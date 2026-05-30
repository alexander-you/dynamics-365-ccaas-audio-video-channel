# Implementation Plan

> **Version:** 0.1.0 · **Current phase:** Phase 2 (Azure foundation — **planning only**).
> This file is the single source of truth for phase status, open tasks, and risks. Update it every
> meaningful release.

## Phase status

| Phase | Title | Status | Gate |
|---|---|---|---|
| 0 | Environment, access & readiness validation | ✅ Done | — |
| 1 | Repository & project foundation | ✅ Done | — |
| 2 | Azure foundation (plan only) | 🟡 Planning done — **awaiting provisioning approval** | 👤 Azure cost approval |
| 3 | ACS token service + customer entry point | 🔲 Not started | — |
| 4 | ACS Room / call session lifecycle | 🔲 Not started | — |
| 5 | Dynamics 365 / Dataverse configuration model | 🔲 Not started | 👤 D365 schema approval |
| 6 | Dynamics workspace integration (CIF v2) | 🔲 Not started | 👤 D365 config approval |
| 7 | Agent-side media experience (PCF/web) | 🔲 Not started | — |
| 8 | Recording, transcription & compliance | 🔲 Not started | — |
| 9 | Routing & assignment | 🔲 Not started | 👤 D365 routing approval |
| 10 | Supervisor & reporting | 🔲 Not started | — |
| 11 | End-to-end test & validation | 🔲 Not started | — |
| 12 | Deployment readiness | 🔲 Not started | — |

Legend: ✅ done · 🟡 in progress · 🔲 not started · 👤 requires user decision/approval.

---

## Completed work

### Phase 0 — Readiness
- Verified local toolchain (git, node, npm, .NET, Functions Core Tools, Azure CLI, pac) — all present.
- Verified Azure CLI authentication and enumerated subscription/resource groups (read-only).
- Verified Dynamics 365 connection via `pac org who` (read-only) — connection works.
- Documented the access matrix in [access-readiness-checklist.md](access-readiness-checklist.md)
  and concrete values in `private/` (git-ignored).

### Phase 1 — Foundation
- Re-rooted the Git repository correctly inside the project folder (was misrooted at home dir).
- Added `.gitignore`, `VERSION` (0.1.0), `README.md`, `CHANGELOG.md`.
- Created the documentation menu separating **Public** and **Private** docs ([docs/README.md](README.md)).
- Authored architecture, business overview, configuration model, security & compliance,
  known limitations, deployment/admin/end-user guide skeletons.
- Added the first ADRs.

### Phase 2 — Azure foundation (planning only)
- Authored [azure-resources.md](azure-resources.md): proposed resource inventory, resource group,
  region guidance, ACS/Function App/storage/Event Grid/App Insights/Key Vault names, Managed
  Identity + RBAC model, naming convention, environment variables, deployment sequence, cost
  considerations, and the explicit pre-provisioning approval gate.
- Recorded proposed concrete names and pending decisions in `private/environments.md` (git-ignored).
- **No Azure resources created, modified, or deleted.**

---

## Open tasks (next)

| # | Task | Phase | Owner | Blocks |
|---|---|---|---|---|
| T1 | Confirm target Azure subscription/RG/region | 2 | 👤 User | Azure provisioning |
| T2 | Approve Azure resource creation (cost) | 2 | 👤 User | Azure provisioning |
| T3 | Author `azure-resources.md` plan (names/regions/RBAC) | 2 | Agent | ✅ Done |
| T3a | Decide runtime/hosting/redundancy/IaC/CMK (azure-resources §15) | 2 | 👤 User | Azure provisioning |
| T3b | Provide session volume/concurrency for cost modeling | 2 | 👤 User | Cost sign-off |
| T4 | Confirm D365 environment + solution + publisher | 5/6 | 👤 User | Phase 5/6 |
| T5 | Approve Dataverse schema before creation | 5 | 👤 User | Phase 5 |
| T6 | Define routing approach (workstream/queue/capacity) | 9 | 👤 User | Phase 9 |
| T7 | Open Microsoft validation items | All | 👤 User | Production |

---

## Technical assumptions (initial)

- ACS is the media foundation; Teams is internal-only. **[Confirmed]**
- The customer-to-agent media path stays on ACS end to end. **[Confirmed]**
- Recordings use Bring-Your-Own-Storage to the organization's Blob. **[Confirmed]**
- Post-call transcription is the default; real-time only where explicitly required. **[Assumption]**
- A supported routed work-item / bootstrap pattern is required to integrate with Unified Routing. **[Validate with Microsoft]**
- Customization prefix is `alex` (placeholder, to confirm). **[Assumption]**

## Open questions

1. Supported pattern to attach a custom ACS media session to a routed work item? **[Validate]**
2. Can a custom ACS interaction consume agent capacity via Unified Routing? **[Validate]**
3. Supported approach for ACS WebRTC inside the D365 workspace (PCF/CIF iframe `getUserMedia`)? **[Validate]**
4. Can custom ACS recordings be consumed by D365 Quality Management? **[Validate]**
5. Which supervisor capabilities can be reused vs custom-built? **[Validate]**
6. Licensing for D365 CC seats, ACS consumption, recording, Teams interop? **[Validate]**

---

## Risk register (top risks)

| # | Risk | Impact | Mitigation | Confidence |
|---|---|---|---|---|
| R1 | Native communication panel cannot be fully reused | Custom media UI required | Build PCF/web component | [Confirmed — live] |
| R2 | CIF v2 doesn't make the channel a first-class Omnichannel channel | No auto conversation/capacity/analytics | Bootstrap via supported workstream | [Confirmed — live] |
| R3 | Routing & capacity require validation | Risk of non-native behavior | Validate work-item pattern with Microsoft | [Validate] |
| R4 | Browser/iframe media permissions | Camera/mic may be blocked in iframe | Configure `allow` attributes; fallback | [Validate] |
| R5 | Recording storage & retention are customer-owned | Operational burden | BYOS + lifecycle/WORM + governance | [Confirmed — live] |
| R6 | ACS consumption cost at scale | Budget risk | Capacity & storage lifecycle model; alerts | [Likely] |
| R7 | No Microsoft reference architecture for custom ACS media channel | Higher design risk | Engage FastTrack; PoC early | [Confirmed — live] |
| R8 | No built-in ACS geo-replication/DR | Availability risk | App-level multi-region + fallback | [Confirmed] |

---

## Versioning policy

Every meaningful release updates: `README.md`, `CHANGELOG.md`, this file, the Power Platform
solution version (when created), and the PCF/web package version (when created).
