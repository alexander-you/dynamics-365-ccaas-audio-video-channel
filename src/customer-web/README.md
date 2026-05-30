# ACV Customer Web Entry Point (TypeScript + Vite)

Customer-facing browser entry point for the custom **Audio & Video Channel (ACV)**. It walks the
customer through **consent → device check → join → in-call controls**.

> **Phase 3 status: scaffolding only.** Runs in **mock mode** by default (`VITE_USE_MOCKS=true`):
> it shows a local camera/mic preview and exercises the full UI flow, but **no real ACS call is
> placed** and the token service returns mock tokens. The real ACS Calling SDK path
> (`RealCallController`) is a documented placeholder, enabled only after ACS is approved.

## Flow

1. **Consent** — discloses recording, captures explicit consent, and creates the session via the
   token service **before** any media starts.
2. **Device check** — uses the browser `MediaDevices` API to verify camera + microphone and show
   a live preview.
3. **Join** — requests a (mock) ACS token and "joins" the session.
4. **In-call controls** — mute/unmute, stop/start video, leave.

## Project layout

| File | Purpose |
| ---- | ------- |
| `index.html` | Three-step UI shell |
| `src/main.ts` | Flow orchestration + error handling |
| `src/api.ts` | Token-service client (`/api/token`, `/api/session`, `/api/consent`) |
| `src/media.ts` | Camera/microphone checks + preview stream |
| `src/call.ts` | `CallController` abstraction: `MockCallController` (active) + `RealCallController` (placeholder) |
| `src/types.ts` | Contracts mirrored from the token service |

## Prerequisites

- [Node.js 18+](https://nodejs.org/) (LTS recommended)
- The [token service](../token-service/README.md) running locally on `http://localhost:7071`

## Local development

```powershell
# from src/customer-web
Copy-Item .env.example .env.local        # placeholders only — never commit real values
npm install
npm run dev                              # http://localhost:5173
```

The Vite dev server proxies `/api/*` to the local Functions host (`:7071`), so you don't need to
set `VITE_TOKEN_SERVICE_BASE_URL` for local runs.

> Camera/microphone access requires a secure context. `http://localhost` is treated as secure by
> browsers, so local dev works without HTTPS.

### Type-check / build

```powershell
npm run typecheck
npm run build
```

## Configuration

See `.env.example`. Only `VITE_`-prefixed variables are exposed to the browser.

| Variable | Default | Notes |
| -------- | ------- | ----- |
| `VITE_USE_MOCKS` | `true` | `false` would use the real ACS SDK — not implemented in Phase 3 |
| `VITE_TOKEN_SERVICE_BASE_URL` | _empty_ | Empty uses the dev proxy |
| `VITE_CHANNEL_CONFIG` | `default` | Channel configuration name to request |

## What is intentionally NOT here yet

- No real ACS Calling SDK wiring (mock controller only).
- No remote participants / agent media.
- No secrets or ACS connection strings (tokens come from the server only).
