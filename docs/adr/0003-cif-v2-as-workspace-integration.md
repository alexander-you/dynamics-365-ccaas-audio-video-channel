# 0003. CIF v2 as workspace integration, not the media layer

## Status
Accepted

## Context
The agent experience must feel integrated in the Dynamics 365 workspace (notification, session tab,
screen-pop, presence). Channel Integration Framework v2 (CIF v2) provides these hooks but is scoped
to telephony and explicitly does not manage calls or render media.

## Decision
Use **CIF v2 for workspace orchestration only** — incoming notification (`notifyEvent`),
session creation (`createSession`), screen-pop (`searchAndOpenRecords`/`createTab`), and presence
(`setPresence`/`getPresence`). Implement the **actual media controls in a custom PCF / web
component** hosting the ACS Calling SDK.

## Consequences
- Clear separation: CIF = workspace integration; ACS/PCF = media. **[Confirmed — live]**
- CIF does not auto-create a native Omnichannel conversation or consume capacity — these are
  approximated via a supported work-item/bootstrap pattern. **[Confirmed — live / Validate]**
- We must validate WebRTC/`getUserMedia` inside the PCF/CIF iframe. **[Validate with Microsoft]**
