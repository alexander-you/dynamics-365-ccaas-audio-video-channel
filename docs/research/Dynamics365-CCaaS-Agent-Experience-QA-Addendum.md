# Addendum — Agent Experience, Routing, Recording & Supportability Q&A
## Dynamics 365 Contact Center — Custom Audio & Video Channel

**Companion to:** `Dynamics365-CCaaS-Audio-Video-Channel-Research.md`
**Purpose:** Direct answers to detailed agent-experience, routing, Dataverse, recording, Teams-vs-ACS, supervisor, supportability, and MVP questions.
**Status:** Research — validate with Microsoft before committing. Most claims below are **live-verified** against current Microsoft Learn pages (URLs in Appendix B).
**Last updated:** 2026-05-30

> **Confidence tags:** **[Confirmed — live]** page fetched and quoted this session · **[Confirmed]** documented · **[Likely]** strong inference, re-verify · **[Assumption]** design assumption · **[Open question]** validate with Microsoft.

---

## ⭐ The single most important finding (read first)

Two facts reshape every answer in this addendum:

1. **CIF v2 is scoped to *telephony channels only*.** The current CIF v2 overview page states verbatim: *"Dynamics 365 Channel Integration Framework 2.0 supports **only telephony channels**."* **[Confirmed — live]** It is a softphone/CTI widget framework — not a supported host for a custom **video** channel, and it does **not** automatically create a routed Omnichannel conversation.

2. **Dynamics 365 Contact Center already has native, ACS-powered voice *and video* — but only as an *escalation from Live Chat*, not as a standalone channel.** The chat widget has a **"Voice and video calls"** toggle (User features), and conversations can switch *"from the text mode to elevated voice or video modes."* **[Confirmed — live]** There is **no standalone native video channel**, and none appears on the 2025 Wave 1/Wave 2 roadmap. **[Confirmed — live]**

**Consequence:** The most *native-feeling, Microsoft-supported* way to get audio **and video** in the agent workspace today is to **use the Live Chat channel's built-in voice/video elevation** (first-party, fully integrated with routing, capacity, customer summary, supervisor monitor/barge, and analytics). A **fully custom ACS channel embedded via CIF v2/PCF** can approximate a native experience but will **re-implement** routing, capacity, conversation records, supervisor tooling, and analytics yourself — and is **off-label for video** under CIF v2. This trade-off drives the recommendations throughout.

---

# Section 1 — Dynamics 365 Agent Experience and UI Integration

**1. Can a custom A/V channel be integrated into the native agent experience the same way as the first-party voice channel?**
**No — not to the same degree. [Confirmed — live]** The first-party voice channel is *"built, owned, and operated completely by Microsoft"* on ACS and is a registered platform channel. A custom channel cannot register itself as a first-party Omnichannel channel; it can only be surfaced via CIF v2 (telephony-only), a PCF control, a web resource, or BYOC messaging (text-only). The closest native parity is **not** a custom channel at all — it is the **native voice/video elevation from Live Chat**. **[Confirmed — live]**

**2. Can the native communication panel and its call controls (answer, mute, hold, transfer, consult, end, recording indicators) be reused?**
**Only for native channels (voice + chat-elevated voice/video). [Confirmed — live]** The native Conversation Control / communication panel and its call controls are rendered by the platform for first-party channels. CIF v2 explicitly *"doesn't manage call or chat sessions"* and *"doesn't make calls or send messages"* — the provider builds its own call controls inside its widget. So a **custom ACS channel must implement its own answer/mute/hold/transfer/end/recording UI**; it cannot drive the native voice panel's buttons. **[Confirmed — live]**

**3. If the native panel can't be reused, what is the recommended Microsoft-supported embedding approach?**
In priority order:
- **(Best, supported, native) Use Live Chat with voice/video elevation** — no custom channel needed. **[Confirmed — live]**
- **(If a custom widget is required) Host the ACS calling UI in a PCF control** on the conversation form and/or a **CIF v2 telephony provider** widget, using CIF v2 session/notification/tab/presence APIs to integrate with the workspace. Treat the ACS video UI as a **custom widget** within these supported frameworks. **[Confirmed — live for the frameworks; the ACS-in-PCF/CIF video combination itself is custom/Open question]**

**4. CIF v2 vs PCF vs web resource vs combination?**
**A combination, with PCF as the primary media host. [Likely]**
- **PCF control** — hosts the ACS Calling SDK UI (audio/video/screen-share) on the conversation form, with Dataverse record context. Best for the in-form media experience. (Validate `getUserMedia`/WebRTC in the PCF iframe sandbox — see §7.3.) **[Confirmed framework / Open question on media perms]**
- **CIF v2** — provides the workspace integration hooks: incoming toast (`notifyEvent`), session tab (`createSession`), screen-pop tabs (`createTab`), and presence (`setPresence`). Note CIF v2 is **telephony-scoped**, so using it for a *video* channel is **off-label**. **[Confirmed — live]**
- **Custom web resource** — fallback host if PCF media permissions are problematic; less integrated.
- **Recommendation:** PCF for media + CIF v2 for notifications/session/presence, *or* (preferred) avoid custom entirely via Live Chat elevation. **[Likely]**

**5. Can CIF v2 create a *true* Omnichannel session, or only a widget + screen-pop?**
**It creates a real workspace *session tab*, but NOT a true Omnichannel *conversation*. [Confirmed — live]** `Microsoft.CIFramework.createSession()` *"creates a new session"* (Generic templates only, max 10) and produces a genuine multi-session tab in the Copilot Service workspace. However, CIF v2 does **not** automatically create the `msdyn_ocliveworkitem` Omnichannel conversation, does **not** plug into Unified Routing, and does **not** consume agent capacity. Those are the provider's responsibility via Dataverse APIs. So: **session tab + screen-pop + presence = yes; first-class routed conversation = no (custom code required).**

**6. Can the custom A/V interaction appear as a *first-class conversation* like chat/voice/messaging?**
**Not natively for a custom channel. [Confirmed — live]** First-class conversation status (auto-created `msdyn_ocliveworkitem`, routing, capacity, customer summary, analytics) is reserved for platform channels. The only way to get genuine first-class A/V is the **native voice channel** (audio) or **chat-elevated voice/video**. A custom channel can *simulate* first-class behavior by creating Dataverse records and a session tab, but it is **not** automatically first-class. **[Confirmed — live]**

**7. Can the custom channel use the native session tab, conversation panel, customer summary panel, and productivity pane?**
- **Session tab:** Yes, via `createSession` (Generic template). **[Confirmed — live]**
- **Customer summary / Active Conversation panel:** **Not auto-populated** for a custom channel — it is driven by the Omnichannel conversation context; you'd need custom code/forms. **[Confirmed — live]**
- **Productivity pane (agent scripts, macros, knowledge):** Available if configured in the app/session profile, but conversation context is **not** automatically linked for a custom channel. **[Confirmed — live]**
- For **native chat-elevated voice/video**, all of these are populated automatically. **[Confirmed — live]**

**8. Can the custom channel trigger the standard incoming conversation toast?**
**A CIF v2 notification toast — yes; the *Omnichannel* conversation toast — no. [Confirmed — live]** `notifyEvent` displays a workspace toast that returns `Accept`/`Reject`/`Timeout`. This *looks* native but is a CIF notification, not the platform's Omnichannel incoming-conversation notification tied to a routed work item. **[Confirmed — live]**

**9. Can the agent accept/reject via the native Omnichannel UI, or must acceptance happen in a custom ACS widget?**
- **Custom channel:** Accept/Reject happens through the **CIF `notifyEvent` toast** (returns the agent's choice to your provider), then your widget joins the ACS call. The *native Omnichannel* accept flow is not used. **[Confirmed — live]**
- **Native chat-elevated voice/video:** Accept/Reject is the standard Omnichannel flow. **[Confirmed — live]**

**10. Can the custom channel participate in native presence & capacity (blocking new work during a video call)?**
**Partially, via presence sync — but not native capacity. [Confirmed — live]** CIF v2 `setPresence`/`getPresence` lets a "blended agent" sync presence so capacity is *"optimally utilized,"* i.e., you can set the agent Busy/DND to discourage new work. However, true **capacity-profile consumption** (a unit cost that automatically blocks routing) belongs to native channels/work items; a custom channel must manage this via presence and/or by creating work items. For **chat-elevated voice/video**, native capacity applies automatically. **[Confirmed — live]**

---

# Section 2 — Routing and Work Item Integration

**1. Recommended way to create a routed work item for a custom real-time A/V interaction?**
**Prefer the native path (Live Chat elevation) so a routed work item is created automatically. [Confirmed — live]** If you must build custom, the documented routing primitives are **Messaging / Record / Voice** workstreams — there is **no "CIF telephony" workstream type**. A custom channel would have to create an entry that Unified Routing understands (e.g., route a **Record** work item, or use the **Custom messaging** workstream to bootstrap the conversation and carry context), then attach the ACS media. This bootstrap-via-messaging-then-elevate pattern mirrors how native chat→video works. **[Confirmed — live for primitives / Open question for the exact supported custom pattern]**

**2. Can Unified Routing be the primary engine, or is ACS Job Router required?**
**Use Unified Routing as primary; ACS Job Router is optional/secondary. [Confirmed — live]** Unified Routing *"can be used to route service requests on all channels"* and is the native engine that drives capacity, presence, and analytics. ACS Job Router is only needed if you route entirely outside Dynamics (not recommended when the goal is a native agent experience). **[Confirmed — live]**

**3. If Unified Routing is used, what entity/API creates the incoming work item?**
For native channels the platform creates `msdyn_ocliveworkitem` automatically. For a custom channel, the supported, documented hook is to **route through a workstream** — Messaging (incl. **Custom** via Direct Line) or **Record**. Directly creating/forcing `msdyn_ocliveworkitem` from custom code is **not a documented/supported public API** and should be validated. **[Confirmed workstreams / Open question on direct work-item creation]**

**4. Can the custom channel be a dedicated workstream and queue?**
- **Via BYOC (messaging):** Yes — a **Custom** messaging workstream + queue (text bootstrap), which can then elevate to ACS media. **[Confirmed — live]**
- **As a standalone real-time A/V workstream:** No such workstream type exists. **[Confirmed — live]**

**5. Can skills, capacity profiles, priorities, operating hours, and assignment rules be reused?**
**Yes — for any work item that flows through a supported workstream** (Messaging/Record/Voice). All these Unified Routing features apply to native and Custom-messaging workstreams. They do **not** apply to a pure CIF v2 telephony widget that bypasses workstreams. **[Confirmed — live]**

**6. Will routing diagnostics and conversation analytics capture the full A/V lifecycle?**
- **Native voice / chat-elevated A/V:** Yes — full lifecycle in Omnichannel analytics. **[Confirmed — live]**
- **Custom channel:** No, not automatically — you must emit your own telemetry/records; the native Conversation analytics won't see a non-platform conversation. **[Confirmed — live]**

**7. Limitations of Unified Routing for non-native, real-time media channels?**
There is **no workstream type for custom real-time media (CIF telephony)**; Unified Routing applies to Messaging/Record/Voice only. Real-time media elevation is supported **within** native chat/voice conversations, and **elevated voice/video conversations cannot be transferred across agents** once elevated. **[Confirmed — live]**

---

# Section 3 — Conversation, Case, and Dataverse Linkage

**1. Recommended Dataverse data model for custom A/V session metadata?**
- **Native path:** Reuse platform entities — the conversation (`msdyn_ocliveworkitem`), `msdyn_ocsession`, transcript, and the **`phonecall`/activity** timeline. **[Likely — verify names per version]**
- **Custom path:** Add custom tables (`new_acvsession`, `new_acvrecording`, `new_acvconsent`, optional `new_acvevent`) linked to conversation/case/contact/account (see base research §10.2). **[Assumption]**

**2. Link to `msdyn_ocliveworkitem`, `msdyn_ocsession`, `phonecall`, `incident`, or custom tables?**
- **If native (chat-elevated or voice):** the interaction *is* an `msdyn_ocliveworkitem` with `msdyn_ocsession`(s); a `phonecall` activity and `incident` can be associated on the timeline. **[Likely]**
- **If custom:** store A/V specifics in **custom tables** and relate them to `incident`/`contact`/`account` and (if you created one) the conversation; also write a **`phonecall` activity** so it appears natively on the timeline. **[Assumption/Likely]**

**3. Will the A/V session appear in the standard customer timeline as a communication activity?**
**Yes if you write a `phonecall` (or custom) activity. [Likely]** Native voice/chat-elevated sessions appear automatically; a custom channel appears on the timeline only if it creates an activity record regarding the customer/case. **[Likely]**

**4. Can it be linked automatically to an existing Case, Contact, Account, or Conversation?**
- **Native:** Yes, via screen-pop/context. **[Confirmed — live (customer summary)]**
- **Custom:** Yes, with code — resolve the customer (token/identity mapping or pre-chat survey) and set lookups; CIF `searchAndOpenRecords`/`createRecord` assist. **[Confirmed — live for APIs / Assumption for the resolution logic]**

**5. Can native wrap-up, disposition, and agent notes be reused?**
- **Native channels:** Yes (wrap-up, notes, conversation summary). **[Confirmed — live]**
- **Custom channel:** Not automatically — wrap-up/disposition UI is tied to the Omnichannel conversation; you'd build equivalent or bootstrap via a Custom messaging conversation to inherit it. **[Likely/Open question]**

**6. Can transcripts, call summaries, or AI-generated summaries attach to the same interaction record?**
- **Native voice/chat-elevated:** Yes — real-time transcription and AI conversation summary attach to the conversation. **[Confirmed]**
- **Custom channel:** Possible but custom — feed ACS real-time transcription/media-stream to your own store and write a `msdyn_transcript`/note; AI summary (e.g., Copilot/Azure OpenAI) is your build. **[Likely/Assumption]**

---

# Section 4 — Recording and Compliance

**1. Recording controls via the native communication panel, or only in the custom ACS UI?**
- **Native voice / chat-elevated:** Recording is controlled by the platform; a **recording indicator** shows in the panel. **[Confirmed — live]**
- **Custom ACS channel:** You implement start/stop/pause/resume in **your widget**, driving ACS Call Recording server-side. **[Confirmed]**

**2. How should recording status be shown to agent and supervisor?**
- **Native:** built-in recording indicator + supervisor visibility. **[Confirmed — live]**
- **Custom:** render a recording badge in your PCF/CIF widget and write status to Dataverse so supervisor dashboards (custom) can display it. **[Assumption]**

**3. Recording metadata/playback links in native conversation summary or timeline?**
- **Native voice:** Yes — recording/transcript surface in the conversation/timeline. **[Confirmed]**
- **Custom:** Only if you write the playback URI to a Dataverse record/activity and add it to a form/timeline. **[Assumption]**

**4. Same storage model as Dynamics voice, or separate Azure Blob?**
**A custom channel uses its own ACS Call Recording + Bring Your Own Storage (Azure Blob).** Do **not** rely on the 24-hour ACS temp store. The first-party voice channel manages its own ACS storage internally; a custom channel cannot write into that managed store, so **a separate BYO Blob model is required**. **[Confirmed]**

**5. Can Dynamics Quality Management consume recordings from a custom ACS channel?**
**Not out of the box. [Open question]** QM/QA features are built around native conversations/recordings. For a custom channel, plan to either (a) push recording references into a QA process via custom integration, or (b) use the native chat-elevated voice/video path so recordings are native. Validate current QM extensibility with Microsoft. **[Open question]**

**6. Consent in the native agent flow, or before the ACS session?**
**Best practice: capture consent *before* media starts (at the entry point), and log it. [Confirmed/Assumption]** The native recording banner is a notice, not compliance-grade consent logging. Capture explicit consent at the customer entry point (pre-call) and record it in Dataverse (`new_acvconsent`). For native channels, combine the platform notice with your own logged consent. **[Confirmed — live that banner ≠ logged consent]**

**7. Supported pause/resume from the agent UI for sensitive segments?**
- **Custom ACS channel:** Yes — ACS Recording **Pause/Resume** APIs, surfaced as a button in your widget. **[Confirmed — live]**
- **Native voice:** Validate whether the agent UI exposes pause/resume for compliance segments in your version. **[Open question]**

---

# Section 5 — Microsoft Teams vs ACS

**1. Any supported pattern where Teams is the media layer while preserving the native D365 agent experience?**
**Not as a customer-engagement channel. [Confirmed — live]** A **"Use Microsoft Teams phone in Dynamics 365 Contact Center"** capability exists (Wave 1, ~GA Sep 2025) for **voice**, but Teams is not a supported *customer A/V channel* embedded in the native conversation experience. The native agent experience for customer A/V is the **ACS-powered voice channel and chat-elevated voice/video**. **[Confirmed — live]**

**2. Can Teams meetings/calling be embedded into the native D365 communication panel?**
**No native embedding of Teams meetings into the conversation control. [Confirmed]** You could launch/join a Teams meeting from a custom widget, but it would not be the native communication panel experience. **[Confirmed]**

**3. If Teams is internal-only, can a Teams user be added to an ACS customer session *without* moving the customer into a Teams meeting?**
**Yes — via ACS↔Teams interop. [Confirmed — live]** A Teams user can be added to an ACS call/Room (and ACS clients can call Teams users), so an agent can pull a Teams-based expert into the **customer's ACS session** for internal consult, without relocating the customer into a Teams meeting. (Validate group-interop specifics and current GA.) **[Confirmed — live / Open question on group limits]**

**4. Limitations of ACS↔Teams interop in this scenario?**
ACS participants can't start/stop Teams recording or be meeting organizer; Teams chat/reactions/breakout rooms aren't available to ACS participants; some interop calling is constrained (e.g., honoring external/guest access config; certain ACS↔ACS operations unsupported in the Teams-client calling SDK). Re-verify the current capability matrix. **[Confirmed — live]**

**5. Does Microsoft recommend ACS as the primary media layer for custom customer-facing A/V?**
**Yes — by construction. [Confirmed — live]** Microsoft's own voice channel is *"built on Azure Communication Services,"* and chat voice/video elevation is ACS-powered. ACS is the platform Microsoft uses and the right primary media layer; Teams is positioned for internal collaboration. **[Confirmed — live]**

---

# Section 6 — Supervisor and Operational Experience

**1. Can supervisors monitor, whisper, coach, or barge a custom ACS A/V session?**
- **Native voice / chat-elevated A/V:** Yes — **Monitor** (silent listen), **Consult** (private text to agent — the docs' equivalent of "whisper"), and **Join/Barge**. **[Confirmed — live]**
- **Custom ACS channel:** **Not out of the box. [Confirmed — live]** No documented supervisor monitor/barge for CIF/custom channels; the Ongoing Conversations dashboard has nothing to show without a native conversation.

**2. If not OOB, what APIs/patterns to build them?**
Use **ACS server-side control**: add the supervisor as a muted **`Consumer`/Attendee** in the **ACS Room** for silent **monitor**; use **Call Automation `AddParticipant`** for **barge**; use a private channel/whisper via a separate audio path or text for **consult**. Surface controls in a custom supervisor app. **[Likely/Assumption — validate]**

**3. Can the supervisor experience surface inside D365 Contact Center dashboards?**
- **Native:** Yes — supervisor dashboards show ongoing conversations and allow monitor/assign/transfer/end. **[Confirmed — live]**
- **Custom:** Only via custom dashboards/embedded apps fed by your Dataverse/ACS data. **[Assumption]**

**4. Can live call quality, video status, network issues, and participant state be monitored in real time?**
**Yes, from ACS — but you build the supervisor view. [Confirmed]** ACS provides User-Facing Diagnostics (UFD), pre-call diagnostics, participant/call state, and quality metrics; pipe these to Azure Monitor/App Insights and a custom dashboard. Native channels surface their own quality signals in Microsoft's tooling. **[Confirmed]**

**5. Will the custom channel feed standard Omnichannel analytics, or is custom reporting required?**
**Custom reporting required for a custom channel; native channels feed Omnichannel analytics automatically. [Confirmed — live]**

---

# Section 7 — Product Boundaries and Supportability

**1. What is officially supported vs custom?**
| Supported by Microsoft | Custom (your responsibility) |
|---|---|
| First-party **voice channel** (ACS) | A fully **custom ACS A/V channel** end-to-end |
| **Chat voice/video elevation** (ACS) | ACS Calling SDK UI inside **PCF/CIF** for video |
| **CIF v2** telephony widget hooks (session, toast, tab, presence) | Creating routed work items / capacity for a custom channel |
| **BYOC** messaging via Direct Line (text) | Real-time **media** over BYOC (not supported) |
| **Unified Routing** for Messaging/Record/Voice | Supervisor monitor/barge for custom channels |
| Native supervisor monitor/consult/barge (native channels) | Analytics/reporting for custom channels |

**[Confirmed — live]**

**2. Unsupported patterns in embedding ACS Calling SDK inside PCF or CIF v2?**
- **CIF v2 is telephony-only** — using it to host a **video** channel is outside its documented scope. **[Confirmed — live]**
- Embedding ACS **video** in **PCF** is not a documented Microsoft pattern (no reference architecture); treat as custom and validate sandbox/media constraints. **[Open question]**

**3. Browser iframe / media permission limits for WebRTC inside the workspace?**
WebRTC needs `getUserMedia` (camera/mic), which requires the hosting **iframe to allow camera/microphone** and a **secure (HTTPS) context**. PCF/CIF widgets run in sandboxed iframes; the CIF v2 system-requirements guidance even notes ensuring *"microphone and speaker access is not blocked by browser policy."* **You must validate that the PCF/CIF iframe passes `allow="camera; microphone; display-capture"` and that org browser policies permit it.** **[Confirmed — live that the note exists / Open question on exact PCF iframe permissions]**

**4. Is there a Microsoft reference architecture for a custom ACS media channel in D365 Contact Center?**
**None found. [Confirmed — live: not found]** Microsoft documents the *first-party* voice channel and chat elevation, CIF v2, and BYOC — but **no published reference architecture for a custom ACS-based real-time media channel** in Contact Center. This is a strong signal to prefer native capabilities and to validate any custom build with Microsoft. **[Confirmed — live (absence)]**

**5. Roadmap items for native video that could reduce custom need?**
**No standalone native video channel on 2025 Wave 1/Wave 2 roadmaps. [Confirmed — live]** Related items: **Teams Phone in Contact Center** (voice, ~GA Sep 2025) and **rich media messaging** (images/files/cards, Preview Oct 2025 / GA Mar 2026 — not video calls). The existing **chat voice/video elevation** already covers many video needs today. Re-check future waves. **[Confirmed — live]**

---

# Section 8 — MVP and Architecture Decision

**1. For an MVP, native routing/workspace first, or validate ACS A/V independently first?**
**Two-track, but decide build-vs-buy first. [Likely]**
- **Track 0 (decision gate):** Pilot **native Live Chat with voice/video elevation**. If it meets the need, you may not require a custom channel at all — this is the lowest-risk, most-native route. **[Confirmed — live]**
- **Track A:** If native is insufficient, **validate the ACS A/V experience independently** (entry → token → Room → media → recording → BYOS) to de-risk the hardest technical part.
- **Track B:** In parallel, prove **workspace integration** (PCF media panel + CIF toast/session/presence) on a stub.
Integrate once both are proven. **[Likely]**

**2. Minimum supported architecture to prove end-to-end (entry → routing → accept → media → recording → Dataverse)?**
**Leanest native-leaning MVP:**
1. **Live Chat** entry with the **voice/video toggle** enabled (native routing, capacity, customer summary, supervisor — all free). **[Confirmed — live]**
2. Native recording/transcript + timeline linkage. **[Confirmed]**
3. Consent capture at entry, logged to Dataverse. **[Assumption]**

**Leanest *custom* MVP (if native rejected):** trusted token service → web entry (ACS SDK) + consent → ACS Room → **CIF `notifyEvent`** accept → **PCF/ACS** media panel → **ACS recording → BYOS** → Azure Function writes session/recording/consent to Dataverse + `phonecall` activity on the case. **[Confirmed components / Open question on supportability]**

**3. Mandatory for go-live vs deferrable?**
**Mandatory:** customer entry; agent accept in workspace; 1:1 audio+video+screen-share; recording to durable storage; consent capture/logging; case/contact linkage + timeline; basic supervisor visibility; security (token service, SRTP/TLS, RBAC). 
**Defer:** anonymous/public entry, mobile apps, IVR/bot triage, supervisor barge (custom), advanced analytics, multi-region DR, ACS↔Teams expert consult. **[Likely]**

**4. Main risks that prevent it feeling like a native D365 channel?**
- CIF v2 being **telephony-only** → video is off-label. **[Confirmed — live]**
- Custom channel is **not** a first-class conversation (no auto work item/capacity/customer-summary/analytics). **[Confirmed — live]**
- **No native supervisor monitor/barge** for custom channels. **[Confirmed — live]**
- **No Microsoft reference architecture** → support burden. **[Confirmed — live]**
- PCF iframe **media-permission** uncertainty. **[Open question]**
- Recording can't use the native voice storage model. **[Confirmed]**

**5. What to validate with Microsoft before full implementation?**
1. Whether **native chat voice/video elevation** meets requirements (likely yes for many cases). **[Confirmed — live it exists]**
2. Supported way (if any) to make a **custom A/V channel** a routed Omnichannel conversation (work-item creation, capacity). **[Open question]**
3. **Supervisor monitor/barge** options for custom A/V. **[Open question]**
4. **PCF iframe `getUserMedia`/WebRTC** support and any policy constraints. **[Open question]**
5. **QM/analytics** extensibility for custom recordings. **[Open question]**
6. Current **licensing/pricing** (Contact Center seat + ACS consumption + Teams Phone if used). **[Open question]**
7. **Roadmap** for native video and Teams Phone in Contact Center for your regions. **[Confirmed — live, but re-check waves]**

---

## Revised headline recommendation

1. **Start with the native path — Live Chat with voice/video elevation (ACS-powered).** It is first-class: native routing, capacity, customer summary, supervisor monitor/consult/barge, recording, transcript, and analytics — with **no custom channel to maintain**. **[Confirmed — live]**
2. **Only build a custom ACS A/V channel if native elevation genuinely cannot meet the requirement** (e.g., a public, chat-less, anonymous video entry point). Then use **PCF (media) + CIF v2 (workspace hooks) + ACS Rooms/Call Automation + BYOS recording + Dataverse**, accepting that you re-implement routing/capacity/supervisor/analytics and that **CIF v2 video is off-label**. **[Confirmed — live trade-offs]**
3. **Keep Teams for internal consult only** (ACS↔Teams interop to pull experts into the customer's ACS session). **[Confirmed — live]**
4. **Validate the seven open questions with Microsoft** before committing to a full custom build.

---

## Appendix B — Live-verified Microsoft Learn URLs (this session)

| Topic | URL |
|---|---|
| CIF v2 overview (telephony-only) | `https://learn.microsoft.com/en-us/dynamics365/channel-integration-framework/v2/administer/overview-channel-integration-framework` |
| CIF v2 API reference index | `https://learn.microsoft.com/en-us/dynamics365/channel-integration-framework/v2/develop/reference/microsoft-ciframework-v2` |
| CIF v2 `createSession` | `https://learn.microsoft.com/en-us/dynamics365/channel-integration-framework/v2/develop/reference/microsoft-ciframework/createsession` |
| CIF v2 `notifyEvent` | `https://learn.microsoft.com/en-us/dynamics365/channel-integration-framework/v2/develop/reference/microsoft-ciframework/notifyevent` |
| CIF v2 multi-session experiences | `https://learn.microsoft.com/en-us/dynamics365/channel-integration-framework/v2/administer/integration-multi-session-experiences` |
| CIF FAQ ("doesn't manage call/chat sessions") | `https://learn.microsoft.com/en-us/dynamics365/channel-integration-framework/faq-channel-integration-framework` |
| Bring Your Own Channel (Direct Line, messaging) | `https://learn.microsoft.com/en-us/dynamics365/customer-service/develop/bring-your-own-channel` |
| Configure custom channel | `https://learn.microsoft.com/en-us/dynamics365/customer-service/administer/configure-custom-channel` |
| Voice channel overview (ACS-powered) | `https://learn.microsoft.com/en-us/dynamics365/customer-service/administer/voice-channel` |
| Voice channel ACS resource setup | `https://learn.microsoft.com/en-us/dynamics365/customer-service/administer/voice-channel-acs-resource` |
| Chat widget — Voice and video calls toggle | `https://learn.microsoft.com/en-us/dynamics365/customer-service/administer/add-chat-widget` |
| Supervisor — monitor voice calls (monitor/consult/join) | `https://learn.microsoft.com/en-us/dynamics365/customer-service/use/voice-channel-monitor-calls` |
| Supervisor — monitor conversations (all native channels) | `https://learn.microsoft.com/en-us/dynamics365/customer-service/use/monitor-conversations` |
| Enable supervisor monitor/assign/transfer | `https://learn.microsoft.com/en-us/dynamics365/customer-service/administer/enable-monitor-assign-transfer-conv` |
| Unified Routing overview | `https://learn.microsoft.com/en-us/dynamics365/customer-service/administer/overview-unified-routing` |
| Create workstreams (Messaging/Record/Voice) | `https://learn.microsoft.com/en-us/dynamics365/customer-service/administer/create-workstreams` |
| Customer summary / Active Conversation panel | `https://learn.microsoft.com/en-us/dynamics365/customer-service/use/oc-customer-summary` |
| 2025 Wave 1 — Contact Center planned features | `https://learn.microsoft.com/en-us/dynamics365/release-plan/2025wave1/service/dynamics365-contact-center/planned-features` |
| 2025 Wave 2 — Contact Center planned features | `https://learn.microsoft.com/en-us/dynamics365/release-plan/2025wave2/service/dynamics365-contact-center/planned-features` |
| ACS Call Recording (formats, 24h temp, pause/resume) | `https://learn.microsoft.com/en-us/azure/communication-services/concepts/voice-video-calling/call-recording` |
| ACS Teams-user (custom Teams client) calling | `https://learn.microsoft.com/en-us/azure/communication-services/concepts/interop/teams-user-calling` |

> **Note:** Several older `/customer-service/voice-channel-overview` and `/contact-center/...` deep links now 404 — the URLs above are the current working paths verified this session. Always navigate from the current Learn landing page rather than cached deep links.

## סיכום בעברית (Hebrew Summary)

**הממצא המרכזי וכיוון מומלץ.** Dynamics 365 Contact Center כבר כולל יכולת אודיו **ווידאו** מובנית ומבוססת ACS — אך רק כ**הסלמה מתוך צ'אט חי** (מתג "Voice and video calls" בווידג'ט הצ'אט), ולא כערוץ עצמאי. אין ערוץ וידאו עצמאי מובנה ואין כזה במפת הדרכים של 2025. בנוסף, מסגרת CIF v2 תומכת **רק בערוצי טלפוניה** ואינה יוצרת שיחה אומניצ'אנל אמיתית, ניתוב או קיבולת באופן אוטומטי. לכן הדרך ה**נייטיבית והנתמכת ביותר** לקבל אודיו/וידאו בחוויית הסוכן היא להשתמש בהסלמת הקול/וידאו של ערוץ הצ'אט החי, ולא לבנות ערוץ מותאם אישית.

**גישת היישום המעשית.** מומלץ להתחיל בפיילוט של הצ'אט החי עם הסלמת וידאו (שמספק ניתוב, קיבולת, סיכום לקוח, ניטור מפקח והקלטה באופן מובנה). רק אם הצורך אינו מתממש כך (למשל נקודת כניסת וידאו אנונימית ללא צ'אט), יש לבנות ערוץ ACS מותאם אישית באמצעות **PCF** למדיה ו-**CIF v2** לחיבור לסביבת העבודה, עם **ACS Rooms/Call Automation**, הקלטה ל-**Azure Blob שלכם (BYOS)** ורישום מטא-דאטה והסכמה ב-**Dataverse** — תוך מודעות לכך שניתוב, קיבולת, ניטור מפקח ואנליטיקה יידרשו במימוש עצמי, ושאין ארכיטקטורת ייחוס רשמית מבית מיקרוסופט. את Teams יש לשמור ל**היוועצות פנימית** בלבד (צירוף מומחה לשיחת ה-ACS של הלקוח). לפני התחייבות למימוש מלא, יש לאמת מול מיקרוסופט: יצירת work item וקיבולת לערוץ מותאם, ניטור מפקח, הרשאות מדיה ב-PCF, אינטגרציית QM, רישוי ומפת דרכים.
