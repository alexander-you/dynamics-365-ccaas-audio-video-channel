# ACV Deployment Assistant (TypeScript + Vite) — Preview

A **local, static** deployment assistant that helps an administrator plan the Azure resources and
configuration for the custom **Audio & Video Channel (ACV)**. It collects inputs, validates them
locally, and renders a **deployment plan preview** with proposed resource names, cost impact,
RBAC explanation, an app-settings template, and example Bicep parameters.

> **Phase 3.5 status: prototype only.** This page **does not deploy anything.** It makes **no calls
> to Azure or Dynamics 365**, stores **no secrets**, and contains **no tenant-specific values**.
> Everything it produces is clearly marked as *not yet executed*.

## What it does

1. Collects deployment inputs (subscription label, region, resource group, prefix, environment, options).
2. Validates fields locally (Azure naming rules, GUID shape) — advisory only.
3. Warns if a value looks like a secret (connection string, key, SAS, JWT).
4. Generates a plan preview: resource table, cost impact, required permissions, RBAC model,
   app-settings template, example Bicep parameters, manual portal steps, and approval gates.
5. Lets you export the plan as a `.txt` file to review with your administrator.

## Sections in the UI

- Welcome and solution overview
- Azure prerequisites
- Required permissions
- Resource naming
- Region selection
- Resource plan preview
- Cost impact warning
- Environment variables preview
- Next steps
- Manual approval gates

## Project layout

| File | Purpose |
| ---- | ------- |
| `index.html` | The wizard/setup page shell |
| `src/main.ts` | Input binding, local validation, plan generation, export |
| `src/deploymentModel.ts` | Inputs, region/naming logic, resource catalog, RBAC + app-settings templates, `buildPlan()` |
| `src/validation.ts` | Local field validation + secret-detection heuristic |
| `src/planRenderer.ts` | Renders the plan to HTML and plain text |
| `src/styles.css` | Styling |

## Prerequisites

- [Node.js 18+](https://nodejs.org/)

## Local development

```powershell
# from src/deployment-assistant
Copy-Item .env.example .env.local      # placeholders only — cosmetic defaults, never secrets
npm install
npm run dev                            # http://localhost:5180
```

### Type-check / build

```powershell
npm run typecheck
npm run build
```

## Safety guarantees (by design)

- **No network calls.** There is no Azure SDK, no `fetch` to management APIs, no auth.
- **No secrets.** A heuristic warns the user if they paste something that looks like a secret;
  the field values are never persisted or transmitted.
- **No tenant values committed.** `.env.example` holds cosmetic defaults only; `.env.local` is git-ignored.

## What comes later (not in this preview)

- Optional generation of real Bicep/parameter files for IaC deployment.
- Optional guided `az` CLI command output for copy/paste execution by the admin.
- Linking to the Power Platform managed/unmanaged solution import flow.
- Dynamics 365 / Dataverse connection setup (after approval).

See [docs/deployment-experience.md](../../docs/deployment-experience.md) for the full concept.
