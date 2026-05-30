# 0008. Agent-side media component — embedded web component first, PCF-ready

## Status
Accepted

## Context
The agent-side media experience (mute, camera, screen share, recording/consent status, participant
roster, related case/contact) will ultimately be **embedded in the Dynamics 365 agent workspace**.
Two scaffolding approaches were considered for Phase 3c:

- **PCF control** (`pac pcf init`): the native Power Apps Component Framework path for embedding
  custom UI in model-driven apps. Pros: first-class D365 embedding, lifecycle hooks. Cons: requires
  Power Platform CLI + PCF tooling and the PCF test harness; generated artifacts; conceptually tied
  to the Power Platform; heavier diff for a phase that must stay **local-only and mock**.
- **Embedded web component** (TypeScript + Vite, like `customer-web` / `deployment-assistant`):
  framework-neutral, runs fully locally with no Power Platform tooling, consistent with the existing
  scaffolds, and easy to review.

Phase 3c constraints are explicit: **local-only, mock mode, no Power Platform solution, do not
register/deploy a PCF control, no Dataverse, no CIF v2, no real ACS tokens, no secrets.**

## Decision
For Phase 3c, build an **embedded web component** scaffold (`src/agent-media-panel/`) with a strict
abstraction boundary, [`IMediaSession`](../../src/agent-media-panel/src/mediaSession.ts), between the
UI and the future ACS Calling SDK. The UI never references the ACS SDK directly.

The component is designed to be **PCF-ready**: when D365 embedding is approved, the same UI and
`IMediaSession` boundary can be wrapped as a **PCF control** (`pac pcf init`) or hosted as a **web
resource**, with `RealMediaSession` implementing the interface using `@azure/communication-calling`
and a server-minted token — **without rewriting the UI**.

## Consequences
- Phase 3c stays local-only and tool-light; no Power Platform CLI dependency is introduced now.
- Consistent developer experience with the other web scaffolds (Vite, strict TS, `npm run typecheck`).
- A later phase must choose the concrete embedding host (PCF vs web resource) and add CIF v2 wiring;
  the abstraction boundary makes that a wrapping exercise, not a rewrite.
- Browser/iframe permission policy for camera/mic/screen-share in the D365 host remains an open
  validation item (see [known-limitations.md](../known-limitations.md)).
