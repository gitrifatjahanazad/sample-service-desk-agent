import WebSocket from 'ws';
import { EventEmitter } from 'node:events';

const MODEL = 'gpt-realtime-1.5';
const REALTIME_URL = `wss://api.openai.com/v1/realtime?model=${MODEL}`;

export class OpenAIBridge extends EventEmitter {
  constructor({ apiKey, instructions }) {
    super();
    this.apiKey = apiKey;
    this.instructions = instructions;
    this.ws = null;
    this.ready = false;
    this.closed = false;
    this.audioDeltaCount = 0;
    this.audioBytes = 0;
    this.greetingSent = false;
    this.eventTypeSeen = new Set();
  }

  connect() {
    this.ws = new WebSocket(REALTIME_URL, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    });

    this.ws.on('open', () => {
      this.#sendSessionUpdate();
    });

    this.ws.on('message', (data) => {
      let ev;
      try { ev = JSON.parse(data.toString()); } catch { return; }
      this.#handleEvent(ev);
    });

    this.ws.on('error', (err) => this.emit('error', err));

    this.ws.on('close', () => {
      this.ready = false;
      this.emit('log', `OpenAI WS closed — audio deltas: ${this.audioDeltaCount}, bytes: ${this.audioBytes}`);
      this.emit('close');
    });
  }

  #sendSessionUpdate() {
    const session = {
      type: 'realtime',
      model: MODEL,
      instructions: this.instructions,
      output_modalities: ['audio'],
      audio: {
        input: {
          format: { type: 'audio/pcmu' },
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
          format: { type: 'audio/pcmu' },
          voice: 'cedar',
        },
      },
    };
    this.#send({ type: 'session.update', session });
  }

  #requestGreeting() {
    // Kick off a Bangla greeting so the caller hears something on pickup.
    this.#send({
      type: 'response.create',
      response: {
        instructions: 'সংক্ষিপ্ত বাংলায় গ্রাহককে অভিবাদন জানান এবং কীভাবে সাহায্য করতে পারেন জিজ্ঞেস করুন।',
      },
    });
  }

  sendAudio(pcmuBuffer) {
    if (!this.ready || this.closed) return;
    this.#send({
      type: 'input_audio_buffer.append',
      audio: pcmuBuffer.toString('base64'),
    });
  }

  #handleEvent(ev) {
    // Surface every new event type once so we can see what the API actually sends.
    if (!this.eventTypeSeen.has(ev.type)) {
      this.eventTypeSeen.add(ev.type);
      this.emit('log', `event seen: ${ev.type}`);
    }
    switch (ev.type) {
      case 'session.updated':
        // Now safe to ask for the greeting — output format/voice are applied.
        this.ready = true;
        this.emit('ready');
        if (!this.greetingSent) {
          this.greetingSent = true;
          this.#requestGreeting();
        }
        break;
      case 'response.output_audio.delta':
      case 'response.audio.delta': {
        if (ev.delta) {
          const buf = Buffer.from(ev.delta, 'base64');
          this.audioDeltaCount += 1;
          this.audioBytes += buf.length;
          this.emit('audio', buf);
        }
        break;
      }
      case 'response.output_audio.done':
      case 'response.audio.done':
        this.emit('audio_done');
        break;
      case 'response.audio_transcript.delta':
      case 'response.output_audio_transcript.delta':
        if (ev.delta) this.emit('transcript', { role: 'bot', text: ev.delta, partial: true });
        break;
      case 'response.audio_transcript.done':
      case 'response.output_audio_transcript.done':
        if (ev.transcript) this.emit('transcript', { role: 'bot', text: ev.transcript, partial: false });
        break;
      case 'conversation.item.input_audio_transcription.delta':
        if (ev.delta) this.emit('transcript', { role: 'user', text: ev.delta, partial: true });
        break;
      case 'conversation.item.input_audio_transcription.completed':
        if (ev.transcript) this.emit('transcript', { role: 'user', text: ev.transcript, partial: false });
        break;
      case 'error':
        this.emit('error', new Error(ev.error?.message || JSON.stringify(ev.error)));
        break;
    }
  }

  #send(obj) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(obj));
    }
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    try { this.ws?.close(); } catch {}
    this.ws = null;
  }
}
