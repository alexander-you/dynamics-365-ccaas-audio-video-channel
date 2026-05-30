# 0002. ACS as the real-time media foundation

## Status
Accepted

## Context
The solution needs embeddable real-time audio/video, screen share, server-side call control,
recording with organization-owned storage, transcription, identity/token management, and Teams
interop for internal experts. Options considered: Azure Communication Services (ACS), Microsoft
Teams as the customer-facing layer, and third-party CPaaS.

## Decision
Use **Azure Communication Services** as the real-time media foundation for the customer-to-agent
path. Teams is used only for internal expert/supervisor collaboration via ACS↔Teams interop; the
customer never moves to Teams.

## Consequences
- ACS provides exactly the primitives needed (Calling SDK, Identity/tokens, Rooms, Call Automation,
  Call Recording with BYOS, transcription, Event Grid, Teams interop). **[Confirmed]**
- It is the same platform behind the first-party Dynamics voice channel. **[Confirmed — live]**
- We own DR/geo-resilience, operational monitoring, and storage lifecycle (no built-in geo-replication).
- ACS consumption cost must be modeled. **[Likely]**
