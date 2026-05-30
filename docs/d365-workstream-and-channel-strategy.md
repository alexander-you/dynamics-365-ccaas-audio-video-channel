# Workstream & Channel Strategy for the Custom ACS A/V Channel (Phase 4A — Planning Only)

> **Version:** 0.1.0 · **Status:** PLANNING ONLY — **no workstream, queue, routing rule, or capacity
> profile has been created.** This document evaluates *how* the custom channel should relate to
> Dynamics 365 routing, and recommends a model to validate.
> **Approval gate:** No routing configuration is created until separately approved. See
> [d365-pre-change-checklist.md](d365-pre-change-checklist.md).

Related: [cif-v2-configuration.md](cif-v2-configuration.md) ·
[d365-agent-workspace-integration.md](d365-agent-workspace-integration.md) ·
[channel-configuration-model.md](channel-configuration-model.md).

---

## 1. The core constraint

> **There is no native, standalone "custom real-time audio/video" workstream type in Dynamics 365.**

Unified Routing ships workstream **channel types** for **Messaging**, **Voice (Azure
Communication Services telephony)**, **Record**, and **Case/Entity**. A bring-your-own **real-time
A/V** channel is **not** a first-class workstream channel type. CIF v2 (the workspace integration) is
**not** a routing mechanism and does **not** create a routable work item or consume capacity by
itself.

Therefore the work item that represents an incoming A/V request must be **bootstrapped** into a
routing-capable shape. Three candidate models are evaluated below; **Phase 4A validates the workspace
experience first and does not implement routing.**

---

## 2. Candidate routing models

### Model A — Record-based workstream (recommended to validate first)

Create an **Audio/Video Session** Dataverse record (`alex_acvsession`) when a request arrives; a
**Record** workstream routes that record to a queue/agent using Unified Routing.

| Aspect | Detail |
|---|---|
| Work item | A Dataverse row (`alex_acvsession`) |
| Routing | **Record-based routing** workstream → queue → assignment |
| Capacity | Standard capacity/units via the workstream/capacity profile |
| Skills/priority | Native (attributes on the record drive skill/priority rules) |
| Pros | Uses native Unified Routing, capacity, skills, assignment, reporting; auditable |
| Cons | Requires the `alex_acvsession` **table** (deferred — schema approval needed) |
| Fit | **Best native alignment**; recommended target once schema is approved |

### Model B — Custom Messaging / BYOC bootstrap

Use a **Custom Messaging (BYOC)** channel to create a conversation/work item that, on accept,
**launches the ACS media session** (the message thread is the routing carrier; media rides alongside
via the custom panel).

| Aspect | Detail |
|---|---|
| Work item | A messaging conversation (custom/BYOC) |
| Routing | Native **Messaging** workstream → queue → assignment |
| Capacity | Messaging capacity model |
| Pros | Real conversation object, presence, capacity, reporting; agent gets a familiar messaging session that "upgrades" to A/V |
| Cons | Conceptual mismatch (A/V represented as a message thread); BYOC bootstrap/maintenance; more moving parts |
| Fit | Viable alternative if a conversation object is desired before media |

### Model C — External ACS Job Router (fallback only)

Route entirely **outside** Dynamics using **ACS Job Router**; Dynamics only **reflects** assignment
via CIF v2 (notification + screen-pop), not native routing.

| Aspect | Detail |
|---|---|
| Work item | ACS Job Router job (outside Dataverse) |
| Routing | ACS Job Router (queues, workers, distribution policies) |
| Capacity | Managed in ACS, **not** Dynamics capacity |
| Pros | Fully decoupled; flexible; no Dataverse routing dependency |
| Cons | **Bypasses** native Unified Routing, capacity, skills, reporting, supervisor tooling; duplicate worker/agent modeling; weaker D365 integration |
| Fit | **Fallback only** — use if routing must live outside Dynamics |

---

## 3. Recommendation

| Decision | Recommendation |
|---|---|
| **Phase 4A (now)** | Validate **workspace experience only** (CIF v2). **No routing.** Trigger is mock. |
| **Primary target model** | **Model A — Record-based workstream** on `alex_acvsession` (after schema approval) |
| **Alternative** | **Model B — Custom Messaging / BYOC** if a conversation object is required up front |
| **Fallback** | **Model C — ACS Job Router** only if routing is deliberately handled outside Dynamics |

Rationale: Model A keeps **routing, capacity, skills, assignment, and reporting native** to Dynamics,
which maximizes supervisor/reporting reuse and minimizes parallel infrastructure. It depends only on a
small custom table, which is approved separately.

---

## 4. How each Unified Routing concept maps (target = Model A)

| Concept | Native role | Custom A/V mapping (future) |
|---|---|---|
| **Workstream** | Entry point + routing config | **Record** workstream bound to `alex_acvsession` |
| **Queue** | Pool of agents | A/V queue(s); `alex_queueid` on channel config |
| **Unified Routing** | Classification + assignment | Rulesets on `alex_acvsession` attributes |
| **Capacity** | Concurrency control | Capacity profile; `alex_videocapacitycost` units per session |
| **Skills** | Match work to ability | Skill attributes on the session record (e.g., language, product) |
| **Assignment rules** | Pick the agent | Native assignment methods on the workstream |
| **Record-based routing** | Route Dataverse rows | The mechanism for Model A |
| **Custom Messaging / BYOC** | Bring external messaging | The mechanism for Model B |
| **ACS Job Router** | External distribution | The mechanism for Model C (fallback) |

---

## 5. Explicitly out of scope for Phase 4A

- No workstream, queue, routing ruleset, capacity profile, or skill is created.
- No `alex_acvsession` table is created in Part 1 (schema is a separate approval — see
  [channel-configuration-model.md](channel-configuration-model.md)).
- The incoming-request trigger is **mock**; no real signaling or distribution.
- The chosen routing model is **decided later**, after the workspace POC and schema approval.

> Findings from the POC (e.g., whether presence/session APIs behave well enough to support Model A vs
> Model B) feed the routing decision and are recorded in [known-limitations.md](known-limitations.md).
