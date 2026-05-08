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
    this.droppedAfterCancel = 0;
    this.greetingSent = false;
    this.eventTypeSeen = new Set();
    this.currentResponseId = null;
    this.responseCancelSent = false;
    this.botSpeaking = false;
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
      this.emit('log', `OpenAI WS closed — audio deltas: ${this.audioDeltaCount}, bytes: ${this.audioBytes}, dropped: ${this.droppedAfterCancel}`);
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
          noise_reduction: { type: 'far_field' },
          transcription: {
            model: 'gpt-4o-mini-transcribe',
            language: 'bn',
            prompt: 'বাংলা ভাষায় কথোপকথন। Robi (রবি) মোবাইল অপারেটর সম্পর্কিত শব্দ যেমন রিচার্জ, ইন্টারনেট প্যাকেজ, MB, GB, MNP, FnF, USSD, কাস্টমার কেয়ার (১২১) থাকতে পারে।',
          },
          turn_detection: {
            type: 'server_vad',
            threshold: 0.5,
            prefix_padding_ms: 200,
            silence_duration_ms: 500,
            create_response: true,
            interrupt_response: true,
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

  /**
   * Trigger interrupt locally — used by sip-ua's energy-based barge-in detector
   * when it sees sustained caller speech but OpenAI's VAD hasn't fired
   * `speech_started` yet (e.g., narrowband telephony with low VAD confidence).
   * Idempotent per response via `responseCancelSent`.
   */
  cancelActive(reason = 'local_barge_in') {
    if (!this.currentResponseId || this.responseCancelSent || this.closed) return;
    this.responseCancelSent = true;
    this.#send({ type: 'response.cancel', response_id: this.currentResponseId });
    this.emit('flush_output');
    this.emit('log', `cancelActive(${reason}) — response.cancel + flush for ${this.currentResponseId}`);
  }

  #handleTurnLifecycle(ev) {
    switch (ev.type) {
      case 'session.updated':
        this.ready = true;
        this.emit('ready');
        if (!this.greetingSent) {
          this.greetingSent = true;
          this.#requestGreeting();
        }
        return true;
      case 'response.created':
        if (this.currentResponseId) this.emit('flush_output');
        this.currentResponseId = ev.response?.id || null;
        this.responseCancelSent = false;
        this.botSpeaking = true;
        return true;
      case 'response.done':
        if (ev.response?.status && ev.response.status !== 'completed') {
          this.emit('flush_output');
        }
        this.currentResponseId = null;
        this.responseCancelSent = false;
        this.botSpeaking = false;
        return true;
      case 'response.cancelled':
        this.emit('flush_output');
        this.currentResponseId = null;
        this.responseCancelSent = false;
        this.botSpeaking = false;
        return true;
      case 'input_audio_buffer.speech_started':
        if (this.currentResponseId && !this.responseCancelSent) {
          this.responseCancelSent = true;
          this.#send({ type: 'response.cancel', response_id: this.currentResponseId });
          // Flush the local RTP queue immediately — don't wait for the cancellation
          // round-trip. The responseCancelSent flag makes this one-shot per response,
          // so noise-driven repeat speech_started events can't churn the queue.
          this.emit('flush_output');
          this.emit('log', `speech_started: response.cancel + flush for ${this.currentResponseId}`);
        }
        return true;
      default:
        return false;
    }
  }

  #handleEvent(ev) {
    // Surface every new event type once so we can see what the API actually sends.
    if (!this.eventTypeSeen.has(ev.type)) {
      this.eventTypeSeen.add(ev.type);
      this.emit('log', `event seen: ${ev.type}`);
    }
    if (this.#handleTurnLifecycle(ev)) return;
    switch (ev.type) {
      case 'response.output_audio.delta':
      case 'response.audio.delta': {
        if (!ev.delta) break;
        const buf = Buffer.from(ev.delta, 'base64');
        // Discard any deltas that arrive after we've sent response.cancel for the
        // current response — they were already in flight and would re-fill the
        // freshly cleared RTP queue, causing the bot to "resume after silence."
        if (this.responseCancelSent) {
          this.droppedAfterCancel += buf.length;
          break;
        }
        this.audioDeltaCount += 1;
        this.audioBytes += buf.length;
        this.emit('audio', buf);
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
