# Thai ERP Help-Desk Voice Agent

A minimal browser-based voice agent that speaks and listens in Thai, built on the OpenAI Realtime API (`gpt-realtime-1.5`) over WebRTC. Ships with a default ERP (Enterprise Resource Planning) help-desk persona that can be edited live in the UI.

## How it works

```
Browser (mic + speakers)
   |
   |  WebRTC (audio + data channel)
   v
OpenAI Realtime API
   - noise reduction (far_field)
   - server VAD (turn detection)
   - transcription (gpt-4o-mini-transcribe, language=th)
   - reasoning + speech (gpt-realtime-1.5, voice: cedar)
```

The Node server's only job is to mint short-lived ephemeral session keys via `POST /v1/realtime/client_secrets`. The master `OPENAI_API_KEY` never reaches the browser; audio flows directly from the browser to OpenAI.

## Features

- True speech-to-speech (no separate STT and TTS round-trips)
- Thai input and output, with live user and assistant transcripts in the UI
- Server-side voice activity detection with barge-in (just talk; or toggle to push-to-talk)
- Editable system prompt with an Apply button that re-configures the live session
- Default persona: polite Thai ERP help-desk agent (Sales, Purchase, Inventory, GL/AP/AR, HR, BOM, reports, login/permission issues) — refers unknowns to the internal IT/ERP admin team
- Single command to run; no build step, no framework

## Quick start

Requires Node.js 18+.

```bash
cp .env.example .env
# put your OpenAI API key in .env
npm install
npm start
```

Open `http://localhost:3000` in Chrome or Edge, grant microphone permission, click **เชื่อมต่อ**, and start speaking in Thai.

## Configuration

| Setting | Value | Where to change |
|---|---|---|
| Realtime model | `gpt-realtime-1.5` | [server.js](server.js), [public/app.js](public/app.js) (constant `MODEL`) |
| Voice | `cedar` | [public/app.js](public/app.js) — `audio.output.voice` |
| Transcription model | `gpt-4o-mini-transcribe` | [public/app.js](public/app.js) — `audio.input.transcription.model` |
| Transcription language | `th` | [public/app.js](public/app.js), [lib/openai-bridge.js](lib/openai-bridge.js) — `audio.input.transcription.language` |
| Noise reduction | `far_field` (laptop / built-in mics) | [public/app.js](public/app.js) — `audio.input.noise_reduction.type` |
| Server VAD | threshold `0.5`, prefix padding `300 ms`, silence `500 ms` | [public/app.js](public/app.js) — `audio.input.turn_detection` |
| System prompt | ERP-themed Thai default, editable in UI | [public/app.js](public/app.js) — `DEFAULT_SYSTEM_PROMPT`, or edit at runtime |

Other valid voices for Realtime: `marin`, `alloy`, `echo`, `shimmer`. Other transcription models: `gpt-4o-transcribe`, `whisper-1`. Switch `noise_reduction` to `near_field` if you use a close-talking headset mic.

## Files

```
.
├── package.json            # express, dotenv, sip, ws
├── server.js               # /api/session + /api/sip/* endpoints, SSE
├── .env.example            # template; copy to .env and add your key
├── .gitignore              # excludes .env, node_modules, sip-config.json
├── lib/
│   ├── sip-config.js       # load/save sip-config.json
│   ├── sip-events.js       # EventEmitter shared with the SSE stream
│   ├── rtp-session.js      # RTP/UDP socket, 20ms μ-law packetizer
│   ├── openai-bridge.js    # ws to OpenAI Realtime (audio/pcmu both ways)
│   └── sip-ua.js           # SIP UAS: REGISTER w/ digest, INVITE → 200 OK, BYE
└── public/
    ├── index.html          # UI (Thai labels, prompt editor, SIP panel, log)
    ├── style.css           # dark theme, chat bubbles, prompt + SIP panels
    └── app.js              # WebRTC handshake, session.update, SIP form, SSE
```

## SIP / call integration

The server can also act as a SIP softphone (like MicroSIP) so that incoming PSTN/PBX calls are auto-answered and bridged to the same Thai ERP bot. The bridge is server-side and runs in parallel with the browser flow.

- Open `http://localhost:3000`, expand **📞 ตั้งค่าโทรศัพท์ (SIP Account)**, fill in the same fields you'd put in MicroSIP (SIP Server, Username, Domain, Login, Password, Transport=UDP, Register Refresh, Keep-Alive), click **Save**, then **Start**.
- Credentials are persisted to `sip-config.json` (gitignored). The password is never returned to the browser once saved — the form shows `(saved — leave blank to keep)`.
- The status line and call log update live via Server-Sent Events at `/api/sip/events`.
- Audio path: caller → PBX → SIP/RTP (G.711 μ-law, 8 kHz, 20 ms) → Node bridge → OpenAI Realtime WebSocket (`audio/pcmu` both ways, no resampling) → bot reply RTP → caller.
- Concurrency: one call at a time; a second concurrent INVITE is rejected with `486 Busy Here`.
- Local SIP listen port defaults to UDP `5070` (override with `SIP_LOCAL_PORT` in `.env`). Don't run MicroSIP on the same extension at the same time — the PBX will only honor one registration.
- The bot's persona for SIP calls is read from `sip-config.json#instructions`. Use the **บันทึกไปยัง SIP** button in the System prompt panel to push the current textarea contents to that file.
- Limitations: UDP transport only (no TLS/WSS), no SRTP, no outbound calling, no DNS SRV, single concurrent call. NAT/IP rewrite relies on the PBX honoring `rport`/`received`.

## Security note

The `OPENAI_API_KEY` lives only in `.env` (gitignored) and is read by the Node server. The browser only ever sees an ephemeral client secret with a short TTL. If a key is ever exposed (paste in chat, screenshot, accidental commit), revoke it at https://platform.openai.com/api-keys and rotate.

## Limitations

- No persistence: refresh the page and the conversation history is gone (the realtime session is per-tab).
- HTTP only: runs on `http://localhost`. For deployment beyond localhost you need HTTPS so the browser will allow `getUserMedia`.
- No tool calling, no RAG, no knowledge base. The agent answers from the system prompt and the model's general knowledge; for ERP-specific data (master records, customer-tenant configurations, exact menu paths in your ERP product) it refers users to the internal IT/ERP admin team.
