import sip from 'sip';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { RtpSession } from './rtp-session.js';
import { OpenAIBridge } from './openai-bridge.js';
import { WavWriter } from './wav-writer.js';
import { bus } from './sip-events.js';

const LOCAL_SIP_PORT = Number(process.env.SIP_LOCAL_PORT) || 5070;

let started = false;
let currentConfig = null;
let registerTimer = null;
let keepAliveTimer = null;
let registerCallId = null;
let registerFromTag = null;
let registerCSeq = 1;
let activeCall = null;

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
      bus.status('error', `Auth challenge missing in ${status}`);
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
    bus.status('registered', `Registered as ${cfg.username}@${cfg.sipServer}`);
    scheduleReregister(cfg);
    scheduleKeepAlive(cfg);
  } else if (status >= 300) {
    bus.status('error', `REGISTER failed: ${status} ${rs.reason || ''}`);
    bus.log('error', `REGISTER ${status} ${rs.reason || ''}`);
  }
}

function scheduleReregister(cfg) {
  if (registerTimer) clearTimeout(registerTimer);
  const delay = Math.max(60, (cfg.registerRefresh || 300) - 10) * 1000;
  registerTimer = setTimeout(() => {
    if (started) sendRegister(cfg);
  }, delay);
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
  if (activeCall) {
    sip.send(sip.makeResponse(rq, 486, 'Busy Here'));
    bus.log('info', 'Rejected concurrent INVITE with 486');
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

  rtp.on('audio', (payload) => {
    callerBytes += payload.length;
    callerWav.writeUlaw(payload);
    bridge.sendAudio(payload);
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
  // NOTE: We deliberately do NOT clear the outbound queue on `barge_in` here.
  // On a noisy phone line `input_audio_buffer.speech_started` fires almost
  // continuously, which would zap every bot frame before the RTP pacer can send
  // it. The OpenAI server already cancels in-flight responses when the caller
  // really starts a new turn, so we just let the queue drain naturally.
  bridge.on('transcript', (t) => bus.transcript(t.role, t.text, t.partial));
  bridge.on('log', (msg) => bus.log('info', `OpenAI: ${msg}`));
  bridge.on('error', (err) => bus.log('error', `OpenAI error: ${err.message}`));
  bridge.on('close', () => {
    if (activeCall) {
      bus.log('info', `Call audio totals — caller: ${callerBytes}B, bot: ${botBytes}B`);
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

function endActiveCall(reason) {
  if (!activeCall) return;
  const call = activeCall;
  activeCall = null;
  try { call.rtp?.close(); } catch {}
  try { call.bridge?.close(); } catch {}
  // Finalize WAV files in the background — don't block call teardown.
  Promise.all([
    call.callerWav?.close().catch((e) => bus.log('error', `caller.wav close: ${e.message}`)),
    call.botWav?.close().catch((e) => bus.log('error', `bot.wav close: ${e.message}`)),
  ]).then(() => {
    if (call.recDir) bus.log('info', `Recording saved → ${call.recDir}`);
  });
  const duration = Math.round((Date.now() - call.answeredAt) / 1000);
  bus.call('ended', { from: call.from, reason, duration });
  bus.status('registered', `Registered as ${currentConfig?.username}@${currentConfig?.sipServer}`);
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
