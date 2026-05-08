import dgram from 'node:dgram';
import { EventEmitter } from 'node:events';
import crypto from 'node:crypto';

const PCMU_PAYLOAD_TYPE = 0;
const FRAME_BYTES = 160;       // 20 ms at 8 kHz μ-law
const FRAME_INTERVAL_MS = 20;
const SILENCE_BYTE = 0xff;     // μ-law silence

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
    this.pacer = null;
    this.closed = false;
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
    this.pacer = setInterval(() => this.#tick(), FRAME_INTERVAL_MS);
  }

  enqueueAudio(payload) {
    if (this.closed || !payload?.length) return;
    this.outQueue = Buffer.concat([this.outQueue, payload]);
  }

  clearOutgoing() {
    this.outQueue = Buffer.alloc(0);
  }

  hasOutgoingQueued() {
    return this.outQueue.length > 0;
  }

  #tick() {
    if (this.closed || !this.remoteHost) return;
    let frame;
    if (this.outQueue.length >= FRAME_BYTES) {
      frame = this.outQueue.subarray(0, FRAME_BYTES);
      this.outQueue = this.outQueue.subarray(FRAME_BYTES);
    } else if (this.outQueue.length > 0) {
      // partial frame — pad with silence
      frame = Buffer.alloc(FRAME_BYTES, SILENCE_BYTE);
      this.outQueue.copy(frame, 0);
      this.outQueue = Buffer.alloc(0);
    } else {
      // no audio queued — emit silence so RTP timing stays continuous (helps PBX NAT pinhole)
      frame = Buffer.alloc(FRAME_BYTES, SILENCE_BYTE);
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

  close() {
    if (this.closed) return;
    this.closed = true;
    if (this.pacer) {
      clearInterval(this.pacer);
      this.pacer = null;
    }
    try { this.socket?.close(); } catch {}
    this.socket = null;
  }
}
