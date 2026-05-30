# 0001. Record architecture decisions

## Status
Accepted

## Context
This solution involves multiple platforms (ACS, Dynamics 365, Dataverse, Azure) and several
decisions with long-term consequences and Microsoft-validation dependencies. We need a durable,
reviewable record of why decisions were made.

## Decision
We will keep Architecture Decision Records (ADRs) in `docs/adr/`, one file per decision, using a
lightweight format (Status, Context, Decision, Consequences). New significant decisions get a new
numbered ADR. Superseded decisions are marked, not deleted.

## Consequences
- Decisions are traceable and onboarding is easier.
- Small ongoing documentation overhead per decision.
