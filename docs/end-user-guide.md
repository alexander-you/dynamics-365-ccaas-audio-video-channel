# End-User Guide (Agents & Supervisors)

> **Version:** 0.1.0 · **Status:** Skeleton — expands with Phases 6–10.

## For agents

### Receiving and accepting a session (target)
1. A notification appears in the Customer Service workspace when a customer starts an A/V session.
2. Accept the notification. A session tab opens and the related customer/case record screen-pops.
3. The ACS media panel loads inside the workspace session tab.

### During a session (target)
| Control | What it does |
|---|---|
| Mute / Unmute | Toggle your microphone |
| Camera on / off | Toggle your camera |
| Screen share | Share/stop sharing your screen |
| Recording status | Shows whether the session is being recorded (and paused/resumed) |
| Participant status | Shows who is connected (customer, supervisor, expert) |
| Session status | Connecting / active / ended / failed |
| End | Leave/end the session |
| Related case | Quick link to the linked case and customer |

### After a session (target)
- The recording is stored and linked to the case.
- A `phonecall` activity appears on the case/customer timeline.
- Transcript/summary (if enabled) is attached to the session.

### Fallback (target)
If video fails, the session degrades per the configured fallback (audio-only, callback offer, or
clean end). Follow the on-screen message.

## For supervisors

### Phase 10 (initial)
- View a list of active and recent A/V sessions with status, recording status, and consent status.
- See agent/customer participant state and error/quality events.

### Later phases (if approved)
- Silent monitor, consult, or barge into a live session via the ACS Room.

## Troubleshooting (target)

| Symptom | Likely cause | Action |
|---|---|---|
| Camera/mic blocked | Browser/iframe permissions | Check browser permissions; see admin guide for required policies |
| No notification | CIF provider/app profile | Contact admin |
| Recording not starting | Consent not captured | Ensure consent step completed |

> Detailed, screenshot-based instructions are added as the agent experience is built.
