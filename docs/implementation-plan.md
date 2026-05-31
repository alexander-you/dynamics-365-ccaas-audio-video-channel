# Implementation Plan

> **Version:** 0.1.0 · **Current phase:** Phase 4A Part 1 (D365 workspace & channel **planning only** — awaiting environment/solution approval).
> This file is the single source of truth for phase status, open tasks, and risks. Update it every
> meaningful release.

## Phase status

| Phase | Title | Status | Gate |
|---|---|---|---|
| 0 | Environment, access & readiness validation | ✅ Done | — |
| 1 | Repository & project foundation | ✅ Done | — |
| 2 | Azure foundation (plan only) | 🟡 Planning done — **awaiting provisioning approval** | 👤 Azure cost approval |
| 3 | ACS token service + customer entry point | 🟡 Scaffolding done (mocks) — **awaiting Azure/ACS approval to wire real services** | 👤 Azure/ACS approval |
| 3.5 | Deployment experience & Git alignment | ✅ Scaffold + docs done (deployment assistant preview) | — |
| 3b | IaC & deployment automation scaffold | ✅ Scaffold + docs done (Bicep/scripts, no provisioning) | 👤 Azure provisioning approval |
| 3c | Agent workspace & media component scaffold | 🟡 Scaffold + docs done (mock web component, not in D365) | 👤 D365 / Power Platform approval |
| 4A.1 | D365 workspace & channel **planning** (CIF v2, strategy, checklist) | 🟡 Planning docs done — **awaiting environment/solution approval** | 👤 D365 env + checklist approval |
| 4A.2 | D365 workspace POC (CIF v2, mock panel) | 🔲 Not started | 👤 D365 changes approval |
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

### Phase 3 — ACS token service + customer entry point (scaffolding only)
- `src/token-service/` (Azure Functions, .NET 8 isolated): mock-only endpoints `health`, `token`,
  `session`, `consent`. Interfaces (`Abstractions/`) for ACS token issuance, session lifecycle,
  consent capture, recording metadata, and Dataverse integration; mock implementations
  (`Services/Mock/`). Build verified.
- `src/customer-web/` (TypeScript + Vite): consent → device check → join → in-call flow in mock
  mode (local preview only); `RealCallController` placeholder for the ACS Calling SDK. Type-check verified.
- Placeholder config only (`local.settings.json.example`, `.env.example`) — no secrets/tenant values.
- Added ADR-0006 (storage split) and ADR-0007 (.NET 8 isolated runtime).
- **No real ACS/Dataverse/Storage calls; no Azure or Dynamics 365 changes.**

### Phase 3.5 — Deployment experience & Git alignment (scaffold + docs only)

**Why this phase exists before any real Azure/Dynamics work:** the deliverable must be deployable
by an administrator who is *not* the author. Designing the deployment experience now — before
provisioning real resources or touching Dynamics 365 — ensures naming, RBAC, cost, configuration,
and the eventual managed/unmanaged Power Platform solutions are coherent and repeatable, instead of
being retrofitted around a developer-only setup.

- `src/deployment-assistant/` (TypeScript + Vite): a **local, static** HTML wizard that collects
  deployment inputs, validates them locally, warns against pasting secrets, and renders a
  **deployment plan preview** (resource table + proposed names, cost impact, RBAC explanation,
  app-settings template, example Bicep parameters, manual Portal steps, approval gates) with text
  export. Makes **no Azure/Dynamics calls**; stores no secrets; no tenant values. Type-check verified.
- `docs/deployment-experience.md`: end-user deployment concept (HTML wizard, managed/unmanaged
  solutions, Azure setup, Dynamics setup, admin decisions, MVP vs production hardening, approval gates).
- `docs/deployment-guide.md`: rewritten for a real administrator deploying in their own tenant.
- `docs/azure-resources.md` §18: how the assistant guides resource creation (mapped to the plan).
- `docs/admin-guide.md`: early section on the future admin setup experience.
- **No real ACS/Dataverse/Storage calls; no Azure or Dynamics 365 changes.**

---

### Phase 3b — IaC & deployment automation scaffold (scaffold + docs only)

**Why:** translate the approved resource plan into reviewable, repeatable Infrastructure-as-Code so
a future approved deployment is one well-documented step instead of manual Portal clicking.

- `infra/bicep/`: `main.bicep` entry point + modules (`monitoring`, `storage`, `key-vault`,
  `communication-services`, `function-app`, `event-grid`, `rbac`) and `parameters/dev.example.bicepparam`
  (placeholders only). Applies the naming convention and the documented RBAC model.
  [`infra/README.md`](../infra/README.md) explains it is **scaffold-only / not deployed**.
- `scripts/`: `generate-azure-plan.ps1` (prints `az` commands, never provisions; `-Execute`
  intentionally refuses), `validate-prerequisites.ps1` (read-only local tool/version checks),
  and `scripts/README.md`.
- Deployment Assistant extended to also generate **example `az` CLI commands** (flagged read-only
  vs state-changing), a **cost warning summary**, and a **pre-deployment approval checklist**, plus
  an explicit "never commit to Git" list. Type-check verified.
- Architecture note added distinguishing **screen sharing (MVP)** from **co-browsing (future custom
  module)**; recorded in [architecture.md §9](architecture.md) and
  [known-limitations.md §6](known-limitations.md).
- **No Azure resources provisioned; no `az deployment` executed; no Dynamics 365 / Power Platform
  changes; no real ACS/Dataverse/storage connections; `USE_MOCKS` stays `true`.**

---

### Phase 3c — Agent workspace & media component scaffold (scaffold + docs only)

**Why:** prepare the agent-side media experience locally, in mock mode, before any Dynamics 365 or
Azure changes — so the UI and the UI↔ACS abstraction are validated and reviewable ahead of embedding.

- `src/agent-media-panel/` (TypeScript + Vite): framework-neutral **agent media panel** with a strict
  `IMediaSession` abstraction between the UI and the future ACS Calling SDK. Mock UI for join/leave,
  mute, camera, screen share, recording status, consent status, participant roster, related
  case/contact reference, and error/fallback messages. `RealMediaSession` is a documented placeholder
  that throws until ACS is approved. Type-check verified. Runs locally on port 5190.
- [ADR-0008](adr/0008-agent-media-component-approach.md): chose an **embedded web component first,
  PCF-ready** approach (can be wrapped as PCF or hosted as a web resource later) and the rationale.
- Documented **browser/iframe Permissions-Policy** considerations for camera/mic/screen-share when
  embedded in the D365 host (README + known-limitations).
- Deployment Assistant: added a **Power Platform solution import** note (later phase; includes the
  agent media component; not available yet).
- Updated architecture (§5.1), admin guide, known-limitations, and CHANGELOG.
- **No Power Platform solution created/imported; PCF not registered/deployed; no Dataverse
  tables/columns; no CIF v2 config; no real ACS tokens; no secrets stored.**

---

### Phase 4A Part 1 — D365 workspace & channel planning (planning docs only)

**Why:** before touching a Dynamics 365 environment, define *how* the custom ACS A/V channel is
represented in D365 (workspace, CIF v2, routing strategy, config model) and produce a pre-change
approval checklist — so the actual POC is reviewable and explicitly approved first.

- [d365-agent-workspace-integration.md](d365-agent-workspace-integration.md): how the **mock** panel
  integrates into the agent workspace; native-vs-custom split; hosted web component (not PCF yet).
- [cif-v2-configuration.md](cif-v2-configuration.md): proposed CIF v2 Channel Provider, channel URL
  strategy, app profile association, notification/accept-reject, session create/focus, screen-pop,
  presence, limitations.
- [d365-workstream-and-channel-strategy.md](d365-workstream-and-channel-strategy.md): documents that
  there is **no native standalone real-time A/V workstream type**; evaluates record-based workstream
  (recommended), Custom Messaging/BYOC, and ACS Job Router (fallback).
- [channel-configuration-model.md](channel-configuration-model.md): admin configuration surface
  (audio/video/screen/recording/consent/transcription/AI summary/queue/capacity/fallback/supervisor/
  Teams/telemetry); server-authoritative enforcement principle.
- [d365-pre-change-checklist.md](d365-pre-change-checklist.md): every D365/Power Platform component
  that would be created or modified, plus the 12 environment/solution values to confirm.
- **No Dynamics 365 / Power Platform changes made; no solution/provider/app profile/templates/tables
  created; media stays mock; no Azure/ACS.** Awaiting environment + checklist approval before Part 2.

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

## Hosting strategy & migration plan (panel: GitHub Pages → Azure)

> **Planning only.** No Azure resources are provisioned and the CIF Channel URL is **not** changed by
> this section. This is the agreed direction; provisioning happens only after explicit approval.

### Strategy

1. **GitHub Pages = temporary POC hosting only.** It hosts the mock/live panel
   (`https://alexander-you.github.io/dynamics-365-ccaas-audio-video-channel/?mode=live`) for early CIF
   provider/widget validation. It is **not** the target hosting model.
2. **MVP hosting = Azure Static Web Apps (preferred)** unless a concrete technical limitation forces
   otherwise. SWA gives a global CDN, built-in HTTPS/custom domains, GitHub-native CI/CD, and staging
   environments at low cost.
3. **Alternatives (if SWA is unsuitable):**
   - **Azure Storage static website** — simplest/lowest-cost static hosting (pair with Azure CDN/Front
     Door for custom domain + headers). Good when only static file serving is needed.
   - **Azure App Service** — when enterprise controls are needed: custom response headers (CSP /
     `Permissions-Policy`), built-in auth, managed identity, deployment slots, VNet integration, and a
     co-located backend/token proxy.
4. **Production: GitHub Pages must NOT be used.** Production hosting must be Azure-based, aligned with
   the rest of the Azure footprint (ACS, Functions, storage) for identity, network, custom domain, and
   governance.

### Migration plan — GitHub Pages → Azure Static Web Apps

| Step | Action |
|---|---|
| **Required Azure resource** | One **Azure Static Web App** (Standard tier recommended for SLA, custom auth, and BYO-functions; Free tier acceptable for MVP validation) in the existing `rg-acv-byoc-poc` (or a dedicated RG), same subscription/tenant as the relay. |
| **Deployment flow from GitHub** | Replace the current Pages workflow with the **Azure/static-web-apps-deploy** GitHub Action. Build `src/agent-media-panel` (`npm ci`, `npm run typecheck`, `npm run build`, `VITE_USE_MOCKS=true`), `app_location: src/agent-media-panel`, `output_location: dist`. Auth via the SWA **deployment token** (GitHub secret) or OIDC. PR builds get free **preview environments**. |
| **Environment variables** | Build-time `VITE_*` only (e.g. `VITE_TOKEN_URL`); set as Action env or SWA build config. **No secrets in the bundle.** Runtime config (ACS tokens) continues to come from the relay `/api/token`, not from SWA. |
| **Custom domain** | Optionally map a custom domain (e.g. `acv.<org>.com`) in SWA → add DNS CNAME/TXT, SWA auto-provisions the managed TLS cert. The custom origin becomes the new CIF Trusted domain. |
| **CIF Channel URL update process** | After the SWA origin is verified, update the `msdyn_channelprovider` record: `msdyn_channelurl` → `https://<swa-host>/?mode=live` and `msdyn_trusteddomain` → `https://<swa-host>`. Keep `msdyn_customparams = { "mode": "live" }` (still no `acsGroupId`). Re-run the §10.5 validation checklist. |
| **Rollback plan** | Keep the GitHub Pages deployment live during cutover. If the SWA origin fails validation, revert `msdyn_channelurl` / `msdyn_trusteddomain` back to the GitHub Pages origin (single Dataverse PATCH) — no code change needed. Decommission Pages only after SWA is validated and stable. |
| **Security considerations** | Enforce HTTPS-only; set CSP / `Permissions-Policy` (delegate `camera; microphone; display-capture; autoplay` for the iframe) via SWA `staticwebapp.config.json`; restrict `frame-ancestors` to the D365 host; no secrets in the bundle or CIF config; use OIDC for the deploy identity where possible. |
| **Cost impact** | SWA **Free** tier = $0 (sufficient for MVP validation); **Standard** ≈ low monthly fixed cost per app (for SLA, custom auth, BYO-functions, more custom domains). Negligible vs. ACS/Functions spend. Storage-static-website + Front Door would add CDN/Front Door cost; App Service adds a plan cost — choose SWA unless those features are required. |

> **Decision gate:** provisioning the SWA, wiring the deploy Action, and updating the CIF Channel URL
> are **separate approvals**. This plan does not execute any of them.

---

## Versioning policy

Every meaningful release updates: `README.md`, `CHANGELOG.md`, this file, the Power Platform
solution version (when created), and the PCF/web package version (when created).
