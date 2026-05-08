import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig, saveConfig, redactConfig, mergeIncoming } from './lib/sip-config.js';
import { startSip, stopSip, getStatus as getSipStatus, pingPbx } from './lib/sip-ua.js';
import { bus } from './lib/sip-events.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json({ limit: '256kb' }));
app.use(express.static(path.join(__dirname, 'public')));

const MODEL = 'gpt-realtime-1.5';

app.post('/api/session', async (_req, res) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OPENAI_API_KEY missing in .env' });
  }

  const body = JSON.stringify({
    session: { type: 'realtime', model: MODEL },
  });

  // Try the GA endpoint first; fall back to the legacy beta one if 404.
  // GA endpoint MUST NOT include the OpenAI-Beta header; legacy beta endpoint requires it.
  const endpoints = [
    { url: 'https://api.openai.com/v1/realtime/client_secrets', beta: false },
    { url: 'https://api.openai.com/v1/realtime/sessions', beta: true },
  ];

  for (const { url, beta } of endpoints) {
    try {
      const headers = {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      };
      if (beta) headers['OpenAI-Beta'] = 'realtime=v1';
      const r = await fetch(url, { method: 'POST', headers, body });

      const text = await r.text();
      if (r.ok) {
        res.type('application/json').send(text);
        return;
      }
      if (r.status !== 404) {
        return res.status(r.status).type('application/json').send(text);
      }
    } catch (err) {
      return res.status(502).json({ error: String(err) });
    }
  }

  res.status(404).json({ error: 'No realtime session endpoint reachable' });
});

app.get('/api/sip/config', async (_req, res) => {
  try {
    const cfg = await loadConfig();
    res.json({ config: redactConfig(cfg), status: getSipStatus() });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.post('/api/sip/config', async (req, res) => {
  try {
    const current = await loadConfig();
    const next = mergeIncoming(current, req.body || {});
    const saved = await saveConfig(next);
    if (saved.enabled) {
      try {
        await startSip(saved);
      } catch (err) {
        return res.status(500).json({ error: String(err), config: redactConfig(saved) });
      }
    } else {
      await stopSip();
    }
    res.json({ config: redactConfig(saved), status: getSipStatus() });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.post('/api/sip/start', async (_req, res) => {
  try {
    const cfg = await loadConfig();
    const saved = await saveConfig({ ...cfg, enabled: true });
    await startSip(saved);
    res.json({ config: redactConfig(saved), status: getSipStatus() });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.post('/api/sip/test', async (_req, res) => {
  try {
    const result = await pingPbx();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.post('/api/sip/stop', async (_req, res) => {
  try {
    const cfg = await loadConfig();
    const saved = await saveConfig({ ...cfg, enabled: false });
    await stopSip();
    res.json({ config: redactConfig(saved), status: getSipStatus() });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.get('/api/sip/events', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders?.();
  const send = (ev) => {
    res.write(`data: ${JSON.stringify(ev)}\n\n`);
  };
  // Replay last status so the UI knows current state on connect.
  send(bus.lastStatus);
  bus.on('event', send);
  const heartbeat = setInterval(() => res.write(': ping\n\n'), 25_000);
  req.on('close', () => {
    clearInterval(heartbeat);
    bus.off('event', send);
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`bangla service desk listening on http://localhost:${PORT}`);
  try {
    const cfg = await loadConfig();
    if (cfg.enabled && cfg.sipServer && cfg.username && cfg.password) {
      await startSip(cfg);
    }
  } catch (err) {
    console.error('SIP autostart failed:', err.message);
  }
});
