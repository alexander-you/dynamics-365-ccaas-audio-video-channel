# CIF v2 Channel Provider Configuration (Phase 4A — Planning Only)

> **Version:** 0.1.0 · **Status:** PLANNING ONLY — **no Channel Provider, app profile, or template has
> been created in Dynamics 365.** This is the *proposed* CIF v2 setup for the POC.
> **Approval gate:** Created only after the user confirms environment, solution, app profile, and that
> changes are allowed. See [d365-pre-change-checklist.md](d365-pre-change-checklist.md).

Channel Integration Framework (CIF) **v2** is the supported way to embed a third-party/custom
communication widget into a model-driven **agent workspace** with **multi-session** support. It is a
**UI integration layer** — it is **not** a routing engine and does **not** consume Omnichannel
capacity by itself.

Related: [d365-agent-workspace-integration.md](d365-agent-workspace-integration.md) ·
[d365-workstream-and-channel-strategy.md](d365-workstream-and-channel-strategy.md).

---

## 1. Channel Provider record (proposed)

The CIF v2 Channel Provider is a Dataverse configuration record (in the **Channel Integration
Framework** app / `msdyn_*` provider tables) with these proposed values:

| Setting | Proposed value (POC) | Notes |
|---|---|---|
| **Name** | `ACS Audio/Video (POC)` | Human-readable; confirm prefix usage |
| **Unique name** | `alex_acvprovider_poc` | Uses confirmed prefix `alex` |
| **Label** | `Audio/Video` | Shown in the workspace |
| **Channel URL** | `https://<poc-host>/agent-media-panel/` | Static hosted mock panel (see §2) |
| **Enable Outbound Communication** | No (POC) | Inbound notification focus first |
| **Channel order** | `0` | Single provider in POC |
| **API version** | CIF **v2** | Multi-session workspace |
| **Trusted domain** | the POC host origin | Must be HTTPS; required for `getUserMedia` later |
| **Select environments / app** | the dev/sandbox workspace app | Associated via **app profile** (§3) |
| **Enable Analytics** | No (POC) | — |
| **Custom Parameters** | `{ "mode": "mock" }` | Forces `MockMediaSession` |

> The Channel URL must be served over **HTTPS** from a **trusted/allow-listed origin**. For the POC
> this can be a dev host (e.g., a static web host or tunneled `vite preview`). Real media later
> additionally requires the host **iframe** to delegate `camera; microphone; display-capture; autoplay`
> — an open validation item, see [known-limitations.md](known-limitations.md).

---

## 2. Channel URL strategy

- **POC:** host the existing `src/agent-media-panel` build (`VITE_USE_MOCKS=true`) at a stable HTTPS
  URL and point the Channel Provider at it. The widget loads inside the CIF panel `iframe`.
  The POC host is **GitHub Pages** (`https://alexander-you.github.io/dynamics-365-ccaas-audio-video-channel/`).
- The widget uses the **CIF v2 client API** (`Microsoft.CIFramework.*`) for workspace actions
  (notifications, sessions, screen-pop, presence) and its own `IMediaSession` (mock) for media.
- **Later (real ACS):** the same URL serves the production bundle with `RealMediaSession`; the origin
  must be allow-listed and the embedding `iframe` must carry the media `allow` policy.

> **Hosting note — GitHub Pages is temporary POC hosting only.** It is **not** the target production
> hosting model. Production hosting of the panel must be **Azure-based** — preferably **Azure Static
> Web Apps**, otherwise **Azure App Service** or **Azure Storage static website** — per final
> requirements. When that move happens, update the Channel Provider **Channel URL** and **Trusted
> domain** to the Azure origin. See [architecture.md](architecture.md) §5.2.

> **No secrets in the URL or custom parameters.** Tokens (later) are fetched at runtime from the token
> service, never embedded in CIF configuration.

---

## 3. App profile association

- CIF v2 providers are surfaced to agents via the **App Profile Manager** (Agent experience profile)
  bound to the workspace app.
- **POC:** create or use a **dedicated POC app profile** (not a production profile). Attach the
  `ACS Audio/Video (POC)` channel provider to it, and assign the profile to the test agent user(s).
- This isolation guarantees the POC channel never appears for production agents.

---

## 4. Incoming notification behavior (proposed)

- The notification is raised with `Microsoft.CIFramework.notifyEvent(...)` using a **notification
  template** (a `msdyn_*` notification field template) defining title, fields (e.g., caller/contact,
  case ref), icon, **Accept** and **Reject** actions, and an **auto-reject timeout**.
- **POC trigger is mock**: a test action (button in the panel, or a small test harness) calls
  `notifyEvent` with a mock payload. No real inbound signaling.
- Notification fields are populated from the mock payload (contact name, case number, channel = A/V).

---

## 5. Accept / reject flow

| Action | CIF v2 behavior | POC (mock) outcome |
|---|---|---|
| **Accept** | Notification resolves accepted; provider proceeds to create/focus a session | `createSession`/`createTab`, screen-pop, launch mock panel |
| **Reject** | Notification resolves rejected; no session created | Panel logs rejection; no session/tab; presence unchanged |
| **Timeout** | Auto-reject after configured seconds | Treated as reject |

---

## 6. Session creation / focus

- On Accept, the provider calls **`Microsoft.CIFramework.createSession(...)`** (CIF v2 multi-session)
  to start a workspace session, optionally driven by a **session template** that defines the session
  title (e.g., `A/V — {contactName}`), anchor tab, and application tabs.
- If a session for the same context already exists, the provider **focuses** it
  (`setSessionTitle`/`focusSession`) instead of creating a duplicate.
- The **mock media panel** is shown in the CIF panel; optionally a larger **app tab** hosts the media
  stage via the session template's application tab.

---

## 7. Screen-pop behavior

- **`Microsoft.CIFramework.searchAndOpenRecords(...)`** or **`createTab`** opens the related record:
  - **Contact** (by mock identifier), or
  - **Case / `incident`** (by mock case number), or
  - a **placeholder Audio/Video Session context** — for the POC this is a **mock in-memory context or
    an existing standard record**; a dedicated `alex_acvsession` table is **not** created in Part 1
    (see [channel-configuration-model.md](channel-configuration-model.md) and the checklist).
- Screen-pop target is configurable per the mock payload to demonstrate Contact, Case, and placeholder
  flows.

---

## 8. Presence coordination

- The provider may call **`Microsoft.CIFramework.setPresence(...)`** to reflect Busy/Available during
  a mock session, and **`getPresence`** to read current presence.
- **Best-effort in the POC:** presence APIs depend on the workspace app and Omnichannel presence being
  available; if the dev/sandbox app does not expose unified presence, this is recorded as a finding,
  not a blocker.

---

## 9. Limitations (CIF v2, POC scope)

- CIF v2 does **not** route work, **not** create a native Omnichannel conversation, and **not**
  consume capacity — routing/capacity is separate (see
  [d365-workstream-and-channel-strategy.md](d365-workstream-and-channel-strategy.md)). **[Confirmed — live]**
- The native first-party communication panel **cannot be fully reused** for custom media; the media
  controls are the **custom panel**. **[Confirmed]**
- Whether the CIF `iframe` permits `getUserMedia` / `getDisplayMedia` (real media, later) and the
  exact `allow`/CSP/Permissions-Policy required is an **open validation item**. **[Validate with Microsoft]**
- Presence/session APIs availability depends on the workspace app edition and configuration.
  **[Validate in target environment]**
- Outbound and analytics are out of scope for the POC.
