// IMediaSession — the abstraction boundary between the agent panel UI and the media engine.
// Phase 3c scaffold.
//
// WHY THIS BOUNDARY EXISTS:
// The UI must never call the ACS Calling SDK directly. It talks only to IMediaSession. This lets
// us (a) build and test the entire agent experience locally in mock mode, and (b) drop in the real
// ACS implementation later (after Azure/ACS approval) without touching the UI.
//
// Phase 3c ships MockMediaSession only. RealMediaSession is a documented placeholder that throws
// until the real ACS path is approved and implemented.

import type {
  SessionSnapshot,
  RecordingStatus,
  ConsentStatus,
  Participant,
  CaseContext,
  LocalMediaState,
  PanelMessage,
  SessionState
} from "./types";

/** Events the session can emit to the UI. */
export interface MediaSessionListener {
  onSnapshot(snapshot: SessionSnapshot): void;
}

/** The contract the UI depends on. No ACS types leak through this interface. */
export interface IMediaSession {
  readonly isMock: boolean;
  subscribe(listener: MediaSessionListener): () => void;
  getSnapshot(): SessionSnapshot;

  join(): Promise<void>;
  leave(): Promise<void>;

  setMicMuted(muted: boolean): Promise<void>;
  setCameraOff(off: boolean): Promise<void>;
  setScreenSharing(on: boolean): Promise<void>;

  // Recording/consent are server-authoritative in the real system; here they are simulated so the
  // agent UI can render every state. The real panel will receive these via the token/orchestration
  // service and Event Grid, not control them directly.
  simulateConsent(status: ConsentStatus): void;
  simulateRecording(status: RecordingStatus): void;
}

// -------------------------------------------------------------------------------------------------
// MockMediaSession — fully local, no network, no ACS, no getUserMedia required.
// -------------------------------------------------------------------------------------------------
const MOCK_CASE: CaseContext = {
  caseNumber: (import.meta.env.VITE_MOCK_CASE_NUMBER as string) ?? "CAS-01234-ABCDE",
  caseTitle: "Sample support case (mock)",
  contactName: (import.meta.env.VITE_MOCK_CONTACT_NAME as string) ?? "Sample Customer"
};

function initialSnapshot(): SessionSnapshot {
  const local: LocalMediaState = { micMuted: false, cameraOff: false, sharingScreen: false };
  return {
    state: "idle",
    isMock: true,
    local,
    recording: "not-recording",
    consent: "unknown",
    participants: [],
    caseContext: MOCK_CASE,
    message: {
      severity: "info",
      text: "Mock mode — no real ACS call is placed. Use the controls to preview agent states."
    }
  };
}

export class MockMediaSession implements IMediaSession {
  readonly isMock = true;
  private snapshot: SessionSnapshot = initialSnapshot();
  private listeners = new Set<MediaSessionListener>();

  subscribe(listener: MediaSessionListener): () => void {
    this.listeners.add(listener);
    listener.onSnapshot(this.snapshot);
    return () => this.listeners.delete(listener);
  }

  getSnapshot(): SessionSnapshot {
    return this.snapshot;
  }

  private update(patch: Partial<SessionSnapshot>, message?: PanelMessage): void {
    this.snapshot = { ...this.snapshot, ...patch, message: message ?? this.snapshot.message };
    for (const l of this.listeners) l.onSnapshot(this.snapshot);
  }

  private setState(state: SessionState, message?: PanelMessage): void {
    this.update({ state }, message);
  }

  private mockParticipants(): Participant[] {
    return [
      {
        id: "agent-1",
        displayName: "You (Agent)",
        role: "agent",
        connection: "connected",
        micMuted: this.snapshot.local.micMuted,
        cameraOn: !this.snapshot.local.cameraOff,
        isSharingScreen: this.snapshot.local.sharingScreen
      },
      {
        id: "customer-1",
        displayName: MOCK_CASE.contactName,
        role: "customer",
        connection: "connected",
        micMuted: false,
        cameraOn: true,
        isSharingScreen: false
      }
    ];
  }

  async join(): Promise<void> {
    this.setState("joining", { severity: "info", text: "Joining session (mock)…" });
    await delay(400);
    this.update(
      { state: "connected", participants: this.mockParticipants() },
      { severity: "info", text: "Connected (mock). Recording and consent are simulated." }
    );
  }

  async leave(): Promise<void> {
    this.setState("leaving", { severity: "info", text: "Leaving session (mock)…" });
    await delay(300);
    this.update(
      {
        state: "disconnected",
        participants: [],
        recording: "not-recording",
        local: { micMuted: false, cameraOff: false, sharingScreen: false }
      },
      { severity: "info", text: "Disconnected (mock). You can re-join." }
    );
  }

  async setMicMuted(muted: boolean): Promise<void> {
    this.update({ local: { ...this.snapshot.local, micMuted: muted }, participants: this.syncAgent({ micMuted: muted }) });
  }

  async setCameraOff(off: boolean): Promise<void> {
    this.update({ local: { ...this.snapshot.local, cameraOff: off }, participants: this.syncAgent({ cameraOn: !off }) });
  }

  async setScreenSharing(on: boolean): Promise<void> {
    this.update(
      { local: { ...this.snapshot.local, sharingScreen: on }, participants: this.syncAgent({ isSharingScreen: on }) },
      on
        ? { severity: "info", text: "Screen sharing started (mock). Co-browsing is a separate future capability." }
        : undefined
    );
  }

  private syncAgent(patch: Partial<Participant>): Participant[] {
    return this.snapshot.participants.map((p) => (p.role === "agent" ? { ...p, ...patch } : p));
  }

  simulateConsent(status: ConsentStatus): void {
    const msg: PanelMessage =
      status === "declined"
        ? { severity: "warning", text: "Customer declined consent. Recording must stay off.", fallbackHint: "Continue without recording." }
        : { severity: "info", text: `Consent status: ${status} (mock).` };
    this.update({ consent: status }, msg);
  }

  simulateRecording(status: RecordingStatus): void {
    if (status !== "not-recording" && this.snapshot.consent !== "granted") {
      this.update(
        {},
        { severity: "error", text: "Cannot record without granted consent.", fallbackHint: "Capture consent first." }
      );
      return;
    }
    this.update({ recording: status }, { severity: "info", text: `Recording status: ${status} (mock).` });
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// -------------------------------------------------------------------------------------------------
// RealMediaSession — placeholder. NOT implemented in Phase 3c.
// -------------------------------------------------------------------------------------------------
export class RealMediaSession implements IMediaSession {
  readonly isMock = false;

  private fail(): never {
    throw new Error(
      "RealMediaSession is not implemented in Phase 3c. Keep VITE_USE_MOCKS=true until ACS is approved. " +
        "The real implementation will use @azure/communication-calling with a server-issued token."
    );
  }

  subscribe(): () => void {
    this.fail();
  }
  getSnapshot(): SessionSnapshot {
    this.fail();
  }
  join(): Promise<void> {
    // Real flow (later phase, after ACS approval):
    //   const token = await fetch("/api/token", ...);  // server-minted via Managed Identity
    //   const cred = new AzureCommunicationTokenCredential(token);
    //   const agent = await new CallClient().createCallAgent(cred);
    //   this.call = agent.join({ roomId });
    //   wire call.on("stateChanged"/"remoteParticipantsUpdated") -> emit snapshots
    this.fail();
  }
  leave(): Promise<void> {
    this.fail();
  }
  setMicMuted(): Promise<void> {
    this.fail();
  }
  setCameraOff(): Promise<void> {
    this.fail();
  }
  setScreenSharing(): Promise<void> {
    this.fail();
  }
  simulateConsent(): void {
    this.fail();
  }
  simulateRecording(): void {
    this.fail();
  }
}

/** Factory honoring VITE_USE_MOCKS. Phase 3c always returns the mock unless explicitly disabled. */
export function createMediaSession(): IMediaSession {
  const useMocks = (import.meta.env.VITE_USE_MOCKS as string | undefined) !== "false";
  return useMocks ? new MockMediaSession() : new RealMediaSession();
}
