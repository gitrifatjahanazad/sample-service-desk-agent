import { EventEmitter } from 'node:events';

class SipEventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100);
    this.lastStatus = { kind: 'status', state: 'stopped', message: 'Stopped' };
  }

  status(state, message) {
    this.lastStatus = { kind: 'status', state, message: message || state };
    this.emit('event', this.lastStatus);
  }

  log(level, message) {
    this.emit('event', { kind: 'log', level, message, ts: Date.now() });
  }

  call(state, info = {}) {
    this.emit('event', { kind: 'call', state, ...info, ts: Date.now() });
  }

  transcript(role, text, partial = false) {
    this.emit('event', { kind: 'transcript', role, text, partial, ts: Date.now() });
  }
}

export const bus = new SipEventBus();
