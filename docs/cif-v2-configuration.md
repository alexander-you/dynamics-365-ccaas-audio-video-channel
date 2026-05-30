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
- **The provider loads from the *active* app profile for the user.** A user has exactly **one** app
  profile per app. The widget surfaces only if the provider is attached to the profile the user is
  actually on — attaching it to a different profile has no effect for that user.

> **Surfacing ≠ routed conversation.** Attaching the provider to the active profile only makes the
> widget **available to load**; it does not create a workstream, queue, routing, Dataverse session
> schema, or a real work item. The widget loads in the **communication/side-pane provider area** of
> the workspace; it is **not** auto-opened as a native conversation. See
> [architecture.md](architecture.md) §5.3 for the full in-scope/out-of-scope validation matrix and the
> correct status wording (*“the CIF v2 provider and mock media widget are available for workspace
> integration validation”*).

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

---

## 10. Live in-panel video (real ACS) — embed wiring

This section makes the embedded CIF widget show **real ACS video inside the Communication Panel**,
not just the mock widget. The **code** for this is implemented and ships in the hosted panel; the
remaining work is the **Channel Provider registration** below.

### 10.1 How the single hosted build runs live (no second build)

The panel selects mock vs. real **at runtime** so the same GitHub Pages build can stay safe on its
bare URL and go live only when embedded:

- `createMediaSession(ctx)` returns the **real** `RealMediaSession` when **either** the build sets
  `VITE_USE_MOCKS=false` **or** the resolved context says **`mode=live`**. Opening the bare URL with
  no params keeps the default `mode=mock` → local mock (no ACS, no camera/mic prompt).
- `acsGroupId` is read from the URL query / CIF custom params and, when present, the agent joins
  **that exact ACS group** — the same group the customer entry point joined. With no `acsGroupId`
  it falls back to the build default GUID (`VITE_ACS_GROUP_ID`).
- `main.ts` **auto-joins** the ACS group on load when the session is real, so the agent's video
  appears in the panel without a manual click (`join()` is idempotent; controls still render).

### 10.2 Channel Provider values for live video

Same record as §1, with these changes:

| Setting | Live value | Notes |
|---|---|---|
| **Channel URL** | `https://alexander-you.github.io/dynamics-365-ccaas-audio-video-channel/?mode=live` | `mode=live` flips the widget to real ACS at runtime |
| **Trusted domain** | `https://alexander-you.github.io` | Must be HTTPS and allow-listed |
| **Custom Parameters** | `{ "mode": "live", "acsGroupId": "7a9f5c2e-0b1d-4e6a-9c3f-1a2b3c4d5e6f" }` | `mode=live` + the **same** group GUID the customer joins |

> Either put `?mode=live` in the **Channel URL** *or* set `mode: "live"` in **Custom Parameters**
> (`CifBridge.getContextOverrides()` merges custom params over the URL). Pin `acsGroupId` to the
> shared POC group GUID so the agent and customer land in the same call.

### 10.3 iframe media permissions (required for camera/mic)

For `getUserMedia` to work inside the CIF iframe, the host frame must delegate media permissions via
**Permissions-Policy / `allow`**: `camera; microphone; display-capture; autoplay`. If the embedding
frame does not delegate these, the browser blocks the agent camera/mic and the call cannot publish
media. This is the open validation item from §9 — confirm with Microsoft for the target workspace app.

### 10.4 Registration steps (admin)

1. Open the **Channel Integration Framework 2.0** app in the target environment.
2. **New Channel Provider** with the values in §1 + §10.2 (Name, Unique name `alex_acvprovider_poc`,
   Label `Audio/Video`, **Channel URL** with `?mode=live`, **Trusted domain**
   `https://alexander-you.github.io`, **Custom Parameters** `{ "mode": "live", "acsGroupId": "<group GUID>" }`,
   API version **2.0**, Channel order `0`).
3. In the **app profile** (App Profile Manager) bound to the test workspace app, attach this provider
   under **Channel providers**, and assign the profile to the test agent user(s) only.
4. Sign in as the test agent on that app profile → the panel loads in the **Communication Panel**,
   auto-joins the ACS group, and shows live agent + customer video once the customer joins the same
   group from the customer-web page (also `mode=live`, same `acsGroupId`).

> **Scope / safety:** this surfaces the widget and starts a real ACS call; it does **not** create a
> workstream/queue/native conversation. The BYOC relay’s `/api/inbound` still provides the routed
> messaging work item + context separately. Rollback: detach the provider from the app profile (or
> change the Channel URL back to mock / drop `?mode=live`).
