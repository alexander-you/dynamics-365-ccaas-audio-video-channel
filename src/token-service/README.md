# ACV Token Service (Azure Functions, .NET 8 isolated)

Backend entry points for the custom **Audio & Video Channel (ACV)**. This service issues
short-lived ACS tokens, creates/join sessions, captures consent, and prepares recording
metadata — all behind clean interfaces.

> **Phase 3 status: scaffolding only.** All implementations are **mocks**. Nothing connects
> to real ACS, Dataverse, or Storage. Real implementations are added in later phases, after
> Azure and Dynamics 365 approvals, behind the same interfaces.
>
> See [ADR-0006](../../docs/adr/0006-storage-responsibility-split.md) (storage split) and
> [ADR-0007](../../docs/adr/0007-functions-runtime-dotnet8-isolated.md) (runtime choice).

## Why this service exists

The ACS connection string / keys must **never** reach the browser. The client calls this
service, which mints short-lived, least-privilege ACS tokens server-side. It is also the
natural place to enforce the **consent-before-recording** gate and to write business/compliance
metadata to Dataverse (later phases).

## Endpoints

| Method | Route          | Function            | Auth      | Purpose |
| ------ | -------------- | ------------------- | --------- | ------- |
| GET    | `/api/health`  | `Health`            | Anonymous | Liveness + mock-mode indicator |
| POST   | `/api/token`   | `IssueToken`        | Function  | Issue a (mock) ACS token + session |
| POST   | `/api/session` | `CreateSession`     | Function  | Create a (mock) ACS Room/session |
| POST   | `/api/consent` | `CaptureConsent`    | Function  | Capture consent evidence (in-memory) |

## Architecture (interfaces)

All real integrations sit behind interfaces in `Abstractions/`, so Phase 3 ships mocks and
later phases swap in real implementations without touching the Functions:

| Interface                  | Responsibility                                   | Phase 3 mock | Real (later) |
| -------------------------- | ------------------------------------------------ | ------------ | ------------ |
| `IAcsTokenService`         | Issue/delete ACS identities + tokens             | `MockAcsTokenService` | ACS Identity SDK + Managed Identity |
| `IAcsSessionService`       | Create session/Room, assign roles, status        | `MockAcsSessionService` | ACS Rooms + Call Automation |
| `IConsentStore`            | Capture consent, verify recording consent        | `InMemoryConsentStore` | Dataverse `alex_acvconsent` |
| `IRecordingMetadataStore`  | Prepare/update recording metadata (+ Blob ref)   | `InMemoryRecordingMetadataStore` | Dataverse `alex_acvrecording` + Blob BYOS |
| `IDataverseClient`         | Generic Dataverse create/update seam             | `NullDataverseClient` (`IsConfigured=false`) | Dataverse Web API / ServiceClient |

### Storage responsibility (critical)

- **Dataverse** = system of record for business/compliance **metadata** (sessions, consent,
  recording references, retention).
- **Azure Blob (BYOS)** = the physical **media bytes** (audio/video files), from day one.
- `DataverseFile` is a demo/experimental option only — **not** the MVP default.

The `IRecordingMetadataStore` mock enforces the **consent gate**: `PrepareAsync` throws if
`ConsentVerified` is false.

## Prerequisites

- [.NET SDK 8.0](https://dotnet.microsoft.com/download/dotnet/8.0)
- [Azure Functions Core Tools v4](https://learn.microsoft.com/azure/azure-functions/functions-run-local)
- (Optional) [Azurite](https://learn.microsoft.com/azure/storage/common/storage-use-azurite)
  for the local `AzureWebJobsStorage` emulator.

## Local development

```powershell
# from src/token-service
Copy-Item local.settings.json.example local.settings.json   # placeholders only — never commit
dotnet build
func start                                                  # or: func start --csharp
```

`local.settings.json` is **git-ignored**. It contains placeholders only; no real secrets,
endpoints, or keys belong in source control.

### Smoke test (mock mode)

```powershell
# Health (anonymous)
curl http://localhost:7071/api/health

# Issue a token (function auth is relaxed locally)
curl -X POST http://localhost:7071/api/token `
  -H "Content-Type: application/json" `
  -d '{ "anonymous": true, "entryPoint": "Public", "channelConfig": "default" }'

# Create a session
curl -X POST http://localhost:7071/api/session `
  -H "Content-Type: application/json" `
  -d '{ "channelMode": "Video", "entryPoint": "Public" }'

# Capture consent
curl -X POST http://localhost:7071/api/consent `
  -H "Content-Type: application/json" `
  -d '{ "sessionId": "sess-123", "consentType": "Recording", "value": "Granted" }'
```

Responses include `"isMock": true` so it is always obvious the data is not real.

## Configuration

See `local.settings.json.example` for the full list. Key settings:

| Setting | Default | Notes |
| ------- | ------- | ----- |
| `USE_MOCKS` | `true` | When `false`, startup **fails fast** (no real impls yet) |
| `TOKEN_TTL_MINUTES` | `60` | Token lifetime |
| `RECORDING_STORAGE_MODE` | `AzureBlobBYOS` | MVP default (see config model) |
| `DATAVERSE_URL` | _empty_ | Left blank until Phase 5 approval |

## What is intentionally NOT here yet

- No real ACS calls (identity, tokens, Rooms, Call Automation, recording).
- No real Dataverse connection (`NullDataverseClient.IsConfigured == false`).
- No real Blob writes.
- No secrets or tenant-specific values in source control.
