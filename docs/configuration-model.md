# Dataverse Configuration & Metadata Model

> **Version:** 0.1.0 · **Status:** DESIGN ONLY — nothing is created in Dynamics 365 yet.
> **Prefix:** `alex` (placeholder — confirm with publisher).
> **Approval gate:** Tables/columns are created only after the user confirms environment, solution,
> publisher, prefix, and that changes are allowed. See [known-limitations.md](known-limitations.md).

This model has two parts:
1. **Channel configuration** — admin-managed settings that drive runtime behavior.
2. **Interaction metadata** — session, recording, consent, telemetry, transcript records.

---

## 0. Storage responsibility (MVP system-of-record split)

> This is a load-bearing architecture decision. See [adr/0006-storage-responsibility-split.md](adr/0006-storage-responsibility-split.md).

| Data | System of record (MVP) | Notes |
|---|---|---|
| A/V **session metadata** | **Dataverse** | `alex_acvsession` |
| **Consent records** | **Dataverse** | `alex_acvconsent` — compliance evidence |
| **Recording metadata** + secure reference to the file | **Dataverse** | `alex_acvrecording` (stores the **Blob reference**, not the bytes) |
| **Transcript** + **AI summary** | **Dataverse** | `alex_acvtranscript` |
| **Events / telemetry metadata** | **Dataverse** | `alex_acvevent` (operational firehose may also go to App Insights) |
| Case / contact / account **linkage** | **Dataverse** | Standard lookups + `phonecall` timeline |
| Agent, queue, status, **lifecycle** | **Dataverse** | On `alex_acvsession` |
| **Physical audio/video recording file (bytes)** | **Azure Blob Storage (BYOS)** | From **day one** of the MVP |

**Rules:**
- **Dataverse is the system of record for business and compliance data.** It stores the records and
  metadata above, including a **secure reference** (Blob URI + credential reference) to the media file.
- **The physical media file lives in Azure Blob Storage (BYOS) from the MVP onward.** It is **not**
  stored in Dataverse by default.
- The recording table (`alex_acvrecording`) holds **metadata + a secure reference** to the Blob file
  — never the file bytes.
- `recordingStorageMode` (`alex_recordingstoragemode`) MVP default = **`AzureBlobBYOS`**.
- **`DataverseFile` is demo-only / experimental** for *very small* recordings — **not recommended for
  MVP or production**. See §6.
- Later production phases harden Blob storage: lifecycle rules, retention, immutability/WORM (if
  required), RBAC, auditing, and cost controls. See [azure-resources.md](azure-resources.md) §6.2.

---

## 1. Channel configuration table — `alex_acvchannelconfig`

**Display name:** ACS A/V Channel Configuration
**Primary name:** `alex_name` (e.g., *"Claims Video Queue — EU Production"*)

A configuration can be scoped (most specific wins at runtime): **channel instance → workstream →
queue → business unit**.

| Logical name | Display name | Type | Default | Description |
|---|---|---|---|---|
| `alex_name` | Configuration name | Text(100) | required | Human-readable label |
| `alex_workstreamref` | Workstream reference | Text/Lookup | — | Associated Unified Routing workstream |
| `alex_queueid` | Default queue | Lookup → queue | — | Default routing queue |
| `alex_businessunitid` | Business unit | Lookup → businessunit | — | Scope fallback |
| `alex_enableaudio` | Enable audio | Boolean | Yes | Voice audio active |
| `alex_enablevideo` | Enable video | Boolean | Yes | Camera video active |
| `alex_enablescreenshare` | Enable screen sharing | Boolean | Yes | Screen share permitted |
| `alex_autorecording` | Automatic recording | Boolean | Yes | Start recording on connect |
| `alex_manualrecordingallowed` | Allow manual recording | Boolean | No | Agent can start/stop |
| `alex_pauseresumeallowed` | Allow pause/resume | Boolean | Yes | For sensitive segments |
| `alex_recordingformat` | Recording format | Choice | MixedVideo | AudioOnly · MixedAudio · UnmixedAudio · MixedVideo |
| `alex_enabletranscription` | Enable transcription | Boolean | No | ACS real-time or post-call |
| `alex_transcriptionlanguage` | Transcription language | Text/Choice | en-US | BCP-47 tag |
| `alex_transcriptionmode` | Transcription mode | Choice | PostCall | RealTime · PostCall |
| `alex_enableaisummary` | Enable AI summary | Boolean | No | Requires transcription |
| `alex_consenttemplate` | Consent message template | Multiline | — | Disclosure text |
| `alex_requireconsent` | Require consent | Boolean | Yes | Block join until consent captured |
| `alex_recordingstoragemode` | Recording storage mode | Choice | **AzureBlobBYOS** | **AzureBlobBYOS (MVP default)** · ACSDefault24h (temp) · DataverseFile (demo-only/experimental — see §6) |
| `alex_storagecontainerurl` | Storage container URL | Text(500) | — | Blob container base URL (BYOS) |
| `alex_storagesasreference` | Storage credential reference | Text(200) | — | Key Vault secret **name** — **never the SAS itself** |
| `alex_retentiondays` | Retention period (days) | Integer | 365 | Blob lifecycle |
| `alex_accesscontrolpolicy` | Recording access policy | Choice | AgentAndSupervisor | AgentOnly · AgentAndSupervisor · ComplianceTeamOnly · Custom |
| `alex_routingpriority` | Routing priority | Integer(1–100) | 50 | Passed to routing |
| `alex_videocapacitycost` | Video capacity cost | Integer | 1 | Units consumed from capacity profile |
| `alex_fallbackbehavior` | Fallback behavior | Choice | AudioOnly | AudioOnly · OfferCallback · EndSession |
| `alex_supervisormonitorenabled` | Supervisor monitoring | Boolean | Yes | Allow silent Consumer join |
| `alex_teamsescalationenabled` | Teams expert escalation | Boolean | No | Allow adding a Teams expert |
| `alex_telemetrylevel` | Telemetry level | Choice | Standard | Off · Minimal · Standard · Verbose |
| `alex_isactive` | Configuration active | Boolean | Yes | Soft-disable without deleting |
| `alex_effectivefrom` | Effective from | DateTime | — | Optional |
| `alex_effectiveto` | Effective to | DateTime | — | Optional auto-expire |

> **Security:** `alex_storagesasreference` stores a **reference** (Key Vault secret name), never a
> literal SAS key or connection string. The backend resolves it at runtime via Managed Identity.

---

## 2. Interaction metadata tables

### 2.1 `alex_acvsession` — Audio/Video Session
| Field | Type | Purpose |
|---|---|---|
| `alex_name` / Session ID | Text/Autonumber | Identifier |
| `alex_acscallid` / `alex_servercallid` | Text | Correlate to ACS call |
| `alex_acsroomid` | Text | Room/session reference |
| `alex_channelmode` | Choice (Audio/Video) | Media type |
| `alex_status` | Choice (Pending/Routing/Active/Completed/Failed/Abandoned) | Lifecycle |
| `alex_entrypoint` | Choice (Portal/Public/AuthArea/Mobile) | Origin |
| `alex_contactid` | Lookup → contact | CRM linkage |
| `alex_accountid` | Lookup → account | CRM linkage |
| `alex_incidentid` | Lookup → incident | Case linkage |
| `alex_workitemref` | Lookup/Text | Optional native work-item link |
| `alex_agentid` | Lookup → systemuser | Assigned agent |
| `alex_queueid` | Lookup → queue | Routing |
| `alex_starttime` / `alex_endtime` / `alex_duration` | DateTime/Number | Metrics |
| `alex_disposition` | Choice/Text | Outcome |
| `alex_anonymous` | Boolean | Identity model |

### 2.2 `alex_acvrecording` — Audio/Video Recording
> Stores **recording metadata + a secure reference** to the media file in Azure Blob (BYOS).
> **Never stores the file bytes** in the MVP/production default.

| Field | Type | Purpose |
|---|---|---|
| `alex_recordingid` | Text | ACS recording id |
| `alex_sessionid` | Lookup → `alex_acvsession` | Parent |
| `alex_format` | Choice (mp4/mp3/wav) | Media format |
| `alex_mode` | Choice (Mixed/Unmixed) | Recording mode |
| `alex_storagemode` | Choice (AzureBlobBYOS/ACSDefault24h/DataverseFile) | Where the file lives (MVP: AzureBlobBYOS) |
| `alex_bloburi` | Text(500) | **Secure reference** to the media file in Blob (BYOS) |
| `alex_blobcredentialref` | Text(200) | Key Vault secret **name** / MI scope for retrieval — never a literal SAS |
| `alex_status` | Choice (Recording/Available/Failed/Deleted) | State |
| `alex_retentionuntil` | DateTime | Lifecycle/WORM |
| `alex_consentverified` | Boolean | Compliance gate |

### 2.3 `alex_acvconsent` — Audio/Video Consent
| Field | Type | Purpose |
|---|---|---|
| `alex_sessionid` | Lookup → `alex_acvsession` | Parent |
| `alex_contactid` | Lookup → contact | Who consented |
| `alex_consenttype` | Choice (Recording/Transcription/DataUse) | Scope |
| `alex_value` | Choice (Granted/Denied/Withdrawn) | Decision |
| `alex_capturedat` | DateTime | Evidence |
| `alex_jurisdiction` | Text/Choice | Legal basis |
| `alex_disclosurechannel` | Choice | How presented |

### 2.4 `alex_acvevent` — Audio/Video Event / Telemetry
| Field | Type | Purpose |
|---|---|---|
| `alex_sessionid` | Lookup → `alex_acvsession` | Parent |
| `alex_eventtype` | Choice (Join/Leave/Mute/ScreenShare/QualityAlert/Error) | Lifecycle/quality |
| `alex_timestamp` | DateTime | Sequence |
| `alex_participant` | Text | Who |
| `alex_metric` / `alex_errorcode` | Text/Number | Diagnostics |

### 2.5 `alex_acvtranscript` — Transcript / Summary (optional)
| Field | Type | Purpose |
|---|---|---|
| `alex_sessionid` | Lookup → `alex_acvsession` | Parent |
| `alex_transcriptbody` | Multiline/File | Full transcript |
| `alex_aisummary` | Multiline | Generated summary |
| `alex_language` | Choice | Locale |
| `alex_source` | Choice (ACS-RT/Batch) | Provenance |

---

## 3. Linkage to standard records

- **Contact / Account / Case (`incident`)** — lookups on the session.
- **Phone Call activity (`phonecall`)** — created "regarding" the customer/case so the session
  appears on the **native timeline**. **[Confirmed]**
- **Conversation / work item (`msdyn_ocliveworkitem`)** — only when a supported bootstrap pattern
  is validated. **[Validate with Microsoft]**
- **Agent (`systemuser`), Queue, Workstream** — captured for analytics.

> Omnichannel internal entity logical names vary by version — confirm in the target environment
> before building dependencies. **[Validate]**

---

## 4. Runtime consumption (how config drives behavior)

1. Token service — which media capabilities to allow.
2. ACS Room creation — validity window + participant roles.
3. Consent gate — show `alex_consenttemplate`; block if `alex_requireconsent = Yes`.
4. Recording start — if `alex_autorecording`, start with `alex_recordingformat` to `alex_storagecontainerurl`.
5. Transcription — if enabled, start per `alex_transcriptionmode`/`alex_transcriptionlanguage`.
6. Routing — pass `alex_routingpriority`/`alex_queueid`/`alex_videocapacitycost`.
7. Supervisor UI — expose monitor join per `alex_supervisormonitorenabled`.
8. Teams escalation — expose "Add expert" per `alex_teamsescalationenabled`.
9. Telemetry — App Insights verbosity per `alex_telemetrylevel`.
10. Fallback — on media failure apply `alex_fallbackbehavior`.

---

## 5. Administration UX

Expose `alex_acvchannelconfig` (and the metadata tables, read-only for ops) as a **custom
model-driven app** or a tab in the existing Contact Center admin app. Admins use forms — no code,
no JSON. **[Assumption]**

---

## 6. `recordingStorageMode` options

| Mode | MVP/Prod recommendation | Where the file lives | When to use |
|---|---|---|---|
| **`AzureBlobBYOS`** | ✅ **MVP & production default** | Organization-owned Azure Blob container | Always, by default. Durable, controllable, retention/WORM-capable, cost-efficient for video. |
| `ACSDefault24h` | ⚠️ Not for production | ACS temporary storage (**24h** only) | Throwaway testing only; files auto-expire. |
| `DataverseFile` | 🧪 **Demo-only / experimental — NOT recommended** | Dataverse File column | Tiny audio-only clips in a demo where no Blob exists. Subject to Dataverse file-size/storage-cost limits; do not use for video or production. |

**Why Blob, not Dataverse File, for media:**
- Video recordings are large; Dataverse file storage is costly and size-limited.
- Blob supports lifecycle, immutability/WORM, and granular RBAC needed for compliance.
- The split keeps Dataverse as the lightweight **system of record** for metadata while Blob holds bytes.

Regardless of mode, **`alex_acvrecording` always stores the metadata + secure reference**; only the
*physical bytes location* changes. The MVP never stores video bytes in Dataverse.
