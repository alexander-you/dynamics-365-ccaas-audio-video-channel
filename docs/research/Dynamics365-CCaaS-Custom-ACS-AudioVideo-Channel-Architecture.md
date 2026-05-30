# Custom ACS-Based Audio & Video Channel for Dynamics 365 Contact Center
## Architecture and Implementation Proposal

**Document type:** Solution architecture and implementation proposal (business + technical)
**Subject:** A dedicated, custom customer-engagement **Audio & Video channel** built on **Azure Communication Services (ACS)** and integrated with **Dynamics 365 Contact Center / Customer Service workspace**
**Status:** Proposal for review — confirmed capabilities, assumptions, and Microsoft validation points are explicitly distinguished
**Last updated:** 2026-05-30

---

### Evidence and confidence conventions

To keep this proposal honest and actionable, claims are tagged:

- **[Confirmed]** — Supported by official Microsoft Learn documentation; **[Confirmed — live]** where the page was retrieved and quoted during research.
- **[Likely]** — Strongly supported by documented behavior/standard patterns; re-verify the exact limit or configuration.
- **[Assumption]** — A reasonable design assumption for this proposal; validate for your tenant, region, and licensing.
- **[Validate with Microsoft]** — Requires explicit confirmation with Microsoft (product group / FastTrack / account team) before production commitment.

> **Caveat.** ACS and Dynamics 365 Contact Center evolve quickly, and licensing/SKUs and documentation URLs changed materially in 2024–2025. Treat all pricing as planning placeholders and re-verify GA status, regional availability, and supportability before design sign-off.

---

## 1. Executive Summary

This document proposes the design and implementation of a **dedicated, custom Audio & Video customer-engagement channel** for Dynamics 365 Contact Center, built on **Azure Communication Services (ACS)**. The objective is not merely to "enable a video call," but to deliver a **controlled customer service channel** with the full operational discipline of a contact-center interaction: real-time audio/video and screen sharing, **session recording**, optional **transcription and AI summaries**, **consent capture and compliance tracking**, **case/customer linkage in Dataverse**, an **agent experience inside the Dynamics 365 workspace**, **routing and assignment**, **supervisor visibility**, and **reporting and auditability**.

**Recommended technical direction.** Build the channel on **Azure Communication Services** as the real-time media foundation, and integrate it into Dynamics 365 through a **custom agent-side media experience** (PCF control and/or embedded web component) orchestrated by **Channel Integration Framework v2 (CIF v2)**, with **Dataverse** custom tables for metadata and linkage, **ACS Call Recording** to your **own Azure Blob Storage (Bring Your Own Storage)**, optional **ACS real-time transcription**, and **Azure Functions / Event Grid** for lifecycle orchestration, telemetry, and compliance.

ACS is the recommended foundation because it provides exactly the primitives a custom customer-facing channel needs: **embeddable real-time audio/video** (web and mobile SDKs), **identity and short-lived token management**, **Rooms** for per-session isolation and role control, **Call Automation** for server-side session control, **Call Recording** (mixed/unmixed; audio/video) with **Bring Your Own Storage**, **real-time transcription/media streaming**, **Event Grid** integration, and **Teams interoperability** for internal experts. **[Confirmed]** It is also the same platform Microsoft uses for its first-party Dynamics 365 voice channel, which is *"built on Azure Communication Services."* **[Confirmed — live]**

**Architectural principle (the core flow).**

> Customer entry point → **Azure Communication Services** → **ACS Room / call session** → **routing and agent assignment** → **Dynamics 365 agent workspace** → **embedded ACS media experience** → **recording and transcription** → **Azure Blob Storage** → **Dataverse metadata and case linkage** → **reporting and supervision**.

**Teams positioning.** Teams should **not** be the primary customer-facing media layer. It may be used for **internal** consultation, expert assist, and supervisor collaboration — and an internal expert can be pulled into the customer's ACS session via ACS↔Teams interop — but the **customer-to-agent path remains on ACS** to preserve control over identity, recording, consent, CRM linkage, and channel behavior. **[Confirmed — live]**

**Native capability to acknowledge.** Dynamics 365 already offers ACS-powered **voice/video elevation from Live Chat** (a chat conversation can elevate to voice or video). **[Confirmed — live]** This is a legitimate native option and should be acknowledged. However, it is a feature **inside the chat channel** and does not, on its own, give an organization full control over **custom entry points, recording lifecycle and storage, transcription, compliance metadata, and bespoke Dataverse integration**. Where those requirements are first-class, a **dedicated custom ACS channel** is the appropriate choice — and is the recommendation of this document.

**Bottom line.** A custom ACS-based channel provides the **greatest control** over customer entry, media, recording, transcription, compliance, storage, and CRM linkage. The trade-off is that the implementation team **owns** the custom channel behavior, routing/capacity integration, supervisor features, analytics, and Microsoft supportability validation. This document defines the architecture, data model, integration approach, phased plan, risks, and the specific validation questions to close with Microsoft.

---

## 2. Business Context and Use Cases

Organizations increasingly need **high-trust, high-context, visual** interactions that still carry full CRM context, recording, and compliance. A dedicated audio/video channel embedded in the agent's Dynamics 365 workspace enables this while keeping routing, history, and auditability intact.

**Representative use cases:**

| Use case | Why audio/video + control matters |
|---|---|
| **Insurance claim inspection** | Live visual capture of damage at first notice of loss; recorded evidence for the claim file. |
| **Remote visual support** | "See-what-I-see" guided troubleshooting reduces truck rolls and improves first-time-fix. |
| **Damage assessment** | Adjusters assess remotely with recorded, timestamped media tied to the case. |
| **Identity verification** | "Hold your ID to the camera" for KYC/account recovery, with consented recording. |
| **High-value customer service** | White-glove, face-to-face-quality service for premium segments. |
| **Financial / healthcare advisory** | Advisory and tele-consult with auditable consent and recording (HIPAA-eligible platform). **[Confirmed]** |
| **Technical troubleshooting** | Screen share and video for complex setup/diagnosis. |
| **Escalation from digital channels** | Move a chat/email/case into a live, recorded video session when visual context is required. |
| **Audit/compliance-driven video** | Scenarios where a **recorded video interaction** is mandated for audit, dispute, or regulatory evidence. |

**Common thread:** these scenarios require not just media, but **control over recording, storage, consent, and CRM linkage** — the defining reason to build a dedicated custom channel rather than rely solely on an in-chat elevation feature.

---

## 3. Functional Requirements

| # | Requirement | Capability basis |
|---|---|---|
| F1 | Start an A/V session from a customer portal, website, mobile app, or authenticated customer area | ACS Calling SDK (web + iOS/Android). **[Confirmed]** |
| F2 | Support both **anonymous** and **authenticated** customers | On-the-fly ACS identity + short-lived token; optional identity mapping for authenticated users. **[Confirmed]** |
| F3 | Create or link to **customer, contact, account, and case** | Dataverse linkage via backend/CIF APIs. **[Confirmed]** |
| F4 | Route/assign the session to the right agent | Unified Routing (preferred) / record bootstrap / ACS Job Router (alt). **[Confirmed primitives]** |
| F5 | Agent **accepts** the session from Dynamics 365 | CIF v2 notification + acceptance flow. **[Confirmed — live]** |
| F6 | Embed the A/V experience **inside the agent workspace** | PCF control / embedded web component hosting ACS UI. **[Confirmed framework]** |
| F7 | Support **mute, camera on/off, screen share, hold/end, session status** | ACS Calling SDK controls (custom widget). **[Confirmed]** |
| F8 | **Record** the session (audio, and video where required) | ACS Call Recording (mixed/unmixed; mp3/wav/mp4). **[Confirmed — live]** |
| F9 | Store recordings in a **controlled storage account** | ACS Bring Your Own Storage → your Azure Blob. **[Confirmed — live]** |
| F10 | Write **session metadata** to Dataverse | Event Grid → Azure Function → Dataverse Web API. **[Confirmed pattern]** |
| F11 | Support **transcription and summary** where required | ACS real-time transcription / media streaming + Azure AI. **[Confirmed]** |
| F12 | Provide **supervisor visibility** | Custom dashboards fed by Dataverse + ACS diagnostics. **[Assumption]** |
| F13 | Provide **telemetry and error tracking** | ACS UFD/pre-call diagnostics + Azure Monitor/App Insights. **[Confirmed]** |
| F14 | **Consent** capture and compliance tracking | Pre-call consent flow + Dataverse consent record. **[Assumption — must build]** |
| F15 | Pause/resume recording for sensitive segments | ACS Recording pause/resume. **[Confirmed — live]** |

---

## 4. Non-Functional Requirements

| Category | Requirement | Notes / basis |
|---|---|---|
| **Security** | TLS 1.2+ signaling; SRTP/DTLS-SRTP (AES) media; AES-256 at rest; CMK option | ACS encryption + Key Vault. **[Confirmed]** |
| **Scalability** | Handle peak concurrency; group/Room up to ~350 participants | ACS limits. **[Likely — verify]** |
| **Availability** | 99.9%+ customer entry; graceful media fallback | ACS SLA; **no built-in geo-replication — DR is app-level**. **[Confirmed]** |
| **Privacy** | Data-at-rest in chosen region; deletion APIs; CMK | Media path is Azure-global (encrypted, not residency-guaranteed). **[Confirmed]** |
| **Compliance** | ISO 27001/27017/27018, SOC 1/2/3, HIPAA (BAA), PCI DSS, GDPR | Azure/ACS certifications — validate per feature. **[Confirmed]** |
| **Consent** | Explicit, logged, jurisdiction-aware consent before recording | Custom build. **[Assumption]** |
| **Retention** | Configurable retention + immutable (WORM) where required | Blob lifecycle/immutability. **[Confirmed capability]** |
| **Browser support** | Chrome, Edge, Safari (incl. iOS, screen-share-send limits), Firefox (limited video) | ACS browser matrix — verify current. **[Confirmed]** |
| **Network** | Allow-list ACS/Azure media relay ranges; optional ExpressRoute | TURN/STUN relays on Azure. **[Confirmed]** |
| **Fallback** | Degrade video→audio; offer PSTN/callback on failure | App-level design. **[Assumption]** |
| **Disaster recovery** | Multi-region failover strategy owned by the solution | ACS DR is your responsibility. **[Confirmed]** |

> **Operational ownership.** A custom ACS channel means the implementation team **owns** monitoring, operational support, storage lifecycle, ephemeral-identity cleanup, and custom reporting. These are first-class workstreams, not afterthoughts.

---

## 5. Proposed Solution Concept

The solution is a **dedicated ACS-based customer interaction channel** integrated into Dynamics 365. It is composed of the following building blocks:

- **Customer-facing web/mobile experience** using the **ACS Calling SDK** (audio, video, screen share), embedded in a portal, public page, authenticated area, or mobile app.
- **Trusted token service** (Azure Function / API, authenticated to ACS via **Managed Identity**) that creates ACS identities and issues **short-lived `voip` tokens**; never exposes ACS secrets to the client. **[Confirmed]**
- **ACS Rooms** (or controlled call sessions) for **per-interaction isolation** and role assignment (customer = Attendee, agent = Presenter, supervisor = Consumer). **[Confirmed]**
- **Azure Functions / backend APIs** for orchestration: session creation, routing trigger, recording control, metadata writes, cleanup.
- **Dynamics 365 workspace integration** via **CIF v2** (notification, session tab, screen-pop, presence) plus a **PCF control / embedded web component** that hosts the ACS media UI. **[Confirmed framework]**
- **Dataverse custom tables** for **session, recording, consent, and telemetry** metadata, linked to standard CRM records.
- **Azure Blob Storage (BYOS)** for durable, organization-owned recording storage with lifecycle/immutability policies. **[Confirmed]**
- **Event Grid + Azure Functions** to react to ACS events (e.g., `RecordingFileStatusUpdated`) and update Dataverse. **[Confirmed]**
- **Azure Monitor + Application Insights** for diagnostics, quality, and error tracking. **[Confirmed]**
- **Teams for internal consultation/expert assist only**, via ACS↔Teams interop. **[Confirmed — live]**

**Separation of concerns (the recommended pattern):**

| Layer | Responsibility |
|---|---|
| **ACS** | Audio, video, screen share, recording, transcription, call/session control |
| **CIF v2** | Dynamics workspace orchestration: notification, session tab, screen-pop, presence |
| **PCF / web component** | The actual in-workspace media UI and call controls |
| **Dataverse** | Session, consent, recording, transcript, and case-linkage metadata |
| **Azure Functions / APIs** | Lifecycle coordination across ACS, Dynamics, Dataverse, and storage |
| **Azure Blob (BYOS)** | Durable recording storage and retention |
| **Teams** | Internal expert/supervisor collaboration only |

---

## 6. Dynamics 365 Agent Workspace Integration

The custom channel must feel integrated in the agent workspace while being honest about what is native versus custom-built.

**Key points:**

- **The native first-party communication panel cannot be fully reused** for a custom ACS video channel. The native Conversation Control and its call buttons are rendered by the platform for first-party channels; CIF v2 *"doesn't manage call or chat sessions"* and *"doesn't make calls or send messages."* **[Confirmed — live]**
- **A custom widget or PCF component is required for the actual media controls** (mute, camera, screen share, hold, end, recording status, participant state). These are implemented against the ACS Calling SDK. **[Confirmed]**
- **CIF v2 provides workspace-integration capabilities** — incoming notification toast, session-tab creation, screen-pop, and presence sync — **but it does not automatically create a native Omnichannel conversation or consume agent capacity**. **[Confirmed — live]**
- **The agent experience should aim to feel native:** on acceptance, open the relevant customer/contact/account/case record, show session status, and embed the call controls inside the workspace session tab.
- **Clearly separate native vs custom.** The table below sets expectations.

| Capability | Native (first-party channels) | Custom ACS channel (this solution) |
|---|---|---|
| Workspace session tab | Automatic | Via CIF `createSession` (Generic template) **[Confirmed — live]** |
| Incoming notification | Automatic | Via CIF `notifyEvent` toast **[Confirmed — live]** |
| Screen-pop / record open | Automatic | Via CIF `createTab` / `searchAndOpenRecords` **[Confirmed — live]** |
| Presence sync | Automatic | Via CIF `setPresence`/`getPresence` **[Confirmed — live]** |
| Media controls (mute/camera/share/end) | Native panel | **Custom PCF/web component (ACS SDK)** **[Confirmed]** |
| Routed Omnichannel conversation + capacity | Automatic | **Custom — not automatic** **[Confirmed — live]** |
| Customer summary / productivity pane auto-context | Automatic | Partial / custom **[Confirmed — live]** |

---

## 7. Routing and Assignment Strategy

The goal is to assign the custom A/V session to the right agent while reusing as much of Dynamics' native routing discipline as possible.

**Recommended model — in priority order:**

1. **Dynamics Unified Routing (preferred)** when a **supported work-item model** can be used. Unified Routing *"can be used to route service requests on all channels"* and natively supports **Messaging**, **Record**, and **Voice** workstreams, providing queues, skills, priority, operating hours, capacity, and presence. **[Confirmed — live]**
2. **Dataverse record-based work item or custom messaging bootstrap.** Because there is **no workstream type for a custom real-time media channel**, the practical pattern is to bootstrap the interaction through a supported workstream — e.g., create a **Record** work item, or start a lightweight **Custom (Direct Line) messaging** conversation that carries context — and then **elevate to the ACS media session**. This lets the routed work item drive queueing, skills, and capacity while ACS carries the media. **[Confirmed primitives / Validate with Microsoft for the exact supported pattern]**
3. **ACS Job Router (alternative)** only if routing must be managed **outside** Dynamics. ACS Job Router provides jobs, queues, workers, channels, and distribution/classification policies; your app acts on the offer by adding the agent to the ACS call. This is **not recommended** when a native agent experience and native analytics are priorities, because it bypasses Dynamics routing/capacity. **[Confirmed]**

**Capacity, presence, and rules:**

- **Capacity implications for video:** a video session typically consumes the agent's full attention; model it as a **high-cost capacity profile** (e.g., one video unit that blocks additional routed work). **[Likely]**
- **Agent availability/presence:** synchronize presence with CIF `setPresence`/`getPresence` so the agent is marked Busy/DND while on a video call. **[Confirmed — live]**
- **Skills, queues, operating hours, priority:** reuse Unified Routing configuration for any work item that flows through a supported workstream. **[Confirmed — live]**

**Known limitation.** A fully custom ACS media interaction **may not automatically behave as a first-class Omnichannel conversation** (auto-created conversation record, capacity consumption, customer summary, native analytics) **unless a supported work-item pattern is validated** with Microsoft. Plan for either the bootstrap pattern or explicit Microsoft guidance. **[Confirmed — live limitation / Validate with Microsoft]**

---

## 8. ACS Technical Architecture

The ACS layer carries all real-time media and server-side control.

| Component | Role in this solution | Notes |
|---|---|---|
| **ACS Identity** | Create per-customer identities (authenticated → mapped to CRM; anonymous → ephemeral) | Permanent until deleted; clean up ephemeral identities. **[Confirmed]** |
| **Token issuance & refresh** | Trusted token service issues short-lived `voip` tokens; SDK `tokenRefresher` refreshes before expiry | Backend authenticates via Managed Identity; no secrets client-side. **[Confirmed]** |
| **ACS Calling SDK** | Web (JS) + iOS/Android media: audio, video, screen share, mute/hold, diagnostics | Hosted in the customer app and the agent PCF/web component. **[Confirmed]** |
| **ACS Rooms** | Per-session isolation and roles (Presenter/Attendee/Consumer); validity window | Prevents cross-customer media bleed; supports scheduled callbacks; Teams-user join. **[Confirmed]** |
| **ACS Call Automation** | Server-side: answer/create, add/remove participant, transfer, play/TTS, DTMF/recognition | Used to add the routed agent (and supervisor/expert) into the session; IVR/bot triage. **[Confirmed]** |
| **ACS Call Recording** | Start/stop/pause/resume; mixed/unmixed; mp3/wav/mp4; BYOS | The core recording capability (Section 9). **[Confirmed — live]** |
| **Real-time transcription / media streaming** | Live transcription over WebSocket; raw audio streaming for AI | Feeds transcripts and downstream AI summaries. **[Confirmed]** |
| **Event Grid events** | `RecordingFileStatusUpdated`, call lifecycle events → Azure Functions | Drives metadata writes and storage handling. **[Confirmed]** |
| **Teams interoperability** | Add an internal Teams expert into the customer's ACS session | Internal collaboration only; customer stays on ACS. **[Confirmed — live]** |

**Participant roles (logical):**

| Role | ACS treatment | Capability |
|---|---|---|
| **Customer** | Ephemeral/authenticated ACS identity, Room **Attendee** | Audio/video/screen-share send/receive |
| **Agent** | ACS identity (mapped to Entra user), Room **Presenter** | Full media + screen share; can be added via Call Automation |
| **Supervisor** | ACS identity, Room **Consumer** (muted) for monitor; promote for barge | Silent monitor; optional join/barge |
| **Internal expert** | ACS or **Teams** user via interop | Joins for consult; no customer-data exposure beyond the session |

**Session lifecycle:** create Room → add customer → create pending Dataverse session → route/assign → add agent → start recording (post-consent) → capture events → stop recording → finalize storage → write metadata/transcript/summary → close session and clean up ephemeral identity. **[Confirmed pattern]**

---

## 9. Recording, Transcription, and Compliance

This section is central to the value of a dedicated custom channel: **full control over the recorded media and its compliance lifecycle.**

**Recording mechanics (ACS Call Recording):**

- **Start/stop/pause/resume** server-side via the recording APIs; triggered by internal logic or an agent action; works for PSTN, WebRTC, and SIP calls. **[Confirmed — live]**
- **Formats:** mixed video **mp4** (1080p, ~16 FPS, active-speaker tiles), mixed audio **mp3**/**wav**, and **unmixed** audio **wav** (up to 5 channels, one participant per channel for per-agent QA/analytics). **[Confirmed — live]**
- **Pause/resume** around sensitive segments (e.g., card entry) for PCI alignment. **[Confirmed — live]**

**Consent (before recording starts):**

- Present a **jurisdiction-aware disclosure at the entry point** and capture explicit consent **before** media/recording begins; persist a **consent record** in Dataverse. The platform recording banner is a notice, not compliance-grade consent logging — **build your own**. **[Confirmed — live that banner ≠ logged consent / Assumption for the build]**

**Storage (Bring Your Own Storage):**

- ACS built-in temporary storage retains recordings for **24 hours** only; therefore use **Bring Your Own Storage** to write recordings directly to **your** Azure Blob container, where Microsoft does not retain a copy. Retrieval is driven by the `RecordingFileStatusUpdated` Event Grid event. **[Confirmed — live]**
- Apply **lifecycle** and **immutable (WORM)** policies for regulatory retention; store the blob URI + retention metadata in Dataverse. **[Confirmed capability]**

**Status, linkage, and retrieval:**

- Show **recording status** to agent and supervisor in the custom widget; write status to Dataverse for dashboards.
- On `RecordingFileStatusUpdated`, confirm/copy the file in your container and **link it to the case and customer timeline** (Dataverse recording record + `phonecall`/custom activity). **[Confirmed]**

**Transcription and AI summary (optional):**

- Use **ACS real-time transcription** (or media streaming → Azure AI Speech) to produce a transcript; generate an **AI summary** with Azure OpenAI / Copilot and attach it to the interaction record. **[Confirmed capability / Assumption for the AI pipeline]**

**Sensitive information, auditability, access control:**

- Redact/pause around sensitive data; restrict recording retrieval via **RBAC** and scoped storage access; maintain **audit logs** of access; implement a **GDPR deletion workflow** that removes both the Dataverse record and the blob (and cleans up the ACS identity). **[Confirmed/Assumption]**

> **Note on Quality Management.** Whether Dynamics 365 **Quality Management** can consume recordings from a *custom* ACS channel is **not confirmed** and should be validated; native QM is built around native conversations/recordings. **[Validate with Microsoft]**

---

## 10. Dataverse Data Model

The custom channel persists its metadata in dedicated Dataverse tables, linked to standard CRM records so interactions appear natively on timelines and dashboards.

### 10.1 Custom tables

**`new_acvsession` — Audio/Video Session**

| Field | Type | Purpose |
|---|---|---|
| Name / Session ID | Text/Autonumber | Human-readable identifier |
| ACS Call ID / Server Call ID | Text | Correlates to ACS call |
| ACS Room ID | Text | Room/session reference |
| Channel mode | Choice (Audio/Video) | Media type used |
| Status | Choice (Pending/Routing/Active/Completed/Failed/Abandoned) | Lifecycle state |
| Direction / Entry point | Choice (Portal/Public/Auth area/Mobile) | Where it started |
| Customer (Contact) | Lookup → contact | CRM linkage |
| Account | Lookup → account | CRM linkage |
| Case | Lookup → incident | CRM linkage |
| Conversation / Work item | Lookup (if bootstrapped) | Optional native linkage |
| Agent | Lookup → systemuser | Assigned agent |
| Queue | Lookup → queue | Routing |
| Workstream | Lookup/Text | Routing config used |
| Start/End time, Duration | DateTime/Number | Metrics |
| Disposition / Wrap-up | Choice/Text | Outcome |
| Anonymous flag | Boolean | Identity model |

**`new_acvrecording` — Audio/Video Recording**

| Field | Type | Purpose |
|---|---|---|
| Recording ID | Text | ACS recording identifier |
| Session | Lookup → `new_acvsession` | Parent session |
| Format | Choice (mp4/mp3/wav) | Media format |
| Mixed/Unmixed | Choice | Recording mode |
| Blob URI / Container | Text | Storage location (BYOS) |
| Status | Choice (Recording/Available/Failed/Deleted) | State |
| Retention-until | DateTime | Lifecycle/WORM |
| Consent verified | Boolean | Compliance gate |

**`new_acvconsent` — Audio/Video Consent**

| Field | Type | Purpose |
|---|---|---|
| Session | Lookup → `new_acvsession` | Parent session |
| Contact | Lookup → contact | Who consented |
| Consent type | Choice (Recording/Transcription/Data use) | Scope |
| Value | Choice (Granted/Denied/Withdrawn) | Decision |
| Captured-at | DateTime | Evidence |
| Jurisdiction | Text/Choice | Legal basis |
| Disclosure channel | Choice | How presented |

**`new_acvevent` — Audio/Video Event / Telemetry**

| Field | Type | Purpose |
|---|---|---|
| Session | Lookup → `new_acvsession` | Parent session |
| Event type | Choice (Join/Leave/Mute/ScreenShare/QualityAlert/Error) | Lifecycle/quality |
| Timestamp | DateTime | Sequence |
| Participant | Text | Who |
| Quality metric / Error code | Text/Number | Diagnostics |

**`new_acvtranscript` — Transcript / Summary (optional)**

| Field | Type | Purpose |
|---|---|---|
| Session | Lookup → `new_acvsession` | Parent session |
| Transcript body | Multiline/File | Full transcript |
| AI summary | Multiline | Generated summary |
| Language | Choice | Locale |
| Source | Choice (ACS RT / Batch) | Provenance |

### 10.2 Linkage to standard records

- **Contact / Account / Case (`incident`)** — set as lookups on the session; surfaces the interaction in the customer/case context.
- **Phone Call activity (`phonecall`)** — create an activity "regarding" the customer/case so the session appears on the **native timeline**. **[Confirmed]**
- **Conversation / work item** — link to `msdyn_ocliveworkitem` only when a supported bootstrap pattern is used. **[Validate with Microsoft]**
- **Agent (`systemuser`), Queue, Workstream** — captured for routing analytics and reporting.

> Omnichannel internal entity logical names vary by version; confirm names in the target environment before building dependencies. **[Validate]**

---

## 10a. Workstream and Channel Configuration Model

### 10a.1 Why a custom configuration model is needed

The first-party Dynamics 365 voice channel exposes its settings — recording, transcription, language, storage, and IVR — directly through the voice-channel administrative UI and the underlying platform-owned configuration entities. A custom ACS-based audio/video channel **does not inherit those settings** and has no equivalent native configuration surface in Dynamics 365 Contact Center. The platform has no concept of an "ACS video channel instance" with its own configuration record.

The solution therefore requires a **custom channel configuration model** stored in Dataverse. This model serves two purposes:

1. **Operational control** — it drives runtime behaviour: whether audio, video, screen share, recording, and transcription are active for a given context.
2. **Decoupled administration** — administrators can adjust settings per workstream, queue, channel instance, or business unit without redeploying code.

### 10a.2 Configuration scope and association

A configuration record can be scoped to one of the following levels, in decreasing order of specificity (a more specific record overrides a broader one at runtime):

| Scope level | When to use |
|---|---|
| **Channel instance** | Different A/V entry points with different policies (e.g., a public anonymous entry vs. a premium authenticated area) |
| **Workstream** | All sessions routed through a specific workstream share the same defaults |
| **Queue** | A specialised queue (e.g., claims video queue) has its own recording or consent requirements |
| **Business unit** | Organisation-wide defaults, inherited when no more specific record exists |

A lookup on `new_acvchannelconfig` to the relevant entity (workstream logical name/ID, queue, or business unit) drives the association. The token service and session-creation function read the applicable configuration record at session-start time.

### 10a.3 Native vs custom configuration boundary

| Configuration type | Native Dynamics 365 surface | Custom `new_acvchannelconfig` record |
|---|---|---|
| Workstream type (Messaging / Record / Voice) | ✅ Dynamics admin UI | — |
| Queue, skills, operating hours, priority | ✅ Unified Routing admin | — |
| Agent capacity profile | ✅ Unified Routing admin | Capacity cost for video (**also** stored in `new_acvchannelconfig`) |
| Recording storage account | ❌ Not available for custom channel | ✅ Config record |
| Recording format and mode | ❌ Not available for custom channel | ✅ Config record |
| Transcription language / mode | ❌ Not available for custom channel | ✅ Config record |
| Consent message template | ❌ Not available for custom channel | ✅ Config record |
| Media capabilities (audio/video/screen share) | ❌ Not available for custom channel | ✅ Config record |
| Fallback behaviour | ❌ Not available for custom channel | ✅ Config record |
| Supervisor and Teams escalation toggles | ❌ Not available for custom channel | ✅ Config record |

### 10a.4 Proposed Dataverse configuration table: `new_acvchannelconfig`

**Table display name:** ACS A/V Channel Configuration
**Table logical name:** `new_acvchannelconfig`
**Primary key:** `new_acvchannelconfigid` (auto-generated GUID)
**Primary name column:** `new_name` (Text) — human-readable label, e.g., *"Claims Video Queue — EU Production"*

| Logical name | Display name | Type | Default | Description |
|---|---|---|---|---|
| `new_name` | Configuration name | Text (100) | Required | Human-readable label for the configuration record |
| `new_workstreamid` | Workstream reference | Text / Lookup | — | ID or name of the associated Unified Routing workstream |
| `new_queueid` | Default queue | Lookup → queue | — | Default routing queue for this channel instance |
| `new_businessunitid` | Business unit | Lookup → businessunit | — | Scope; used when no workstream/queue override exists |
| `new_enableaudio` | Enable audio | Boolean (Yes/No) | Yes | Whether voice audio is active for sessions using this config |
| `new_enablevideo` | Enable video | Boolean (Yes/No) | Yes | Whether camera video is active |
| `new_enablescreenshare` | Enable screen sharing | Boolean (Yes/No) | Yes | Whether screen share send/receive is permitted |
| `new_autorecording` | Enable automatic recording | Boolean (Yes/No) | Yes | Start recording automatically on session connect |
| `new_manualrecordingallowed` | Allow manual recording control | Boolean (Yes/No) | No | Agent can start/stop recording manually |
| `new_pauseresumeallowed` | Allow recording pause and resume | Boolean (Yes/No) | Yes | Enable pause/resume for sensitive segments |
| `new_recordingformat` | Recording format | Choice | MixedVideo | Options: AudioOnly · MixedAudio · UnmixedAudio · MixedVideo |
| `new_enabletranscription` | Enable transcription | Boolean (Yes/No) | No | Activate ACS real-time or post-call transcription |
| `new_transcriptionlanguage` | Transcription language | Text / Choice | en-US | BCP-47 language tag (e.g., en-US, he-IL, fr-FR) |
| `new_transcriptionmode` | Transcription mode | Choice | PostCall | Options: RealTime · PostCall |
| `new_enableaisummary` | Enable AI-generated summary | Boolean (Yes/No) | No | Generate a post-call AI summary (requires transcription) |
| `new_consenttemplate` | Consent message template | Multiline Text | — | Disclosure text shown to the customer before joining |
| `new_requireconsent` | Require consent before joining | Boolean (Yes/No) | Yes | Block session join until consent is captured |
| `new_storagecontainerurl` | Recording storage container URL | Text (500) | — | Azure Blob container base URL for BYOS recordings |
| `new_storagesasreference` | Storage SAS / credential reference | Text (200) | — | Key Vault secret name or Managed Identity scope reference — **never store the SAS key directly** |
| `new_retentiondays` | Recording retention period (days) | Integer | 365 | Days before blob lifecycle policy marks the recording for deletion |
| `new_accesscontrolpolicy` | Recording access control policy | Choice | AgentAndSupervisor | Options: AgentOnly · AgentAndSupervisor · ComplianceTeamOnly · Custom |
| `new_routingpriority` | Routing priority | Integer (1–100) | 50 | Session priority passed to the routing engine |
| `new_videocapacitycost` | Capacity cost for video sessions | Integer | 1 | Units consumed from the agent's capacity profile when a video session is active |
| `new_fallbackbehavior` | Fallback behaviour if video fails | Choice | AudioOnly | Options: AudioOnly · OfferCallback · EndSession |
| `new_supervisormonitorenabled` | Supervisor monitoring enabled | Boolean (Yes/No) | Yes | Allow supervisors to join as silent Consumer via ACS Room |
| `new_teamsescalationenabled` | Teams expert escalation enabled | Boolean (Yes/No) | No | Allow adding an internal Teams expert to the session |
| `new_telemetrylevel` | Telemetry and diagnostics level | Choice | Standard | Options: Off · Minimal · Standard · Verbose |
| `new_isactive` | Configuration active | Boolean (Yes/No) | Yes | Soft-disable a configuration record without deleting it |
| `new_effectivefrom` | Effective from | DateTime | — | Optional: enforce configuration only after this date/time |
| `new_effectiveto` | Effective to | DateTime | — | Optional: auto-expire the configuration |

### 10a.5 Example configuration record

The following represents a sample configuration for a **Video Claims Queue** in a European insurance organisation that requires automatic recording, Spanish-language transcription, strict consent, a 7-year regulatory retention, and supervisor monitoring.

```
Configuration name:        Claims Video Queue — EU (Spanish)
Workstream reference:      ws_claims_video_eu
Default queue:             Claims Video Agents — ES
Business unit:             Insurance Operations — EMEA

Media capabilities
  Enable audio:            Yes
  Enable video:            Yes
  Enable screen sharing:   Yes

Recording
  Automatic recording:     Yes
  Manual recording:        No
  Pause and resume:        Yes
  Recording format:        MixedVideo (mp4)

Transcription and AI
  Enable transcription:    Yes
  Transcription language:  es-ES
  Transcription mode:      RealTime
  Enable AI summary:       Yes

Consent
  Require consent:         Yes
  Consent template:        "This session will be recorded for quality assurance and
                            regulatory compliance. By proceeding, you consent to the
                            recording and transcription of this interaction."

Storage and retention
  Storage container URL:   https://<storageaccount>.blob.core.windows.net/claims-recordings
  SAS / credential ref:    kv-secret://acvrecording-sas-claims-eu
  Retention period:        2555 days (7 years)
  Access control policy:   ComplianceTeamOnly

Routing
  Default queue:           Claims Video Agents — ES
  Routing priority:        70
  Capacity cost:           1 (blocks parallel work for the agent)
  Fallback behaviour:      AudioOnly

Operations
  Supervisor monitoring:   Yes
  Teams escalation:        No
  Telemetry level:         Standard
  Configuration active:    Yes
  Effective from:          2026-06-01
  Effective to:            (none)
```

### 10a.6 How the configuration is consumed at runtime

The backend session-creation service reads the applicable `new_acvchannelconfig` record at the start of each session and uses its values to:

1. **Token service** — determine which media capabilities (`voip` scope, optional video/screen-share) to allow.
2. **ACS Room creation** — set Room validity window and participant roles.
3. **Consent gate** — present the `new_consenttemplate` text; block progression if `new_requireconsent = Yes` and consent has not been captured.
4. **Recording start** — if `new_autorecording = Yes`, start ACS recording with the specified `new_recordingformat` and `new_storagecontainerurl` (BYOS); apply `new_pauseresumeallowed` to the agent UI.
5. **Transcription** — if `new_enabletranscription = Yes`, start ACS real-time transcription (if `new_transcriptionmode = RealTime`) in `new_transcriptionlanguage`; otherwise enqueue post-call transcription.
6. **Routing** — pass `new_routingpriority` and `new_queueid` to the routing trigger; pass `new_videocapacitycost` to the capacity profile lookup.
7. **Supervisor UI** — conditionally expose the monitor join button based on `new_supervisormonitorenabled`.
8. **Teams escalation** — conditionally expose the "Add expert" control based on `new_teamsescalationenabled`.
9. **Telemetry** — configure App Insights verbosity based on `new_telemetrylevel`.
10. **Fallback** — if media setup fails, apply `new_fallbackbehavior` (degrade to audio-only, offer a callback, or end the session cleanly).

> **Security note.** The `new_storagesasreference` field stores a **reference** (e.g., a Key Vault secret name) — **never** a literal SAS key or connection string. The backend resolves this reference at runtime using its Managed Identity. **[Confirmed security principle]**

> **Administration UX.** Expose the `new_acvchannelconfig` table as a **custom model-driven app** (or a tab within the existing Contact Center admin app) using standard Dynamics 365 form configuration. Administrators interact with a form — they do not need to write code or edit JSON. **[Assumption]**

---

## 11. End-to-End Flow

1. **Customer opens the audio/video entry point** (portal, public page, authenticated area, or mobile app) hosting the ACS Calling SDK.
2. **Customer is identified or treated as anonymous** — authenticated users are mapped to a Contact; anonymous users get an ephemeral identity.
3. **Consent is presented and captured** at the entry point (before any media/recording).
4. **Backend creates an ACS identity and short-lived token** via the trusted token service (Managed Identity to ACS).
5. **Backend creates an ACS Room / call session** and assigns the customer the Attendee role.
6. **A pending session record is created in Dataverse** (`new_acvsession`), with consent recorded.
7. **Routing/assignment is triggered** via Unified Routing (record/messaging bootstrap) or the chosen routing model.
8. **Agent receives a notification in Dynamics 365** through CIF v2 (`notifyEvent`).
9. **Agent accepts** the interaction; CIF creates/focuses a session tab and screen-pops the customer/case record.
10. **The ACS media panel opens in the workspace** (PCF/web component) and the agent joins as Presenter (or is added via Call Automation).
11. **Customer and agent join the session**; audio/video/screen-share established.
12. **Recording starts after consent validation** (ACS Call Recording); pause/resume wraps sensitive segments.
13. **Session events are captured** (`new_acvevent`) for telemetry and quality.
14. **Recording is stored in Azure Blob (BYOS)** on completion; `RecordingFileStatusUpdated` fires.
15. **Metadata, transcript, and summary are written to Dataverse** by an Azure Function.
16. **The case timeline is updated** with a `phonecall`/custom activity and recording/transcript links.
17. **Supervisor and reporting views are updated**; ephemeral identities are cleaned up.

---

## 12. Supervisor and Operational Experience

**What is native vs custom:**

- **Native Omnichannel supervisor tools** (monitor/consult/barge, ongoing-conversations dashboard) apply to **native channels** (voice, chat, digital messaging) and **may not automatically apply** to a custom ACS channel, because the custom channel does not create a native conversation by default. **[Confirmed — live limitation]**
- **Supervisor capabilities for the custom channel must be built**, using ACS primitives:

| Capability | Approach |
|---|---|
| **Session-state monitoring** | Custom dashboard fed by `new_acvsession`/`new_acvevent` + ACS state. **[Assumption]** |
| **Recording status** | Surface `new_acvrecording` status. **[Assumption]** |
| **Participant state (agent/customer)** | ACS roster/participant events. **[Confirmed data / custom UI]** |
| **Call-quality diagnostics** | ACS UFD/pre-call diagnostics → App Insights → dashboard. **[Confirmed]** |
| **Supervisor join / barge** | Add supervisor to the ACS **Room/Call Automation** (muted Consumer for monitor; promote/AddParticipant for barge). **[Likely — validate]** |

> **Known limitation.** Do not assume native supervisor experiences are reusable for the custom channel. Treat supervisor tooling as a custom deliverable and validate any reuse with Microsoft. **[Confirmed — live / Validate with Microsoft]**

---

## 13. Reporting and Analytics

Standard Omnichannel analytics **may not automatically capture** the full lifecycle of a custom ACS channel (no native conversation record by default). Plan a **custom reporting approach**:

- **Dataverse dashboards** over `new_acvsession`/`new_acvrecording`/`new_acvconsent`/`new_acvevent`.
- **Power BI** for executive and operational reporting.
- **Azure Monitor + Application Insights** for service health, errors, and quality.
- **ACS call diagnostics** for media quality and reliability signals.
- **Recording/transcript metadata** for QA and audit.

**Recommended KPIs:** session count, average/percentile **duration**, **abandonment** rate, **recording status/coverage**, **consent rate**, **agent handling time**, **video usage** (% of sessions using video), **failure rate**, and **call-quality** scores (e.g., poor-call %). **[Assumption — metrics defined by this solution]**

---

## 14. Security and Identity

| Control | Implementation |
|---|---|
| **Agent identity** | Microsoft **Entra ID**; RBAC for workspace and recordings. **[Confirmed]** |
| **Backend identity** | **Managed Identity** for Azure Functions/APIs to ACS, Storage, Key Vault. **[Confirmed]** |
| **Customer tokens** | **Short-lived ACS tokens** (`voip` scope), refreshed via SDK callback. **[Confirmed]** |
| **No secrets in client** | ACS connection string/keys never exposed to the browser/app. **[Confirmed]** |
| **Secrets & keys** | **Key Vault** for secrets; **Customer-Managed Keys** where required. **[Confirmed]** |
| **Recording access** | **RBAC** + scoped SAS/Managed Identity; least privilege (write-only where possible). **[Confirmed/Assumption]** |
| **Blob access control** | Private containers; no public access; signed, time-limited retrieval. **[Confirmed]** |
| **Audit logs** | Log token issuance, recording access, and admin actions. **[Assumption]** |
| **Anonymous identity cleanup** | Scheduled `deleteUser` for ephemeral identities. **[Confirmed]** |
| **Privacy/GDPR deletion** | Workflow to delete Dataverse records **and** blobs **and** ACS identity. **[Confirmed/Assumption]** |
| **Encryption** | TLS 1.2+ signaling; SRTP/DTLS-SRTP media; AES-256 at rest. **[Confirmed]** |
| **Residency** | Pin ACS resource + storage to region; document media-path caveat. **[Confirmed]** |

---

## 15. Teams Role in the Architecture

Teams is **not recommended** as the core customer-facing media layer. It lacks native CCaaS routing, anonymous-customer identity/context, compliance-grade consent capture, and CRM linkage. **[Confirmed — live]**

**Where Teams adds value (internal only):**

- **Internal expert consultation** during a live customer session.
- **Supervisor collaboration** and coaching among internal staff.
- **Back-office escalation** for complex cases.
- **Adding an internal expert to the ACS session** via ACS↔Teams interop — the expert joins the customer's ACS session without moving the customer into a Teams meeting. **[Confirmed — live]**

**Principle:** the **customer remains on the ACS-based path** at all times to preserve control over identity, recording, consent, CRM linkage, and channel behavior.

---

## 16. MVP Implementation Plan

**MVP goal:** Prove the dedicated custom channel end-to-end for an authenticated web customer reaching an agent in the Dynamics workspace, with recording and Dataverse linkage.

**In scope:**
- Web customer **entry point** (ACS Calling SDK).
- **ACS token service** (Azure Function + Managed Identity).
- **ACS Room / call session** creation.
- **Basic agent notification** in Dynamics 365 (CIF v2 `notifyEvent`) and acceptance.
- **Embedded ACS media panel** in the workspace (PCF/web component) with mute, camera, screen share, end, status.
- **1:1 audio/video** session.
- **Recording to Azure Blob (BYOS)**.
- **Consent capture** at entry, logged to Dataverse.
- **Dataverse session and recording metadata** (`new_acvsession`, `new_acvrecording`, `new_acvconsent`).
- **Case/contact linkage** (+ `phonecall` activity on the timeline).
- **Basic monitoring and telemetry** (App Insights).

**Out of scope (deferred):**
- Mobile apps; advanced supervisor barge; complex routing; multi-region DR; advanced AI summaries; Teams expert escalation; full analytics package.

**Acceptance criteria:** A test customer starts a video call from the web entry point; an available agent receives a CIF notification, accepts, sees the customer/case record, and conducts audio+video+screen-share; recording is stored in your Blob and linked to the case; consent is logged; the session appears on the timeline.

**Indicative effort:** 6–10 weeks with a small team (1 Azure dev, 1 Power Platform dev, 1 front-end), assuming environments and licensing are ready. **[Assumption]**

---

## 17. Production Roadmap

| Phase | Focus | Key deliverables | Technical validation |
|---|---|---|---|
| **Phase 1 — Foundation & PoC** | Prove ACS media + token service | Entry point, token service, Room session, 1:1 audio/video | Media quality, token refresh, browser matrix |
| **Phase 2 — Dynamics workspace integration** | Make it feel native | CIF v2 notification/session/screen-pop/presence + PCF media panel | PCF iframe **getUserMedia/WebRTC** permissions **[Validate]** |
| **Phase 3 — Recording, transcription & compliance** | Control the media lifecycle | BYOS recording, consent capture, pause/resume, transcript + AI summary, retention/WORM | Event Grid → Function → Dataverse; deletion workflow |
| **Phase 4 — Routing & operationalization** | Assign work the native way | Unified Routing via record/messaging bootstrap; capacity profiles; presence sync | **Work-item/capacity pattern** with Microsoft **[Validate]** |
| **Phase 5 — Supervisor & reporting** | Oversight and KPIs | Custom supervisor dashboard, monitor/barge via ACS, Power BI/Dataverse analytics | Supervisor reuse vs custom **[Validate]** |
| **Phase 6 — Hardening, security & scale** | Production readiness | RBAC, CMK, audit logs, identity cleanup, load/scale tests, **multi-region DR** | DR/failover; cost model at peak |
| **Phase 7 — Teams internal collaboration & advanced** | Expert assist + extras | ACS↔Teams expert join; mobile apps; advanced AI | Interop limits; mobile push/CallKit |

---

## 18. Risks and Limitations

| # | Risk / limitation | Impact | Mitigation | Confidence |
|---|---|---|---|---|
| R1 | **Native communication panel cannot be fully reused** | Custom media UI required | Build PCF/web component for controls | [Confirmed — live] |
| R2 | **CIF v2 does not make the channel a first-class Omnichannel channel** | No auto conversation/capacity/analytics | Bootstrap via supported workstream; custom records | [Confirmed — live] |
| R3 | **Routing & capacity require validation** | Risk of non-native behavior | Validate work-item pattern with Microsoft | [Validate] |
| R4 | **Supervisor capabilities may be custom** | Extra build effort | ACS Room/Call Automation + custom dashboard | [Confirmed — live] |
| R5 | **Standard Omnichannel analytics may not apply** | Reporting gaps | Custom Power BI/Dataverse/App Insights | [Confirmed — live] |
| R6 | **Recording storage & retention are customer-owned** | Operational burden | BYOS + lifecycle/WORM + governance | [Confirmed — live] |
| R7 | **Browser/iframe media permissions** | Camera/mic may be blocked in PCF/CIF iframe | Configure `allow` attributes; validate; fallback web component | [Validate] |
| R8 | **ACS consumption cost must be modeled** | Budget risk at scale | Capacity model; storage lifecycle; alerts | [Likely] |
| R9 | **Microsoft supportability must be validated** | Production/support risk | Close the Section 19 questions before commit | [Validate] |
| R10 | **No Microsoft reference architecture for custom ACS media channel** | Higher design risk | Engage FastTrack/account team; PoC early | [Confirmed — live (absence)] |
| R11 | **No built-in ACS geo-replication/DR** | Availability risk | App-level multi-region + fallback | [Confirmed] |
| R12 | **Entity logical names vary by version** | Integration breakage | Confirm names in target env | [Validate] |

---

## 19. Microsoft Validation Questions

Close these with Microsoft (product group / FastTrack / account team) before committing to production:

1. What is the **supported pattern for attaching a custom ACS media session to a Dynamics 365 routed work item**?
2. Can a **custom ACS audio/video interaction consume agent capacity** through Unified Routing?
3. What is the **recommended approach for embedding ACS WebRTC inside the Dynamics 365 workspace**?
4. Are **PCF or CIF v2 supported for camera and microphone (getUserMedia)** access in this scenario, and what iframe/browser-policy configuration is required?
5. Can **custom ACS recordings be consumed by Dynamics 365 Quality Management**?
6. **Which supervisor capabilities can be reused** (monitor/consult/barge) and **which must be custom-built** for a custom ACS channel?
7. What **licensing** applies to Dynamics 365 Contact Center seats, **ACS consumption**, **recording**, and **Teams interoperability**?
8. Are there **roadmap items for standalone native video channel** support that could reduce custom scope?

---

## 20. Final Recommendation

**Implement a dedicated custom Audio & Video Channel based on Azure Communication Services**, integrated into Dynamics 365 Contact Center through a **custom agent-side media experience** (PCF/web component) orchestrated by **CIF v2**, with **Dataverse** metadata and case linkage, **ACS recording and transcription**, **Azure Blob Storage (BYOS)**, and **Azure orchestration services** (Functions, Event Grid, Monitor/App Insights). Use **Unified Routing** as the preferred assignment engine through a validated work-item/bootstrap pattern, and reserve **Teams for internal expert/supervisor collaboration only**, keeping the **customer on the ACS path** end to end.

This approach delivers the **greatest control** over customer entry points, media, **recording**, **transcription**, **compliance metadata**, **storage**, and **CRM linkage** — which is precisely why it is preferred over relying solely on the native in-chat voice/video elevation. The explicit trade-off is **ownership**: the implementation team is responsible for the **custom channel behavior, routing/capacity integration, supervisor features, analytics, and Microsoft supportability validation** captured in Sections 7, 12, 13, 18, and 19. With those validation points closed and the phased plan followed, this architecture provides a controlled, auditable, and CRM-integrated video engagement channel suitable for regulated and high-touch customer service.

---

## Appendix — Key live-verified Microsoft Learn references

| Topic | URL |
|---|---|
| ACS Call Recording (formats, 24h temp storage, pause/resume) | `https://learn.microsoft.com/en-us/azure/communication-services/concepts/voice-video-calling/call-recording` |
| ACS Teams-user (custom Teams client) calling capabilities | `https://learn.microsoft.com/en-us/azure/communication-services/concepts/interop/teams-user-calling` |
| CIF v2 overview (telephony-only) | `https://learn.microsoft.com/en-us/dynamics365/channel-integration-framework/v2/administer/overview-channel-integration-framework` |
| CIF v2 API reference index | `https://learn.microsoft.com/en-us/dynamics365/channel-integration-framework/v2/develop/reference/microsoft-ciframework-v2` |
| CIF v2 `createSession` | `https://learn.microsoft.com/en-us/dynamics365/channel-integration-framework/v2/develop/reference/microsoft-ciframework/createsession` |
| CIF v2 `notifyEvent` | `https://learn.microsoft.com/en-us/dynamics365/channel-integration-framework/v2/develop/reference/microsoft-ciframework/notifyevent` |
| CIF FAQ ("doesn't manage call/chat sessions") | `https://learn.microsoft.com/en-us/dynamics365/channel-integration-framework/faq-channel-integration-framework` |
| Bring Your Own Channel (Direct Line, messaging) | `https://learn.microsoft.com/en-us/dynamics365/customer-service/develop/bring-your-own-channel` |
| Voice channel overview (ACS-powered) | `https://learn.microsoft.com/en-us/dynamics365/customer-service/administer/voice-channel` |
| Voice channel ACS resource setup | `https://learn.microsoft.com/en-us/dynamics365/customer-service/administer/voice-channel-acs-resource` |
| Chat widget — Voice and video calls toggle (native elevation) | `https://learn.microsoft.com/en-us/dynamics365/customer-service/administer/add-chat-widget` |
| Supervisor — monitor voice calls (monitor/consult/join) | `https://learn.microsoft.com/en-us/dynamics365/customer-service/use/voice-channel-monitor-calls` |
| Supervisor — monitor conversations (native channels) | `https://learn.microsoft.com/en-us/dynamics365/customer-service/use/monitor-conversations` |
| Unified Routing overview | `https://learn.microsoft.com/en-us/dynamics365/customer-service/administer/overview-unified-routing` |
| Create workstreams (Messaging/Record/Voice) | `https://learn.microsoft.com/en-us/dynamics365/customer-service/administer/create-workstreams` |

> Several older `/voice-channel-overview` and `/contact-center/...` deep links now return 404; the URLs above are current working paths verified during research. Always navigate from the current Microsoft Learn landing page rather than cached deep links.

---

## CIF v2 Integration Role and Boundaries

This section defines the precise role of **Channel Integration Framework v2 (CIF v2)** in the proposed architecture. CIF v2 is positioned as the **Dynamics 365 workspace integration layer** — **not** the media layer, and **not** a full custom Omnichannel channel framework. **[Confirmed — live]**

### What CIF v2 is used for

CIF v2 provides the agent-workspace integration hooks that make the custom ACS channel feel part of Dynamics 365:

- **Displaying incoming interaction notifications** inside the agent workspace (`notifyEvent`, returning Accept/Reject/Timeout). **[Confirmed — live]**
- **Creating or focusing agent workspace sessions** (`createSession`, `getFocusedSession`; Generic templates, up to a documented maximum). **[Confirmed — live]**
- **Opening customer, contact, account, case, or custom session records** (`searchAndOpenRecords`, `createTab`). **[Confirmed — live]**
- **Supporting screen-pop behavior** on acceptance. **[Confirmed — live]**
- **Synchronizing or influencing agent presence** (`setPresence`/`getPresence`) so capacity is used appropriately. **[Confirmed — live]**
- **Hosting or launching the custom communication widget** within the workspace panel. **[Confirmed — live]**
- **Coordinating the agent-side acceptance flow** with the custom ACS session (CIF signals acceptance; the widget joins the ACS call). **[Confirmed — live]**

### Boundaries and limitations

CIF v2 explicitly does **not** do the following — these remain custom responsibilities:

- **CIF v2 does not provide the actual audio/video media experience.** It *"doesn't make calls or send messages"* and *"doesn't manage call or chat sessions."* **[Confirmed — live]**
- **CIF v2 does not automatically create a native Omnichannel conversation** (`msdyn_ocliveworkitem`). **[Confirmed — live]**
- **CIF v2 does not automatically consume agent capacity** through Unified Routing. **[Confirmed — live]**
- **CIF v2 does not automatically populate** the native conversation panel, customer summary, transcript, supervisor tools, or Omnichannel analytics. **[Confirmed — live]**
- **CIF v2 does not allow a custom ACS video channel to fully reuse the native first-party communication panel.** It is, by documentation, scoped to **telephony channels**. **[Confirmed — live]**
- **The actual A/V controls** — mute, camera on/off, screen sharing, hold, end call, recording status, and participant state — **must be implemented in a custom ACS-based agent widget, PCF control, or embedded web component.** **[Confirmed]**

### Recommended pattern

Use **CIF v2 for workspace orchestration and agent-experience integration**, and **Azure Communication Services for the actual real-time media session**. In this architecture:

- **CIF v2** handles the **agent workspace experience** (notification, session tab, screen-pop, presence, acceptance coordination).
- **ACS** handles **audio, video, screen sharing, recording, and call/session control**.
- **Dataverse** stores **session, consent, recording, transcript, and case-linkage metadata**.
- **Azure Functions / backend APIs** coordinate the **lifecycle** across ACS, Dynamics 365, Dataverse, and storage.

CIF v2 is therefore **valuable for making the custom ACS channel feel integrated** into Dynamics 365, but it does **not** make the custom channel equivalent to a **native first-party Dynamics 365 Contact Center voice or messaging channel**. The first-class behaviors (routed conversation, capacity, customer summary, native supervisor tools, native analytics) must be approximated through the supported work-item/bootstrap pattern and custom components described in Sections 6, 7, 12, and 13, and validated with Microsoft per Section 19. **[Confirmed — live / Validate with Microsoft]**

---

## סיכום בעברית (Hebrew Summary)

**מושג הפתרון.** מומלץ לבנות **ערוץ אודיו ווידאו ייעודי ומותאם אישית** עבור Dynamics 365 Contact Center, המבוסס על **Azure Communication Services (ACS)** כשכבת המדיה בזמן אמת. המטרה אינה רק לאפשר שיחת וידאו, אלא ליצור **ערוץ שירות מבוקר** הכולל אודיו/וידאו ושיתוף מסך, **הקלטה** של המדיה, **תמלול וסיכומי AI** אופציונליים, **לכידת הסכמה ומעקב ציות**, וקישור מלא ל-Case וללקוח ב-**Dataverse**. ACS מספק בדיוק את אבני הבניין הנדרשות: SDK להטמעה בדפדפן ובמובייל, ניהול זהות וטוקנים קצרי-תוקף, בידוד שיחות עם Rooms, שליטת צד-שרת (Call Automation), הקלטה עם אחסון בבעלותכם (BYOS), ואינטראופרביליות עם Teams להיוועצות פנימית. חשוב להכיר ביכולת הנייטיבית של הסלמת קול/וידאו מתוך הצ'אט החי, אך היא אינה נותנת שליטה מלאה על נקודות כניסה מותאמות, מחזור חיי ההקלטה והאחסון, התמלול, מטא-דאטה לציות והאינטגרציה ל-Dataverse — ולכן לערוץ ייעודי מותאם יש יתרון.

**גישת היישום.** הלקוח נכנס דרך פורטל/אתר/אפליקציה עם ACS, נוצר Room מבודד וטוקן קצר-מועד דרך שירות טוקנים מהימן (Managed Identity), והשיחה מנותבת לסוכן. חוויית הסוכן מוטמעת ב-Workspace באמצעות **CIF v2** (התראה, טאב סשן, Screen-pop, נוכחות) יחד עם **בקר PCF/רכיב ווב** המכיל את פקדי המדיה של ACS — שכן הפאנל הנייטיבי אינו ניתן לשימוש חוזר מלא וניתוב/קיבולת אינם נוצרים אוטומטית. ההקלטה מופעלת לאחר אימות הסכמה ונשמרת ב-**Azure Blob שלכם**; מטא-דאטה, תמלול, סיכום וקישור לתיק נכתבים ל-Dataverse דרך Azure Functions ו-Event Grid. **Teams** משמש להיוועצות פנימית בלבד, והלקוח נשאר תמיד בנתיב ה-ACS. גישה זו מעניקה את השליטה הרבה ביותר, אך מחייבת בעלות על התנהגות הערוץ, כלי המפקח, האנליטיקה, ואימות תמיכה מול מיקרוסופט לפני מעבר לפרודקשן.
