# Changelog

All notable changes to this solution are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
