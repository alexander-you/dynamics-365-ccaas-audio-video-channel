// Shared types for the customer web entry point. Mirrors the token-service contracts.
// Phase 3 scaffold.

export type EntryPoint = "Portal" | "Public" | "AuthArea" | "Mobile";
export type ChannelMode = "Audio" | "Video";

export interface TokenRequest {
  anonymous: boolean;
  contactId?: string;
  caseId?: string;
  entryPoint: EntryPoint;
  channelConfig?: string;
}

export interface TokenResponse {
  acsUserId: string;
  token: string;
  expiresOn: string;
  sessionId: string;
  roomId?: string;
  isMock: boolean;
}

export interface SessionRequest {
  entryPoint: EntryPoint;
  anonymous: boolean;
  contactId?: string;
  caseId?: string;
  channelConfig?: string;
  channelMode: ChannelMode;
}

export interface SessionResponse {
  sessionId: string;
  roomId: string;
  status: string;
  createdOn: string;
  validUntil?: string;
  isMock: boolean;
}

export interface ConsentRecord {
  sessionId: string;
  contactId?: string;
  consentType: "Recording" | "Transcription" | "DataUse";
  value: "Granted" | "Denied" | "Withdrawn";
  jurisdiction?: string;
  disclosureChannel?: string;
  disclosureText?: string;
}

export interface ConsentResult {
  sessionId: string;
  accepted: boolean;
  consentId: string;
  isMock: boolean;
}

export interface DeviceCheckResult {
  cameraAvailable: boolean;
  microphoneAvailable: boolean;
  cameraLabel?: string;
  microphoneLabel?: string;
  error?: string;
}
