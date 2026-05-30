# BYOC relay (`byoc-relay`)

Azure Function relay for the **Bring Your Own Channel (BYOC) / Custom Messaging API**
bootstrap of the custom ACS Audio/Video channel POC (Option C, gate **C4c**).

It does two jobs:

| Direction | Trigger | Purpose |
|---|---|---|
| **Inbound** (relay → D365) | `POST /api/inbound` | Create a routed Custom Messaging conversation carrying a **mock** A/V context. |
| **Outbound** (D365 → relay) | `POST /api/v3/conversations/{conversationId}/activities` | Receive agent messages / typing / state changes (Bot Framework Activity Schema). |
| Health | `GET /api/health` | Liveness probe; reports `mock`/`live` mode. |

> **Mock-first.** With `RELAY_MODE=mock` (default) the relay never acquires a token or
> calls D365 — it logs intent and returns a synthetic conversation id. No real ACS media
> is involved at any point in this relay. Real media is a separate, later, explicitly
> approved gate (C5).

## Messaging API contract

Implements the Dynamics 365 Contact Center Messaging API:

- **Base URL:** `https://m-{org_id}.{geo}.omnichannelengagementhub.com`
- **Auth:** OAuth 2.0 client credentials, scope `https://{org_id_without_dash}-c.{zone}.dynamics.com/.default`
- **Headers:** `Authorization: Bearer {token}`, `channel-id: {custom_channel_id}`, `organization-id: {org_id}`
- **Endpoints used:** `POST /conversation/create`, `POST /conversation/{id}`

References:
- [Overview of messaging APIs](https://learn.microsoft.com/en-us/dynamics365/contact-center/extend/intro-messaging-apis)
- [Configure a custom messaging channel using messaging APIs](https://learn.microsoft.com/en-us/dynamics365/contact-center/extend/configure-custom-messaging-channel)

## Configuration

Copy `local.settings.json.example` → `local.settings.json` for local runs, or set the
same keys as App Settings in Azure. **Never commit a real client secret** — in Azure use a
Key Vault reference (`@Microsoft.KeyVault(...)`) backed by the Function App's managed identity.

| Setting | Meaning |
|---|---|
| `RELAY_MODE` | `mock` (default) or `live`. |
| `OC_BASE_URL` | Messaging API base URL. |
| `OC_ORG_ID` | Organization GUID (`organization-id` header). |
| `OC_CHANNEL_ID` | Custom messaging channel GUID (`channel-id` header). |
| `OC_TOKEN_SCOPE` | Token scope for the Messaging API. |
| `OC_TENANT_ID` / `OC_CLIENT_ID` / `OC_CLIENT_SECRET` | Entra app used for client-credentials auth. |

## Run locally

```powershell
cd src/byoc-relay
npm install
Copy-Item local.settings.json.example local.settings.json
func start
```

Smoke test (mock mode):

```powershell
curl http://localhost:7071/api/health
curl -X POST http://localhost:7071/api/inbound -H "content-type: application/json" `
  -d '{ "customerName": "Jane Doe", "avContext": { "mode": "mock" } }'
```

## Deploy (POC)

Target Function App: `func-acv-byoc-relay-vnusoc` (Flex Consumption, resource group
`rg-acv-byoc-poc`).

```powershell
cd src/byoc-relay
npm install
func azure functionapp publish func-acv-byoc-relay-vnusoc
```

After deploy, the **webhook base URL** to register on the `msdyn_occustommessagingchannel`
record is:

```
https://func-acv-byoc-relay-vnusoc.azurewebsites.net/api
```

(the platform appends `/v3/conversations/{conversationId}/activities`).
