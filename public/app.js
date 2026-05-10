const MODEL = 'gpt-realtime-1.5';

const DEFAULT_SYSTEM_PROMPT = `
คุณคือเจ้าหน้าที่ Help Desk ของระบบ ERP (Enterprise Resource Planning) ที่สุภาพ ใจเย็น และเป็นมืออาชีพ พูดภาษาไทยมาตรฐานเท่านั้น ให้บริการผู้ใช้งานทั้งภายในและภายนอกองค์กรผ่านทางโทรศัพท์

บทบาท:

* ช่วยผู้ใช้งานเกี่ยวกับโมดูลต่าง ๆ ของระบบ ERP เช่น ฝ่ายขาย (Sales Order, ใบเสนอราคา, ใบกำกับภาษี), จัดซื้อ (Purchase Order, ผู้ขาย/Vendor), คลังสินค้า (Inventory, สต็อก, การโอนย้าย), บัญชี (GL, AP, AR, การกระทบยอด), การเงิน, ทรัพยากรบุคคล (HR, เงินเดือน, การเข้างาน), การผลิต (BOM, Work Order) และรายงาน
* ช่วยแก้ปัญหาทั่วไป เช่น เข้าระบบไม่ได้, ลืมรหัสผ่าน, สิทธิ์การเข้าถึงไม่ครบ, รายงานไม่ออก, ตัวเลขในงบไม่ตรง, การปิดงวด, การตั้งค่าผู้ใช้
* คุณช่วยเฉพาะเรื่องที่เกี่ยวกับระบบ ERP เท่านั้น หากผู้ใช้ถามเรื่องอื่น ให้ดึงกลับมาที่เรื่อง ERP อย่างสุภาพ

ภาษาและสำเนียง:

* ตอบเป็นภาษาไทยมาตรฐานเสมอ ใช้คำสุภาพ ลงท้ายด้วย ครับ/ค่ะ อย่างเหมาะสม (ใช้ "ค่ะ" เป็นค่าเริ่มต้น)
* ใช้ภาษาพูดที่เป็นธรรมชาติ ฟังง่าย ไม่เป็นทางการเกินไปและไม่หยาบ
* คำเรียกผู้ใช้: "คุณลูกค้า" หรือ "พี่" ตามความเหมาะสม
* คำที่ใช้ได้บ่อย: "สวัสดีค่ะ", "ยินดีให้บริการค่ะ", "รบกวนสอบถามนิดนึงนะคะ", "เข้าใจแล้วค่ะ", "ได้เลยค่ะ", "ขอตรวจสอบให้นะคะ"
* ห้ามใช้ภาษาทางการมากเกินไป หรือศัพท์เทคนิคที่ผู้ใช้ทั่วไปไม่เข้าใจ

รูปแบบการตอบ:

* ตอบสั้น กระชับ และเข้าใจง่าย เน้นการแก้ปัญหาให้ผู้ใช้ได้จริง
* ถามคำถามสั้น ๆ เพื่อทำความเข้าใจปัญหาก่อน เช่น ใช้โมดูลอะไร, เห็นข้อความ error อะไร, เลขเอกสารอะไร
* หากไม่แน่ใจ อย่าเดา ให้บอกตรง ๆ ว่าจะตรวจสอบเพิ่มเติม หรือแนะนำให้ติดต่อทีมเทคนิคหรือผู้ดูแลระบบ
* หากเป็นเรื่องที่ต้องแก้ไขในระบบจริง (เช่น สิทธิ์, master data, การปิดงวด) ให้แจ้งว่าจะส่งเรื่องต่อให้ทีมที่เกี่ยวข้อง

บุคลิกและน้ำเสียง:

* สุภาพ ใจเย็น อบอุ่น และมั่นใจเหมือนเจ้าหน้าที่คอลเซ็นเตอร์มืออาชีพ
* หากผู้ใช้หงุดหงิดหรือเดือดร้อน ให้ใช้น้ำเสียงเห็นอกเห็นใจและขอโทษอย่างเหมาะสม
* เมื่อให้คำแนะนำที่ช่วยผู้ใช้ได้ ให้น้ำเสียงเชิงบวกและให้กำลังใจ

จังหวะและการหยุด:

* พูดด้วยความเร็วปานกลาง ไม่เร็วเกินไป
* ข้อมูลสำคัญ เช่น เลขเอกสาร, รหัสผู้ใช้, จำนวนเงิน, วันที่, ขั้นตอนการกดเมนู ให้พูดช้า ๆ ชัด ๆ
* เว้นจังหวะระหว่างขั้นตอนเพื่อให้ผู้ใช้ตามทัน

การออกเสียง:

* ใช้การออกเสียงไทยมาตรฐาน
* ศัพท์อังกฤษทางเทคนิคให้ออกเสียงตามที่คนไทยใช้กันทั่วไป เช่น
  * "ERP" → "อี-อาร์-พี"
  * "PO" → "พี-โอ", "SO" → "เอส-โอ", "GL" → "จี-แอล", "AR" → "เอ-อาร์", "AP" → "เอ-พี"
  * "Invoice" → "อินวอยซ์"
  * "Login" → "ล็อกอิน", "Password" → "พาสเวิร์ด"
  * "Stock" → "สต็อก", "Report" → "รีพอร์ต"

การเน้นเสียง:

* เน้นเสียงให้ชัดเจนเป็นพิเศษเมื่อพูดถึงเลขเอกสาร, รหัสผู้ใช้, จำนวนเงิน, วันที่, และชื่อเมนูในระบบ

แนวทางเพิ่มเติม:

* ใช้คำศัพท์อังกฤษบางคำได้เป็นปกติเมื่อจำเป็น แต่ภาษาหลักต้องเป็นภาษาไทย
* พูดเสมือนเป็นเจ้าหน้าที่ Help Desk ของระบบ ERP จริงที่กำลังคุยกับผู้ใช้งานทางโทรศัพท์
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
          language: 'th',
          prompt: 'บทสนทนาภาษาไทยเกี่ยวกับระบบ ERP อาจมีคำเช่น Sales Order, Purchase Order, Invoice, Inventory, สต็อก, GL, AP, AR, BOM, Work Order, รายงาน, ปิดงวด, ล็อกอิน, รหัสผ่าน, สิทธิ์ผู้ใช้',
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
  setStatus('กำลังเชื่อมต่อ…');
  connectBtn.disabled = true;

  let ephemeralKey;
  try {
    ephemeralKey = await fetchEphemeralKey();
  } catch (err) {
    setStatus(`ขอ token ไม่สำเร็จ: ${err.message}`, true);
    connectBtn.disabled = false;
    return;
  }

  pc = new RTCPeerConnection();

  pc.ontrack = (e) => {
    remoteAudio.srcObject = e.streams[0];
  };

  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
      setStatus(`การเชื่อมต่อ ${pc.connectionState}`, true);
    }
  };

  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err) {
    setStatus('ไม่ได้รับสิทธิ์เข้าถึงไมโครโฟน', true);
    cleanup();
    return;
  }

  for (const track of micStream.getTracks()) {
    micSender = pc.addTrack(track, micStream);
  }

  dc = pc.createDataChannel('oai-events');
  dc.onopen = () => {
    sendEvent(buildSessionUpdate(vadToggle.checked));
    setStatus(vadToggle.checked ? 'กำลังฟัง…' : 'กดค้างเพื่อพูด');
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
  connectBtn.textContent = 'ตัดการเชื่อมต่อ';
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
  connectBtn.textContent = 'เชื่อมต่อ';
  connectBtn.disabled = false;
  talkBtn.disabled = true;
  talkBtn.classList.remove('active');
}

function disconnect() {
  cleanup();
  setStatus('ตัดการเชื่อมต่อแล้ว');
}

function handleEvent(ev) {
  switch (ev.type) {
    case 'input_audio_buffer.speech_started':
      pendingUserBubble = addBubble('user', '…', true);
      setStatus('กำลังฟัง…');
      break;

    case 'input_audio_buffer.speech_stopped':
      setStatus('กำลังตอบ…');
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
      setStatus(vadToggle.checked ? 'กำลังฟัง…' : 'กดค้างเพื่อพูด');
      break;

    case 'error':
      setStatus(`ข้อผิดพลาด: ${ev.error?.message || JSON.stringify(ev.error)}`, true);
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
  setStatus(vadToggle.checked ? 'กำลังฟัง…' : 'กดค้างเพื่อพูด');
});

function startTalk() {
  if (!connected || vadToggle.checked) return;
  talkBtn.classList.add('active');
  setMicEnabled(true);
  setStatus('กำลังฟัง…');
}

function stopTalk() {
  if (!connected || vadToggle.checked) return;
  if (!talkBtn.classList.contains('active')) return;
  talkBtn.classList.remove('active');
  setMicEnabled(false);
  sendEvent({ type: 'input_audio_buffer.commit' });
  sendEvent({ type: 'response.create' });
  setStatus('กำลังตอบ…');
}

talkBtn.addEventListener('mousedown', startTalk);
talkBtn.addEventListener('mouseup', stopTalk);
talkBtn.addEventListener('mouseleave', stopTalk);
talkBtn.addEventListener('touchstart', (e) => { e.preventDefault(); startTalk(); });
talkBtn.addEventListener('touchend', (e) => { e.preventDefault(); stopTalk(); });

applyPromptBtn.addEventListener('click', () => {
  if (connected) {
    sendEvent(buildSessionUpdate(vadToggle.checked));
    promptStatusEl.textContent = 'นำ prompt ไปใช้แล้ว';
  } else {
    promptStatusEl.textContent = 'จะใช้ prompt นี้เมื่อเชื่อมต่อ';
  }
  setTimeout(() => { promptStatusEl.textContent = ''; }, 2500);
});

resetPromptBtn.addEventListener('click', () => {
  promptEl.value = DEFAULT_SYSTEM_PROMPT;
  promptStatusEl.textContent = 'โหลด prompt ค่าเริ่มต้นแล้ว';
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
    sipFormStatus.textContent = `โหลดไม่สำเร็จ: ${err.message}`;
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
  stopped: 'หยุดทำงาน',
  starting: 'กำลังเริ่ม…',
  registered: 'ลงทะเบียนแล้ว',
  in_call: 'อยู่ในสาย',
  error: 'ข้อผิดพลาด',
};

function handleSipStatus(ev) {
  const label = SIP_STATUS_LABELS[ev.state] || ev.state;
  sipStatusEl.textContent = `สถานะ: ${label} — ${ev.message}`;
  sipStatusEl.classList.toggle('error', ev.state === 'error');
}

function handleSipCall(ev) {
  if (ev.state === 'ringing') {
    appendSipLog(`📞 สายเข้า: ${ev.from}`, 'info');
  } else if (ev.state === 'connected') {
    appendSipLog(`✅ เชื่อมต่อแล้ว: ${ev.from}`, 'info');
    sipBubbles.user = null;
    sipBubbles.bot = null;
  } else if (ev.state === 'ended') {
    appendSipLog(`📴 จบสาย (${ev.reason}, ${ev.duration ?? 0}s)`, 'info');
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
  sipFormStatus.textContent = 'กำลังบันทึก…';
  try {
    const data = readForm();
    const json = await postSip('/api/sip/config', data);
    applyConfigToForm(json.config);
    sipFormStatus.textContent = 'บันทึกแล้ว';
  } catch (err) {
    sipFormStatus.textContent = `บันทึกไม่สำเร็จ: ${err.message}`;
  }
  setTimeout(() => { sipFormStatus.textContent = ''; }, 3000);
});

sipStartBtn.addEventListener('click', async (e) => {
  e.preventDefault();
  sipFormStatus.textContent = 'กำลังเริ่ม…';
  try {
    const data = readForm();
    await postSip('/api/sip/config', { ...data, enabled: true });
    sipFormStatus.textContent = 'เริ่มทำงานแล้ว';
  } catch (err) {
    sipFormStatus.textContent = `เริ่มไม่สำเร็จ: ${err.message}`;
  }
  setTimeout(() => { sipFormStatus.textContent = ''; }, 3000);
});

sipStopBtn.addEventListener('click', async (e) => {
  e.preventDefault();
  sipFormStatus.textContent = 'กำลังหยุด…';
  try {
    await postSip('/api/sip/stop');
    sipFormStatus.textContent = 'หยุดแล้ว';
  } catch (err) {
    sipFormStatus.textContent = `หยุดไม่สำเร็จ: ${err.message}`;
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
  promptStatusEl.textContent = 'กำลังบันทึกไปยัง SIP…';
  try {
    await postSip('/api/sip/config', { instructions: getSystemPrompt() });
    promptStatusEl.textContent = 'บันทึก prompt ของ SIP แล้ว';
  } catch (err) {
    promptStatusEl.textContent = `บันทึกไม่สำเร็จ: ${err.message}`;
  }
  setTimeout(() => { promptStatusEl.textContent = ''; }, 3000);
});

loadSipConfig();
startSseStream();

window.addEventListener('beforeunload', cleanup);
