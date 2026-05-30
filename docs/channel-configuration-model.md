# Custom ACS A/V Channel — Admin Configuration Model (Phase 4A — Planning Only)

> **Version:** 0.1.0 · **Status:** PLANNING ONLY — **no Dataverse tables or columns are created.**
> This is the *proposed* admin-facing configuration model for the custom ACS Audio/Video channel.
> **Prefix:** `alex` (placeholder — confirm with publisher).
> **Approval gate:** Schema is created only after explicit, separate approval. See
> [d365-pre-change-checklist.md](d365-pre-change-checklist.md).

This document focuses on the **admin configuration surface** for the channel. The broader Dataverse
metadata model (sessions, recordings, consent, transcripts, telemetry) is in
[configuration-model.md](configuration-model.md); this file is the **channel settings** subset that an
administrator manages, aligned to Phase 4A.

> **Phase 4A note:** None of these settings are created or enforced during the POC. The mock panel
> reads a small mock config so admins can *see* the intended surface; **enforcement is future** and
> mostly **server-authoritative** (token service + ACS), not client-side.

---

## 1. Proposed channel configuration record

**Table (future):** `alex_acvchannelconfig` — *ACS A/V Channel Configuration*
**Scope (most specific wins):** channel instance → workstream → queue → business unit.

| Setting (admin) | Logical name (future) | Type | Default | Phase 4A | Enforced by (future) |
|---|---|---|---|---|---|
| **Audio enabled** | `alex_enableaudio` | Boolean | Yes | mock display | Token service / ACS |
| **Video enabled** | `alex_enablevideo` | Boolean | Yes | mock display | Token service / ACS |
| **Screen sharing enabled** | `alex_enablescreenshare` | Boolean | Yes | mock display | ACS + iframe policy |
| **Recording enabled** | `alex_autorecording` | Boolean | Yes | mock display | Server-authoritative |
| **Recording start mode** | `alex_recordingstartmode` | Choice | OnConnect | mock display | Server-authoritative |
| **Recording storage mode** | `alex_recordingstoragemode` | Choice | AzureBlobBYOS | mock display | Azure (BYOS) |
| **Transcription enabled** | `alex_enabletranscription` | Boolean | No | mock display | ACS / post-call |
| **Transcription language** | `alex_transcriptionlanguage` | Text/Choice | en-US | mock display | ACS |
| **AI summary enabled** | `alex_enableaisummary` | Boolean | No | mock display | Post-call pipeline |
| **Consent required** | `alex_requireconsent` | Boolean | Yes | mock gate | Server-authoritative |
| **Consent template** | `alex_consenttemplate` | Multiline | — | mock display | Panel + server |
| **Default queue** | `alex_queueid` | Lookup → queue | — | not used (no routing) | Unified Routing |
| **Capacity cost** | `alex_videocapacitycost` | Integer | 1 | not used | Capacity profile |
| **Fallback behavior** | `alex_fallbackbehavior` | Choice | AudioOnly | mock display | Orchestration |
| **Supervisor monitoring** | `alex_supervisormonitorenabled` | Boolean | Yes | mock display | ACS roles |
| **Teams expert consult** | `alex_teamsescalationenabled` | Boolean | No | mock display | ACS/Teams interop |
| **Telemetry level** | `alex_telemetrylevel` | Choice | Standard | mock display | Functions / App Insights |

### Choice value sets (proposed)

| Field | Values |
|---|---|
| **Recording start mode** (`alex_recordingstartmode`) | `OnConnect` · `ManualByAgent` · `Disabled` |
| **Recording storage mode** (`alex_recordingstoragemode`) | `AzureBlobBYOS` (default) · `ACSDefault24h` (temp) · `DataverseFile` (demo-only) |
| **Fallback behavior** (`alex_fallbackbehavior`) | `AudioOnly` · `OfferCallback` · `EndSession` |
| **Telemetry level** (`alex_telemetrylevel`) | `Off` · `Standard` · `Verbose` |

---

## 2. Enforcement principle (important)

- **Recording and consent are server-authoritative.** The agent panel **renders** state; it does not
  decide whether recording is allowed. The token service + ACS enforce consent-before-record. A
  client toggle is never the security boundary.
- **Media capabilities** (audio/video/screen) are enforced by the **ACS token/room configuration**
  and the **browser/iframe permissions**, not by the panel alone.
- **Routing/capacity** settings (`alex_queueid`, `alex_videocapacitycost`) are consumed by **Unified
  Routing**, which is **not** part of Phase 4A.

---

## 3. Phase 4A mock configuration

For the POC, the mock panel reads a minimal client config (no Dataverse) to demonstrate the surface:

```jsonc
// mock only — not a Dataverse record, not enforced
{
  "audioEnabled": true,
  "videoEnabled": true,
  "screenShareEnabled": true,
  "recordingEnabled": true,        // display only
  "consentRequired": true,         // mock gate before mock "record"
  "fallbackBehavior": "AudioOnly", // display only
  "supervisorMonitoring": true,    // display only
  "telemetryLevel": "Standard"     // display only
}
```

> This mirrors `VITE_USE_MOCKS=true` behavior already in `src/agent-media-panel`. No real settings are
> read from or written to Dataverse.

---

## 4. Relationship to existing design

- This is the **admin-facing subset** of [configuration-model.md](configuration-model.md) §1
  (`alex_acvchannelconfig`). Where the two overlap, **`configuration-model.md` is authoritative** for
  full column definitions; this file frames the **admin experience** and Phase 4A applicability.
- The session/recording/consent/transcript/telemetry tables remain **design-only** and are **not**
  part of Phase 4A.
