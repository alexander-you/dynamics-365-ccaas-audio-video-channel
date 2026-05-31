// Domain types for the agent media panel. Phase 3c scaffold (mock-only).
// These types describe the SHAPE of an agent-side media session. They contain no tenant data
// and are independent of the ACS SDK so the UI can be built and tested without real ACS.

import type { RequestedMedia } from "./context";

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

/** Outcome of a one-shot media operation, for the diagnostics panel. */
export type DiagOutcome = "success" | "failed" | "not-attempted";

/** Browser permission state (mirrors the Permissions API, plus "unknown" when unavailable). */
export type PermissionState = "granted" | "denied" | "prompt" | "unknown";

/**
 * Embedded-surface media diagnostics. Surfaced in the panel so we can SEE exactly where camera/mic
 * publishing fails inside the Dynamics application tab (vs. a top-level window) without guessing.
 * Every field maps to a concrete WebRTC/ACS step the agent video path depends on.
 */
export interface MediaDiagnostics {
  /** True when the panel is inside an iframe (e.g., the Dynamics app tab) rather than top-level. */
  embedded: boolean;
  /** Camera permission as reported by the Permissions API. */
  cameraPermission: PermissionState;
  /** Microphone permission as reported by the Permissions API. */
  microphonePermission: PermissionState;
  /** Whether a getUserMedia capture attempt succeeded, failed, or has not run yet. */
  getUserMedia: DiagOutcome;
  /** Whether an ACS LocalVideoStream object was constructed from a camera. */
  localVideoStreamCreated: boolean;
  /** Whether call.startVideo / join-with-video published the local stream. */
  startVideo: DiagOutcome;
  /** Whether the local self-preview tile rendered. */
  localPreviewRendered: boolean;
  /** Whether the agent's video is published into the ACS group call. */
  videoPublished: boolean;
  /** Exact browser error message captured from getUserMedia/askDevicePermission. */
  lastError?: string;
  /** Exact Permissions Policy / iframe permission error, when one is detected. */
  permissionsPolicyError?: string;
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
  /** Relay mode that created the conversation ("mock"/"live"). Display-only. */
  mode: string;
  /** Media the customer requested; drives the agent's initial camera state. */
  requestedMedia: RequestedMedia;
  /** Correlation reference from the relay (conversationrequestid / sessionRef). */
  sessionRef: string;
  /**
   * Resolved ACS group-call GUID for THIS session (the same group the customer joined). Empty when
   * no session context is available yet. Surfaced so the UI can build the top-level "call window"
   * pop-out URL with the SAME dynamic group (never a static group, never a token/secret).
   */
  acsGroupId: string;
  /** Embedded-surface media diagnostics (live sessions only). */
  diagnostics?: MediaDiagnostics;
  message?: PanelMessage;
}
