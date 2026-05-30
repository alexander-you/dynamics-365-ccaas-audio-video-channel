# Phase 0 — Access & Readiness Checklist

> **Purpose:** Verify that the permissions and connections required to build the custom
> ACS-based Audio & Video channel exist **before** implementation begins.
> **This file is public** — it contains statuses only, no secrets, no tenant-specific IDs.
> Concrete environment names, subscription IDs, and URLs live in
> [`private/environments.md`](private/environments.md) and
> [`private/dynamics-environments.md`](private/dynamics-environments.md) (git-ignored).

**Last verified:** 2026-05-30
**Verified by:** Implementation agent (read-only checks only)

Legend: ✅ Working · ⚠️ Partial / needs action · ❌ Missing · 🔲 Not yet checked · 👤 Requires user action

---

## 1. Local development toolchain

| Item | Status | Detail |
|---|---|---|
| Git | ✅ | v2.53 installed; repo correctly rooted in project folder |
| Node.js | ✅ | v22.17 (≥18 required) |
| npm | ✅ | v10.9 |
| .NET SDK | ✅ | v9.0 (Functions isolated worker supported) |
| Azure Functions Core Tools | ✅ | v4.0.x |
| Azure CLI (`az`) | ✅ | v2.75 |
| Power Platform CLI (`pac`) | ✅ | v1.44 |

**Conclusion:** Local toolchain is **ready**. No action required.

---

## 2. GitHub repository

| Item | Status | Detail |
|---|---|---|
| Remote repository exists | ✅ | `origin` set; repo reachable |
| Local clone correctly rooted | ✅ | Fixed — repo now rooted in the project folder (was previously misrooted at the user home directory) |
| Push access | 🔲 | To be confirmed on first push of the foundation branch |
| Branch strategy | ✅ | `feature/*` convention defined in README |

**Action:** First push will confirm write access. 👤 If push prompts for credentials, the user may need to authenticate Git to GitHub.

---

## 3. Azure subscription & resources

| Item | Status | Detail | Owner |
|---|---|---|---|
| Azure subscription | ✅ | Authenticated via `az`; one active subscription | Azure |
| Resource group (for this solution) | ❌ | **Not yet created.** Existing resource groups belong to other demos — none designated for this solution | Azure — 👤 user to confirm target RG/region |
| Azure Communication Services resource | ❌ | **Not created for this solution.** Existing ACS resources belong to other demos and must not be reused without confirmation | Azure |
| Azure Function App (token service / orchestration) | ❌ | Not created | Azure |
| Azure Storage Account (recordings) | ❌ | Not created | Azure |
| Blob container for recordings (BYOS) | ❌ | Not created | Azure |
| Azure Event Grid subscription | ❌ | Not created | Azure |
| Application Insights | ❌ | Not created | Azure |
| Azure Key Vault | ❌ | Not created (planned for secrets/CMK) | Azure |
| Managed Identity / Entra app registration | ❌ | Not created | Entra ID |
| RBAC model | 🔲 | To be designed in Phase 2 | Azure |

**Conclusion:** Subscription access is **available**, but **no resources are provisioned** for this
solution. Per Phase 2 rules, resources will be **documented first** and only created after the user
confirms the target subscription, resource group, and region. 👤 **User decision needed** before any provisioning.

---

## 4. Dynamics 365 / Power Platform

| Item | Status | Detail | Owner |
|---|---|---|---|
| Dynamics 365 environment reachable | ✅ | `pac org who` connects successfully (read-only) | D365 |
| Multiple environments available | ✅ | Several environments are registered in `pac auth` (Contact Center EN/HE + others) | D365 |
| Contact Center / Customer Service app | 🔲 | To be confirmed when the target environment is chosen | D365 |
| Dataverse access | ✅ | Connection established via the same identity | Dataverse |
| Power Platform solution (target) | 👤 | **User to specify** which solution to use/create | D365 |
| Publisher & prefix | ⚠️ | Prefix placeholder `alex` provided; publisher to be confirmed | D365 |
| CIF v2 configuration access | 🔲 | To be confirmed in Phase 6 | D365 |
| Security roles (System Customizer / Admin) | 🔲 | Connected identity appears to be an admin; to be confirmed per environment | D365 |
| Existing workstreams / queues / forms to reuse | 👤 | **User to specify** in Phase 5/9 | D365 |

**Critical rule:** No create/update/delete/import/export/publish operation will be performed in any
Dynamics 365 environment without **explicit user confirmation** of environment, solution, publisher,
prefix, and whether changes are permitted. Only a **trivial brand-new table** may be created via API,
and only with approval.

---

## 5. Microsoft validation items (cannot be self-verified)

These require confirmation with Microsoft (product group / FastTrack / account team) — see
[known-limitations.md](known-limitations.md):

| Item | Status |
|---|---|
| Supported pattern to attach a custom ACS media session to a routed work item | 🔲 Validate |
| Whether a custom ACS interaction can consume agent capacity via Unified Routing | 🔲 Validate |
| Supported approach for embedding ACS WebRTC inside the D365 workspace (PCF/CIF iframe `getUserMedia`) | 🔲 Validate |
| Whether custom ACS recordings can be consumed by D365 Quality Management | 🔲 Validate |
| Which supervisor capabilities (monitor/consult/barge) can be reused vs custom-built | 🔲 Validate |
| Licensing for D365 Contact Center seats, ACS consumption, recording, Teams interop | 🔲 Validate |

---

## 6. Outstanding actions before implementation

| # | Action | Owner | Blocks |
|---|---|---|---|
| 1 | Confirm target Azure subscription, resource group, and region for this solution | 👤 User | Phase 2 |
| 2 | Approve creation of Azure resources (cost implication) | 👤 User | Phase 2 |
| 3 | Specify target Dynamics 365 environment + Power Platform solution + publisher | 👤 User | Phase 5/6 |
| 4 | Confirm whether changes are allowed in the chosen D365 environment now | 👤 User | Phase 5/6 |
| 5 | Provide/confirm naming conventions and reusable workstreams/queues | 👤 User | Phase 5/9 |
| 6 | Open Microsoft validation items (Section 5) | 👤 User | Production sign-off |

> **Gate:** Do not proceed to implementation phases that create Azure cost or modify Dynamics 365
> until the relevant rows above are resolved.
