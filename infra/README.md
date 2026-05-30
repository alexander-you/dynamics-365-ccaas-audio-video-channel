# Infrastructure as Code (IaC) — Bicep Scaffold

> **Phase 3b — Scaffold only. Nothing in this folder is deployed by any automation in this repository.**
>
> These templates exist so that, **once Azure provisioning is approved**, an administrator
> can review and deploy the Audio & Video Channel (ACV) infrastructure from a single,
> version-controlled source. No resources have been created. No `az deployment` command is
> executed by this repo. Helper scripts under [`../scripts`](../scripts/README.md) only
> **print** commands for human review.

## What this provisions (when an admin chooses to deploy)

| Module | Resource | Purpose |
| --- | --- | --- |
| `modules/monitoring.bicep` | Log Analytics + Application Insights | Telemetry, diagnostics |
| `modules/storage.bicep` | Storage (Functions runtime) + optional recordings BYOS | Runtime + recording storage |
| `modules/key-vault.bicep` | Key Vault (RBAC auth) | Secret references (no secrets stored by IaC) |
| `modules/communication-services.bicep` | Azure Communication Services | Audio/video media foundation |
| `modules/function-app.bicep` | Function App (.NET 8 isolated) + plan | Token service + orchestration |
| `modules/event-grid.bicep` | ACS system topic + subscription | Recording/call event routing |
| `modules/rbac.bicep` | Role assignments | Least-privilege for the Function identity |

The entry point is [`main.bicep`](bicep/main.bicep), which composes the modules and applies the
naming convention `<type>-<prefix>-<env>-<region>[-nn]` (see
[`docs/azure-resources.md`](../docs/azure-resources.md)).

## Folder layout

```
infra/
  README.md                    <- this file
  bicep/
    main.bicep                 <- entry point (resourceGroup scope)
    modules/                   <- one module per resource group of concerns
    parameters/
      dev.example.bicepparam   <- EXAMPLE params (no real values)
```

## Important guardrails

- **No real values.** `dev.example.bicepparam` contains placeholders only. Copy it to a
  **git-ignored** `dev.bicepparam` and fill in real values locally before deploying.
- **No secrets in IaC.** Key Vault is created empty; secret values are added by an admin
  out-of-band and never committed to Git.
- **`USE_MOCKS` stays `true`** in the Function App settings until the real (non-mock)
  service implementations are built and approved in a later phase.
- **RBAC requires elevated rights.** Deploying `rbac.bicep` needs Owner or
  User Access Administrator on the target scope.

## How an administrator would deploy (for reference — do NOT run now)

These commands are documented for a future, approved deployment. They are **not** executed by
this repository.

```bash
# 1) Validate / what-if (no changes made) — review the plan first.
az deployment group what-if \
  --resource-group rg-acv-dev-weu \
  --template-file infra/bicep/main.bicep \
  --parameters infra/bicep/parameters/dev.bicepparam

# 2) Deploy (only after explicit approval).
az deployment group create \
  --resource-group rg-acv-dev-weu \
  --template-file infra/bicep/main.bicep \
  --parameters infra/bicep/parameters/dev.bicepparam
```

The resource group itself (`rg-acv-dev-weu`) is created separately by an administrator
(`az group create`), per [`docs/deployment-experience.md`](../docs/deployment-experience.md).

## Validation without deploying

You can lint/compile the templates locally without touching Azure:

```bash
az bicep build --file infra/bicep/main.bicep   # compiles to ARM JSON, no deployment
```

> Compilation requires the Bicep CLI/Azure CLI. It does not connect to Azure and does not
> create resources.
