# Deployment Guide

> **Version:** 0.1.0 · **Status:** Skeleton — fills in as components are built (Phases 2–12).
> Goal: a new person can deploy the solution from scratch using only this guide.

## 0. Prerequisites

| Tool | Min version | Check |
|---|---|---|
| Git | 2.40+ | `git --version` |
| Node.js + npm | 18+ / 9+ | `node --version` |
| .NET SDK | 8+ | `dotnet --version` |
| Azure Functions Core Tools | 4 | `func --version` |
| Azure CLI | 2.5+ | `az version` |
| Power Platform CLI | 1.30+ | `pac help` |

Access required: Azure subscription (Contributor on target RG), Dynamics 365 environment
(System Customizer/Admin), GitHub repo write. See [access-readiness-checklist.md](access-readiness-checklist.md).

## 1. Clone the repository

```powershell
git clone https://github.com/alexander-you/dynamics-365-ccaas-audio-video-channel.git
cd dynamics-365-ccaas-audio-video-channel
```

## 2. Azure resources (Phase 2 — TBD)

> To be filled in once `docs/azure-resources.md` is authored and resources approved.
Planned: resource group, ACS resource, Function App, Storage account + container, Event Grid
subscription, Application Insights, Key Vault, Managed Identity, RBAC assignments.

## 3. Configuration (no secrets in repo)

> Each component will ship a `*.settings.example` / `.env.example`. Copy locally and fill from
> Key Vault references. Never commit real values.

## 4. Token service deployment (Phase 3 — TBD)

## 5. Customer entry point deployment (Phase 3 — TBD)

## 6. Orchestration Functions + Event Grid (Phase 4/8 — TBD)

## 7. Dynamics 365 solution import (Phase 5/6 — TBD)

> Import the Power Platform solution; configure CIF v2 channel provider; bind the agent app profile.
> **Requires user-confirmed environment, solution, publisher, and prefix.**

## 8. PCF / web component deployment (Phase 7 — TBD)

## 9. Routing configuration (Phase 9 — TBD)

## 10. Smoke test

> Follow `docs/test-results.md` (Phase 11) once available.

## 11. Rollback

> Per-component rollback steps (solution version revert, Function App slot swap, resource
> teardown) to be documented as components land.

## Environment variable / setting reference

| Setting | Component | Source | Notes |
|---|---|---|---|
| _(to be populated per component)_ | | | No secrets in repo |
