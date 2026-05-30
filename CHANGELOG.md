# Changelog

All notable changes to this solution are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
