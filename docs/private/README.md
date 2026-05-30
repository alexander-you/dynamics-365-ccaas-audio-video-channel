# 🔒 Private Documentation

This folder holds **environment-specific** notes: real Azure subscription/resource names,
Dynamics 365 environment URLs, solution names, object IDs, and the concrete access matrix.

## Rules

- Everything here is **git-ignored** except `README.md` and `*.template.md`.
- **Never store secrets here** (no passwords, connection strings, SAS keys, client secrets).
  Secrets belong in Azure Key Vault / environment configuration. Store only *references*.
- To start a real private note: copy the matching `*.template.md`, remove the `.template`
  suffix, and fill it in locally. The filled file stays on your machine only.

## Files

| Template (tracked) | Local file (git-ignored) | Contents |
|---|---|---|
| `environments.template.md` | `environments.md` | Azure subscription, RG, region, ACS, storage, Functions, App Insights, Key Vault names/IDs |
| `dynamics-environments.template.md` | `dynamics-environments.md` | D365 env URLs, IDs, solution, publisher, prefix, app profiles |
| `access-matrix.template.md` | `access-matrix.md` | Concrete who-has-what access record |
