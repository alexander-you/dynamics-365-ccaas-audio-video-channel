# Azure Environments (PRIVATE — fill in locally)

> Copy to `environments.md` (git-ignored). Store **references**, never secret values.

## Subscription
- Subscription name: `<fill in>`
- Subscription ID: `<fill in>`
- Signed-in identity: `<fill in>`
- Default region for this solution: `<fill in>`

## Resource group (this solution)
- Resource group name: `<not yet created>`
- Region: `<fill in>`

## Resources (to be created in Phase 2)
| Resource | Name | Region | Notes |
|---|---|---|---|
| ACS resource | `<tbd>` | | Real-time media, recording, transcription |
| Function App (token + orchestration) | `<tbd>` | | Managed Identity enabled |
| Storage account (recordings, BYOS) | `<tbd>` | | Private containers only |
| Blob container | `<tbd>` | | Recording storage |
| Event Grid subscription | `<tbd>` | | `RecordingFileStatusUpdated`, call lifecycle |
| Application Insights | `<tbd>` | | Diagnostics |
| Key Vault | `<tbd>` | | Secrets + optional CMK |
| Managed Identity | `<tbd>` | | Functions → ACS/Storage/Key Vault |

## Secret references (names only — NEVER the values)
| Purpose | Key Vault secret name |
|---|---|
| ACS connection (prefer Managed Identity) | `<kv-secret-name>` |
| Storage access (prefer Managed Identity) | `<kv-secret-name>` |
