# Dynamics 365 / Power Platform Pre-Change Approval Checklist (Phase 4A)

> **Version:** 0.1.0 · **Status:** APPROVAL REQUIRED — **nothing below has been created or modified.**
> This checklist enumerates **every** Dynamics 365 / Power Platform component that *would* be created
> or changed for the Phase 4A workspace POC. **No implementation proceeds until the user approves this
> checklist and confirms the environment/solution values.**

Related: [d365-agent-workspace-integration.md](d365-agent-workspace-integration.md) ·
[cif-v2-configuration.md](cif-v2-configuration.md) ·
[d365-workstream-and-channel-strategy.md](d365-workstream-and-channel-strategy.md) ·
[channel-configuration-model.md](channel-configuration-model.md).

---

## 1. Environment & solution values to confirm (blocking)

| # | Item | Proposed (do **not** assume) | Confirmed? |
|---|---|---|---|
| 1 | Target Dynamics 365 environment | _Demo Contact Center EN_ (to confirm) | ☐ |
| 2 | Environment URL | _(to confirm)_ | ☐ |
| 3 | Power Platform solution name | _New unmanaged POC solution (to confirm)_ | ☐ |
| 4 | Managed or unmanaged | **Unmanaged** (POC) | ☐ |
| 5 | Publisher | _(to confirm)_ | ☐ |
| 6 | Prefix | `alex` (to confirm) | ☐ |
| 7 | Workspace app | Customer Service workspace **or** Contact Center workspace (to confirm) | ☐ |
| 8 | App profile | **Dedicated POC profile** (create or reuse — not production) | ☐ |
| 9 | New CIF v2 Channel Provider | **Yes — new dedicated provider** | ☐ |
| 10 | Hosted web component vs PCF | **Hosted web component / web resource first** (no PCF yet) | ☐ |
| 11 | Reuse existing session/notification templates | _(reuse or create — to confirm)_ | ☐ |
| 12 | Changes allowed now | **No** until this row is checked | ☐ |

---

## 2. Components that would be created or modified

> Legend: 🆕 create · ✏️ modify · ⛔ **not in Phase 4A** · ◯ optional (only if approved).

| Component | Action | Detail | In Phase 4A? |
|---|---|---|---|
| **Solution** | 🆕 | New **unmanaged** solution dedicated to the POC | ✅ |
| **Publisher** | 🆕/✏️ | Publisher with prefix `alex` (create or reuse) | ✅ |
| **CIF v2 Channel Provider** | 🆕 | `alex_acvprovider_poc` → hosted mock panel URL; mode=mock | ✅ |
| **App profile** | 🆕/✏️ | Dedicated POC agent experience profile; attach provider; assign test agent(s) | ✅ |
| **Notification template** | 🆕/◯ | Incoming A/V notification (title, fields, Accept/Reject, timeout) | ✅ (or reuse) |
| **Session template** | 🆕/◯ | Workspace session (title, anchor/app tabs) for the A/V session | ◯ optional |
| **Web resource / hosted widget registration** | 🆕 | Register the hosted panel URL as trusted origin (web resource only if hosting in-Dataverse) | ✅ |
| **Custom table** `alex_acvsession` | ⛔ | Screen-pop placeholder context | ⛔ not in Part 1 (separate approval) |
| **Other custom tables** (recording/consent/transcript/telemetry/config) | ⛔ | Full schema | ⛔ deferred to schema phase |
| **Workstream** | ⛔ | Record/messaging workstream | ⛔ deferred (routing phase) |
| **Queue** | ⛔ | A/V queue | ⛔ deferred (routing phase) |
| **Capacity profile** | ⛔ | Concurrency/units | ⛔ deferred (routing phase) |
| **Routing rulesets / skills / assignment** | ⛔ | Unified Routing config | ⛔ deferred (routing phase) |
| **Security roles** | ◯ | Minimal role/privileges for POC agent to use the provider/profile | ◯ only if required |
| **Managed solution** | ⛔ | test/prod packaging | ⛔ not in POC |

---

## 3. What is explicitly NOT changed in Phase 4A

- ⛔ No Azure provisioning; no ACS resource; no real ACS tokens; no real calls; no recordings.
- ⛔ No full Dataverse schema (session/recording/consent/transcript/telemetry/config tables).
- ⛔ No workstream, queue, routing ruleset, capacity profile, or skills.
- ⛔ No managed solution; no production app profile; no production agents.
- ⛔ No PCF control packaging.

---

## 4. Rollback / safety

- All POC artifacts live in **one unmanaged solution** → removable by **deleting the solution** and the
  **app profile** in the dev/sandbox environment.
- The Channel Provider is bound only to the **dedicated POC app profile**, so it never appears for
  production agents.
- Media stays **mock** (`VITE_USE_MOCKS=true`); no external media/token calls occur.
- The hosted panel URL serves static files only; **no secrets** are placed in CIF config, URLs, or
  custom parameters.

---

## 5. Approval statement

> I approve the components marked **✅ In Phase 4A** above, in the environment/solution confirmed in
> §1, and authorize the agent to proceed with **Phase 4A Part 2 (implementation in the dev/sandbox
> environment)**. Items marked ⛔ remain out of scope and require separate approval.

**Approved by:** ____________________  **Date:** ____________  **Environment:** ____________________
