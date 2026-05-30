# 0006. Storage responsibility split — Dataverse for records, Blob for media

## Status
Accepted

## Context
The solution produces two very different kinds of data: (1) lightweight **business and compliance
records** (session, consent, recording metadata, transcript, AI summary, events, CRM linkage), and
(2) large **physical media files** (audio/video recordings). We must decide where each lives for the
MVP, and avoid accidentally making Dataverse the store for large video files.

## Decision
For the **MVP and production**:
- **Dataverse is the system of record** for all business and compliance data and metadata,
  including a **secure reference** (Blob URI + credential reference) to each media file.
- **Azure Blob Storage (BYOS) holds the physical audio/video recording files from day one.**
- The recording table (`alex_acvrecording`) stores **metadata + secure reference only — never file bytes**.
- `recordingStorageMode` default = **`AzureBlobBYOS`**.
- `DataverseFile` is documented as **demo-only / experimental** for very small recordings and is
  **not** the recommended MVP/production model.
- Later production phases harden Blob storage: lifecycle rules, retention, immutability/WORM (if
  required), RBAC, access auditing, and cost controls.

## Consequences
- Dataverse stays lightweight and query/report-friendly; large media doesn't bloat it or its cost.
- Blob provides durability, lifecycle, WORM, and granular RBAC needed for compliance. **[Confirmed]**
- Two stores must be kept consistent (an Event-Grid-driven Function links the Blob file back to the
  Dataverse recording record).
- A demo path (`DataverseFile`) exists for environments without Blob, clearly marked non-production.
