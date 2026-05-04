const MODEL = 'gpt-realtime-1.5';

const DEFAULT_SYSTEM_PROMPT = [
  'আপনি Robi (রবি) মোবাইল অপারেটরের একজন ভদ্র, বন্ধুত্বপূর্ণ এবং সাহায্যকারী বাংলাভাষী কাস্টমার সার্ভিস এজেন্ট।',
  'গ্রাহকদের রবি সংক্রান্ত সেবা যেমন কল রেট, ইন্টারনেট ও মিনিট প্যাকেজ, রিচার্জ, বান্ডেল অফার, MNP, রোমিং, বিল পেমেন্ট, কাস্টমার কেয়ার, FnF, USSD কোড ইত্যাদি বিষয়ে সাহায্য করুন।',
  'সর্বদা শুধু বাংলায় উত্তর দিন—সংক্ষিপ্ত, ভদ্র এবং পরিষ্কার ভাষায়। প্রয়োজনে গ্রাহকের সমস্যা ভালোভাবে বুঝতে প্রশ্ন করুন।',
  'যদি নির্দিষ্ট কোনো তথ্য নিশ্চিতভাবে না জানেন, তাহলে অনুমান করবেন না—গ্রাহককে অনুরোধ করুন রবি কাস্টমার কেয়ার (১২১) এ কল করতে অথবা https://www.robi.com.bd ভিজিট করতে।',
  'আপনি শুধু রবি সংক্রান্ত বিষয়ে সাহায্য করেন—অন্য বিষয়ে প্রশ্ন এলে ভদ্রভাবে গ্রাহককে রবি সম্পর্কিত প্রশ্ন করতে অনুরোধ করুন।',
].join(' ');

function buildSessionConfig(instructions) {
  return {
    type: 'realtime',
    model: MODEL,
    instructions,
    output_modalities: ['audio'],
    audio: {
      input: {
        noise_reduction: { type: 'far_field' },
        transcription: {
          model: 'gpt-4o-mini-transcribe',
          language: 'bn',
          prompt: 'বাংলা ভাষায় কথোপকথন। Robi (রবি) মোবাইল অপারেটর সম্পর্কিত শব্দ যেমন রিচার্জ, ইন্টারনেট প্যাকেজ, MB, GB, MNP, FnF, USSD, কাস্টমার কেয়ার (১২১) থাকতে পারে।',
        },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500,
          create_response: true,
        },
      },
      output: {
        voice: 'marin',
      },
    },
  };
}

const $ = (id) => document.getElementById(id);
const connectBtn = $('connectBtn');
const talkBtn = $('talkBtn');
const vadToggle = $('vadToggle');
const statusEl = $('status');
const logEl = $('log');
const remoteAudio = $('remote');
const promptEl = $('systemPrompt');
const applyPromptBtn = $('applyPromptBtn');
const resetPromptBtn = $('resetPromptBtn');
const promptStatusEl = $('promptStatus');

promptEl.value = DEFAULT_SYSTEM_PROMPT;

function getSystemPrompt() {
  return (promptEl.value || '').trim() || DEFAULT_SYSTEM_PROMPT;
}

let pc = null;
let dc = null;
let micStream = null;
let micSender = null;
let connected = false;

const userBubbles = new Map();
const botBubbles = new Map();
let pendingUserBubble = null;

function setStatus(text, isError = false) {
  statusEl.textContent = text;
  statusEl.classList.toggle('error', isError);
}

function addBubble(kind, text = '', pending = false) {
  const div = document.createElement('div');
  div.className = `bubble ${kind}` + (pending ? ' pending' : '');
  div.textContent = text;
  logEl.appendChild(div);
  logEl.scrollTop = logEl.scrollHeight;
  return div;
}

function getOrCreateUserBubble(itemId) {
  if (itemId && userBubbles.has(itemId)) return userBubbles.get(itemId);
  const bubble = pendingUserBubble || addBubble('user', '…', true);
  pendingUserBubble = null;
  if (itemId) userBubbles.set(itemId, bubble);
  return bubble;
}

function getOrCreateBotBubble(responseId) {
  if (botBubbles.has(responseId)) return botBubbles.get(responseId);
  const bubble = addBubble('bot', '');
  botBubbles.set(responseId, bubble);
  return bubble;
}

function sendEvent(obj) {
  if (dc && dc.readyState === 'open') {
    dc.send(JSON.stringify(obj));
  }
}

function buildSessionUpdate(useVad) {
  const session = buildSessionConfig(getSystemPrompt());
  if (!useVad) session.audio.input.turn_detection = null;
  return { type: 'session.update', session };
}

async function fetchEphemeralKey() {
  const res = await fetch('/api/session', { method: 'POST' });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || data?.error || JSON.stringify(data));
  }
  // Handle both response shapes from OpenAI.
  const key = data.value || data.client_secret?.value;
  if (!key) throw new Error('Ephemeral key missing in response');
  return key;
}

async function connect() {
  setStatus('সংযোগ হচ্ছে…');
  connectBtn.disabled = true;

  let ephemeralKey;
  try {
    ephemeralKey = await fetchEphemeralKey();
  } catch (err) {
    setStatus(`টোকেন আনতে ব্যর্থ: ${err.message}`, true);
    connectBtn.disabled = false;
    return;
  }

  pc = new RTCPeerConnection();

  pc.ontrack = (e) => {
    remoteAudio.srcObject = e.streams[0];
  };

  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
      setStatus(`সংযোগ ${pc.connectionState}`, true);
    }
  };

  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err) {
    setStatus('মাইক্রোফোন অ্যাক্সেস দেওয়া হয়নি।', true);
    cleanup();
    return;
  }

  for (const track of micStream.getTracks()) {
    micSender = pc.addTrack(track, micStream);
  }

  dc = pc.createDataChannel('oai-events');
  dc.onopen = () => {
    sendEvent(buildSessionUpdate(vadToggle.checked));
    setStatus(vadToggle.checked ? 'শুনছি…' : 'কথা বলার জন্য বাটন চেপে ধরুন');
  };
  dc.onmessage = (e) => {
    try {
      handleEvent(JSON.parse(e.data));
    } catch {
      /* ignore */
    }
  };

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  const sdpRes = await fetch(`https://api.openai.com/v1/realtime/calls?model=${MODEL}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ephemeralKey}`,
      'Content-Type': 'application/sdp',
    },
    body: offer.sdp,
  });

  if (!sdpRes.ok) {
    const errText = await sdpRes.text();
    setStatus(`SDP exchange failed: ${errText}`, true);
    cleanup();
    return;
  }

  const answerSdp = await sdpRes.text();
  await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

  connected = true;
  connectBtn.textContent = 'সংযোগ বন্ধ করুন';
  connectBtn.disabled = false;
  talkBtn.disabled = vadToggle.checked;
  setMicEnabled(vadToggle.checked);
}

function setMicEnabled(enabled) {
  if (!micStream) return;
  for (const t of micStream.getTracks()) t.enabled = enabled;
}

function cleanup() {
  connected = false;
  if (dc) {
    try { dc.close(); } catch {}
    dc = null;
  }
  if (pc) {
    try { pc.close(); } catch {}
    pc = null;
  }
  if (micStream) {
    for (const t of micStream.getTracks()) t.stop();
    micStream = null;
  }
  remoteAudio.srcObject = null;
  connectBtn.textContent = 'সংযোগ করুন';
  connectBtn.disabled = false;
  talkBtn.disabled = true;
  talkBtn.classList.remove('active');
}

function disconnect() {
  cleanup();
  setStatus('সংযোগ বন্ধ।');
}

function handleEvent(ev) {
  switch (ev.type) {
    case 'input_audio_buffer.speech_started':
      pendingUserBubble = addBubble('user', '…', true);
      setStatus('শুনছি…');
      break;

    case 'input_audio_buffer.speech_stopped':
      setStatus('উত্তর দিচ্ছি…');
      break;

    case 'conversation.item.input_audio_transcription.delta': {
      const bubble = getOrCreateUserBubble(ev.item_id);
      if (bubble.classList.contains('pending')) {
        bubble.textContent = '';
        bubble.classList.remove('pending');
      }
      bubble.textContent += ev.delta || '';
      logEl.scrollTop = logEl.scrollHeight;
      break;
    }

    case 'conversation.item.input_audio_transcription.completed': {
      const bubble = getOrCreateUserBubble(ev.item_id);
      bubble.classList.remove('pending');
      if (ev.transcript) bubble.textContent = ev.transcript;
      break;
    }

    case 'response.audio_transcript.delta':
    case 'response.output_audio_transcript.delta': {
      const bubble = getOrCreateBotBubble(ev.response_id);
      bubble.textContent += ev.delta || '';
      logEl.scrollTop = logEl.scrollHeight;
      break;
    }

    case 'response.audio_transcript.done':
    case 'response.output_audio_transcript.done': {
      const bubble = getOrCreateBotBubble(ev.response_id);
      if (ev.transcript) bubble.textContent = ev.transcript;
      break;
    }

    case 'response.done':
      setStatus(vadToggle.checked ? 'শুনছি…' : 'কথা বলার জন্য বাটন চেপে ধরুন');
      break;

    case 'error':
      setStatus(`ত্রুটি: ${ev.error?.message || JSON.stringify(ev.error)}`, true);
      break;
  }
}

connectBtn.addEventListener('click', () => {
  if (connected) disconnect();
  else connect();
});

vadToggle.addEventListener('change', () => {
  if (!connected) return;
  sendEvent(buildSessionUpdate(vadToggle.checked));
  talkBtn.disabled = vadToggle.checked;
  setMicEnabled(vadToggle.checked);
  setStatus(vadToggle.checked ? 'শুনছি…' : 'কথা বলার জন্য বাটন চেপে ধরুন');
});

function startTalk() {
  if (!connected || vadToggle.checked) return;
  talkBtn.classList.add('active');
  setMicEnabled(true);
  setStatus('শুনছি…');
}

function stopTalk() {
  if (!connected || vadToggle.checked) return;
  if (!talkBtn.classList.contains('active')) return;
  talkBtn.classList.remove('active');
  setMicEnabled(false);
  sendEvent({ type: 'input_audio_buffer.commit' });
  sendEvent({ type: 'response.create' });
  setStatus('উত্তর দিচ্ছি…');
}

talkBtn.addEventListener('mousedown', startTalk);
talkBtn.addEventListener('mouseup', stopTalk);
talkBtn.addEventListener('mouseleave', stopTalk);
talkBtn.addEventListener('touchstart', (e) => { e.preventDefault(); startTalk(); });
talkBtn.addEventListener('touchend', (e) => { e.preventDefault(); stopTalk(); });

applyPromptBtn.addEventListener('click', () => {
  if (connected) {
    sendEvent(buildSessionUpdate(vadToggle.checked));
    promptStatusEl.textContent = 'প্রম্পট প্রয়োগ করা হয়েছে।';
  } else {
    promptStatusEl.textContent = 'সংযোগ করার সময় এই প্রম্পট ব্যবহার হবে।';
  }
  setTimeout(() => { promptStatusEl.textContent = ''; }, 2500);
});

resetPromptBtn.addEventListener('click', () => {
  promptEl.value = DEFAULT_SYSTEM_PROMPT;
  promptStatusEl.textContent = 'ডিফল্ট প্রম্পট লোড হয়েছে।';
  setTimeout(() => { promptStatusEl.textContent = ''; }, 2500);
});

window.addEventListener('beforeunload', cleanup);
