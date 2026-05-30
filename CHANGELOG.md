# Changelog

All notable changes to this solution are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Phase 2: Azure resource plan (documentation only, no provisioning).
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
