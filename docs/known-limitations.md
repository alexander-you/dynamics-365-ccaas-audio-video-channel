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
3. Recommended approach to **embed ACS WebRTC inside the D365 workspace** (PCF/CIF iframe `getUserMedia`); required iframe/browser-policy config?4. Can **custom ACS recordings be consumed by D365 Quality Management**?
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
