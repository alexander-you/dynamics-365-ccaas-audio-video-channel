// Media engine types for the Visual Engagement Media Host PCF control.
//
// These mirror the shapes used by the agent-media-panel (src/agent-media-panel/src/types.ts) so the
// engine logic stays faithful to the proven RealMediaSession, but are self-contained here (no Vite /
// no panel UI dependency) so the PCF builds with pcf-scripts/webpack.

export type RequestedMedia = "audio" | "audio-video";

export type SessionState =
  | "idle"
  | "joining"
  | "connected"
  | "leaving"
  | "disconnected"
  | "error";

export type ParticipantConnectionState =
  | "connecting"
  | "connected"
  | "on-hold"
  | "disconnected";

export interface Participant {
  id: string;
  displayName: string;
  role: "agent" | "customer";
  connection: ParticipantConnectionState;
  micMuted: boolean;
  cameraOn: boolean;
}

export type DiagOutcome = "success" | "failed" | "not-attempted";
export type PermissionState = "granted" | "denied" | "prompt" | "unknown";

/** Embedded-surface media diagnostics — same fields the web-resource probe / panel surface. */
export interface MediaDiagnostics {
  embedded: boolean;
  cameraPermission: PermissionState;
  microphonePermission: PermissionState;
  getUserMedia: DiagOutcome;
  localVideoStreamCreated: boolean;
  startVideo: DiagOutcome;
  localPreviewRendered: boolean;
  videoPublished: boolean;
  lastError?: string;
  permissionsPolicyError?: string;
}

export interface MediaMessage {
  severity: "info" | "warning" | "error";
  text: string;
  hint?: string;
}

export interface LocalMediaState {
  micMuted: boolean;
  cameraOff: boolean;
}

/** Snapshot the PCF view renders from. No tenant data, no ACS types leak through. */
export interface MediaSnapshot {
  state: SessionState;
  isMock: boolean;
  hasContext: boolean;
  acsGroupId: string;
  mode: string;
  requestedMedia: RequestedMedia;
  sessionRef: string;
  local: LocalMediaState;
  participants: Participant[];
  diagnostics: MediaDiagnostics;
  message?: MediaMessage;
}

/** Configuration the engine needs, built from PCF inputs (never hardcoded in code). */
export interface MediaEngineConfig {
  /** Relay POST /api/token endpoint that mints a VoIP ACS token. */
  tokenUrl: string;
  /**
   * URL of the standalone, self-hosted ACS SDK bundle (sdk-host/dist/acv-acs-sdk.js). Loaded at
   * runtime via a <script> tag (the SDK cannot be bundled into a PCF — pcf-1045/5 MB limit). Must
   * be a same-origin / allowlisted static host. No secret/tenant value.
   */
  sdkUrl: string;
  /** Dynamic ACS group-call GUID (same group the customer joined). Empty => waiting. */
  groupId: string;
  requestedMedia: RequestedMedia;
  mode: string;
  sessionRef: string;
}

export interface MediaEngineListener {
  onSnapshot(snapshot: MediaSnapshot): void;
}
