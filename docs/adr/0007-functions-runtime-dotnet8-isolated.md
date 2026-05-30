# 0007. Azure Functions runtime — .NET 8 isolated worker

## Status
Accepted

## Context
The backend (token service + orchestration Functions) needs a runtime. Candidates: **.NET 8
isolated worker** and **Node.js 18+**. Both have mature ACS SDKs and Azure Functions support.

Factors:
- The Dataverse/Dynamics ecosystem is .NET-centric (ServiceClient, SDK, plugins) — Phase 5+
  integration is simpler and better-supported in .NET.
- .NET isolated worker is the current, forward-looking Functions model (decoupled from host runtime,
  supports latest .NET LTS).
- The user expressed a preference for **.NET 8 isolated** unless there is a strong reason otherwise.
- The local machine has the .NET 8 SDK (8.0.421) and Azure Functions Core Tools v4.

## Decision
Use **.NET 8 isolated worker** for all Azure Functions in this solution (token service and
orchestration). The customer web entry point remains a separate browser app (TypeScript + ACS
Calling SDK), independent of this choice.

## Consequences
- Smooth path to Dataverse integration via the .NET SDK / `ServiceClient` in Phase 5+.
- Aligns with the LTS, isolated-worker direction for Azure Functions.
- Front-end and back-end use different languages (TypeScript vs C#) — acceptable and conventional.
- Requires the .NET 8 SDK + Functions Core Tools locally (already present).
