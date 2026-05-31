# Known Limitations — Native vs Custom vs Validate-with-Microsoft

> **Version:** 0.1.0. This document is the honesty contract of the solution. It separates what is
> **native** Dynamics 365 behavior, what must be **custom-built**, and what requires **Microsoft
> validation** before a production commitment.

## 1. Native vs custom capability matrix

| Capability | Native (first-party channels) | Custom ACS channel (this solution) |
|---|---|---|
| Workspace session tab | Automatic | Via CIF `createSession` (Generic template) **[Confirmed — live]** |
| Incoming notification | Automatic | Via CIF `notifyEvent` toast **[Confirmed — live]** |
| Screen-pop / record open | Automatic | Via CIF `createTab` / `searchAndOpenRecords` **[Confirmed — live]** |
| Presence sync | Automatic | Via CIF `setPresence`/`getPresence` **[Confirmed — live]** |
| Media controls (mute/camera/share/end) | Native panel | **Custom PCF/web component (ACS SDK)** **[Confirmed]** |
| Routed Omnichannel conversation + capacity | Automatic | **Custom — not automatic** **[Confirmed — live]** |
| Customer summary / productivity pane auto-context | Automatic | Partial / custom **[Confirmed — live]** |
| Supervisor monitor/consult/barge | Native (voice/chat) | **Custom for A/V** **[Confirmed — live]** |
| Omnichannel analytics | Automatic | **Custom (Dataverse/Power BI/App Insights)** **[Confirmed — live]** |
| Recording storage & retention | Platform-managed | **Customer-owned (BYOS)** **[Confirmed — live]** |
| Quality Management consumption | Native recordings | **Unconfirmed for custom recordings** **[Validate]** |

## 2. CIF v2 boundaries

CIF v2 is the **workspace integration layer**, not the media layer. **[Confirmed — live]**

**CIF v2 does:** notification, create/focus session, screen-pop, presence, host/launch the custom widget.

**CIF v2 does NOT:**
- Provide audio/video media ("doesn't make calls or send messages").
- Manage call/chat sessions.
- Auto-create a native Omnichannel conversation (`msdyn_ocliveworkitem`).
- Auto-consume agent capacity via Unified Routing.
- Auto-populate the native conversation panel, customer summary, transcript, supervisor tools, or analytics.
- Let a custom A/V channel fully reuse the native first-party communication panel (CIF is scoped to telephony).

→ The actual A/V controls (mute, camera, screen share, hold, end, recording status, participant
state) **must** be implemented in a custom ACS widget / PCF / web component. **[Confirmed]**

## 3. Items requiring Microsoft validation

Close these with Microsoft (product group / FastTrack / account team) before production:

1. Supported pattern to **attach a custom ACS media session to a routed work item**?
2. Can a **custom ACS interaction consume agent capacity** via Unified Routing?
3. Recommended approach to **embed ACS WebRTC inside the D365 workspace** (PCF/CIF iframe `getUserMedia`); required iframe/browser-policy config? Specifically: does the model-driven app page (`*.crm.dynamics.com`) emit a document-level **Permissions-Policy** allowing `camera; microphone`, and can a **PCF / web resource** (same-origin/in-DOM) call `getUserMedia`? See [workspace-media-surface-spike.md](workspace-media-surface-spike.md) §7. **[Open — partially confirmed: cross-origin app-tab is blocked, see §8]**
4. Can **custom ACS recordings be consumed by D365 Quality Management**?
5. **Which supervisor capabilities** (monitor/consult/barge) can be reused vs custom-built?
6. **Licensing** for D365 Contact Center seats, ACS consumption, recording, Teams interop?
7. Any **roadmap** for a standalone native video channel that could reduce custom scope?

## 4. Operational ownership (custom)

A custom ACS channel means the implementation team owns: monitoring, operational support, storage
lifecycle, ephemeral-identity cleanup, custom reporting, supervisor tooling, and Microsoft
supportability validation. These are first-class workstreams, not afterthoughts.

## 5. Environment-specific caveats

- Omnichannel internal entity **logical names vary by version** — confirm in the target environment. **[Validate]**
- **No built-in ACS geo-replication/DR** — disaster recovery is app-level. **[Confirmed]**
- **No Microsoft reference architecture** exists for a custom ACS media channel — higher design risk. **[Confirmed — live (absence)]**

## 5a. Camera/microphone publishing from an embedded workspace surface

- **The cross-origin Application Tab (Third-Party Website) cannot publish camera/microphone.**
  Confirmed live (2026-05-31): inside the embedded app-tab iframe, `getUserMedia` fails with
  `NotAllowedError: Permission denied` (camera/mic permission `denied`). A cross-origin iframe is
  denied media unless the **host** delegates `allow="camera; microphone"`, which is **not** an
  admin/maker-controllable attribute on the app-tab/side-pane iframe. **[Confirmed — live]**
- **Misleading ACS signal:** with capture denied, the ACS SDK still reports `startVideo: success` and
  "video published" because a `LocalVideoStream` object is attached — but **no frames flow**, so the
  customer's Agent tile is black. "Published" ≠ "transmitting". **[Confirmed — live]**
- **The pop-out top-level window is REJECTED** as the agent UX (kept only as a `?debug=1` diagnostic).
  **[Decision]**
- **Likely path:** host the publishing code on a **same-origin / in-DOM** surface (PCF code component
  preferred; HTML web resource as the cheapest first probe) so capture is governed by the workspace
  page's own policy rather than a denied cross-origin delegation. Feasibility is a **grounded
  hypothesis pending a same-origin probe + Microsoft validation** — see
  [workspace-media-surface-spike.md](workspace-media-surface-spike.md). **[Validate]**
- **Same-origin capture probe DEPLOYED (2026-05-31):** a minimal, unbound HTML web resource
  `alex_acv_capture_probe.html` was created in **Demo Contact Center EN** (solution
  `alex_visual_engagement_channel`) to empirically test whether a same-origin Dynamics surface gets
  document-level camera/microphone permission. No ACS, no Dataverse writes, no storage/tokens, not
  bound to navigation or any template. **CONCLUSIVE result (2026-05-31):** capture succeeded **both**
  top-level **and inside the model-driven app-shell iframe** (`Inside iframe = Yes`, `Parent origin =`
  the Dynamics origin) — Permissions-Policy allows camera + microphone, permissions granted,
  `getUserMedia({video,audio})` **SUCCESS** with a local preview. A same-origin / in-DOM Dynamics
  surface (incl. the app's own content iframe) **can** capture camera/mic; the blocker was specifically
  the **cross-origin** third-party Application Tab (`NotAllowedError`). **Live-validated publishing path
  = PCF code component (or same-origin web resource / custom page); remaining validation is runtime +
  Microsoft support, not permissions.** See spike §11. **[Confirmed — embedded same-origin capture
  works]**
- **PCF Media Host POC BUILT (2026-05-31) — packaging finding + resolution:** `alex_AcvMediaHost`
  ("Visual Engagement Media Host") was scaffolded under `pcf/acv-media-host`, wrapping the proven
  `RealMediaSession` ACS engine (token → join → publish camera/mic → render local + remote → cleanup),
  with config from PCF inputs (dynamic `acsGroupId`/`contextId`/`tokenUrl`, no static group, no token in
  code). **A PCF cannot *bundle* the ACS Calling SDK** — minified it is ~5.5 MiB, over PCF's **hard 5 MB
  per-component limit** (`pcf-1045`), and code-splitting is forbidden (`pcf-scripts` forces
  `maxChunks: 1`, *"the PCF runtime cannot handle chunked bundles"*). **Resolved by loading the SDK at
  runtime:** the SDK is built separately into a standalone self-contained IIFE
  (`sdk-host/dist/acv-acs-sdk.js`, ~5.15 MiB, exposes `window.AcvAcs`) and loaded by the control via a
  `<script>` from a configurable `sdkUrl`. The PCF component bundle is then **21.4 KiB** and
  **production packaging SUCCEEDS** (`solution.zip` ~11 KB). Remaining: build + host the SDK file
  (same-origin web resource or allowlisted host) and the live in-Dynamics 2-way test. See spike §12.
  **[Confirmed — ACS SDK builds in PCF; live runtime pending]**

## 6. Co-browsing (future, out of MVP scope)

**Screen sharing is in the MVP** (native ACS Calling SDK). **True co-browsing is not.** Do not
treat ACS screen sharing as co-browsing — they are different capabilities (see
[architecture.md §9](architecture.md)).

Co-browsing should be delivered later as a **custom module**, evaluated against a real-time
transport such as **Azure Web PubSub** or **Azure Fluid Relay**, and must include **consent**,
**field-level masking** of sensitive inputs, an **audit trail**, and **Dataverse linkage** to the
conversation/case. **[Assumption — design later]**

## 7. IaC / deployment automation (Phase 3b — scaffold only)

- The Bicep templates under [`/infra`](../infra/README.md) and the helper scripts under
  [`/scripts`](../scripts/README.md) are **scaffolding only**. **No Azure resources have been
  provisioned**, and no `az deployment` command is run by this repository.
- The real (non-mock) ACS, Dataverse, and storage service implementations are **not** included
  yet; `USE_MOCKS` remains `true`. The IaC describes the target topology so a future approved
  deployment is reviewable and repeatable.
- RBAC deployment requires **Owner / User Access Administrator**; ACS data-plane roles still
  require **[Validate with Microsoft]**.

## 8. Agent media component & browser/iframe permissions (Phase 3c — scaffold only)

- The agent media panel under [`src/agent-media-panel`](../src/agent-media-panel/README.md) is a
  **local, mock-mode** web component. It is **not registered or imported into Dynamics 365**, uses
  **no real ACS tokens**, and creates no Dataverse/Power Platform artifacts.
- The real implementation will use `getUserMedia` / `getDisplayMedia` and the ACS Calling SDK. When
  embedded in the D365 workspace, media access depends on the hosting **iframe Permissions-Policy**
  delegating `camera; microphone; display-capture; autoplay` over **HTTPS**. **[Validate with Microsoft]**
- Whether the **PCF/CIF iframe** in Dynamics 365 permits `getUserMedia` / `getDisplayMedia`, and the
  exact `allow` / CSP configuration required, is an **open validation item** (also listed in §3).
  **[Validate with Microsoft]**
- **Screen sharing (`getDisplayMedia`)** may be restricted inside cross-origin iframes and requires a
  user gesture; co-browsing remains a separate future capability (§6). **[Assumption — validate]**
- The choice of **PCF control vs web resource** for the eventual embedding is recorded in
  [ADR-0008](adr/0008-agent-media-component-approach.md) and is finalized in a later phase.
