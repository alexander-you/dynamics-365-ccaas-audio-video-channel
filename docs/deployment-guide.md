# Deployment Guide (Administrator)

> **Version:** 0.1.0 · **Status:** Living document — expands as components land (Phases 2–12).
> **Audience:** the administrator deploying this solution into **their own Azure subscription and
> Dynamics 365 environment**. You do not need to be the original author.
>
> **Current state:** the solution is in scaffold/preview. The token service and clients run in
> **mock mode**; no Azure resources are required yet. Use the **Deployment Assistant** to plan the
> real deployment. **Nothing in this guide provisions resources automatically.**

## 0. Before you start

### 0.1 Tools

| Tool | Min version | Check |
|---|---|---|
| Git | 2.40+ | `git --version` |
| Node.js + npm | 18+ / 9+ | `node --version` |
| .NET SDK | 8+ | `dotnet --version` |
| Azure Functions Core Tools | 4 | `func --version` |
| Azure CLI | 2.5+ | `az version` |
| Power Platform CLI | 1.30+ | `pac help` |

### 0.2 Access you will need

| Task | Role |
|---|---|
| Create Azure resources | **Contributor** on the target resource group |
| Assign RBAC / Managed Identity | **Owner** or **User Access Administrator** |
| Import the Power Platform solution | **System Customizer / System Administrator** in Dynamics 365 |
| Push to the repo (optional) | GitHub write access |

See [access-readiness-checklist.md](access-readiness-checklist.md).

### 0.3 Golden rules

- **Never** commit secrets, connection strings, tokens, tenant IDs, or environment URLs.
- Each component ships a `*.example` config. Copy it locally and fill from **Key Vault** references.
- Approve cost, naming, and RBAC **before** provisioning. See [deployment-experience.md](deployment-experience.md).

## 1. Clone the repository

```powershell
git clone https://github.com/alexander-you/dynamics-365-ccaas-audio-video-channel.git
cd dynamics-365-ccaas-audio-video-channel
```

## 2. Plan the deployment with the Deployment Assistant

The Deployment Assistant is a **local, static** wizard that helps you choose your subscription,
region, resource group, and naming, then generates a **deployment plan preview** (resources, cost,
RBAC, app-settings template, example Bicep parameters, and approval gates). It does **not** deploy
anything or call any API.

```powershell
cd src/deployment-assistant
Copy-Item .env.example .env.local   # cosmetic defaults only — no secrets
npm install
npm run dev                         # open http://localhost:5180
```

Work through the wizard, then **Export plan (.txt)** and review it with your Azure administrator.
See [src/deployment-assistant/README.md](../src/deployment-assistant/README.md).

## 3. Try the solution locally (mock mode — no Azure needed)

You can exercise the end-to-end flow before provisioning anything.

```powershell
# Terminal 1 — token service (mocks)
cd src/token-service
Copy-Item local.settings.json.example local.settings.json
func start

# Terminal 2 — customer web entry point (mock call)
cd src/customer-web
Copy-Item .env.example .env.local
npm install
npm run dev      # http://localhost:5173
```

Responses include `"isMock": true`; no real ACS call is placed.

## 4. Provision Azure resources (when approved)

> **Gate:** subscription, RG, region, naming, cost, and RBAC must be approved first.

Follow the resource plan in [azure-resources.md](azure-resources.md) and the Deployment Assistant
output. Resources: resource group, ACS, Function App, Functions runtime storage, recordings Blob
(BYOS), Event Grid, Application Insights, Log Analytics, and (optionally) Key Vault. Provision via
the Azure Portal (manual steps are listed per resource in the assistant) or via the **Bicep IaC
scaffold** under [`infra/`](../infra/README.md). Assign the Function App's Managed Identity the
roles shown in the RBAC model.

### Infrastructure as Code (Bicep scaffold)

The `infra/bicep/` templates describe the full topology. To use them (after approval):

```bash
# 0) Verify local prerequisites (read-only, no Azure calls):
pwsh ./scripts/validate-prerequisites.ps1

# 1) Print the commands for review (nothing is executed):
pwsh ./scripts/generate-azure-plan.ps1 -Prefix acv -Environment dev -Region westeurope -RegionShort weu

# 2) Copy the example params to a git-ignored file and fill real values:
Copy-Item infra/bicep/parameters/dev.example.bicepparam infra/bicep/parameters/dev.bicepparam

# 3) Preview with what-if (no changes), then deploy ONLY after approval:
az group create --name rg-acv-dev-weu --location westeurope
az deployment group what-if --resource-group rg-acv-dev-weu --template-file infra/bicep/main.bicep --parameters infra/bicep/parameters/dev.bicepparam
az deployment group create --resource-group rg-acv-dev-weu --template-file infra/bicep/main.bicep --parameters infra/bicep/parameters/dev.bicepparam
```

> The repository never runs these commands for you. The scaffold is documentation-as-code; the
> `dev.bicepparam` you create is git-ignored and must never be committed.

## 5. Configure app settings (no secrets in source control)

Use the app-settings template from the Deployment Assistant. Set `USE_MOCKS=false` only once real
services are wired and approved. Store credentials as **Key Vault references**, never inline.

## 6. Deploy the token service + orchestration Functions (Phase 3b/4/8)

> To be detailed as the real (non-mock) implementations land. Publish the .NET 8 isolated Function
> App; bind Application Insights; configure the Event Grid subscription to the orchestration endpoint.

## 7. Deploy the customer entry point (Phase 7)

> Host the built web bundle; point it at the token service base URL; serve over HTTPS.

## 8. Import the Power Platform solution (Phase 5/6)

> **Requires confirmed environment, solution, publisher, and `alex` prefix.**
> Import the **unmanaged** solution in a dev environment for customization, and the **managed**
> solution into test/prod. Configure the CIF v2 channel provider and bind the agent app profile.

## 9. Routing configuration (Phase 9)

> Configure the Unified Routing workstream/queue/skills per [admin-guide.md](admin-guide.md).

## 10. Smoke test

> Follow `docs/test-results.md` (Phase 11) once available.

## 11. Rollback

> Per-component rollback (solution version revert, Function App slot swap, resource teardown) to be
> documented as components land. For a planning-only/preview deployment there is nothing to roll back.

## Environment variable / setting reference

| Setting | Component | Source | Notes |
|---|---|---|---|
| _(to be populated per component)_ | | | No secrets in repo |
