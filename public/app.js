const MODEL = 'gpt-realtime-1.5';

const DEFAULT_SYSTEM_PROMPT = `
तपाईं एक विनम्र, सहयोगी, र पेशेवर नेपालीभाषी ERP (Enterprise Resource Planning) सहायता एजेन्ट हुनुहुन्छ। तपाईं केवल प्राकृतिक नेपाली भाषा (नेपाली उच्चारण र शब्दचयन) मात्र प्रयोग गर्नुहुन्छ।

भूमिका:

* प्रयोगकर्तालाई ERP प्रणालीसँग सम्बन्धित विषयहरू जस्तै लेखा (Accounting/Finance), बिक्री (Sales), खरिद (Purchase), इन्भेन्टरी (Inventory), मानव संसाधन (HR/Payroll), उत्पादन (Manufacturing), CRM, इन्भ्वाइस, भ्याट/कर, रिपोर्ट, प्रयोगकर्ता पहुँच, अनुमति, र मोड्युल कन्फिगरेसन सम्बन्धी समस्यामा सहयोग गर्नुहोस्।
* तपाईं केवल ERP सम्बन्धी विषयमा सहयोग गर्नुहुन्छ। अन्य विषयको प्रश्न आए विनम्रतापूर्वक प्रयोगकर्तालाई ERP सम्बन्धी प्रश्नमा फर्काउनुहोस्।

भाषा र उच्चारण:

* सधैँ नेपाली भाषामा मात्र उत्तर दिनुहोस्।
* प्राकृतिक, आधुनिक नेपाली बोलीचाली प्रयोग गर्नुहोस्।
* अत्यन्त साहित्यिक वा कठिन संस्कृतनिष्ठ शब्द प्रयोग नगर्नुहोस्।
* आवश्यक परे प्रयोग गर्नुहोस्:

  * “नमस्ते”
  * “तपाईंलाई कसरी सहयोग गर्न सक्छु?”
  * “हुन्छ”
  * “ठीक छ”
  * “समस्या छैन”
* भाषा सरल, स्पष्ट, मित्रवत्, र वास्तविक नेपाली कस्टमर सपोर्टजस्तै हुनुपर्छ।

उत्तरको शैली:

* संक्षिप्त, स्पष्ट र सहज रूपमा उत्तर दिनुहोस्।
* आवश्यक भए प्रयोगकर्ताको समस्या बुझ्न प्रश्न सोध्नुहोस्।
* निश्चित नभएमा अनुमान नगर्नुहोस्।
* आवश्यक भएमा प्रयोगकर्तालाई आफ्नो ERP प्रशासक वा संस्थाको IT/सहायता टोलीलाई सम्पर्क गर्न अनुरोध गर्नुहोस्।

व्यक्तित्व र स्वर:

* विनम्र, धैर्यशील, न्यानो, र आत्मविश्वासी सहायता एजेन्टजस्तै बोल्नुहोस्।
* प्रयोगकर्ता निराश वा अप्ठेरोमा परेको लागे सहानुभूतिपूर्ण स्वर प्रयोग गर्नुहोस्।
* समाधान वा सही प्रक्रिया बताउँदा स्वरमा सकारात्मक आत्मविश्वास राख्नुहोस्।

गति र विराम:

* मध्यम गतिमा बोल्नुहोस्।
* महत्त्वपूर्ण जानकारी—रकम, मिति, इन्भ्वाइस नम्बर, मोड्युलको नाम, मेनु पथ (menu path), बटनको नाम—विस्तारै र स्पष्ट रूपमा बोल्नुहोस्।
* प्रत्येक महत्त्वपूर्ण चरण वा वाक्यबीच सानो विराम राख्नुहोस् ताकि प्रयोगकर्ताले सजिलै बुझ्न सकून्।

उच्चारण:

* शुद्ध मानक नेपाली उच्चारण प्रयोग गर्नुहोस्।
* English module र technical term नेपाली उच्चारणमा बोल्नुहोस्:

  * “Invoice” → “इन्भ्वाइस”
  * “Inventory” → “इन्भेन्टरी”
  * “Purchase Order” → “पर्चेज अर्डर”
  * “Sales Order” → “सेल्स अर्डर”
  * “Ledger” → “लेजर”
* संक्षिप्त रूप स्पष्ट गरी एक एक अक्षर भनेर बोल्नुहोस्:

  * “ERP” → “ई आर पी”
  * “HR” → “एच आर”
  * “VAT” → “भ्याट”
  * “GL” → “जी एल”
  * “PO” → “पी ओ”
  * “SO” → “एस ओ”

जोड (Emphasis):

* रकम, मिति, इन्भ्वाइस वा अर्डर नम्बर, मोड्युलको नाम, र मेनु पथ—यी अंशहरूमा स्वरमा थप स्पष्टता र जोड दिनुहोस्।

अतिरिक्त निर्देशन:

* Slight English mixing प्राकृतिक रूपमा प्रयोग गर्न सकिन्छ, तर मूल भाषा अनिवार्य रूपमा नेपाली नै हुनुपर्छ।
* सधैँ यसरी बोल्नुहोस् मानौँ एक वास्तविक नेपाली ERP सहायता प्रतिनिधि प्रयोगकर्तासँग फोनमा कुरा गरिरहेको छ।
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
          language: 'ne',
          prompt: 'नेपाली भाषामा कुराकानी। ERP सम्बन्धित शब्दहरू जस्तै लेखा, बिक्री, खरिद, इन्भेन्टरी, HR, पेरोल, मोड्युल, इन्भ्वाइस, भ्याट, रिपोर्ट, पर्चेज अर्डर, सेल्स अर्डर हुन सक्छन्।',
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
const sipTestBtn = $('sipTestBtn');

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
  setStatus('जडान हुँदै…');
  connectBtn.disabled = true;

  let ephemeralKey;
  try {
    ephemeralKey = await fetchEphemeralKey();
  } catch (err) {
    setStatus(`टोकन ल्याउन असफल: ${err.message}`, true);
    connectBtn.disabled = false;
    return;
  }

  pc = new RTCPeerConnection();

  pc.ontrack = (e) => {
    remoteAudio.srcObject = e.streams[0];
  };

  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
      setStatus(`जडान ${pc.connectionState}`, true);
    }
  };

  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err) {
    setStatus('माइक्रोफोन पहुँच दिइएको छैन।', true);
    cleanup();
    return;
  }

  for (const track of micStream.getTracks()) {
    micSender = pc.addTrack(track, micStream);
  }

  dc = pc.createDataChannel('oai-events');
  dc.onopen = () => {
    sendEvent(buildSessionUpdate(vadToggle.checked));
    setStatus(vadToggle.checked ? 'सुन्दैछु…' : 'बोल्नका लागि बटन थिच्नुहोस्');
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
  connectBtn.textContent = 'जडान बन्द गर्नुहोस्';
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
  connectBtn.textContent = 'जडान गर्नुहोस्';
  connectBtn.disabled = false;
  talkBtn.disabled = true;
  talkBtn.classList.remove('active');
}

function disconnect() {
  cleanup();
  setStatus('जडान बन्द गरियो।');
}

function handleEvent(ev) {
  switch (ev.type) {
    case 'input_audio_buffer.speech_started':
      pendingUserBubble = addBubble('user', '…', true);
      setStatus('सुन्दैछु…');
      break;

    case 'input_audio_buffer.speech_stopped':
      setStatus('जवाफ दिँदैछु…');
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
      setStatus(vadToggle.checked ? 'सुन्दैछु…' : 'बोल्नका लागि बटन थिच्नुहोस्');
      break;

    case 'error':
      setStatus(`त्रुटि: ${ev.error?.message || JSON.stringify(ev.error)}`, true);
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
  setStatus(vadToggle.checked ? 'सुन्दैछु…' : 'बोल्नका लागि बटन थिच्नुहोस्');
});

function startTalk() {
  if (!connected || vadToggle.checked) return;
  talkBtn.classList.add('active');
  setMicEnabled(true);
  setStatus('सुन्दैछु…');
}

function stopTalk() {
  if (!connected || vadToggle.checked) return;
  if (!talkBtn.classList.contains('active')) return;
  talkBtn.classList.remove('active');
  setMicEnabled(false);
  sendEvent({ type: 'input_audio_buffer.commit' });
  sendEvent({ type: 'response.create' });
  setStatus('जवाफ दिँदैछु…');
}

talkBtn.addEventListener('mousedown', startTalk);
talkBtn.addEventListener('mouseup', stopTalk);
talkBtn.addEventListener('mouseleave', stopTalk);
talkBtn.addEventListener('touchstart', (e) => { e.preventDefault(); startTalk(); });
talkBtn.addEventListener('touchend', (e) => { e.preventDefault(); stopTalk(); });

applyPromptBtn.addEventListener('click', () => {
  if (connected) {
    sendEvent(buildSessionUpdate(vadToggle.checked));
    promptStatusEl.textContent = 'प्रम्प्ट लागू गरियो।';
  } else {
    promptStatusEl.textContent = 'जडान गर्दा यो प्रम्प्ट प्रयोग हुनेछ।';
  }
  setTimeout(() => { promptStatusEl.textContent = ''; }, 2500);
});

resetPromptBtn.addEventListener('click', () => {
  promptEl.value = DEFAULT_SYSTEM_PROMPT;
  promptStatusEl.textContent = 'पूर्वनिर्धारित प्रम्प्ट लोड गरियो।';
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
    sipFormStatus.textContent = `लोड असफल: ${err.message}`;
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
  stopped: 'बन्द',
  starting: 'सुरु हुँदै…',
  registered: 'दर्ता भएको',
  in_call: 'कलमा',
  error: 'त्रुटि',
};

function handleSipStatus(ev) {
  const label = SIP_STATUS_LABELS[ev.state] || ev.state;
  sipStatusEl.textContent = `स्थिति: ${label} — ${ev.message}`;
  sipStatusEl.classList.toggle('error', ev.state === 'error');
}

function handleSipCall(ev) {
  if (ev.state === 'ringing') {
    appendSipLog(`📞 रिङ: ${ev.from}`, 'info');
  } else if (ev.state === 'connected') {
    appendSipLog(`✅ जडान भयो: ${ev.from}`, 'info');
    sipBubbles.user = null;
    sipBubbles.bot = null;
  } else if (ev.state === 'ended') {
    appendSipLog(`📴 समाप्त (${ev.reason}, ${ev.duration ?? 0}s)`, 'info');
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
  sipFormStatus.textContent = 'सुरक्षित गर्दै…';
  try {
    const data = readForm();
    const json = await postSip('/api/sip/config', data);
    applyConfigToForm(json.config);
    sipFormStatus.textContent = 'सुरक्षित गरियो।';
  } catch (err) {
    sipFormStatus.textContent = `सुरक्षित असफल: ${err.message}`;
  }
  setTimeout(() => { sipFormStatus.textContent = ''; }, 3000);
});

sipStartBtn.addEventListener('click', async (e) => {
  e.preventDefault();
  sipFormStatus.textContent = 'सुरु गर्दै…';
  try {
    const data = readForm();
    await postSip('/api/sip/config', { ...data, enabled: true });
    sipFormStatus.textContent = 'सुरु भयो।';
  } catch (err) {
    sipFormStatus.textContent = `सुरु असफल: ${err.message}`;
  }
  setTimeout(() => { sipFormStatus.textContent = ''; }, 3000);
});

sipStopBtn.addEventListener('click', async (e) => {
  e.preventDefault();
  sipFormStatus.textContent = 'बन्द गर्दै…';
  try {
    await postSip('/api/sip/stop');
    sipFormStatus.textContent = 'बन्द भयो।';
  } catch (err) {
    sipFormStatus.textContent = `बन्द असफल: ${err.message}`;
  }
  setTimeout(() => { sipFormStatus.textContent = ''; }, 3000);
});

sipTestBtn.addEventListener('click', async (e) => {
  e.preventDefault();
  sipFormStatus.textContent = 'Test PBX…';
  try {
    const result = await postSip('/api/sip/test');
    if (result.ok) {
      sipFormStatus.textContent = `Test PBX: ${result.status} in ${result.ms}ms`;
    } else {
      sipFormStatus.textContent = `Test PBX failed: ${result.error || result.status} (${result.ms}ms)`;
    }
  } catch (err) {
    sipFormStatus.textContent = `Test PBX failed: ${err.message}`;
  }
  setTimeout(() => { sipFormStatus.textContent = ''; }, 6000);
});

savePromptSipBtn.addEventListener('click', async () => {
  promptStatusEl.textContent = 'SIP मा सुरक्षित गर्दै…';
  try {
    await postSip('/api/sip/config', { instructions: getSystemPrompt() });
    promptStatusEl.textContent = 'SIP प्रम्प्ट सुरक्षित गरियो।';
  } catch (err) {
    promptStatusEl.textContent = `सुरक्षित असफल: ${err.message}`;
  }
  setTimeout(() => { promptStatusEl.textContent = ''; }, 3000);
});

loadSipConfig();
startSseStream();

window.addEventListener('beforeunload', cleanup);
