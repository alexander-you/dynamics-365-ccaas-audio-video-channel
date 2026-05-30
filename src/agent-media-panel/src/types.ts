// Domain types for the agent media panel. Phase 3c scaffold (mock-only).
// These types describe the SHAPE of an agent-side media session. They contain no tenant data
// and are independent of the ACS SDK so the UI can be built and tested without real ACS.

/** High-level connection state of the agent in a session. */
export type SessionState = "idle" | "joining" | "connected" | "leaving" | "disconnected" | "error";

/** Recording lifecycle as surfaced to the agent (server-authoritative in the real system). */
export type RecordingStatus = "not-recording" | "starting" | "recording" | "paused" | "stopping";

/** Customer consent state for recording/transcription (captured before media in the real flow). */
export type ConsentStatus = "unknown" | "pending" | "granted" | "declined";

/** Per-participant connection/media state shown in the roster. */
export type ParticipantConnectionState = "connecting" | "connected" | "on-hold" | "disconnected";

export interface Participant {
  id: string;
  displayName: string;
  role: "agent" | "customer" | "supervisor" | "expert";
  connection: ParticipantConnectionState;
  micMuted: boolean;
  cameraOn: boolean;
  isSharingScreen: boolean;
}

/** Read-only reference to the related Dynamics 365 records (mocked in Phase 3c). */
export interface CaseContext {
  caseNumber: string;
  caseTitle: string;
  contactName: string;
  // In the real system these resolve to Dataverse record IDs; here they are display-only.
}

/** A user-facing error/fallback message with severity. */
export interface PanelMessage {
  severity: "info" | "warning" | "error";
  text: string;
  /** Suggested fallback action (e.g., "Switch to audio only"). */
  fallbackHint?: string;
}

/** Local media toggle state owned by the agent. */
export interface LocalMediaState {
  micMuted: boolean;
  cameraOff: boolean;
  sharingScreen: boolean;
}

/** Full snapshot the UI renders from. */
export interface SessionSnapshot {
  state: SessionState;
  isMock: boolean;
  local: LocalMediaState;
  recording: RecordingStatus;
  consent: ConsentStatus;
  participants: Participant[];
  caseContext: CaseContext;
  message?: PanelMessage;
}
