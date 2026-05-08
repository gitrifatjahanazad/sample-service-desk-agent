const MODEL = 'gpt-realtime-1.5';

const DEFAULT_SYSTEM_PROMPT = `
আপনি Robi (রবি) মোবাইল অপারেটরের একজন ভদ্র, সাহায্যকারী এবং পেশাদার বাংলাভাষী কাস্টমার সার্ভিস এজেন্ট। আপনি শুধুমাত্র প্রাকৃতিক বাংলাদেশি বাংলা (বাংলাদেশি অ্যাকসেন্ট ও শব্দচয়ন) ব্যবহার করে কথা বলবেন।

ভূমিকা:

* গ্রাহকদের রবি সংক্রান্ত সেবা যেমন কল রেট, ইন্টারনেট ও মিনিট প্যাকেজ, রিচার্জ, বান্ডেল অফার, MNP, রোমিং, বিল পেমেন্ট, FnF, USSD কোড, কাস্টমার কেয়ার ইত্যাদি বিষয়ে সাহায্য করুন।
* আপনি শুধু রবি সংক্রান্ত বিষয়ে সাহায্য করেন। অন্য বিষয়ে প্রশ্ন এলে ভদ্রভাবে গ্রাহককে রবি সম্পর্কিত প্রশ্নে ফিরিয়ে আনুন।

ভাষা ও অ্যাকসেন্ট:

* সর্বদা শুধুমাত্র বাংলায় উত্তর দিন।
* প্রাকৃতিক ঢাকাইয়া/আধুনিক বাংলাদেশি কথ্য বাংলা ব্যবহার করুন।
* কলকাতা বা পশ্চিমবঙ্গের বাংলা শব্দচয়ন, টোন বা উচ্চারণ ব্যবহার করবেন না।
* “নমস্কার”, “কেমন আছো”, “বেশ”, “দেখাচ্ছি” ধরনের কলকাতাকেন্দ্রিক প্রকাশ এড়িয়ে চলুন।
* প্রয়োজনে ব্যবহার করুন:

  * “আসসালামু আলাইকুম”
  * “কেমন আছেন”
  * “ঠিক আছে”
  * “সমস্যা নাই”
  * “এইটা/ওইটা”
* ভাষা হবে সহজ, পরিষ্কার, বন্ধুসুলভ এবং বাস্তব বাংলাদেশি কাস্টমার কেয়ারের মতো।
* অতিরিক্ত সাহিত্যিক বা নাটকীয় বাংলা ব্যবহার করবেন না।

উত্তরের ধরন:

* সংক্ষিপ্ত, পরিষ্কার এবং সহজভাবে উত্তর দিন।
* প্রয়োজনে গ্রাহকের সমস্যা বুঝতে প্রশ্ন করুন।
* নিশ্চিত না হলে অনুমান করবেন না।
* প্রয়োজন হলে গ্রাহককে রবি কাস্টমার কেয়ার ১২১ নম্বরে কল করতে অথবা [রবি অফিসিয়াল ওয়েবসাইট](https://www.robi.com.bd?utm_source=chatgpt.com) ভিজিট করতে বলুন।

ব্যক্তিত্ব ও স্বর:

* ভদ্র, ধৈর্যশীল, উষ্ণ এবং আত্মবিশ্বাসী কাস্টমার সার্ভিস এজেন্টের মতো কথা বলুন।
* গ্রাহক বিরক্ত বা হতাশ হলে সহানুভূতিশীল স্বর ব্যবহার করুন।
* ভালো অফার বা সুবিধার তথ্য দিলে স্বরে ইতিবাচক উৎসাহ রাখুন।

গতি ও বিরতি:

* মাঝারি গতিতে কথা বলুন।
* গুরুত্বপূর্ণ তথ্য—টাকার পরিমাণ, প্যাকেজের দাম, USSD কোড, ফোন নম্বর, মেয়াদ—ধীরে ও স্পষ্ট করে বলুন।
* প্রতিটি গুরুত্বপূর্ণ ধাপ বা বাক্যের মাঝে সামান্য বিরতি রাখুন যেন গ্রাহক সহজে বুঝতে পারেন।

উচ্চারণ:

* শুদ্ধ প্রমিত বাংলাদেশি বাংলা উচ্চারণ ব্যবহার করুন।
* English brand name ও technical term বাংলা টোনে উচ্চারণ করুন:

  * “Robi” → “রবি”
  * “Internet” → “ইন্টারনেট”
  * “Package” → “প্যাকেজ”
  * “Recharge” → “রিচার্জ”
* সংক্ষিপ্ত রূপ স্পষ্টভাবে একটি একটি অক্ষর করে বলুন:

  * “FnF” → “এফ অ্যান্ড এফ”
  * “MNP” → “এম এন পি”
  * “USSD” → “ইউ এস এস ডি”
  * “MB” → “এম বি”
  * “GB” → “জি বি”

জোর (Emphasis):

* টাকার পরিমাণ, প্যাকেজের নাম, USSD কোড, ফোন নম্বর এবং মেয়াদ—এই অংশগুলোতে কণ্ঠে অতিরিক্ত স্পষ্টতা ও জোর দিন।

অতিরিক্ত নির্দেশনা:

* Slight English mixing স্বাভাবিকভাবে ব্যবহার করা যেতে পারে, তবে মূল ভাষা অবশ্যই বাংলা হবে।
* সবসময় এমনভাবে কথা বলুন যেন একজন বাস্তব বাংলাদেশি রবি কাস্টমার কেয়ার প্রতিনিধি গ্রাহকের সাথে ফোনে কথা বলছে।
`;

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
        voice: 'cedar',
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
const savePromptSipBtn = $('savePromptSipBtn');
const promptStatusEl = $('promptStatus');
const sipForm = $('sipForm');
const sipStatusEl = $('sipStatus');
const sipFormStatus = $('sipFormStatus');
const sipLogEl = $('sipLog');
const sipSaveBtn = $('sipSaveBtn');
const sipStartBtn = $('sipStartBtn');
const sipStopBtn = $('sipStopBtn');

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

// ---------- SIP integration ----------

function applyConfigToForm(cfg) {
  for (const el of sipForm.elements) {
    if (!el.name) continue;
    if (el.type === 'checkbox') {
      el.checked = Boolean(cfg[el.name]);
    } else if (el.name === 'password') {
      el.value = '';
      el.placeholder = cfg.passwordSet ? '(saved — leave blank to keep)' : '';
    } else {
      el.value = cfg[el.name] ?? '';
    }
  }
}

function readForm() {
  const data = {};
  for (const el of sipForm.elements) {
    if (!el.name) continue;
    if (el.type === 'checkbox') data[el.name] = el.checked;
    else if (el.type === 'number') data[el.name] = el.value === '' ? null : Number(el.value);
    else data[el.name] = el.value;
  }
  return data;
}

async function loadSipConfig() {
  try {
    const res = await fetch('/api/sip/config');
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed');
    applyConfigToForm(json.config);
  } catch (err) {
    sipFormStatus.textContent = `লোড ব্যর্থ: ${err.message}`;
  }
}

async function postSip(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json;
}

function appendSipLog(text, level = 'info') {
  const li = document.createElement('li');
  li.className = `sip-log-item sip-${level}`;
  const time = new Date().toLocaleTimeString();
  li.textContent = `[${time}] ${text}`;
  sipLogEl.appendChild(li);
  while (sipLogEl.children.length > 50) sipLogEl.firstChild.remove();
  sipLogEl.scrollTop = sipLogEl.scrollHeight;
}

const sipBubbles = { user: null, bot: null };

const SIP_STATUS_LABELS = {
  stopped: 'বন্ধ',
  starting: 'চালু হচ্ছে…',
  registered: 'রেজিস্টার্ড',
  in_call: 'কলে আছে',
  error: 'ত্রুটি',
};

function handleSipStatus(ev) {
  const label = SIP_STATUS_LABELS[ev.state] || ev.state;
  sipStatusEl.textContent = `স্ট্যাটাস: ${label} — ${ev.message}`;
  sipStatusEl.classList.toggle('error', ev.state === 'error');
}

function handleSipCall(ev) {
  if (ev.state === 'ringing') {
    appendSipLog(`📞 রিং: ${ev.from}`, 'info');
  } else if (ev.state === 'connected') {
    appendSipLog(`✅ সংযুক্ত: ${ev.from}`, 'info');
    sipBubbles.user = null;
    sipBubbles.bot = null;
  } else if (ev.state === 'ended') {
    appendSipLog(`📴 শেষ (${ev.reason}, ${ev.duration ?? 0}s)`, 'info');
    sipBubbles.user = null;
    sipBubbles.bot = null;
  }
}

function handleSipTranscript(ev) {
  const slot = ev.role;
  if (!sipBubbles[slot]) {
    sipBubbles[slot] = addBubble(slot === 'user' ? 'user' : 'bot', '');
  }
  if (ev.partial) {
    sipBubbles[slot].textContent += ev.text;
  } else {
    sipBubbles[slot].textContent = ev.text;
    sipBubbles[slot] = null;
  }
  logEl.scrollTop = logEl.scrollHeight;
}

function handleSipEvent(ev) {
  if (ev.kind === 'status') handleSipStatus(ev);
  else if (ev.kind === 'log') appendSipLog(ev.message, ev.level);
  else if (ev.kind === 'call') handleSipCall(ev);
  else if (ev.kind === 'transcript') handleSipTranscript(ev);
}

function startSseStream() {
  const es = new EventSource('/api/sip/events');
  es.onmessage = (e) => {
    try { handleSipEvent(JSON.parse(e.data)); } catch { /* ignore */ }
  };
  es.onerror = () => {
    // Browser will reconnect automatically.
  };
}

sipSaveBtn.addEventListener('click', async (e) => {
  e.preventDefault();
  sipFormStatus.textContent = 'সেভ হচ্ছে…';
  try {
    const data = readForm();
    const json = await postSip('/api/sip/config', data);
    applyConfigToForm(json.config);
    sipFormStatus.textContent = 'সেভ হয়েছে।';
  } catch (err) {
    sipFormStatus.textContent = `সেভ ব্যর্থ: ${err.message}`;
  }
  setTimeout(() => { sipFormStatus.textContent = ''; }, 3000);
});

sipStartBtn.addEventListener('click', async (e) => {
  e.preventDefault();
  sipFormStatus.textContent = 'চালু করা হচ্ছে…';
  try {
    const data = readForm();
    await postSip('/api/sip/config', { ...data, enabled: true });
    sipFormStatus.textContent = 'চালু করা হয়েছে।';
  } catch (err) {
    sipFormStatus.textContent = `চালু ব্যর্থ: ${err.message}`;
  }
  setTimeout(() => { sipFormStatus.textContent = ''; }, 3000);
});

sipStopBtn.addEventListener('click', async (e) => {
  e.preventDefault();
  sipFormStatus.textContent = 'বন্ধ করা হচ্ছে…';
  try {
    await postSip('/api/sip/stop');
    sipFormStatus.textContent = 'বন্ধ হয়েছে।';
  } catch (err) {
    sipFormStatus.textContent = `বন্ধ ব্যর্থ: ${err.message}`;
  }
  setTimeout(() => { sipFormStatus.textContent = ''; }, 3000);
});

savePromptSipBtn.addEventListener('click', async () => {
  promptStatusEl.textContent = 'SIP-এ সেভ হচ্ছে…';
  try {
    await postSip('/api/sip/config', { instructions: getSystemPrompt() });
    promptStatusEl.textContent = 'SIP প্রম্পট সেভ হয়েছে।';
  } catch (err) {
    promptStatusEl.textContent = `সেভ ব্যর্থ: ${err.message}`;
  }
  setTimeout(() => { promptStatusEl.textContent = ''; }, 3000);
});

loadSipConfig();
startSseStream();

window.addEventListener('beforeunload', cleanup);
