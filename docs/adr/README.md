# Architecture Decision Records (ADR)

This folder records significant architectural decisions for the solution.

We use a lightweight ADR format. Each record has: Status, Context, Decision, Consequences.

| ADR | Title | Status |
|---|---|---|
| [0001](0001-record-architecture-decisions.md) | Record architecture decisions | Accepted |
| [0002](0002-acs-as-media-foundation.md) | ACS as the real-time media foundation | Accepted |
| [0003](0003-cif-v2-as-workspace-integration.md) | CIF v2 as workspace integration, not media | Accepted |
| [0004](0004-byos-recording-storage.md) | Bring-Your-Own-Storage for recordings | Accepted |
| [0005](0005-repo-rooted-in-project-folder.md) | Git repository rooted in the project folder | Accepted |
| [0006](0006-storage-responsibility-split.md) | Storage split — Dataverse for records, Blob for media | Accepted |
| [0007](0007-functions-runtime-dotnet8-isolated.md) | Azure Functions runtime — .NET 8 isolated worker | Accepted |
| [0008](0008-agent-media-component-approach.md) | Agent-side media component — embedded web component first, PCF-ready | Accepted |

## Template

```
# NNNN. Title
## Status
Proposed | Accepted | Superseded by ADR-XXXX
## Context
What is the issue and the forces at play?
## Decision
What we decided.
## Consequences
Positive, negative, and follow-ups.
```
