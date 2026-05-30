# Azure Resource Plan

> **Version:** 0.1.0 · **Status:** 📋 PLAN ONLY — **nothing is provisioned**.
> **No Azure resources will be created, modified, or deleted until the user explicitly approves**
> the subscription, resource group, region, naming convention, and cost impact (see §15).
> Tenant-specific values (subscription IDs, real resource names, URLs) live **only** in
> [`private/environments.md`](private/environments.md) (git-ignored). This file is public and generic.

This document proposes the Azure footprint for the custom ACS-based Audio & Video channel.
Names below use the **naming convention** in §11 with placeholder tokens (`<env>`, `<region>`,
`<n>`). Final names are confirmed in the private notes before provisioning.

---

## 1. Resource inventory (proposed)

| # | Resource | Type | Purpose | Required for MVP |
|---|---|---|---|---|
| 1 | Resource group | `Microsoft.Resources/resourceGroups` | Container for all solution resources | ✅ |
| 2 | ACS resource | `Microsoft.Communication/CommunicationServices` | Real-time audio/video, recording, transcription | ✅ |
| 3 | Function App | `Microsoft.Web/sites` (functionapp) | Token service + orchestration Functions | ✅ |
| 4 | App Service Plan / Flex Consumption | `Microsoft.Web/serverfarms` | Hosting for the Function App | ✅ |
| 5 | Storage account (Functions) | `Microsoft.Storage/storageAccounts` | Function runtime state (AzureWebJobsStorage) | ✅ |
| 6 | Storage account (recordings, BYOS) | `Microsoft.Storage/storageAccounts` | Durable recording storage | ✅ |
| 7 | Blob container (recordings) | container in #6 | BYOS recording target | ✅ |
| 8 | Application Insights | `Microsoft.Insights/components` | Diagnostics, traces, quality telemetry | ✅ |
| 9 | Log Analytics workspace | `Microsoft.OperationalInsights/workspaces` | Backing store for App Insights + Azure Monitor | ✅ |
| 10 | Event Grid system topic | `Microsoft.EventGrid/systemTopics` | Source ACS events (recording/call lifecycle) | ✅ |
| 11 | Event Grid subscription | `Microsoft.EventGrid/eventSubscriptions` | Route ACS events → Function | ✅ |
| 12 | Key Vault | `Microsoft.KeyVault/vaults` | Secret references, optional CMK | ✅ (recommended) |
| 13 | Managed Identity | system- or user-assigned | Function → ACS/Storage/Key Vault auth | ✅ |

> Two storage accounts are recommended: one for the Functions runtime, one dedicated to recordings
> (different access policies, lifecycle, and blast radius). They may be merged for a minimal MVP,
> but separation is preferred. **[Assumption — confirm]**

---

## 2. Resource group

- **Proposed name:** `rg-acv-<env>-<region>` → e.g., `rg-acv-dev-weu`
- **One resource group per environment** (dev / test / prod) for clean lifecycle and RBAC scoping.
- All solution resources live inside it; existing demo resource groups are **not** reused.
- **Region:** see §3.

---

## 3. Azure region

| Consideration | Guidance |
|---|---|
| ACS availability | ACS data location and Calling/Recording features vary by region — confirm the target region supports Call Recording + transcription. **[Validate]** |
| Data residency | Pin ACS data location + storage account to the chosen region. Note: ACS **media path** is Azure-global (encrypted), not residency-guaranteed. **[Confirmed]** |
| Proximity to users/agents | Choose a region close to customers/agents to reduce latency. |
| Co-location | Keep Function App, storage, Key Vault, and App Insights in the **same region** as ACS where possible. |

- **Proposed default:** `westeurope` (`weu`) — aligns with the existing EN Contact Center footprint.
  **Final region requires user confirmation.** 👤
- Region short codes used in names: `weu` (West Europe), `neu` (North Europe), `eus` (East US), etc.

---

## 4. Azure Communication Services (ACS)

- **Proposed name:** `acs-acv-<env>-<region>` → e.g., `acs-acv-dev-weu`
- **Data location:** set to the chosen region's data boundary (e.g., Europe). **[Confirm]**
- **Capabilities used:** Identity & tokens, Calling SDK, Rooms, Call Automation, Call Recording
  (BYOS), real-time/post-call transcription, Event Grid events, Teams interop (internal only).
- **Auth to ACS:** prefer **Managed Identity** from the Function App; the connection string is a
  fallback stored as a **Key Vault reference**, never in the repo or client.

---

## 5. Function App (token service + orchestration)

- **Proposed name:** `func-acv-<env>-<region>-<n>` → e.g., `func-acv-dev-weu-01`
- **Runtime:** .NET 8 isolated **or** Node 18+ (decide in Phase 3 ADR). **[Assumption]**
- **Hosting:** Flex Consumption (or Consumption) for MVP; consider Premium/dedicated for
  production (VNet, no cold start). **[Assumption]**
- **Identity:** **system-assigned Managed Identity** enabled.
- **Functions (planned):**
  | Function | Trigger | Purpose | Phase |
  |---|---|---|---|
  | `IssueToken` | HTTP | Mint short-lived ACS `voip` token | 3 |
  | `CreateSession` | HTTP | Create ACS Room + pending Dataverse session | 4 |
  | `StartRecording` / `StopRecording` | HTTP | Recording control (post-consent) | 8 |
  | `OnRecordingFileStatusUpdated` | Event Grid | Finalize recording, write Dataverse + timeline | 8 |
  | `OnCallLifecycle` | Event Grid | Capture join/leave/quality events | 4/8 |
  | `CleanupEphemeralIdentities` | Timer | Delete anonymous ACS identities | 4 |

- **CORS:** restrict to the customer entry-point origin(s) and the Dynamics workspace origin. **[Assumption]**

---

## 6. Storage accounts & blob container

### 6.1 Functions runtime storage
- **Proposed name:** `stacvfunc<env><region><nn>` → e.g., `stacvfuncdevweu01`
  (storage names: 3–24 chars, lowercase alphanumeric, globally unique).
- Standard LRS; used for `AzureWebJobsStorage` only.

### 6.2 Recordings storage (BYOS)
- **Proposed name:** `stacvrec<env><region><nn>` → e.g., `stacvrecdevweu01`
- **Redundancy:** ZRS or GRS for production durability; LRS acceptable for dev. **[Assumption]**
- **Blob container:** `recordings` (private; no public access).
- **Policies:** lifecycle management for retention (`alex_retentiondays`); **immutable (WORM)**
  policy where regulatory retention is required.
- **Access:** Function writes via Managed Identity; retrieval via scoped, time-limited SAS or RBAC.
- **Encryption:** AES-256 at rest; optional **Customer-Managed Keys** via Key Vault.

---

## 7. Event Grid

- **System topic** on the ACS resource (source = `Microsoft.Communication/CommunicationServices`).
  - **Proposed name:** `egst-acv-<env>-<region>` → e.g., `egst-acv-dev-weu`
- **Event subscription(s):**
  - **Proposed name:** `egs-acv-recording-<env>` → e.g., `egs-acv-recording-dev`
  - **Filtered event types (planned):**
    | Event type | Handler |
    |---|---|
    | `Microsoft.Communication.RecordingFileStatusUpdated` | `OnRecordingFileStatusUpdated` |
    | Call lifecycle events (e.g., `CallStarted`/`CallEnded`/participant events) | `OnCallLifecycle` |
  - **Handler:** the Function App (Azure Function endpoint), with Event Grid validation.
  - **Dead-lettering:** to a dedicated blob container `eventgrid-deadletter` (recommended). **[Assumption]**

---

## 8. Application Insights & Log Analytics

- **Log Analytics workspace** — proposed name: `log-acv-<env>-<region>` → e.g., `log-acv-dev-weu`
- **Application Insights** (workspace-based) — proposed name: `appi-acv-<env>-<region>` →
  e.g., `appi-acv-dev-weu`
- Used by the Function App (instrumentation) and for ACS call diagnostics / quality signals.
- Telemetry verbosity is governed per-channel by `alex_telemetrylevel` (see configuration model).

---

## 9. Key Vault

- **Proposed name:** `kv-acv-<env>-<region>-<nn>` → e.g., `kv-acv-dev-weu-01` (3–24 chars).
- **Purpose:** store secret **references/values** consumed by the backend (never by the client);
  optional **CMK** for storage/ACS.
- **Stored secrets (examples — names only):**
  | Secret name | Purpose |
  |---|---|
  | `acs-connection-string` | ACS fallback auth (prefer Managed Identity) |
  | `recordings-sas-reference` | Scoped recording retrieval (if SAS used) |
- **Access model:** **RBAC** (Key Vault Secrets User) for the Function's Managed Identity; no access policies sprawl. Purge protection + soft delete enabled. **[Assumption]**

---

## 10. Managed Identity & RBAC model

**Principle:** the Function App authenticates to Azure services via **Managed Identity**; no secrets
in code or client. Least privilege per resource.

| Principal | Target resource | Role (least privilege) | Why |
|---|---|---|---|
| Function App MI | ACS resource | Communication & Email Service Owner / Contributor (token + recording APIs) — confirm minimal role **[Validate]** | Mint tokens, control recording |
| Function App MI | Recordings storage | **Storage Blob Data Contributor** (scoped to container) | Write recordings, read for linkage |
| Function App MI | Key Vault | **Key Vault Secrets User** | Resolve secret references |
| Function App MI | App Insights | **Monitoring Metrics Publisher** (if needed) | Emit custom telemetry |
| Event Grid | Function App | Event Grid → Function handler (validated) | Deliver events |
| Operators (humans) | Resource group | **Reader** by default; **Contributor** only as needed | Operational visibility |
| Compliance team | Recordings storage | Scoped, time-limited read (per `alex_accesscontrolpolicy`) | Audited retrieval |

> Exact ACS data-plane role for token/recording operations should be confirmed against current
> Microsoft docs before provisioning. **[Validate]**

---

## 11. Naming convention

Pattern: `<type>-acv-<env>-<region>[-<nn>]` (lowercase; storage/KV drop hyphens where required).

| Token | Values |
|---|---|
| `<type>` | `rg`, `acs`, `func`, `st`, `egst`, `egs`, `appi`, `log`, `kv` |
| `acv` | Fixed solution moniker (Audio/Video Channel) |
| `<env>` | `dev`, `test`, `prod` |
| `<region>` | `weu`, `neu`, `eus`, `eus2`, … |
| `<nn>` | Instance number when uniqueness needed (`01`, `02`) |

Examples: `rg-acv-dev-weu`, `acs-acv-dev-weu`, `func-acv-dev-weu-01`, `stacvrecdevweu01`,
`kv-acv-dev-weu-01`, `appi-acv-dev-weu`, `egst-acv-dev-weu`.

> Storage accounts and Key Vault have stricter naming (length/charset/global uniqueness) — final
> names are validated for availability before provisioning.

---

## 12. Environment variables / app settings (Function App)

> Values are supplied at deploy time from Key Vault references / Managed Identity — **never committed**.
> A `.env.example` / `local.settings.json.example` ships with each component in Phase 3+.

| Setting | Purpose | Source |
|---|---|---|
| `ACS_ENDPOINT` | ACS resource endpoint | Config (non-secret) |
| `ACS_CONNECTION_STRING` | ACS auth fallback | **Key Vault reference** (prefer MI) |
| `ACS_USE_MANAGED_IDENTITY` | Toggle MI vs connection string | Config |
| `RECORDINGS_STORAGE_ACCOUNT` | BYOS storage account name | Config |
| `RECORDINGS_CONTAINER` | Blob container (`recordings`) | Config |
| `RECORDINGS_STORAGE_AUTH` | `ManagedIdentity` or KV ref | Config / Key Vault |
| `KEYVAULT_URI` | Key Vault URI | Config |
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | Telemetry | App Insights (KV ref ok) |
| `EVENTGRID_VALIDATION` | Event Grid handshake handling | Config |
| `ALLOWED_ORIGINS` | CORS allow-list (customer + workspace) | Config |
| `DATAVERSE_URL` | Target Dataverse org URL | **Private config** (Phase 5) |
| `DATAVERSE_AUTH` | MI / app registration reference | **Key Vault / Private** (Phase 5) |

The concrete values are tracked in [`private/environments.md`](private/environments.md).

---

## 13. Deployment sequence (when approved)

1. Create the **resource group** (`rg-acv-<env>-<region>`).
2. Create **Log Analytics** + **Application Insights**.
3. Create **Key Vault** (RBAC, purge protection, soft delete).
4. Create **storage accounts** (functions runtime + recordings) and the `recordings` container.
5. Create the **ACS resource**; set data location.
6. Create the **Function App** + plan; enable **system-assigned Managed Identity**.
7. Assign **RBAC** (MI → ACS, storage, Key Vault).
8. Configure **app settings** (Key Vault references, MI toggles, CORS).
9. Create the **Event Grid system topic** on ACS + **event subscription(s)** → Function handler.
10. Deploy Function code (Phase 3+); validate token issuance and Event Grid handshake.
11. Configure storage **lifecycle/WORM** policies and **dead-letter** container.
12. Smoke test end-to-end (Phase 11).

> Steps 1–11 are **infrastructure** and would be captured as IaC (Bicep/Terraform) in a later phase
> for repeatability. **[Assumption]**

---

## 14. Cost considerations (planning placeholders — re-verify)

> All figures are **planning placeholders only**. Re-verify against the Azure pricing calculator for
> the chosen region before commitment. **[Validate]**

| Resource | Cost driver | Notes |
|---|---|---|
| ACS | **Per-minute** audio/video usage + **recording** + **transcription** + data egress | Dominant variable cost; scales with session volume/duration |
| Function App | Executions + execution time (Consumption) or fixed plan | Low for MVP; rises with event volume |
| Storage (recordings) | **GB-month stored** + transactions + egress | Driven by retention period and recording format (mp4 > mp3 > wav) |
| Storage (functions) | Minimal | Runtime state only |
| Application Insights / Log Analytics | **GB ingested** + retention | Control via `alex_telemetrylevel`; set data caps |
| Event Grid | Per **operation** (very low unit cost) | Negligible at MVP scale |
| Key Vault | Per **operation** + optional HSM | Negligible |
| Managed Identity | Free | — |

**Cost-control levers:**
- Use **Consumption/Flex** hosting for dev/MVP.
- Tune **retention** (`alex_retentiondays`) and choose the **smallest sufficient recording format**.
- Set **Log Analytics daily caps** and reduce telemetry verbosity outside production.
- **Model ACS consumption** at expected peak concurrency before production sign-off. **[Likely]**
- Configure **budgets + cost alerts** on the resource group.

> No standalone monetary estimate is given here because it depends entirely on session volume,
> duration, video vs audio mix, retention, and region — all of which require user input to model.

---

## 15. What requires user approval before provisioning

Nothing in this document provisions anything. Before **any** `az`/IaC create operation, the user
must explicitly confirm:

| # | Decision | Needed for |
|---|---|---|
| 1 | **Target subscription** (which one) | All resources |
| 2 | **Resource group name + region** | All resources |
| 3 | **Naming convention** approval (or overrides) | All resources |
| 4 | **Cost impact** acknowledgement (ACS consumption is the main driver) | Go/no-go |
| 5 | One vs two **storage accounts** | Storage layout |
| 6 | **Function runtime** (.NET vs Node) and **hosting tier** | Function App |
| 7 | **Redundancy** for recordings storage (LRS/ZRS/GRS) | Storage durability |
| 8 | Whether to use **IaC (Bicep/Terraform)** from the start | Deployment method |
| 9 | **Key Vault + CMK** scope (use CMK or platform-managed keys) | Encryption |

---

## 16. Microsoft validation items (Azure-specific)

| Item | Status |
|---|---|
| ACS Call Recording + transcription availability in the chosen region | 🔲 Validate |
| Minimal ACS data-plane RBAC role for token + recording operations | 🔲 Validate |
| Recommended ACS data location vs storage region for residency | 🔲 Validate |
| Event Grid event-type names for current ACS call lifecycle | 🔲 Validate |

---

## 17. Open items still missing (to fill private notes)

- Confirmed subscription, resource group, and region.
- Expected **session volume / concurrency / average duration** (for cost modeling).
- Recording **format** default and **retention** period per channel policy.
- Whether production needs **multi-region DR** in this phase.
- Dataverse connection details (Phase 5) for the orchestration Functions.
