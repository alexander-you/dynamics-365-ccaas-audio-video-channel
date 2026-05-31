# Changelog

All notable changes to this solution are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added — PCF Media Host POC (`alex_AcvMediaHost`; build-validated, not imported)
- `pcf/acv-media-host/`: a minimal **same-origin PCF media component** ("Visual Engagement Media Host")
  that replaces the cross-origin third-party Application Tab as the camera/microphone publishing
  surface. It runs the agent media engine in the host model-driven page's **own DOM/origin** (no
  cross-origin iframe), under the workspace page's permissive Permissions-Policy proven by the §11
  capture probe. Files: `AcvMediaHost/ControlManifest.Input.xml` (properties `acsGroupId` bound/optional
  — dynamic, empty = waiting; `contextId`/`tokenUrl`/`requestedMedia`/`mode` input/optional;
  `external-service-usage` enabled for the relay host; no static group, no token/secret in code),
  `AcvMediaHost/index.ts` (PCF `init`/`updateView`/`getOutputs`/`destroy` lifecycle — builds the video
  stage, resolves the dynamic `acsGroupId` from inputs/URL/relay `/api/session`, joins, renders, and
  tears the call down on destroy), and `AcvMediaHost/media/{mediaEngine,sessionResolver,pcfConfig,types}.ts`
  (the ACS Calling engine faithfully adapted from the proven `RealMediaSession`: token → join →
  publish camera/mic → render local + remote via `VideoStreamRenderer` → cleanup; de-Vited so config
  comes from PCF inputs, not `import.meta.env`), plus scoped `css/AcvMediaHost.css`.
- `pcf/solution/`: a Dataverse solution wrapper (`pac solution init` + `add-reference`). Production
  build **succeeds** — PCF `bundle.js` ~21 KiB, `solution.zip` ~11 KB (the SDK is loaded at runtime, not
  bundled — see Notes below). Unique name `alex_visual_engagement_media_host`, publisher prefix `alex`.
- `pcf/acv-media-host/sdk-host/`: the standalone self-hosted ACS SDK bundle (`npm run build:sdk` →
  `dist/acv-acs-sdk.js`, ~5.15 MiB, git-ignored) that the control loads at runtime. See its README.
- Updated `docs/workspace-media-surface-spike.md` (§12: PCF POC build result + the runtime-load
  resolution + post-impl gate + rollback), `docs/known-limitations.md`
  (§5a PCF finding), `docs/d365-agent-workspace-integration.md` (PCF finding), `docs/architecture.md`
  (§5.1 media-surface decision).

### Notes (PCF Media Host POC)
- **Decisive finding + resolution — a PCF cannot *bundle* the ACS Calling SDK, but CAN load it at
  runtime.** Bundling fails `pcf-1045` (minified ~5.5 MiB > the hard 5 MB per-component limit) and
  code-splitting is impossible (`pcf-scripts` forces `LimitChunkCountPlugin({ maxChunks: 1 })`, *"the
  PCF runtime cannot handle chunked bundles"*). **Fix:** the SDK is built separately
  ([`pcf/acv-media-host/sdk-host`](pcf/acv-media-host/sdk-host)) into a standalone self-contained IIFE
  (`acv-acs-sdk.js`, ~5.15 MiB, exposes `window.AcvAcs`, bundles `@azure/communication-calling` +
  `-common` + `@azure/logger` so no extra globals are needed) and **loaded by the control at runtime**
  via a `<script>` tag from a configurable `sdkUrl` input (default: a same-origin web-resource path).
  With only **type-only** SDK imports left in the PCF, the component `bundle.js` is **21.4 KiB** and
  **production/MSBuild packaging now SUCCEEDS** (`solution.zip` ~11 KB). Hosting the SDK file (same-origin
  Dataverse web resource vs allowlisted static host + any cross-origin CSP `script-src`) is a deployment
  choice, but the architecture is proven and the artifact is deployable.
- **Nothing was imported into the org**, no routing/workstream/queue/capacity/session-template/app-
  profile change, no Azure provisioning, no Dataverse schema. **No static `acsGroupId`; no hardcoded
  conversation/contact/case ids, tokens, or tenant values; no secrets.** **Demo Contact Center HE
  untouched.** Remaining (user-gated): build + host `acv-acs-sdk.js`, import into
  `alex_visual_engagement_channel`, host the control on a POC
  custom page / test form, and run the live 2-way agent↔customer call. Rollback = delete the code
  component from the solution and publish (or delete the temp `PowerAppsTools_*` solution if
  `pac pcf push` was used) + `git revert` the commit. The pop-out window remains **rejected**.

### Added — Same-origin capture probe web resource (Demo Contact Center EN; reversible)
- `dataverse/webresources/alex_acv_capture_probe.html`: a minimal, self-contained HTML web resource
  (no external deps, no ACS, no Dataverse data calls, no storage/tokens/secrets) that reports origin /
  iframe / "inside Dynamics" / secure-context / `featurePolicy.allowsFeature('camera'|'microphone')`,
  queries `navigator.permissions` for camera/mic on load (no prompt), and on an explicit button click
  runs one guarded `getUserMedia({video,audio})`, renders a local preview if possible, then **stops
  all tracks immediately**. Surfaces getUserMedia success/failure, exact error name+message, and likely
  Permissions-Policy block. Deployed (and published) to **Demo Contact Center EN** in solution
  `alex_visual_engagement_channel` via `scripts/deploy-capture-probe.ps1`.
- `scripts/deploy-capture-probe.ps1`: create/update + publish helper for the probe web resource
  (az access token → upsert `webresourceset` with `MSCRM.SolutionUniqueName` → `PublishXml`).
- Updated `docs/workspace-media-surface-spike.md` (new §11: probe deployed, two safe test URLs, result
  table awaiting live run, decision rules, one-step rollback), `docs/known-limitations.md` (§5a probe-
  deployed note), `docs/d365-agent-workspace-integration.md` (probe follow-up note).

### Notes (capture probe)
- **Only one component was added: a single HTML web resource**, additive and unbound. No routing /
  workstream / queue / app-profile / session-template / capacity change, no Azure provisioning, no
  navigation/template binding. **Demo Contact Center HE untouched.** **CONCLUSIVE result:** capture
  succeeded **both** top-level **and inside the model-driven app-shell iframe** (`Inside iframe = Yes`,
  parent = the Dynamics origin) — `getUserMedia({video,audio})` SUCCESS with a local preview, no policy
  block. A same-origin / in-DOM Dynamics surface **can** capture camera/mic; the blocker was the
  **cross-origin** third-party Application Tab (`NotAllowedError`). Live-validated publishing path = PCF
  code component (or same-origin web resource / custom page); remaining validation is runtime +
  Microsoft support, not permissions. Rollback = delete the `webresourceset` record and publish (see
  spike §11). The pop-out window remains **rejected** (kept only behind `?debug=1`).

### Added — Workspace media-surface feasibility spike (read-only; docs only)
- `docs/workspace-media-surface-spike.md`: read-only spike evaluating which Dynamics 365 workspace
  hosting surface can publish camera/microphone for ACS video. Confirms the cross-origin Application
  Tab is blocked by the iframe Permissions Policy (`NotAllowedError`, live diagnostics), evaluates
  **PCF code component** (most promising target — runs in host DOM/origin, bundles ACS SDK), **HTML web
  resource** (cheapest same-origin probe), **custom page**, and **App Tab / Side Pane** (limitation:
  no maker control over iframe `allow`). Documents risks, Microsoft validation questions, and a
  recommended next step that **explicitly avoids the pop-out UX**.
- Updated `docs/known-limitations.md` (new §5a on embedded camera/mic publishing; tightened validation
  item 3), `docs/d365-agent-workspace-integration.md` (media-publishing surface decision note),
  `docs/cif-v2-configuration.md` (new §10.9 surface-selection summary).

### Notes (media-surface spike)
- **No Dynamics 365 / Power Platform changes were made.** No PCF built or deployed, no web resource /
  custom page created, no app profile / workstream / queue / routing / session-template change, no
  Azure provisioning, no new product features. The pop-out window remains **rejected** as the agent UX
  (kept only behind the `?debug=1` developer flag).

### Added — Phase 4A Part 1 D365 workspace & channel planning (planning docs only)
- `docs/d365-agent-workspace-integration.md`: plan for integrating the **mock** agent media panel
  into the D365 Customer Service / Contact Center workspace; native-vs-custom responsibility split;
  hosted web component first (PCF deferred).
- `docs/cif-v2-configuration.md`: proposed **CIF v2 Channel Provider** (name, channel URL strategy,
  app profile association, incoming notification, accept/reject, session create/focus, screen-pop,
  presence, limitations).
- `docs/d365-workstream-and-channel-strategy.md`: documents that there is **no native standalone
  real-time A/V workstream type**; evaluates record-based workstream (recommended), Custom
  Messaging/BYOC, and external ACS Job Router (fallback only).
- `docs/channel-configuration-model.md`: admin configuration surface for the custom channel; recording
  and consent are **server-authoritative**.
- `docs/d365-pre-change-checklist.md`: pre-change approval checklist of every D365 / Power Platform
  component that would be created or modified, plus the 12 environment/solution values to confirm.
- Updated `docs/README.md` menu and `docs/implementation-plan.md` (Phase 4A.1 / 4A.2 rows + section).

### Notes (Phase 4A Part 1)
- **No Dynamics 365 / Power Platform changes were made.** No solution, publisher, CIF v2 Channel
  Provider, app profile, session/notification template, web resource, custom table, workstream, queue,
  or capacity profile was created or modified. Media stays mock; no Azure provisioning; no real ACS.

### Added — Phase 3c agent workspace & media component scaffold (scaffold + docs only)
- `src/agent-media-panel/`: framework-neutral **agent media panel** (TypeScript + Vite) with a strict
  `IMediaSession` abstraction between the UI and the future ACS Calling SDK. Mock UI for **join /
  leave session, mute/unmute, camera on/off, screen sharing, recording status, consent status,
  participant state, related case/contact reference, and error/fallback messages**.
  `RealMediaSession` is a documented placeholder that throws until ACS is approved. Runs locally on
  port 5190. Type-check verified.
- `docs/adr/0008-agent-media-component-approach.md`: ADR choosing an **embedded web component first,
  PCF-ready** approach (can later be wrapped as a PCF control or hosted as a web resource) with the
  rationale; added to the ADR index.
- `src/agent-media-panel/README.md`: local test instructions plus **browser/iframe Permissions-Policy**
  considerations for camera, microphone, and screen sharing when embedded in Dynamics 365.
- `src/deployment-assistant/`: added a **Power Platform solution import** note (later phase; includes
  the agent media component; not available yet) to both the HTML preview and text export.
- `docs/architecture.md` §5.1, `docs/admin-guide.md` §1b, `docs/known-limitations.md` §8,
  `docs/implementation-plan.md` (added Phase 3c) updated.

### Notes (Phase 3c)
- **No Power Platform solution was created or imported; the PCF control was not registered or deployed
  to Dynamics 365; no Dataverse tables/columns were created; no CIF v2 configuration; no real ACS
  tokens were used; no secrets were stored.** The component is a local mock-mode scaffold only.

### Added — Phase 3b IaC & deployment automation scaffold (scaffold + docs only)
- `infra/bicep/`: Bicep scaffold — `main.bicep` entry point plus modules `monitoring`, `storage`,
  `key-vault`, `communication-services`, `function-app`, `event-grid`, and `rbac`, applying the
  documented naming convention and least-privilege RBAC model. `parameters/dev.example.bicepparam`
  holds placeholders only. `infra/README.md` documents it as **scaffold-only / not deployed**.
- `scripts/`: `generate-azure-plan.ps1` (prints `az` commands; never provisions; `-Execute`
  intentionally refuses), `validate-prerequisites.ps1` (read-only local tool/version checks), and
  `scripts/README.md`.
- `src/deployment-assistant/`: extended the plan output with **example `az` CLI commands** (each
  flagged read-only vs state-changing), a **cost warning summary**, a **pre-deployment approval
  checklist**, and an explicit "never commit to Git" list — in both the HTML preview and the text
  export. Type-check verified.
- `docs/architecture.md` §9: new note distinguishing **screen sharing (MVP)** from **co-browsing
  (future custom module)** with consent / masking / audit / Dataverse-linkage design notes.
- `docs/known-limitations.md`: added co-browsing (future) and IaC/deployment-automation
  (scaffold-only) sections.
- `docs/azure-resources.md` §19: Bicep scaffold mapping. `docs/deployment-experience.md` §9 and
  `docs/deployment-guide.md`: IaC usage. `docs/admin-guide.md`: provisioning via the scaffold.
  `docs/security-and-compliance.md` §12: IaC security posture.
- `docs/implementation-plan.md`: added **Phase 3b**; fixed the phase-status table.

### Notes (Phase 3b)
- **No Azure resources were provisioned; no `az deployment` was executed; no Dynamics 365 / Power
  Platform changes were made; no real ACS/Dataverse/storage connections were opened.** `USE_MOCKS`
  remains `true`. The scaffold is documentation-as-code for a future, approved deployment.

### Added — Phase 3.5 deployment experience & Git alignment (scaffold + docs only)
- `src/deployment-assistant/`: local, static HTML wizard (TypeScript + Vite) that collects
  deployment inputs, validates them locally, warns against pasting secrets, and renders a
  **deployment plan preview** — resource table with proposed names, cost impact, Managed Identity /
  RBAC explanation, app-settings template, example Bicep parameters, manual Portal steps, and
  approval gates — with plain-text export. Makes **no Azure/Dynamics calls**, stores no secrets,
  contains no tenant values. Type-check verified.
- `docs/deployment-experience.md`: end-user/admin deployment concept (HTML wizard, managed +
  unmanaged Power Platform solutions, Azure + Dynamics setup, required admin decisions, MVP vs
  production hardening, approval gates).
- `docs/admin-guide.md`: early "admin setup experience" section.
- `docs/azure-resources.md` §18: how the Deployment Assistant guides resource creation (mapped to the plan).
- `docs/deployment-guide.md`: rewritten for a real administrator deploying in their own tenant.
- `docs/implementation-plan.md`: added **Phase 3.5** and the rationale for sequencing it before any
  real Azure/Dynamics work.
- `docs/README.md`: added `deployment-experience.md` to the public documentation menu.

### Notes (Phase 3.5)
- **No Azure resources and no Dynamics 365 changes were made.** The assistant is a preview that
  deploys nothing and contacts no APIs.

### Added — Phase 3 scaffolding (code, no real service calls)
- `src/token-service/`: Azure Functions project (.NET 8 isolated worker) with mock-only
  implementations. HTTP endpoints: `GET /api/health`, `POST /api/token`, `POST /api/session`,
  `POST /api/consent`. Clean interfaces in `Abstractions/` for issuing ACS tokens
  (`IAcsTokenService`), creating/joining sessions (`IAcsSessionService`), capturing consent
  (`IConsentStore`), preparing recording metadata (`IRecordingMetadataStore`), and future
  Dataverse integration (`IDataverseClient`). Phase 3 ships mocks (`Services/Mock/`):
  `MockAcsTokenService`, `MockAcsSessionService`, `InMemoryConsentStore`,
  `InMemoryRecordingMetadataStore`, `NullDataverseClient` (`IsConfigured=false`). Build verified.
- `src/customer-web/`: TypeScript + Vite customer entry point covering consent → device check →
  join → in-call controls. Runs in mock mode (local preview only) with a `RealCallController`
  placeholder for the ACS Calling SDK. Type-check verified.
- `local.settings.json.example` (token service) and `.env.example` (web) with **placeholders
  only** — no secrets, endpoints, keys, or tenant values.
- README files for both projects with local development and smoke-test instructions.
- ADR-0006 (storage responsibility split: Dataverse for metadata, Blob BYOS for media) and
  ADR-0007 (.NET 8 isolated worker for Functions).

### Changed — Phase 3
- `docs/configuration-model.md`: added a system-of-record split section; renamed
  `alex_storagemode` to `alex_recordingstoragemode` (default `AzureBlobBYOS`); enriched
  `alex_acvrecording` with `alex_storagemode`, `alex_bloburi`, `alex_blobcredentialref`.
- `docs/azure-resources.md` §6.2: recordings Blob storage (BYOS) is part of the MVP from day one.

### Notes
- **No real ACS, Dataverse, or Storage calls.** All implementations are mocks/placeholders.
  `USE_MOCKS` defaults to `true`; the token service fails fast if set to `false`.
- **No Azure resources and no Dynamics 365 changes were made.**

### Planned
- Phase 4+: real ACS Rooms/Call Automation, recording to Blob (BYOS), Dataverse integration.

### Added — Phase 2 planning (documentation only)
- `docs/azure-resources.md`: proposed Azure resource plan covering resource group, region guidance,
  ACS / Function App / storage (functions + recordings BYOS) / blob container / Event Grid /
  Application Insights / Log Analytics / Key Vault, Managed Identity + RBAC model, naming
  convention, environment variables, deployment sequence, cost considerations, Microsoft validation
  items, and an explicit pre-provisioning approval gate.
- Proposed concrete resource names and the Phase 2 decision checklist recorded in
  `docs/private/environments.md` (git-ignored).
- Updated `docs/implementation-plan.md`: Phase 2 marked as planning-done / awaiting provisioning approval.

### Notes
- **No Azure resources were created, modified, or deleted.** Provisioning is gated on explicit user
  approval of subscription, resource group, region, naming convention, and cost impact.

### Planned
- Phase 3: ACS token service + customer web entry point.

## [0.1.0] — 2026-05-30

### Added — Phase 0 & Phase 1 foundation
- Re-established the Git repository correctly inside the project folder (previously misrooted at the user home directory) and preserved the remote history.
- `.gitignore` covering secrets, environment files, Node/.NET/PCF build output, and the private documentation folder.
- `VERSION` file (semantic versioning baseline `0.1.0`).
- `README.md` with solution purpose, architecture overview, repository structure, component status, branching conventions, and guardrails.
- Documentation foundation under `docs/`:
  - `docs/README.md` — documentation menu separating **Public** and **Private** docs.
  - `architecture.md` — end-to-end architecture.
  - `business-overview.md` — business goal, use cases, roles, value.
  - `implementation-plan.md` — phased plan, current phase, open tasks, risks.
  - `configuration-model.md` — Dataverse configuration & metadata model design.
  - `deployment-guide.md` — deployment from scratch (skeleton).
  - `admin-guide.md` — administrator configuration (skeleton).
  - `end-user-guide.md` — agent & supervisor usage (skeleton).
  - `security-and-compliance.md` — identity, tokens, recording access, consent, retention, deletion, audit.
  - `known-limitations.md` — native vs custom vs validate-with-Microsoft.
  - `access-readiness-checklist.md` — Phase 0 access matrix.
- `docs/adr/` with the first Architecture Decision Records.
- `docs/private/` (git-ignored) for tenant/environment-specific notes, with a template.

### Notes
- No Azure resources have been provisioned.
- No Dynamics 365 / Dataverse components have been created.
- Documented customization prefix placeholder: `alex`.
