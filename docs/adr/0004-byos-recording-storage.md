# 0004. Bring-Your-Own-Storage for recordings

## Status
Accepted

## Context
ACS built-in recording storage retains files for only 24 hours. The solution requires
organization-owned, durable storage with retention, immutability (WORM), and full access control
for compliance and audit.

## Decision
Use **ACS Bring-Your-Own-Storage (BYOS)** to write recordings directly to the organization's own
Azure Blob Storage container. Retrieval is driven by the `RecordingFileStatusUpdated` Event Grid
event, processed by an Azure Function that links the recording to Dataverse and the case timeline.

## Consequences
- Microsoft does not retain a copy; the organization controls storage, lifecycle, and retention. **[Confirmed — live]**
- We own storage lifecycle, WORM policy, RBAC, and deletion workflows. **[Confirmed/Assumption]**
- Recording access uses private containers + scoped, time-limited retrieval. **[Confirmed]**
