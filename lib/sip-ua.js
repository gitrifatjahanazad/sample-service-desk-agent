import sip from 'sip';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { RtpSession } from './rtp-session.js';
import { OpenAIBridge } from './openai-bridge.js';
import { WavWriter, ULAW_TO_PCM16 } from './wav-writer.js';
import { bus } from './sip-events.js';

const ECHO_GATE_THRESHOLD = Number(process.env.SIP_ECHO_GATE) || 5_000_000;

// Local barge-in detector tunables (overridable via env).
// Threshold: PCM16 mean-square energy that counts as "loud frame".
// Window: how many recent 20 ms frames to consider (15 = 300 ms).
// Trigger: how many of those frames must be loud to declare a real interrupt.
const BARGEIN_THRESHOLD = Number(process.env.SIP_BARGEIN_ENERGY) || 4_000_000;
const BARGEIN_WINDOW_FRAMES = Number(process.env.SIP_BARGEIN_WINDOW) || 15;
const BARGEIN_TRIGGER_FRAMES = Number(process.env.SIP_BARGEIN_TRIGGER) || 6;

function meanSquareEnergy(ulaw) {
  if (!ulaw?.length) return 0;
  let sum = 0;
  for (let i = 0; i < ulaw.length; i++) {
    const s = ULAW_TO_PCM16[ulaw[i]];
    sum += s * s;
  }
  return sum / ulaw.length;
}

const LOCAL_SIP_PORT = Number(process.env.SIP_LOCAL_PORT) || 5070;

let started = false;
let currentConfig = null;
let registerTimer = null;
let keepAliveTimer = null;
let registerWatchdog = null;
let lastRegisterOkAt = 0;
let registerCallId = null;
let registerFromTag = null;
let registerCSeq = 1;
let activeCall = null;
let tearingDown = false;
let dialogCSeq = 1;

function md5(s) {
  return crypto.createHash('md5').update(s).digest('hex');
}

function pickLocalIp() {
  for (const ifaceList of Object.values(os.networkInterfaces())) {
    for (const iface of ifaceList || []) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return '127.0.0.1';
}

function parseHostPort(s, defaultPort = 5060) {
  if (!s) return { host: '', port: defaultPort };
  const m = String(s).match(/^([^:]+)(?::(\d+))?$/);
  if (!m) return { host: s, port: defaultPort };
  return { host: m[1], port: m[2] ? Number(m[2]) : defaultPort };
}

// Strip surrounding quotes the parser may leave on challenge field values.
function unq(s) {
  if (typeof s !== 'string') return s;
  return s.startsWith('"') && s.endsWith('"') ? s.slice(1, -1) : s;
}
function q(s) { return `"${s}"`; }

function buildAuthHeader({ user, password, realm, nonce, method, uri, qop, opaque, algorithm }) {
  const realmU = unq(realm);
  const nonceU = unq(nonce);
  const opaqueU = opaque != null ? unq(opaque) : null;
  const ha1 = md5(`${user}:${realmU}:${password}`);
  const ha2 = md5(`${method}:${uri}`);
  const nc = '00000001';
  const cnonce = crypto.randomBytes(8).toString('hex');
  const useQop = qop && String(qop).toLowerCase().split(',').map(s => s.trim()).includes('auth');
  const response = useQop
    ? md5(`${ha1}:${nonceU}:${nc}:${cnonce}:auth:${ha2}`)
    : md5(`${ha1}:${nonceU}:${ha2}`);

  // The `sip` package emits headers verbatim — quote string fields ourselves.
  const obj = {
    scheme: 'Digest',
    username: q(user),
    realm: q(realmU),
    nonce: q(nonceU),
    uri: q(uri),
    response: q(response),
    algorithm: algorithm || 'MD5',
  };
  if (useQop) {
    obj.qop = 'auth';
    obj.nc = nc;
    obj.cnonce = q(cnonce);
  }
  if (opaqueU) obj.opaque = q(opaqueU);
  return obj;
}

function buildSdpAnswer(localIp, localPort) {
  return [
    'v=0',
    `o=- ${Math.floor(Date.now() / 1000)} 1 IN IP4 ${localIp}`,
    's=helpdesk',
    `c=IN IP4 ${localIp}`,
    't=0 0',
    `m=audio ${localPort} RTP/AVP 0`,
    'a=rtpmap:0 PCMU/8000',
    'a=ptime:20',
    'a=sendrecv',
    '',
  ].join('\r\n');
}

function parseRemoteRtp(sdp) {
  if (!sdp) return null;
  const lines = sdp.split(/\r?\n/);
  let connHost = null;
  let mediaPort = null;
  for (const line of lines) {
    if (line.startsWith('c=IN IP4 ')) connHost = line.slice('c=IN IP4 '.length).trim();
    if (line.startsWith('m=audio ')) {
      const parts = line.split(/\s+/);
      mediaPort = Number(parts[1]);
    }
  }
  if (!connHost || !mediaPort) return null;
  return { host: connHost, port: mediaPort };
}

function generateTag() {
  return crypto.randomBytes(6).toString('hex');
}

function generateCallId() {
  return `${crypto.randomBytes(8).toString('hex')}@helpdesk`;
}

function buildRegisterRequest(cfg, { authHeader = null } = {}) {
  const server = parseHostPort(cfg.sipServer, 5060);
  const domain = parseHostPort(cfg.domain || cfg.sipServer, 5060).host;
  const localIp = pickLocalIp();
  const aor = `sip:${cfg.username}@${domain}`;
  const contactUri = `sip:${cfg.username}@${localIp}:${LOCAL_SIP_PORT}`;
  const headers = {
    to: { uri: aor },
    from: { uri: aor, params: { tag: registerFromTag } },
    'call-id': registerCallId,
    cseq: { method: 'REGISTER', seq: registerCSeq++ },
    contact: [{ uri: contactUri }],
    'max-forwards': '70',
    expires: String(cfg.registerRefresh || 300),
    'user-agent': 'BanglaHelpdeskBot/1.0',
  };
  if (authHeader) headers.authorization = [authHeader];
  return {
    method: 'REGISTER',
    uri: `sip:${server.host}:${server.port}`,
    headers,
  };
}

function sendRegister(cfg) {
  if (!registerCallId) registerCallId = generateCallId();
  const req = buildRegisterRequest(cfg);
  bus.log('info', `REGISTER → ${cfg.sipServer}`);
  sip.send(req, (rs) => onRegisterResponse(rs, cfg));
}

function onRegisterResponse(rs, cfg) {
  const status = rs.status;
  if (status === 401 || status === 407) {
    const challengeArr = rs.headers[status === 401 ? 'www-authenticate' : 'proxy-authenticate'];
    const challenge = Array.isArray(challengeArr) ? challengeArr[0] : challengeArr;
    if (!challenge) {
      bus.log('error', `Auth challenge missing in ${status} — retrying in 30s`);
      scheduleRetry(cfg, 30);
      return;
    }
    const server = parseHostPort(cfg.sipServer, 5060);
    const uri = `sip:${server.host}:${server.port}`;
    const auth = buildAuthHeader({
      user: cfg.login || cfg.username,
      password: cfg.password,
      realm: challenge.realm,
      nonce: challenge.nonce,
      method: 'REGISTER',
      uri,
      qop: challenge.qop && challenge.qop.toLowerCase() === 'auth' ? 'auth' : null,
      opaque: challenge.opaque,
      algorithm: challenge.algorithm,
    });
    const req = buildRegisterRequest(cfg, { authHeader: auth });
    bus.log('info', `REGISTER auth retry → ${cfg.sipServer}`);
    sip.send(req, (rs2) => onRegisterResponse(rs2, cfg));
    return;
  }
  if (status >= 200 && status < 300) {
    lastRegisterOkAt = Date.now();
    bus.status('registered', `Registered as ${cfg.username}@${cfg.sipServer}`);
    bus.log('info', `REGISTER ok (200) — refresh in ~${Math.max(60, (cfg.registerRefresh || 300) - 10)}s`);
    scheduleReregister(cfg);
    scheduleKeepAlive(cfg);
    scheduleWatchdog(cfg);
  } else {
    // Any non-2xx final (incl. 408 timeout, 4xx, 5xx). Don't give up — retry soon.
    const delay = status === 408 ? 15 : 30;
    bus.log('error', `REGISTER ${status} ${rs.reason || ''} — retrying in ${delay}s`);
    bus.status('error', `REGISTER failed: ${status} ${rs.reason || ''} — retrying`);
    scheduleRetry(cfg, delay);
  }
}

function scheduleReregister(cfg) {
  if (registerTimer) clearTimeout(registerTimer);
  const delay = Math.max(60, (cfg.registerRefresh || 300) - 10) * 1000;
  registerTimer = setTimeout(() => {
    if (started) {
      // Fresh Call-ID and From-tag for a new registration cycle so the PBX treats
      // it cleanly even if the previous transaction lingered.
      registerCallId = generateCallId();
      registerFromTag = generateTag();
      registerCSeq = 1;
      sendRegister(cfg);
    }
  }, delay);
}

function scheduleRetry(cfg, seconds) {
  if (registerTimer) clearTimeout(registerTimer);
  registerTimer = setTimeout(() => {
    if (started) {
      registerCallId = generateCallId();
      registerFromTag = generateTag();
      registerCSeq = 1;
      sendRegister(cfg);
    }
  }, Math.max(5, seconds) * 1000);
}

function scheduleWatchdog(cfg) {
  // Fail-safe: if no successful REGISTER landed for too long (response callback
  // dropped, NAT pinhole closed, transient network outage), force a fresh
  // registration so we don't sit idle while the PBX has expired our binding.
  if (registerWatchdog) clearInterval(registerWatchdog);
  const refresh = Math.max(60, cfg.registerRefresh || 300);
  // Check every (refresh / 2). If we haven't seen a 2xx for >(refresh + 60)s, re-register.
  registerWatchdog = setInterval(() => {
    if (!started) return;
    const idleMs = Date.now() - lastRegisterOkAt;
    if (idleMs > (refresh + 60) * 1000) {
      bus.log('error', `Watchdog: no REGISTER ok for ${Math.round(idleMs / 1000)}s — forcing re-register`);
      registerCallId = generateCallId();
      registerFromTag = generateTag();
      registerCSeq = 1;
      sendRegister(cfg);
    }
  }, Math.floor(refresh / 2) * 1000);
}

function scheduleKeepAlive(cfg) {
  if (keepAliveTimer) clearInterval(keepAliveTimer);
  const interval = Math.max(5, cfg.keepAlive || 15) * 1000;
  keepAliveTimer = setInterval(() => {
    if (!started) return;
    const server = parseHostPort(cfg.sipServer, 5060);
    const domain = parseHostPort(cfg.domain || cfg.sipServer, 5060).host;
    const aor = `sip:${cfg.username}@${domain}`;
    sip.send({
      method: 'OPTIONS',
      uri: `sip:${server.host}:${server.port}`,
      headers: {
        to: { uri: aor },
        from: { uri: aor, params: { tag: generateTag() } },
        'call-id': generateCallId(),
        cseq: { method: 'OPTIONS', seq: 1 },
        'max-forwards': '70',
      },
    }, () => { /* ignore response */ });
  }, interval);
}

async function handleInvite(rq) {
  if (activeCall || tearingDown) {
    sip.send(sip.makeResponse(rq, 486, 'Busy Here'));
    bus.log('info', tearingDown
      ? 'Rejected INVITE with 486 — previous call still tearing down'
      : 'Rejected concurrent INVITE with 486');
    return;
  }
  const remoteSdp = rq.content || '';
  const remoteRtp = parseRemoteRtp(remoteSdp);
  if (!remoteRtp) {
    sip.send(sip.makeResponse(rq, 488, 'Not Acceptable Here'));
    bus.log('error', 'INVITE missing media info');
    return;
  }
  const fromUri = rq.headers.from?.uri || 'unknown';
  bus.call('ringing', { from: fromUri });

  // 100 Trying, 180 Ringing
  sip.send(sip.makeResponse(rq, 100, 'Trying'));
  sip.send(sip.makeResponse(rq, 180, 'Ringing'));

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    sip.send(sip.makeResponse(rq, 503, 'Service Unavailable'));
    bus.status('error', 'OPENAI_API_KEY missing in .env');
    return;
  }

  const rtp = new RtpSession();
  let localRtpPort;
  try {
    localRtpPort = await rtp.open();
  } catch (err) {
    sip.send(sip.makeResponse(rq, 500, 'Internal Server Error'));
    bus.log('error', `RTP socket open failed: ${err.message}`);
    return;
  }
  rtp.setRemote(remoteRtp.host, remoteRtp.port);

  const localIp = pickLocalIp();
  const sdpAnswer = buildSdpAnswer(localIp, localRtpPort);

  // Build 200 OK with our To tag for the dialog.
  const ok = sip.makeResponse(rq, 200, 'OK');
  ok.headers.to.params = ok.headers.to.params || {};
  ok.headers.to.params.tag = generateTag();
  ok.headers.contact = [{ uri: `sip:${currentConfig.username}@${localIp}:${LOCAL_SIP_PORT}` }];
  ok.headers['content-type'] = 'application/sdp';
  ok.content = sdpAnswer;

  const bridge = new OpenAIBridge({ apiKey, instructions: currentConfig.instructions });

  // Per-call recordings: <cwd>/recordings/<ts>-<from>/{caller,bot}.wav
  const tsDir = new Date().toISOString().replace(/[:.]/g, '-');
  const safeFrom = String(fromUri).replace(/[^a-zA-Z0-9._@-]/g, '_').slice(0, 40);
  const recDir = path.resolve(process.cwd(), 'recordings', `${tsDir}-${safeFrom}`);
  const callerWav = new WavWriter(path.join(recDir, 'caller.wav'));
  const botWav = new WavWriter(path.join(recDir, 'bot.wav'));
  try {
    await callerWav.open();
    await botWav.open();
    bus.log('info', `Recording → ${recDir}`);
  } catch (err) {
    bus.log('error', `WAV open failed: ${err.message}`);
  }

  let botBytes = 0;
  let callerBytes = 0;

  activeCall = {
    inviteRq: rq,
    okResponse: ok,
    rtp,
    bridge,
    callerWav,
    botWav,
    recDir,
    from: fromUri,
    callId: rq.headers['call-id'],
    answeredAt: Date.now(),
  };

  // Sliding window of "is this frame loud?" booleans for local barge-in detection.
  // We can't fully trust OpenAI's server VAD on telephony (narrowband audio,
  // possible signal-level differences), so this is a backup that triggers on
  // sustained caller energy while the bot is speaking.
  const loudWindow = [];
  let loudCount = 0;
  let localBargeFired = 0;

  rtp.on('audio', (payload) => {
    // Always record raw caller stream and forward every frame to OpenAI so its
    // VAD has a chance to detect real interrupts.
    callerWav.writeUlaw(payload);
    callerBytes += payload.length;
    bridge.sendAudio(payload);

    // Local barge-in: only meaningful when the bot is actively speaking AND we
    // haven't already cancelled the current response.
    if (!bridge.botSpeaking || bridge.responseCancelSent) {
      // Reset the window so a stretch of silence doesn't carry a stale "loud"
      // frame into the next bot turn.
      if (loudWindow.length) { loudWindow.length = 0; loudCount = 0; }
      return;
    }

    const energy = meanSquareEnergy(payload);
    const loud = energy >= BARGEIN_THRESHOLD ? 1 : 0;
    loudWindow.push(loud);
    loudCount += loud;
    if (loudWindow.length > BARGEIN_WINDOW_FRAMES) {
      loudCount -= loudWindow.shift();
    }
    if (loudCount >= BARGEIN_TRIGGER_FRAMES) {
      localBargeFired += 1;
      bridge.cancelActive('local_barge_in');
      // Reset window so we don't immediately re-fire on the same caller turn.
      loudWindow.length = 0;
      loudCount = 0;
    }
  });
  rtp.on('error', (err) => bus.log('error', `RTP error: ${err.message}`));

  bridge.on('ready', () => {
    bus.call('connected', { from: fromUri });
    bus.status('in_call', `In call with ${fromUri}`);
  });
  bridge.on('audio', (pcmu) => {
    botBytes += pcmu.length;
    botWav.writeUlaw(pcmu);
    rtp.enqueueAudio(pcmu);
  });
  bridge.on('flush_output', () => {
    rtp.clearOutgoing();
    bus.log('info', 'Bot interrupted — RTP queue flushed');
  });
  bridge.on('transcript', (t) => bus.transcript(t.role, t.text, t.partial));
  bridge.on('log', (msg) => bus.log('info', `OpenAI: ${msg}`));
  bridge.on('error', (err) => bus.log('error', `OpenAI error: ${err.message}`));
  bridge.on('close', () => {
    if (activeCall) {
      bus.log('info', `Call audio totals — caller: ${callerBytes}B, bot: ${botBytes}B, local barge-in fired: ${localBargeFired}`);
      endActiveCall('openai_closed');
    }
  });

  sip.send(ok);
  rtp.startPacer();
  bridge.connect();
}

function handleBye(rq) {
  sip.send(sip.makeResponse(rq, 200, 'OK'));
  if (activeCall && rq.headers['call-id'] === activeCall.callId) {
    bus.log('info', `BYE from caller ${activeCall.from}`);
    endActiveCall('caller_bye');
  }
}

function handleAck(_rq) {
  // ACK confirms our 200 OK; nothing to do — RTP already started.
}

function handleCancel(rq) {
  sip.send(sip.makeResponse(rq, 200, 'OK'));
  if (activeCall && rq.headers['call-id'] === activeCall.callId) {
    // Cancel before answer — send 487 to original INVITE.
    sip.send(sip.makeResponse(activeCall.inviteRq, 487, 'Request Terminated'));
    endActiveCall('caller_cancel');
  }
}

function uriToString(u) {
  if (!u) return null;
  return typeof u === 'string' ? u : sip.stringifyUri(u);
}

function sendBye(call) {
  // Send a SIP BYE inside the existing dialog so the caller's PBX tears down too.
  // Used when the bot side ends the call (OpenAI disconnect, server shutdown).
  if (!call?.inviteRq || !call?.okResponse) return;
  const inv = call.inviteRq;
  const ok = call.okResponse;
  const callerContact = uriToString(inv.headers.contact?.[0]?.uri);
  const fallbackFrom = uriToString(inv.headers.from?.uri);
  const requestUri = callerContact || fallbackFrom;
  if (!requestUri) return;
  const bye = {
    method: 'BYE',
    uri: requestUri,
    headers: {
      // In a confirmed dialog, BYE from us flips the From/To from the response perspective.
      from: { uri: ok.headers.to.uri, params: { tag: ok.headers.to.params?.tag } },
      to: { uri: ok.headers.from.uri, params: { tag: ok.headers.from.params?.tag } },
      'call-id': call.callId,
      cseq: { method: 'BYE', seq: dialogCSeq++ },
      'max-forwards': '70',
      'user-agent': 'BanglaHelpdeskBot/1.0',
    },
  };
  try {
    sip.send(bye, () => { /* response not needed for cleanup */ });
    bus.log('info', `BYE sent to caller ${call.from}`);
  } catch (err) {
    bus.log('error', `BYE send failed: ${err.message}`);
  }
}

async function endActiveCall(reason) {
  if (!activeCall) return;
  const call = activeCall;
  activeCall = null;
  tearingDown = true;

  // If the bot side ended the call, tell the caller's PBX so the line drops.
  const callerInitiated = reason === 'caller_bye' || reason === 'caller_cancel';
  if (!callerInitiated) sendBye(call);

  try { call.rtp?.close(); } catch {}
  try { call.bridge?.close(); } catch {}

  const duration = Math.round((Date.now() - call.answeredAt) / 1000);
  bus.call('ended', { from: call.from, reason, duration });

  // Wait for WAV finalization so the file is fully written before we declare ready.
  try {
    await Promise.all([
      call.callerWav?.close().catch((e) => bus.log('error', `caller.wav close: ${e.message}`)),
      call.botWav?.close().catch((e) => bus.log('error', `bot.wav close: ${e.message}`)),
    ]);
    if (call.recDir) bus.log('info', `Recording saved → ${call.recDir}`);
  } finally {
    tearingDown = false;
    if (currentConfig?.username && currentConfig?.sipServer) {
      bus.status('registered', `Ready for next call — ${currentConfig.username}@${currentConfig.sipServer}`);
      bus.log('info', 'Ready for next call');
    } else {
      bus.status('stopped', 'Stopped');
    }
  }
}

function onRequest(rq /* , remote */) {
  switch (rq.method) {
    case 'INVITE': handleInvite(rq); break;
    case 'ACK': handleAck(rq); break;
    case 'BYE': handleBye(rq); break;
    case 'CANCEL': handleCancel(rq); break;
    case 'OPTIONS':
      sip.send(sip.makeResponse(rq, 200, 'OK'));
      break;
    default:
      sip.send(sip.makeResponse(rq, 405, 'Method Not Allowed'));
  }
}

export async function startSip(cfg) {
  if (started) await stopSip();
  if (!cfg.sipServer || !cfg.username || !cfg.password) {
    throw new Error('sipServer, username, and password are required');
  }
  currentConfig = cfg;
  registerCallId = generateCallId();
  registerFromTag = generateTag();
  registerCSeq = 1;
  bus.status('starting', 'Starting SIP UA…');
  await new Promise((resolve, reject) => {
    try {
      sip.start({
        port: LOCAL_SIP_PORT,
        address: '0.0.0.0',
        publicAddress: cfg.publicAddress && cfg.publicAddress !== 'Auto' ? cfg.publicAddress : undefined,
        udp: true,
        tcp: false,
        tls: false,
        ws: false,
      }, onRequest);
      resolve();
    } catch (err) {
      reject(err);
    }
  });
  started = true;
  bus.log('info', `SIP UA listening on UDP ${LOCAL_SIP_PORT}`);
  sendRegister(cfg);
}

export async function stopSip() {
  if (!started) return;
  started = false;
  if (registerTimer) { clearTimeout(registerTimer); registerTimer = null; }
  if (keepAliveTimer) { clearInterval(keepAliveTimer); keepAliveTimer = null; }
  if (registerWatchdog) { clearInterval(registerWatchdog); registerWatchdog = null; }
  if (activeCall) endActiveCall('shutdown');
  try { sip.stop(); } catch {}
  bus.status('stopped', 'Stopped');
}

export function getStatus() {
  return {
    running: started,
    inCall: Boolean(activeCall),
    activeCall: activeCall ? { from: activeCall.from, callId: activeCall.callId } : null,
  };
}
