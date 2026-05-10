import dgram from 'node:dgram';
import { EventEmitter } from 'node:events';
import crypto from 'node:crypto';

const PCMU_PAYLOAD_TYPE = 0;
const FRAME_BYTES = 160;       // 20 ms at 8 kHz μ-law
const FRAME_INTERVAL_MS = 20;
const SILENCE_BYTE = 0xff;     // μ-law silence
// Hold a partial (<160 byte) tail this many ticks waiting for more deltas before
// flushing it padded with silence. 5 ticks ≈ 100 ms grace covers normal jitter
// in OpenAI delta arrival without injecting silence mid-utterance.
const PARTIAL_HOLD_TICKS = 5;

export class RtpSession extends EventEmitter {
  constructor() {
    super();
    this.socket = null;
    this.localPort = 0;
    this.remoteHost = null;
    this.remotePort = 0;
    this.seq = Math.floor(Math.random() * 0xffff);
    this.timestamp = Math.floor(Math.random() * 0xffffffff);
    this.ssrc = crypto.randomBytes(4).readUInt32BE(0);
    this.outQueue = Buffer.alloc(0);
    this.partialIdleTicks = 0;
    this.pacer = null;
    this.closed = false;
    this.stats = {
      ticks: 0,
      drainFrames: 0,        // ticks that drained a full 160 B frame from queue
      silenceFrames: 0,      // ticks with empty queue → pure silence emitted
      holdFrames: 0,         // ticks holding a partial in queue, silence emitted
      tailFlushes: 0,        // ticks that pad-flushed a stuck partial tail
      severeDrifts: 0,       // pacer baseline resets (>50 ms behind)
      maxAbsDriftMs: 0,      // max |actualFire - targetFire| across ticks
      maxIntervalMs: 0,
      minIntervalMs: Infinity,
      sumIntervalMs: 0,
      intervalSamples: 0,
      maxQueueBytes: 0,
      sumQueueBytes: 0,
      queueSamples: 0,
      enqueues: 0,
      enqueueBytes: 0,
      enqueueMinSize: Infinity,
      enqueueMaxSize: 0,
      enqueueMinGapMs: Infinity,
      enqueueMaxGapMs: 0,
      enqueueSumGapMs: 0,
      enqueueGapSamples: 0,
      lastEnqueueNs: 0n,
      lastTickFireNs: 0n,
    };
  }

  async open() {
    return new Promise((resolve, reject) => {
      const sock = dgram.createSocket('udp4');
      sock.once('error', reject);
      sock.bind(0, '0.0.0.0', () => {
        sock.removeListener('error', reject);
        this.socket = sock;
        this.localPort = sock.address().port;
        sock.on('message', (msg) => this.#onPacket(msg));
        sock.on('error', (err) => this.emit('error', err));
        resolve(this.localPort);
      });
    });
  }

  setRemote(host, port) {
    this.remoteHost = host;
    this.remotePort = port;
  }

  startPacer() {
    if (this.pacer || this.closed) return;
    // Self-clocking pacer with absolute-deadline drift correction. setInterval
    // alone drifts on Windows (default 15.625 ms timer resolution) so the
    // average outbound rate slips off 8 kHz and the receiver's jitter buffer
    // gradually under/overruns. Computing the next setTimeout against an
    // absolute target time locks the long-run cadence to 20 ms even though any
    // individual tick still has OS-quantum jitter.
    let nextTickNs = process.hrtime.bigint();
    const intervalNs = BigInt(FRAME_INTERVAL_MS) * 1_000_000n;
    const tick = () => {
      if (this.closed) return;
      const fireNs = process.hrtime.bigint();
      const s = this.stats;
      // Drift = how far off this tick fired vs its absolute target deadline.
      const driftMs = Math.abs(Number(fireNs - nextTickNs) / 1_000_000);
      if (driftMs > s.maxAbsDriftMs) s.maxAbsDriftMs = driftMs;
      // Interval = wall-clock gap since the previous tick fire (skip first).
      if (s.lastTickFireNs > 0n) {
        const intervalMs = Number(fireNs - s.lastTickFireNs) / 1_000_000;
        if (intervalMs > s.maxIntervalMs) s.maxIntervalMs = intervalMs;
        if (intervalMs < s.minIntervalMs) s.minIntervalMs = intervalMs;
        s.sumIntervalMs += intervalMs;
        s.intervalSamples += 1;
      }
      s.lastTickFireNs = fireNs;

      this.#tick();

      nextTickNs += intervalNs;
      const nowNs = process.hrtime.bigint();
      let delay;
      if (nowNs - nextTickNs > 50_000_000n) {
        // >50 ms behind — likely an event-loop stall. Reset the baseline
        // rather than burst-sending catch-up frames into the receiver.
        s.severeDrifts += 1;
        nextTickNs = nowNs + intervalNs;
        delay = FRAME_INTERVAL_MS;
      } else if (nextTickNs > nowNs) {
        delay = Number(nextTickNs - nowNs) / 1_000_000;
      } else {
        delay = 0;
      }
      this.pacer = setTimeout(tick, delay);
    };
    this.pacer = setTimeout(tick, 0);
  }

  enqueueAudio(payload) {
    if (this.closed || !payload?.length) return;
    this.outQueue = Buffer.concat([this.outQueue, payload]);
    this.partialIdleTicks = 0;
    const s = this.stats;
    s.enqueues += 1;
    s.enqueueBytes += payload.length;
    if (payload.length < s.enqueueMinSize) s.enqueueMinSize = payload.length;
    if (payload.length > s.enqueueMaxSize) s.enqueueMaxSize = payload.length;
    const nowNs = process.hrtime.bigint();
    if (s.lastEnqueueNs > 0n) {
      const gapMs = Number(nowNs - s.lastEnqueueNs) / 1_000_000;
      if (gapMs < s.enqueueMinGapMs) s.enqueueMinGapMs = gapMs;
      if (gapMs > s.enqueueMaxGapMs) s.enqueueMaxGapMs = gapMs;
      s.enqueueSumGapMs += gapMs;
      s.enqueueGapSamples += 1;
    }
    s.lastEnqueueNs = nowNs;
  }

  clearOutgoing() {
    this.outQueue = Buffer.alloc(0);
    this.partialIdleTicks = 0;
  }

  hasOutgoingQueued() {
    return this.outQueue.length > 0;
  }

  #tick() {
    if (this.closed || !this.remoteHost) return;
    const s = this.stats;
    s.ticks += 1;
    const qLen = this.outQueue.length;
    if (qLen > s.maxQueueBytes) s.maxQueueBytes = qLen;
    s.sumQueueBytes += qLen;
    s.queueSamples += 1;
    let frame;
    if (qLen >= FRAME_BYTES) {
      frame = this.outQueue.subarray(0, FRAME_BYTES);
      this.outQueue = this.outQueue.subarray(FRAME_BYTES);
      this.partialIdleTicks = 0;
      s.drainFrames += 1;
    } else if (qLen > 0 && this.partialIdleTicks < PARTIAL_HOLD_TICKS) {
      // Hold the partial bytes — emit pure silence and wait for the next delta
      // to combine with them. Padding mid-utterance would inject silence inside
      // the audio waveform and click on every non-160-aligned delta boundary.
      this.partialIdleTicks += 1;
      frame = Buffer.alloc(FRAME_BYTES, SILENCE_BYTE);
      s.holdFrames += 1;
    } else if (qLen > 0) {
      // Producer has been idle past the hold window — flush the residual tail
      // padded with silence so it doesn't leak into the next utterance.
      frame = Buffer.alloc(FRAME_BYTES, SILENCE_BYTE);
      this.outQueue.copy(frame, 0);
      this.outQueue = Buffer.alloc(0);
      this.partialIdleTicks = 0;
      s.tailFlushes += 1;
    } else {
      // no audio queued — emit silence so RTP timing stays continuous (helps PBX NAT pinhole)
      frame = Buffer.alloc(FRAME_BYTES, SILENCE_BYTE);
      s.silenceFrames += 1;
    }
    this.#sendFrame(frame);
  }

  #sendFrame(payload) {
    const header = Buffer.alloc(12);
    header[0] = 0x80; // V=2, P=0, X=0, CC=0
    header[1] = PCMU_PAYLOAD_TYPE & 0x7f;
    header.writeUInt16BE(this.seq & 0xffff, 2);
    header.writeUInt32BE(this.timestamp >>> 0, 4);
    header.writeUInt32BE(this.ssrc >>> 0, 8);
    const pkt = Buffer.concat([header, payload]);
    this.socket?.send(pkt, this.remotePort, this.remoteHost, (err) => {
      if (err) this.emit('error', err);
    });
    this.seq = (this.seq + 1) & 0xffff;
    this.timestamp = (this.timestamp + FRAME_BYTES) >>> 0;
  }

  #onPacket(msg) {
    if (msg.length < 12) return;
    const version = (msg[0] >> 6) & 0x3;
    if (version !== 2) return;
    const cc = msg[0] & 0x0f;
    const hasExt = (msg[0] & 0x10) !== 0;
    let headerLen = 12 + cc * 4;
    if (hasExt) {
      if (msg.length < headerLen + 4) return;
      const extLen = msg.readUInt16BE(headerLen + 2);
      headerLen += 4 + extLen * 4;
    }
    const payloadType = msg[1] & 0x7f;
    if (payloadType !== PCMU_PAYLOAD_TYPE) return;
    const payload = msg.subarray(headerLen);
    if (payload.length > 0) this.emit('audio', payload);
  }

  formatStats() {
    const s = this.stats;
    const pct = (n) => (s.ticks ? ((n / s.ticks) * 100).toFixed(1) : '0.0');
    const fix = (v, d = 2) => (typeof v === 'number' && Number.isFinite(v) ? v.toFixed(d) : 'n/a');
    const avgInterval = s.intervalSamples ? s.sumIntervalMs / s.intervalSamples : 0;
    const avgQueueB = s.queueSamples ? s.sumQueueBytes / s.queueSamples : 0;
    // 8 bytes of μ-law = 1 ms of audio at 8 kHz, so depth-in-ms = bytes / 8.
    const maxQueueMs = s.maxQueueBytes / 8;
    const avgQueueMs = avgQueueB / 8;
    const lines = [
      `RTP pacer: ticks=${s.ticks} drain=${pct(s.drainFrames)}% silence=${pct(s.silenceFrames)}% hold=${pct(s.holdFrames)}% flush=${s.tailFlushes}, interval avg=${fix(avgInterval)}ms (min=${fix(s.minIntervalMs === Infinity ? 0 : s.minIntervalMs)} max=${fix(s.maxIntervalMs)}), maxDrift=${fix(s.maxAbsDriftMs)}ms, severe=${s.severeDrifts}`,
      `RTP queue: maxDepth=${s.maxQueueBytes}B (~${fix(maxQueueMs, 0)}ms), avgDepth=${fix(avgQueueB, 0)}B (~${fix(avgQueueMs, 0)}ms)`,
    ];
    if (s.enqueues > 0) {
      const avgSize = s.enqueueBytes / s.enqueues;
      const avgGap = s.enqueueGapSamples ? s.enqueueSumGapMs / s.enqueueGapSamples : 0;
      const minGap = s.enqueueGapSamples ? s.enqueueMinGapMs : 0;
      lines.push(
        `OpenAI deltas: count=${s.enqueues} total=${s.enqueueBytes}B, size avg=${fix(avgSize, 0)}B (min=${s.enqueueMinSize === Infinity ? 0 : s.enqueueMinSize} max=${s.enqueueMaxSize}), gap avg=${fix(avgGap)}ms (min=${fix(minGap)} max=${fix(s.enqueueMaxGapMs)})`
      );
    } else {
      lines.push('OpenAI deltas: none');
    }
    return lines;
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    if (this.pacer) {
      clearTimeout(this.pacer);
      this.pacer = null;
    }
    try { this.socket?.close(); } catch {}
    this.socket = null;
  }
}
