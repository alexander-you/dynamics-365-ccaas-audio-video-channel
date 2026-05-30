# Agent Media Panel — Scaffold (Phase 3c)

> **Local-only, mock mode. NOT registered or imported into Dynamics 365.**
>
> This is the agent-side ACS media control that will *later* be embedded in the Dynamics 365 agent
> workspace. Phase 3c delivers the **UI + abstraction boundary** only. It uses **no real ACS tokens**,
> makes **no network calls**, stores **no secrets**, and creates **no Dataverse/Power Platform**
> artifacts.

## What this is

A small TypeScript + Vite app that renders the agent media panel and drives it through a single
abstraction, [`IMediaSession`](src/mediaSession.ts). The UI never calls the ACS SDK directly — it
only talks to `IMediaSession`. Phase 3c ships `MockMediaSession`; `RealMediaSession` is a documented
placeholder that throws until ACS is approved.

### Why an embedded web component (not a PCF control) in Phase 3c

See [ADR-0008](../../docs/adr/0008-agent-media-component-approach.md). In short: a framework-neutral
web component runs **fully locally** with no Power Platform tooling, keeps the diff reviewable, and
matches the existing `customer-web` / `deployment-assistant` scaffolds. The same UI + `IMediaSession`
boundary can later be **wrapped as a PCF control** (`pac pcf init`) or hosted as a **web resource**
when D365 embedding is approved — without rewriting the UI.

## Mock UI capabilities

| Capability | Control | Notes |
| --- | --- | --- |
| Join session | `Join session` button | Simulates connect; populates roster |
| Leave session | `Leave session` button | Tears down mock session |
| Mute / unmute | `Mute mic` toggle | Updates local + roster state |
| Camera on / off | `Camera off` toggle | Updates local + roster state |
| Screen sharing | `Share screen` toggle | Notes co-browsing is a separate future capability |
| Recording status | Status tile + simulate buttons | Blocked unless consent = granted |
| Consent status | Status tile + simulate buttons | Granted / declined / pending |
| Participant state | Roster list | Role, connection, mic/cam/share flags |
| Related Case / Contact | Case panel | Display-only mock; no Dataverse |
| Error / fallback messages | Message banner | e.g., "declined consent → continue without recording" |

> Consent and recording are **server-authoritative** in the real system (token service + Event Grid).
> The "Simulate server signals" buttons exist only to preview those states locally.

## Local test instructions

```bash
cd src/agent-media-panel
copy .env.example .env.local      # Windows (PowerShell: Copy-Item .env.example .env.local)
npm install
npm run dev                        # http://localhost:5190
```

Then:

1. Click **Join session** → roster shows you + a mock customer.
2. Toggle **Mute**, **Camera**, **Share screen** → local + roster flags update.
3. Click **Consent granted**, then **Start recording** → recording tile turns red.
4. Click **Consent declined** then **Start recording** → blocked with an error + fallback hint.
5. Click **Leave session** → roster clears.

Type-check only (no build output):

```bash
npm run typecheck
```

## Browser & iframe permission considerations (important for later D365 embedding)

The real (non-mock) implementation will call `getUserMedia` / `getDisplayMedia` and the ACS Calling
SDK. When this control is later embedded in the Dynamics 365 workspace, media access is governed by
browser **Permissions Policy** delegated through the hosting `<iframe>`:

- **Secure context required.** Camera/mic/screen-share APIs only work over **HTTPS** (or
  `localhost`). The local mock avoids them entirely.
- **Iframe allow-list.** The embedding iframe must delegate permissions, e.g.
  `allow="camera; microphone; display-capture; autoplay"`. Without these, `getUserMedia` /
  `getDisplayMedia` are blocked even if the user has granted the browser permission.
- **`display-capture` is gated.** Screen sharing (`getDisplayMedia`) cannot be triggered
  programmatically without a user gesture and is subject to additional browser policy; some browsers
  restrict it inside cross-origin iframes.
- **Cross-origin hosting.** If the control is served from a different origin than the host page,
  confirm CSP `frame-src` / `frame-ancestors` and that the Permissions-Policy header does not strip
  the delegated features.
- **Autoplay policy.** Remote audio/video rendering may require `autoplay` to be allowed or a user
  gesture to start playback.
- **PCF/CIF specifics — [Validate with Microsoft].** Whether the Dynamics 365 PCF/CIF iframe permits
  `getUserMedia` / `getDisplayMedia` and the exact `allow` configuration is an open item tracked in
  [known-limitations.md](../../docs/known-limitations.md).

These are documentation notes only — Phase 3c does not request any device permission.

## What Phase 3c deliberately does NOT do

- No Power Platform solution is created or imported.
- The PCF control is **not** registered or deployed to Dynamics 365.
- No Dataverse tables/columns are created.
- No CIF v2 configuration.
- No real ACS tokens; no secrets stored.
