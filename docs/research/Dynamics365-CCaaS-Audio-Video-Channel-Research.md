# Dynamics 365 CCaaS — Custom Audio & Video Channel
## Technical and Business Research Brief

**Document type:** Technical and business feasibility / architecture research
**Audience:** Business stakeholders (Contact Center, Compliance, Operations) and technical stakeholders (Solution Architects, Power Platform / Azure engineers)
**Status:** Research and recommendation — for review and validation with Microsoft product teams before committing to build
**Last updated:** 2026-05-30

---

### How to read this document — evidence and confidence conventions

Throughout this document, claims are tagged so business and technical readers can separate fact from assumption:

- **[Confirmed]** — Supported by official Microsoft Learn documentation. Where a page was retrieved live during research it is marked **[Confirmed — live]**.
- **[Likely]** — Strongly supported by documented platform behavior and standard patterns, but the exact configuration/limit should be re-checked against the current Learn page (features move from Preview → GA frequently).
- **[Assumption]** — A reasonable design assumption made for this brief; must be validated for your tenant, region, and licensing.
- **[Open question]** — Requires explicit validation with Microsoft (product group, FastTrack, or your account team) before production commitment.

> **Important research caveat.** Microsoft moves Azure Communication Services (ACS) and Dynamics 365 Contact Center capabilities between Preview and General Availability frequently, and licensing/SKU details changed materially in 2024–2025. Confirm every licensing figure, GA status, and regional-availability statement against the live Microsoft Learn page and your Microsoft account team before design sign-off. Pricing figures in this document are **order-of-magnitude planning placeholders [Open question]**, not quotes.

---

## 1. Executive Summary

Dynamics 365 Contact Center (Microsoft's standalone Contact-Center-as-a-Service offering) and Dynamics 365 Customer Service with the voice add-on already use **Azure Communication Services (ACS)** as their underlying real-time communications platform. **[Confirmed]** This single fact shapes the entire recommendation: ACS is the Microsoft-validated, production-proven foundation for real-time customer-to-agent communication inside the Dynamics 365 ecosystem.

The goal of this brief is to identify the best approach to build a **custom Audio and Video channel** that lets customers and agents talk over real-time voice and video directly within the contact center experience, with session recording, CRM context, routing, and reporting.

Three options were evaluated:

1. **Microsoft Teams as the customer media layer** — Technically possible for meeting-style interactions (anonymous join), but Teams is a *collaboration / meeting* product, not a *customer-engagement channel*. It lacks native CCaaS routing, anonymous-customer identity/context, consent capture, and CRM linkage. **Not recommended as the core customer path.**
2. **Azure Communication Services as the customer media layer** — Purpose-built SDKs for browser and mobile, server-side call control and recording, identity/token model, Rooms for session isolation, and documented integration with the Dynamics agent desktop. **Recommended.**
3. **Hybrid** — Use ACS for the customer-facing audio/video and recording, Dynamics 365 for CRM/case/routing/agent workspace, and Teams strictly for *internal* agent collaboration, supervisor assist, and back-office escalation. **Recommended as the target operating model.**

**Recommendation:** Build the custom channel on **Azure Communication Services**, surfaced in the Dynamics 365 agent workspace via **Channel Integration Framework v2 (CIF v2)** and/or a **PowerApps Component Framework (PCF)** control, with session metadata in **Dataverse**, recordings written to **your own Azure Blob Storage (Bring Your Own Storage)**, and **Teams reserved for internal collaboration only**. Before building from scratch, however, every organization should first evaluate whether **licensing the first-party Dynamics 365 Contact Center voice/video capabilities** meets the requirement, because a custom build re-implements much of what that product already provides. **[Confirmed]**

---

## 2. Business Use Cases

### 2.1 Why an audio and video channel in a contact center

A real-time audio/video channel embedded in the agent's CRM workspace lets an organization move beyond chat and email to **high-trust, high-context, face-to-face-quality interactions** while preserving full CRM history, routing, and compliance. Core business use cases:

- **Escalation from chat/voice to video** when an issue needs visual confirmation (e.g., "show me the damaged part").
- **Identity and document verification** ("hold your ID to the camera") for onboarding, KYC, claims, and account recovery.
- **Guided visual troubleshooting** in field service, telecoms, appliances, and IoT.
- **High-touch advisory** for premium customers, wealth/insurance advisory, and clinical consults.
- **Accessibility** — sign-language interpretation and lip-reading support for customers with hearing impairments.
- **Co-browse / screen share** for form completion, quotes, and demonstrations.

### 2.2 When video is justified vs voice-only

| Scenario | Voice-only sufficient | Video adds clear value |
|---|---|---|
| Simple account questions, balances, status | ✅ | — |
| Password / access recovery | ✅ (often) | ✅ when ID verification required |
| Insurance claim with physical damage | — | ✅ (visual evidence) |
| Healthcare triage / tele-consult | Sometimes | ✅ (visual assessment, rapport) |
| Field service / technical setup | Sometimes | ✅ (guided visual repair) |
| Wealth / mortgage advisory | ✅ | ✅ (trust, document review, signing) |
| High-volume, low-complexity FAQ | ✅ | ❌ (cost/throughput) |

**Rule of thumb:** Video is justified when **visual context, identity assurance, or relationship/trust** materially changes the outcome — not for routine transactional contacts where it only adds cost and handle time.

### 2.3 Industry value

- **Insurance:** First-notice-of-loss with live video evidence capture; remote claims adjustment; reduced fraud; faster settlement.
- **Healthcare:** Tele-consultation, triage, follow-up, and remote monitoring with auditable consent and recording; HIPAA-eligible platform (ACS supports a BAA). **[Confirmed]**
- **Field service:** "See-what-I-see" guided repair reduces truck rolls and first-time-fix failures.
- **Financial services:** Video KYC/AML onboarding, advisory sessions, document co-review, and compliant recording for regulatory evidence.
- **High-touch / premium support:** Differentiated white-glove experience, higher CSAT and retention.

### 2.4 Key business questions — direct answers

1. **Business use cases?** Verification, visual troubleshooting, advisory, claims, accessibility, premium support (Section 2.1).
2. **When video vs voice?** When visual context, identity assurance, or trust changes the outcome (Section 2.2).
3. **Industry value?** Faster resolution, fraud reduction, fewer truck rolls, compliant evidence, differentiation (Section 2.3).
4. **Operational risks/limitations?** Bandwidth/device variability, agent training/staffing for video, privacy exposure of video, recording-storage cost and governance, build-vs-buy duplication of the first-party product (Section 14).
5. **Licensing/compliance/recording/governance?** ACS consumption-based media + Dynamics seat licensing; consent capture, retention, residency, and BYO storage are the organization's responsibility (Sections 11–13).
6. **Impact on agents/supervisors/QM/reporting?** New capacity profiles, video etiquette training, supervisor monitor/coach, QM on recordings/transcripts, additional KPIs (Section 2.5).
7. **MVP vs production?** MVP = authenticated web voice+video to a routed agent with recording and case linkage; production adds anonymous entry, mobile, IVR/bot triage, supervisor assist, advanced routing, analytics, DR (Sections 15–16).

### 2.5 Impact on agents, supervisors, quality, and reporting

- **Agents:** New on-camera etiquette, lighting/background, and privacy handling; capacity profiles must reflect that a video interaction typically consumes full attention (no parallel chats). **[Likely]**
- **Supervisors:** Live monitor / whisper / barge are expected capabilities. They are **built-in for the first-party Dynamics voice channel** but must be **custom-built** for an ACS custom channel using ACS Rooms/Call Automation participant control. **[Likely / Open question]**
- **Quality management:** Recordings and transcripts feed QA scorecards; unmixed (per-participant) audio recording improves agent-level scoring and analytics. **[Confirmed]**
- **Reporting:** First-party channels populate Omnichannel insights automatically; a custom channel must **write its own metrics to Dataverse / Azure** to appear in dashboards. **[Likely]**

---

## 3. Functional Requirements

| # | Requirement | Notes |
|---|---|---|
| F1 | Real-time 1:1 audio between customer and agent | ACS Calling SDK (web + mobile). **[Confirmed]** |
| F2 | Real-time 1:1 video between customer and agent | ACS Calling SDK; camera switch, mute, hold. **[Confirmed]** |
| F3 | Screen share / "see-what-I-see" | ACS screen share (browser tab/window/screen). **[Confirmed]** |
| F4 | Customer entry from web portal, authenticated area, public page, and mobile app | ACS web JS SDK + iOS/Android SDKs. **[Confirmed]** |
| F5 | Anonymous / unauthenticated customer access | "On-the-fly ACS identity + short-lived token" pattern; optionally inside an ACS Room. **[Confirmed]** |
| F6 | Routing/assignment to the right agent | Dynamics Unified Routing (preferred) and/or ACS Job Router. **[Confirmed]** |
| F7 | Agent experience inside Dynamics 365 workspace | CIF v2 widget and/or PCF control in the agent desktop. **[Confirmed]** |
| F8 | Full CRM context (customer, case, conversation, history) | Link to `contact`/`account`/`incident`/conversation entities. **[Confirmed]** |
| F9 | Session recording (audio, and video where required) | ACS Call Recording (mixed/unmixed; mp3/wav/mp4). **[Confirmed — live]** |
| F10 | Recording stored, retained, retrievable, and linked to the case | ACS BYO Storage → your Azure Blob; metadata in Dataverse. **[Confirmed]** |
| F11 | Consent capture and logging | Pre-call disclosure + recorded consent flag in Dataverse. **[Assumption — must build]** |
| F12 | Pause/resume recording (e.g., during card entry) | ACS `Pause`/`Resume` recording. **[Confirmed — live]** |
| F13 | Supervisor monitor / coach / barge | Built-in for first-party; custom build for ACS channel. **[Open question]** |
| F14 | Reporting and analytics | Custom metrics to Dataverse + Azure; optional ACS call diagnostics. **[Likely]** |
| F15 | IVR / bot triage before agent | ACS Call Automation + Copilot Studio. **[Confirmed]** |

---

## 4. Non-Functional Requirements

| Category | Requirement | Source / approach |
|---|---|---|
| **Availability** | Target 99.9%+ for customer-facing entry; graceful fallback when media fails | ACS SLA + app-level DR. ACS has **no built-in geo-replication**; HA/DR is the application's responsibility. **[Confirmed]** |
| **Scalability** | Support concurrent calls at peak; group calls up to 350 participants per call | ACS group/Rooms limit ~350. **[Likely]** |
| **Latency** | Real-time media (<300 ms typical mouth-to-ear) | ACS global media relays (TURN/STUN on Azure). **[Confirmed]** |
| **Security** | TLS 1.2+ signaling; SRTP (DTLS-SRTP, AES) media; AES-256 at rest | ACS encryption. **[Confirmed]** |
| **Data residency** | Store data at rest in chosen region; note media path is Azure-global | ACS data stored in resource region; **media path not residency-guaranteed**. **[Confirmed]** |
| **Compliance** | ISO 27001/27017/27018, SOC 1/2/3, HIPAA (BAA), PCI DSS, GDPR | Azure/ACS certifications. **[Confirmed — verify scope per feature]** |
| **Privacy** | Customer-Managed Keys (CMK) option; data deletion APIs | ACS CMK via Key Vault; `deleteUser`, recording delete. **[Confirmed / verify per data type]** |
| **Browser/device support** | Chrome, Edge, Safari (incl. iOS), Firefox (limited); native iOS/Android | ACS browser-support matrix. **[Confirmed — verify current matrix]** |
| **Observability** | Call quality diagnostics, telemetry, error tracing | ACS UFD/pre-call diagnostics + Azure Monitor/App Insights. **[Confirmed]** |
| **Cost control** | Consumption-based media metering; storage lifecycle policies | ACS pay-as-you-go; Blob lifecycle. **[Confirmed]** |

---

## 5. Dynamics 365 Contact Center — Custom Channel Options

There are several documented extensibility paths for surfacing a custom communication experience inside the Dynamics 365 agent workspace. They are **complementary**, not mutually exclusive.

### 5.1 Channel Integration Framework (CIF)

- **CIF v1** — Embeds a single CTI/communication widget as a side panel in **single-session** model-driven apps (Customer Service Hub, Sales Hub). Good for basic screen-pop, click-to-dial, and activity logging. **Not** multi-session. **[Confirmed]**
- **CIF v2** — Designed for the **multi-session Omnichannel / Customer Service workspace**. Adds session management (`createSession`, `getFocusedSession`), incoming-call notifications (`notifyNewIncomingCall`), panel control, and presence sync. **This is the documented model for embedding a custom voice/video channel into the Omnichannel agent desktop.** **[Confirmed]**

### 5.2 PowerApps Component Framework (PCF) control

A PCF control can embed the ACS calling UI directly on the conversation form, with access to the Dataverse record context (conversation/case) via `context` and `WebApi`. **Caveat:** PCF runs in a sandboxed iframe; `getUserMedia`/WebRTC may require careful iframe sandbox configuration and hosting. **[Confirmed / Open question — validate media permissions in the PCF sandbox]**

### 5.3 Custom Web Resource (iframe)

The older approach: an HTML/JS web resource hosting the ACS UI. Less integrated than PCF; fewer native context APIs. Useful as a quick path or for hosting the ACS widget loaded by CIF. **[Confirmed]**

### 5.4 Bring Your Own Channel (custom messaging via Direct Line bot)

Omnichannel supports custom **messaging** channels through an Azure Bot + Omnichannel Direct Line, which creates routed work items. This is **text-oriented** and adds latency unsuitable for WebRTC signaling — useful to **initiate/route** a conversation and carry context, while ACS carries the real-time media. **[Confirmed]**

### 5.5 First-party Dynamics 365 Contact Center voice/video

The first-party voice channel (ACS-powered) already provides PSTN/VoIP, IVR via Copilot Studio, unified routing, real-time transcription/sentiment/translation, recording to Azure Blob linked to the conversation, voicemail, and supervisor monitor/barge/whisper. **Evaluate this first** — a custom build re-implements much of it. **[Confirmed]**

> **Build-vs-buy note [Confirmed/Open question].** If the requirement is "voice + agent-initiated/escalated video with recording and CRM context," much of it may be satisfiable by licensing first-party capabilities plus a thin ACS video extension, rather than a full custom channel. Confirm current first-party **video** support and roadmap with Microsoft.

---

## 6. Microsoft Teams Feasibility Analysis (Option 1)

### 6.1 What Teams can do for this scenario

- **Anonymous customer join to a Teams meeting** via a shared link, no Microsoft account or license, with audio/video/screen share subject to meeting policy and lobby. **[Confirmed]**
- **Embed/launch from Dynamics:** A Teams meeting can be created via Microsoft Graph **Online Meetings API** and its join URL surfaced/launched from the agent workspace. **[Confirmed]**
- **Recording:** Convenience recording (to OneDrive/SharePoint) or **policy-based compliance recording** via a certified/custom **application-hosted media bot** using the Microsoft Graph Communications (Calls) API. **[Confirmed]**
- **ACS ↔ Teams interop:** ACS (custom) clients can join Teams meetings, and a custom Teams client built on the ACS Calling SDK can place 1:1/group calls to Teams users. **[Confirmed — live]**

### 6.2 What Teams cannot do well as a CCaaS customer channel

| Limitation | Impact |
|---|---|
| No native **ACD/IVR routing** for anonymous customers | Routing must be built externally (ACS/Dynamics). **[Confirmed]** |
| **No customer identity persistence** (anonymous users have no Entra identity) | Cannot reliably track/attribute customers across sessions or to CRM. **[Confirmed]** |
| **No native CRM/case integration** | Context, linkage, and history must be built separately. **[Confirmed]** |
| **Consent not captured in compliance-ready format** | Teams shows a recording banner but does not log consent; custom solution needed. **[Confirmed]** |
| **Compliance recording bot is heavy engineering** | Application-hosted media bots must be built/scaled; consider certified ISVs. **[Confirmed]** |
| **Licensing/agent side** | Agents need M365/Teams (and Teams Phone for PSTN) licensing; external customers do not, but lose identity features. **[Confirmed]** |
| **Interop feature gaps** | ACS-in-Teams users can't start/stop Teams recording, can't be organizer; Teams chat/reactions/breakout rooms not available to ACS participant. **[Confirmed]** |

### 6.3 Verdict on Teams

Microsoft's own guidance positions Teams as a **collaboration/meeting** layer, **not** the customer-engagement media layer for CCaaS. **[Confirmed]** Teams is excellent for **internal** agent collaboration, expert consult, and supervisor assist — and should be used there. It should **not** be the core customer-to-agent path because it lacks routing, anonymous-customer identity/context, consent capture, and CRM linkage that a contact center requires.

**Pros:** Familiar to agents; reuses existing M365 investment; mature meeting/recording; good for internal escalation.
**Cons:** Not a CCaaS channel; no routing/identity/CRM/consent natively; recording-bot complexity; interop feature gaps.

---

## 7. Azure Communication Services Feasibility Analysis (Option 2)

### 7.1 Calling SDK — browser and mobile

- **Web (`@azure/communication-calling`):** 1:1 and group audio/video, screen share (tab/window/screen), mute/hold, dominant-speaker, background blur/replace, DTMF, pre-call and in-call diagnostics, push notifications, transfer (blind/consultative), and Teams interop. **[Confirmed]**
- **iOS / Android / Windows SDKs:** native audio/video, camera switch, audio routing, push notifications (APNs/FCM), CallKit (iOS). **[Confirmed]**
- **Browser support:** Chrome/Edge (Chromium)/Safari (incl. iOS, with some screen-share-send limits)/Firefox (limited video). **[Confirmed — verify current matrix].**

### 7.2 Identity, tokens, and anonymous access

- Server-issued, short-lived **access tokens** (scopes: `voip`, `chat`, `voip+chat`) via a **trusted token service**; never expose the ACS key/connection string to the client; authenticate the backend with **Managed Identity**. **[Confirmed]**
- **Anonymous customers:** create an on-the-fly ACS identity + `voip` token per session; discard afterward. Optionally scope into an **ACS Room** so the customer can only join their assigned session. **[Confirmed]**

### 7.3 Rooms — session isolation

ACS **Rooms** are server-side, roster-controlled call sessions with roles (`Presenter`/`Attendee`/`Consumer`) and a validity window. They give per-interaction isolation (no cross-customer media bleed), least-privilege roles (agent = Presenter, customer = Attendee), and support scheduled callbacks and Teams-user join. **[Confirmed]**

### 7.4 Call Automation — server-side control

The **Call Automation** API (event-driven, via Event Grid/webhooks) provides server-side answer/create/redirect/reject, transfer, add/remove participant, hold, play/TTS, DTMF/speech recognition, **media streaming** (live audio over WebSocket), and **real-time transcription**. This enables IVR/bot triage, mid-call orchestration, and the "add the routed agent into the call" step. **[Confirmed]**

### 7.5 Recording — confirmed details (live-verified)

- Start/stop/**pause/resume** via server-side APIs; can be triggered by internal logic or a user action; works for **PSTN, WebRTC, and SIP** calls. **[Confirmed — live]**
- **Output:** mixed video **mp4** (1080p, ~16 FPS, 3×3 active-speaker tiles), mixed audio **mp3**/**wav**, and **unmixed** audio **wav** (up to 5 channels, one participant per channel). **[Confirmed — live]**
- **Built-in temporary storage retains recordings for 24 hours**, after which they are deleted — you must download or use **Bring Your Own Storage** to persist. **[Confirmed — live]** *(Note: earlier internal notes citing 48 hours are incorrect; the live page states 24 hours.)*
- **Bring Your Own Storage (BYOS):** write recordings directly to your own Azure Blob container; Microsoft does not retain a copy. Retrieval is driven by the `Microsoft.Communication.RecordingFileStatusUpdated` Event Grid event (contains the content location). **[Confirmed — live]**

### 7.6 Routing and agent assignment

Two viable models (Section 9 details the recommendation):
- **ACS Job Router** — jobs, queues, workers, channels, distribution/classification policies, offers; your app acts on the offer by adding the agent to the call via Call Automation. **[Confirmed]**
- **Dynamics Unified Routing** — work streams, queues, capacity profiles, and assignment for work items, shared with all Dynamics channels. **[Confirmed]**

### 7.7 Writing session metadata to Dataverse

Server-side functions (triggered by ACS Event Grid events) write call/session metadata — participants, timestamps, duration, recording URI, consent flag, routing decision — to Dataverse, linking to the conversation, case (`incident`), and `contact`/`account`. **[Confirmed pattern]**

### 7.8 Compliance, residency, encryption

TLS 1.2+ signaling; SRTP/DTLS-SRTP (AES-128/256) media; AES-256 at rest; CMK via Key Vault; data at rest in the resource region; **media path is Azure-global and not residency-guaranteed**; HIPAA BAA, PCI DSS, ISO/SOC, GDPR coverage (verify per feature). **[Confirmed]**

**Pros:** Purpose-built for embeddable real-time comms; full server control and recording; identity/token model; Rooms isolation; the same platform Microsoft uses for first-party D365 voice; strong compliance posture.
**Cons:** You assemble multiple SDKs (Calling, Identity, Rooms, Call Automation, Job Router) with glue code; supervisor tooling and reporting are build-your-own for a custom channel; DR is your responsibility; consumption-based cost modeling required.

---

## 8. Hybrid Architecture Evaluation (Option 3)

A hybrid model assigns each platform to what it does best:

| Concern | Platform | Rationale |
|---|---|---|
| Customer-facing audio/video/screen-share | **ACS** | Embeddable, anonymous-capable, recordable, isolated via Rooms. **[Confirmed]** |
| CRM, case, conversation, agent workspace, routing | **Dynamics 365** | Native CCaaS routing, context, and timeline. **[Confirmed]** |
| Internal consult, expert/supervisor assist, back-office collaboration | **Teams** | Mature collaboration; reuses M365. **[Confirmed]** |
| Recording storage / compliance archive | **Your Azure Blob (BYOS)** + lifecycle/immutable policies | Ownership, retention, residency control. **[Confirmed]** |
| Orchestration (events → CRM, consent, cleanup) | **Azure Functions / Power Automate / plug-ins** | Glue ACS events to Dataverse. **[Confirmed]** |

**Should Teams be on the core customer path?** No. **[Confirmed]** Teams belongs to the **internal collaboration** path (agent-to-expert consult, supervisor whisper/assist, escalation), reachable via ACS↔Teams interop when an agent needs to pull a Teams-based expert into a customer session. The **customer** always connects through ACS, which preserves identity handling, routing, consent, recording, and CRM linkage.

**Verdict:** The hybrid model is the recommended **operating model**; ACS is the recommended **core technology** (Section 9).

---

## 9. Recommended Architecture

### 9.1 Summary

**Customer → ACS (web/mobile) → ACS Room (isolated session) → routed to an agent → ACS UI embedded in the Dynamics agent workspace (CIF v2 + PCF) → recording to your Azure Blob (BYOS) → metadata + links in Dataverse → reporting/supervision. Teams is used only for internal collaboration via ACS↔Teams interop.**

### 9.2 Component responsibilities

| Layer | Component | Responsibility |
|---|---|---|
| Customer entry | Web portal / authenticated area / public page / mobile app, hosting the **ACS Calling SDK** | Start a session; capture consent; request a token |
| Auth model | **Trusted token service** (Azure Function / API, Managed Identity to ACS) | Issue short-lived `voip` tokens; authenticated users mapped to CRM identity, anonymous users get ephemeral identities |
| Session creation | **ACS Rooms** (server-side) | Create an isolated Room per interaction; assign roles; set validity window |
| Media service | **ACS Calling + Call Automation** | Carry audio/video/screen-share; server-side orchestration; IVR/bot; add agent to call |
| Routing | **Dynamics Unified Routing** (primary) with optional **ACS Job Router** | Classify and assign to queue/agent; create the work item |
| Agent experience | **CIF v2** widget + **PCF** control in Customer Service / Contact Center workspace | Incoming-call toast, screen-pop, embedded ACS video panel, presence, activity logging |
| Data model | **Dataverse** (conversation, session, recording, consent, custom entities) | Persist session metadata and CRM linkage |
| Case linkage | `incident`, `contact`, `account`, conversation entities | Tie the session to customer, case, and history/timeline |
| Recording | **ACS Call Recording** (mixed/unmixed; mp4/mp3/wav) | Capture audio and (when required) video; pause/resume for sensitive segments |
| Recording storage | **Your Azure Blob Storage (BYOS)** with lifecycle/immutability | Long-term retention, residency, retrieval |
| Consent | Pre-call disclosure + recorded consent flag in Dataverse | Legal basis; jurisdiction-aware |
| Monitoring/telemetry | **Azure Monitor / App Insights**, ACS diagnostics, Event Grid | Quality, errors, operational metrics |
| Security | Entra ID, Managed Identity, Key Vault (CMK), SRTP/TLS, RBAC | Identity, secrets, encryption, least privilege |
| Error handling/fallback | Pre-call checks; fallback to voice-only / PSTN / callback | Resilience when video/network fails |
| Reporting/supervision | Dataverse dashboards + ACS data; supervisor monitor/coach | KPIs and live oversight |

### 9.3 End-to-end session flow

1. **Entry & consent.** Customer clicks "Start video call" on the web/mobile entry point. A consent disclosure is shown; acceptance is captured.
2. **Token.** The browser/app requests a token from the trusted token service; the service creates an ACS identity (mapped to CRM for authenticated users, ephemeral for anonymous) and returns a short-lived `voip` token.
3. **Session/Room.** The backend creates an **ACS Room**, adds the customer as `Attendee`, and records a pending interaction in Dataverse.
4. **Routing.** A work item is created in **Dynamics Unified Routing** (carrying context: customer, intent, language, priority). The engine selects an available, skilled agent.
5. **Agent notification.** **CIF v2** raises an incoming-call toast in the agent workspace; the agent accepts; **screen-pop** opens the customer/case record.
6. **Agent joins media.** The embedded **PCF/ACS** panel joins the Room as `Presenter` (or **Call Automation** adds the agent), establishing audio/video/screen-share.
7. **Recording.** On connect, the backend starts **ACS recording** (with consent verified); pause/resume wraps any sensitive data capture.
8. **Live assist (optional).** Agent pulls in a Teams-based expert via ACS↔Teams interop, or a supervisor monitors/coaches.
9. **Wrap-up.** On disconnect, ACS emits Event Grid events; the **recording lands in your Azure Blob (BYOS)**; an Azure Function writes final metadata (duration, participants, recording URI, consent, disposition) to Dataverse and links it to the case/conversation/timeline.
10. **Reporting.** Metrics flow to Dataverse dashboards; recordings/transcripts feed QM and analytics; ephemeral ACS identities are cleaned up.

### 9.4 Written architecture diagram description

> **Left (Customer plane):** Web portal, public support page, authenticated customer area, and mobile app — each embedding the **ACS Calling SDK** — connect upward to the **ACS resource**.
>
> **Center-top (ACS plane):** The **ACS resource** contains **Identity/Token**, **Rooms**, **Calling/Media**, **Call Automation**, and **Call Recording**. A **Trusted Token Service** (Azure Function, Managed Identity) sits beside it and feeds tokens to the customer plane. **Call Recording** writes to **Your Azure Blob Storage (BYOS)** on the right.
>
> **Center (Integration plane):** **Azure Event Grid** carries ACS events to **Azure Functions / Power Automate**, which write to **Dataverse** and orchestrate consent/cleanup. **Unified Routing** (and optional **ACS Job Router**) sits here, turning sessions into routed work items.
>
> **Right (Dynamics plane):** The **Dynamics 365 Contact Center / Customer Service agent workspace** hosts the **CIF v2** widget and **PCF** ACS video panel. **Dataverse** holds conversation/session/recording/consent records linked to **Case (incident)**, **Contact**, and **Account**. **Supervisor dashboards** and **Omnichannel/Customer Service insights** read from Dataverse + ACS data.
>
> **Bottom (Internal collaboration plane):** **Microsoft Teams** connects to the ACS plane via **ACS↔Teams interop** for internal expert consult and supervisor assist — never as the customer entry point.
>
> **Cross-cutting (Security & Ops):** **Entra ID**, **Key Vault (CMK)**, **Azure Monitor / App Insights**, and **RBAC** wrap all planes. Arrows: Customer→ACS (media, SRTP), ACS→BYOS (recordings), ACS→Event Grid→Functions→Dataverse (metadata), Dynamics↔ACS (agent media + CIF control), Agent↔Teams (interop).

---

## 10. Data Model and Integration Points

### 10.1 Existing/relevant Dataverse entities

| Entity (logical name) | Purpose |
|---|---|
| `msdyn_ocliveworkitem` | Primary Omnichannel conversation/work item for an interaction. **[Likely — verify name in your version]** |
| `msdyn_liveworkstream` | Work stream (channel intake + routing config). **[Likely]** |
| `msdyn_ocsession` / `msdyn_ocsessionparticipant` | Agent session(s) within a work item and their participants. **[Likely]** |
| `msdyn_transcript` | Conversation transcript. **[Likely]** |
| `phonecall` (activity) | Standard call activity on the timeline. **[Confirmed]** |
| `incident` | Case. **[Confirmed]** |
| `contact` / `account` | Customer master data. **[Confirmed]** |

> Entity logical names for Omnichannel internals vary by version and should be **confirmed in your environment** before building dependencies. **[Open question]**

### 10.2 Proposed custom entities for the ACS channel

| Custom entity | Key fields |
|---|---|
| `new_acvsession` (A/V Session) | ACS callId/serverCallId, roomId, channel (audio/video), start/end, duration, customer ACS identity, agent, queue, disposition, related conversation/case lookups |
| `new_acvrecording` (Recording) | Recording ID, format (mp4/mp3/wav), mixed/unmixed, blob URI/container, retention-until, status, link to A/V Session |
| `new_acvconsent` (Consent) | Consent type, captured-at, jurisdiction, channel of disclosure, value (granted/denied), link to A/V Session and contact |
| `new_acvevent` (Telemetry, optional) | Event type, timestamp, quality metrics, error codes, link to A/V Session |

### 10.3 Integration points

- **ACS → Event Grid → Azure Functions → Dataverse Web API** for session/recording/consent metadata. **[Confirmed pattern]**
- **Trusted token service** (Function/API) ↔ ACS Identity. **[Confirmed]**
- **CIF v2 JS API** ↔ agent workspace (notifications, screen-pop, sessions, presence, activity logging). **[Confirmed]**
- **PCF control** ↔ Dataverse record context + ACS Calling SDK. **[Confirmed]**
- **Unified Routing** work-stream intake (optionally via a Direct Line bot to carry context). **[Confirmed]**
- **Power Automate** for low-code reactions (e.g., auto-create case, notify supervisor). **[Confirmed]**

---

## 11. Recording and Compliance Approach

- **Capture.** Start ACS recording server-side on call connect (after consent verified). Use **unmixed audio** for per-agent QA/analytics, **mixed mp4** when video evidence is required. **[Confirmed — live]**
- **Sensitive segments.** **Pause/resume** recording around payment-card or other sensitive capture for PCI alignment. **[Confirmed — live]**
- **Persistence.** Use **Bring Your Own Storage** so recordings land directly in **your** Azure Blob; do not rely on the **24-hour** built-in temporary store. **[Confirmed — live]**
- **Retention & immutability.** Apply Blob **lifecycle** and **immutable (WORM)** policies to meet regulatory retention; store the URI + retention metadata in Dataverse (`new_acvrecording`). **[Confirmed capability — configure per policy]**
- **Linkage & retrieval.** On `RecordingFileStatusUpdated`, copy/confirm the file in your container and link it to the case/conversation; surface a playback link in the agent/supervisor UI. **[Confirmed]**
- **Consent.** Present a jurisdiction-aware disclosure, capture explicit consent, and log it (`new_acvconsent`). Note Teams' recording banner does **not** satisfy compliance-grade consent logging — build your own. **[Confirmed]**
- **Deletion / GDPR.** Deleting a Dataverse record does **not** delete the blob — implement an explicit deletion workflow across Dataverse and Blob (and ACS identity cleanup). **[Confirmed]**
- **Certifications.** ACS/Azure provide HIPAA (BAA), PCI DSS, ISO/SOC, GDPR coverage — but **your configuration** determines actual compliance. **[Confirmed — validate scope per feature].**

---

## 12. Security and Identity Considerations

- **Token safety.** Never expose the ACS connection string/key client-side; issue **short-lived** tokens from a trusted backend authenticated via **Managed Identity**. Use the SDK `tokenRefresher` callback to refresh before expiry. **[Confirmed]**
- **Session isolation.** Use **Rooms** with least-privilege roles so a customer can only join their own session. **[Confirmed]**
- **Identity model.** Authenticated customers: map ACS identity to the CRM contact. Anonymous customers: ephemeral ACS identity, cleaned up post-call. Agents: Entra-backed identities. **[Confirmed]**
- **Encryption.** TLS 1.2+ signaling; SRTP/DTLS-SRTP media; AES-256 at rest; **CMK** via Key Vault where required. **[Confirmed]**
- **Network.** Allow-list ACS/Azure media relay IP ranges; optional ExpressRoute for signaling. **[Confirmed]**
- **RBAC & least privilege.** Scope BYOS SAS/Managed Identity to write-only where possible; restrict who can retrieve recordings; audit access. **[Confirmed/Assumption]**
- **Residency.** Pin ACS resource and storage to the required region; document that **media path** is Azure-global. **[Confirmed]**

---

## 13. Licensing and Operational Considerations

> All figures below are **planning placeholders [Open question]** — confirm with Microsoft.

- **ACS** is **consumption-based** (per-minute media, recording, PSTN if used, plus storage/egress). Model peak concurrency and average handle time for cost. **[Confirmed model]**
- **Dynamics 365** seat licensing for the agent workspace: **Dynamics 365 Contact Center** (standalone CCaaS) or **Customer Service Enterprise + voice add-on**. Exact SKUs/prices changed in 2024–2025 — verify. **[Confirmed direction / Open question on price]**
- **Teams** licensing applies only to **internal** users (agents/experts/supervisors); external customers need no Teams license when reached via ACS. **Teams Phone** add-on only if PSTN-via-Teams is used. **[Confirmed]**
- **First-party vs custom.** Licensing first-party Contact Center voice/video may be cheaper and faster than building/operating a custom ACS channel (which carries ongoing engineering, scaling, DR, and supervisor-tooling cost). **[Confirmed/Open question]**
- **Operational ownership.** With a custom ACS channel you own scaling, HA/DR, monitoring, supervisor tooling, reporting, identity cleanup, and recording governance. **[Confirmed]**

---

## 14. Risks, Limitations, and Open Questions

| # | Risk / limitation | Mitigation | Confidence |
|---|---|---|---|
| R1 | **Build duplicates the first-party product** | Evaluate licensing first-party voice/video before custom build | [Confirmed] |
| R2 | **Supervisor monitor/coach/barge not OOB for custom channel** | Build with Rooms/Call Automation participant control, or use first-party | [Open question] |
| R3 | **Reporting not automatic for custom channel** | Emit custom metrics to Dataverse/Azure | [Likely] |
| R4 | **24-hour built-in recording retention** | Use BYOS; persist immediately | [Confirmed — live] |
| R5 | **Media path not residency-guaranteed** | Document for compliance; data-at-rest pinned to region | [Confirmed] |
| R6 | **No built-in ACS geo-replication / DR** | App-level HA/DR; fallback to PSTN/callback | [Confirmed] |
| R7 | **PCF iframe sandbox may restrict getUserMedia/WebRTC** | Validate hosting; consider CIF-hosted external widget | [Open question] |
| R8 | **Consent logging is custom** | Build consent capture + storage | [Confirmed] |
| R9 | **Ephemeral ACS identities accumulate** | Implement `deleteUser` cleanup | [Confirmed] |
| R10 | **GA/preview drift & SDK version gating** | Re-verify GA status and pin SDK versions | [Confirmed] |
| R11 | **Browser variability (Safari/iOS screen-share, Firefox video)** | Capability detection + graceful degradation | [Confirmed] |
| R12 | **Entity logical names vary by version** | Confirm in target environment | [Open question] |
| R13 | **Cost overrun at scale (media + storage)** | Capacity model, lifecycle policies, alerts | [Likely] |

**Top open questions to validate with Microsoft:** current first-party **video** capability/roadmap (R1); supported pattern for **supervisor assist** on a custom ACS channel (R2); **PCF media-permission** support in the sandbox (R7); current **licensing/pricing** (Section 13); regional **GA** of Job Router, Rooms-Teams interop, and real-time transcription (R10).

---

## 15. MVP Implementation Plan

**MVP goal:** Authenticated web customer → routed agent → 1:1 audio **and** video with screen share, recording to your Blob, consent captured, and the session linked to the case — all inside the Dynamics agent workspace.

**Scope (in):**
1. Trusted token service (Azure Function + Managed Identity). **[Confirmed]**
2. Web entry point (authenticated area) with ACS Calling SDK; consent disclosure + capture. **[Confirmed]**
3. ACS Room per session; agent joins as Presenter. **[Confirmed]**
4. Routing via **Dynamics Unified Routing** (start simple: one queue, capacity profile that treats video as full-attention). **[Confirmed]**
5. Agent UI: **CIF v2** incoming-call toast + screen-pop; **PCF** ACS video panel on the conversation form. **[Confirmed]**
6. **ACS recording** (mixed mp4) → **BYOS** Azure Blob; metadata + recording link + consent to Dataverse custom entities. **[Confirmed — live]**
7. Basic playback link surfaced to agent/supervisor. **[Confirmed]**

**Scope (out for MVP):** anonymous entry, mobile apps, IVR/bot triage, supervisor barge, advanced analytics, multi-region DR.

**Acceptance criteria:** A test customer starts a video call from the portal; an available agent receives a toast, accepts, sees the customer record, conducts audio+video+screen-share; recording is stored in your Blob and linked to the case; consent is logged; the session appears on the timeline.

**Indicative effort:** 6–10 weeks with a small team (1 Azure dev, 1 Power Platform dev, 1 front-end), assuming environments and licensing are ready. **[Assumption]**

---

## 16. Production Implementation Roadmap

| Phase | Capabilities added |
|---|---|
| **P1 — Harden MVP** | Error handling/fallback (voice-only, PSTN, callback), pre-call diagnostics, telemetry (App Insights), security review (CMK, RBAC, SAS scoping), Blob lifecycle/immutability |
| **P2 — Reach & entry** | Anonymous/public entry via ephemeral identity + Rooms; mobile (iOS/Android) SDKs; push notifications |
| **P3 — Intelligence & triage** | Call Automation IVR + **Copilot Studio** bot triage; real-time transcription/sentiment; warm transfer |
| **P4 — Supervision & QM** | Supervisor monitor/coach/(barge), QM scorecards on recordings/unmixed audio, consent reporting |
| **P5 — Routing & scale** | Skills-based routing, priority/escalation, capacity tuning; optional ACS Job Router; load/scale testing |
| **P6 — Resilience & analytics** | Multi-region DR/failover, advanced dashboards (Dataverse + ACS data), cost optimization, accessibility features |
| **P7 — Collaboration** | ACS↔Teams interop for internal expert consult and supervisor assist |

Each phase should re-validate GA status, licensing, and any newly released first-party video capability that could reduce custom scope. **[Confirmed approach]**

---

## 17. Final Recommendation

1. **Adopt Azure Communication Services** as the core real-time audio/video technology for the custom channel — it is purpose-built, embeddable, recordable, and is the same platform powering Microsoft's first-party Dynamics 365 Contact Center voice channel. **[Confirmed]**
2. **Use a hybrid operating model:** ACS for the customer media path; Dynamics 365 for CRM/case/routing/agent workspace (via **CIF v2 + PCF**); **your own Azure Blob (BYOS)** for recordings; **Teams only for internal collaboration** via ACS↔Teams interop. **[Confirmed]**
3. **Do not place Teams on the customer path** — it lacks routing, anonymous-customer identity/context, consent capture, and CRM linkage required for CCaaS. **[Confirmed]**
4. **Evaluate the first-party Contact Center voice/video product before building** — it may satisfy much of the requirement and reduce custom engineering, scaling, DR, and supervisor-tooling burden. **[Confirmed/Open question]**
5. **Treat recording, consent, residency, and DR as first-class design concerns** — use BYOS (not the 24-hour temp store), capture consent explicitly, pin data-at-rest region, and own HA/DR at the application layer. **[Confirmed]**
6. **Validate the open questions** (first-party video roadmap, supervisor assist pattern, PCF media permissions, current licensing/pricing, regional GA) with Microsoft before design sign-off. **[Open question]**

**Bottom line:** Build the custom Audio & Video channel on **ACS**, embed it in **Dynamics 365** via **CIF v2 + PCF**, persist **recordings to your own Azure Blob**, model **routing/case/consent in Dataverse**, and keep **Teams for internal collaboration only** — while first confirming whether the first-party Dynamics 365 Contact Center capabilities already meet the need.

---

## Appendix A — Key Microsoft Learn references

> Live-retrieved during research are marked **[live]**. Others are canonical Learn paths from research and should be **re-verified** against the current site (paths shift over time).

**Azure Communication Services**
- Call Recording (formats, 24-hour temp storage, pause/resume) — `https://learn.microsoft.com/en-us/azure/communication-services/concepts/voice-video-calling/call-recording` **[live]**
- Teams-user (custom Teams client) calling capabilities — `https://learn.microsoft.com/en-us/azure/communication-services/concepts/interop/teams-user-calling` **[live]**
- Bring Your Own Storage for recording — `https://learn.microsoft.com/en-us/azure/communication-services/quickstarts/call-automation/call-recording/bring-your-own-storage`
- Calling SDK feature matrix — `https://learn.microsoft.com/en-us/azure/communication-services/concepts/voice-video-calling/calling-sdk-features`
- Identity model & authentication — `https://learn.microsoft.com/en-us/azure/communication-services/concepts/identity-model` ; `.../concepts/authentication`
- Rooms — `https://learn.microsoft.com/en-us/azure/communication-services/concepts/rooms/room-concept`
- Call Automation — `https://learn.microsoft.com/en-us/azure/communication-services/concepts/call-automation/call-automation`
- Job Router — `https://learn.microsoft.com/en-us/azure/communication-services/concepts/router/concepts`
- Security / encryption / privacy — `.../concepts/security` ; `.../concepts/encryption` ; `.../concepts/privacy`

**Dynamics 365 / Power Platform**
- Channel Integration Framework v2 — `https://learn.microsoft.com/en-us/dynamics365/channel-integration-framework/v2/overview-channel-integration-framework`
- Unified routing overview — `https://learn.microsoft.com/en-us/dynamics365/customer-service/administer/overview-unified-routing`
- Voice channel (ACS-powered) — `https://learn.microsoft.com/en-us/dynamics365/customer-service/` (voice channel section; **verify current path**)
- Bring your own (custom) channel — `https://learn.microsoft.com/en-us/dynamics365/customer-service/administer/` (custom channel; **verify current path**)
- PCF overview — `https://learn.microsoft.com/en-us/power-apps/developer/component-framework/overview`

**Microsoft Teams / Graph**
- Compliance recording for Teams calls/meetings — `https://learn.microsoft.com/en-us/microsoftteams/teams-recording-policy`
- Anonymous users in meetings — `https://learn.microsoft.com/en-us/microsoftteams/anonymous-users-in-meetings`
- Graph cloud communications (calls) — `https://learn.microsoft.com/en-us/graph/cloud-communications-calls`

> Two D365 URLs probed during research returned 404 (`/dynamics365/contact-center/overview` and `/dynamics365/contact-center/implement/overview`), confirming that Contact Center documentation paths have moved — **always navigate from the current Learn landing page rather than relying on cached deep links.** **[Open question]**

---

## סיכום בעברית (Hebrew Summary)

**מושג הפתרון וכיוון הטכנולוגיה המומלץ.** ההמלצה היא לבנות את ערוץ האודיו והווידאו המותאם אישית מעל **Azure Communication Services (ACS)** — אותה תשתית תקשורת בזמן אמת שעליה מבוסס גם ערוץ הקול המובנה של Dynamics 365 Contact Center. ACS מספק SDK לדפדפן ולמובייל לשיחות אודיו/וידאו ושיתוף מסך, מודל זהות וטוקנים קצרי-תוקף, בידוד שיחות באמצעות Rooms, שליטה צד-שרת והקלטה. מיקרוסופט ממצבת את Teams ככלי **שיתוף פעולה פנימי** ולא כערוץ מעורבות לקוחות, ולכן Teams לא צריך להיות בנתיב הלקוח אלא רק להיוועצות פנימית ולסיוע מפקח. לפני בנייה מותאמת אישית, מומלץ לבחון האם יכולות הקול/וידאו של מוצר Contact Center המובנה כבר עונות על הצורך ומפחיתות מאמץ פיתוח.

**גישת היישום המעשית.** הלקוח מתחבר דרך פורטל/אפליקציה עם ACS אל Room ייעודי ומבודד; שירות טוקנים מהימן (Azure Function עם Managed Identity) מנפיק טוקנים; ניתוב והקצאת סוכן נעשים ב-**Unified Routing** של Dynamics, וחוויית הסוכן מוטמעת ב-Workspace באמצעות **CIF v2** ובקר **PCF**. ההקלטה מופעלת בצד השרת (לאחר תיעוד הסכמה), ונשמרת **ישירות באחסון Azure Blob שלכם (BYOS)** ולא באחסון הזמני שנמחק לאחר 24 שעות; מטא-דאטה, קישורי הקלטה והסכמה נכתבים ל-**Dataverse** ומקושרים לתיק (Case) ולכרטיס הלקוח דרך Azure Functions/Event Grid. יש לטפל בהסכמה, שמירת נתונים, ריבונות נתונים והתאוששות מאסון כשיקולי ליבה, ולאמת מול מיקרוסופט נושאי רישוי, זמינות אזורית ויכולות וידאו עדכניות לפני אישור התכן.
