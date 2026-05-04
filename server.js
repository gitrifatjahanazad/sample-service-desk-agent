import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json());
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`bangla service desk listening on http://localhost:${PORT}`);
});
