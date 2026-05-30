# Helper Scripts

> **Phase 3b — Scaffold only. These scripts never provision Azure resources.**
>
> They are documentation-as-code: they **print** commands for human review or **inspect**
> the local environment. They do not log in to Azure, do not create/modify/delete any
> resource, and do not run `az deployment`.

| Script | What it does | Side effects |
| --- | --- | --- |
| [`generate-azure-plan.ps1`](generate-azure-plan.ps1) | Prints the `az` commands (resource group, what-if, deploy) and planned resource names for a given prefix/env/region. | **None.** Prints to console only. The `-Execute` switch intentionally refuses to provision and exits with an error. |
| [`validate-prerequisites.ps1`](validate-prerequisites.ps1) | Read-only check of local tooling (Azure CLI, Bicep, .NET 8 SDK, Node.js, GitHub CLI) and versions. | **None.** Inspects local environment only. |

## Usage

```powershell
# Print the provisioning plan for the dev environment (nothing is executed):
./scripts/generate-azure-plan.ps1 -Prefix acv -Environment dev -Region westeurope -RegionShort weu

# Verify your machine has the tools needed to build/deploy:
./scripts/validate-prerequisites.ps1
```

## Guardrails

- **No provisioning by default.** Actual deployment is a deliberate, separate, approved step
  performed by an administrator using the printed commands (see
  [`../infra/README.md`](../infra/README.md) and
  [`../docs/deployment-experience.md`](../docs/deployment-experience.md)).
- **No secrets.** These scripts do not read or write secrets, tenant IDs, or subscription IDs.
- **Cross-platform note.** Scripts target PowerShell 5.1+ / PowerShell 7. On macOS/Linux use
  `pwsh`.
