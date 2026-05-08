import fs from 'node:fs';
import path from 'node:path';

const ULAW_TO_PCM16 = (() => {
  const table = new Int16Array(256);
  for (let i = 0; i < 256; i++) {
    const u = ~i & 0xff;
    const sign = u & 0x80;
    const exponent = (u >> 4) & 0x07;
    const mantissa = u & 0x0f;
    let sample = ((mantissa << 3) + 0x84) << exponent;
    sample -= 0x84;
    table[i] = sign ? -sample : sample;
  }
  return table;
})();

export class WavWriter {
  constructor(filePath, sampleRate = 8000) {
    this.filePath = filePath;
    this.sampleRate = sampleRate;
    this.dataBytes = 0;
    this.closed = false;
    this.stream = null;
  }

  async open() {
    await fs.promises.mkdir(path.dirname(this.filePath), { recursive: true });
    this.stream = fs.createWriteStream(this.filePath);
    // Reserve 44 bytes for the header — patched on close().
    this.stream.write(Buffer.alloc(44));
  }

  writeUlaw(ulawBuf) {
    if (this.closed || !this.stream || !ulawBuf?.length) return;
    const pcm = Buffer.allocUnsafe(ulawBuf.length * 2);
    for (let i = 0; i < ulawBuf.length; i++) {
      pcm.writeInt16LE(ULAW_TO_PCM16[ulawBuf[i]], i * 2);
    }
    this.stream.write(pcm);
    this.dataBytes += pcm.length;
  }

  async close() {
    if (this.closed) return;
    this.closed = true;
    if (!this.stream) return;
    await new Promise((resolve) => this.stream.end(resolve));
    if (this.dataBytes === 0) return;
    const fd = await fs.promises.open(this.filePath, 'r+');
    try {
      await fd.write(this.#buildHeader(), 0, 44, 0);
    } finally {
      await fd.close();
    }
  }

  #buildHeader() {
    const buf = Buffer.alloc(44);
    buf.write('RIFF', 0);
    buf.writeUInt32LE(36 + this.dataBytes, 4);
    buf.write('WAVE', 8);
    buf.write('fmt ', 12);
    buf.writeUInt32LE(16, 16);                  // fmt chunk size
    buf.writeUInt16LE(1, 20);                   // PCM
    buf.writeUInt16LE(1, 22);                   // mono
    buf.writeUInt32LE(this.sampleRate, 24);
    buf.writeUInt32LE(this.sampleRate * 2, 28); // byte rate
    buf.writeUInt16LE(2, 32);                   // block align
    buf.writeUInt16LE(16, 34);                  // bits per sample
    buf.write('data', 36);
    buf.writeUInt32LE(this.dataBytes, 40);
    return buf;
  }
}
