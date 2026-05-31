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
import type { AvContext } from "./context";
import { readAvContext } from "./context";

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

  // Optional: render live video tiles into a panel-provided container. Mock sessions omit this;
  // the real ACS session draws local + remote video streams here. Passing an HTMLElement keeps ACS
  // renderer types from leaking through the interface.
  attachVideo?(stage: HTMLElement): void;
}

// -------------------------------------------------------------------------------------------------
// MockMediaSession — fully local, no network, no ACS, no getUserMedia required.
// -------------------------------------------------------------------------------------------------
function caseFromContext(ctx: AvContext): CaseContext {
  return {
    caseNumber: ctx.caseNumber,
    caseTitle: ctx.caseTitle,
    contactName: ctx.contactName
  };
}

function initialSnapshot(ctx: AvContext): SessionSnapshot {
  // Audio-only requests start with the camera off so the agent's initial state matches the request.
  const audioOnly = ctx.requestedMedia === "audio";
  const local: LocalMediaState = { micMuted: false, cameraOff: audioOnly, sharingScreen: false };
  const refNote = ctx.sessionRef ? ` (ref ${ctx.sessionRef})` : "";
  return {
    state: "idle",
    isMock: true,
    local,
    recording: "not-recording",
    consent: "unknown",
    participants: [],
    caseContext: caseFromContext(ctx),
    mode: ctx.mode,
    requestedMedia: ctx.requestedMedia,
    sessionRef: ctx.sessionRef,
    acsGroupId: ctx.acsGroupId,
    message: {
      severity: "info",
      text: `Mock mode — ${ctx.requestedMedia} interaction${refNote}. No real ACS call is placed.`
    }
  };
}

export class MockMediaSession implements IMediaSession {
  readonly isMock = true;
  private snapshot: SessionSnapshot;
  private listeners = new Set<MediaSessionListener>();

  constructor(ctx: AvContext = readAvContext()) {
    this.snapshot = initialSnapshot(ctx);
  }

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
        displayName: this.snapshot.caseContext.contactName,
        role: "customer",
        connection: "connected",
        micMuted: false,
        cameraOn: this.snapshot.requestedMedia === "audio-video",
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
// RealMediaSession — real Azure Communication Services group call (C5).
//
// Flow: fetch a VoIP token from the relay token endpoint (server-minted from the ACS connection
// string in Key Vault) -> AzureCommunicationTokenCredential -> CallClient.createCallAgent ->
// join a group call. Local audio is always published; local video is published when the customer
// requested audio-video. Remote participants and their video streams are reflected into the
// SessionSnapshot and rendered into the panel-provided video stage.
//
// Consent/recording remain simulated overlays here (server-authoritative via Call Recording +
// Event Grid in a later phase); the agent UI can still preview those states.
// -------------------------------------------------------------------------------------------------
import {
  CallClient,
  LocalVideoStream,
  VideoStreamRenderer
} from "@azure/communication-calling";
import type {
  CallAgent,
  Call,
  DeviceManager,
  RemoteParticipant,
  RemoteVideoStream,
  VideoStreamRendererView,
  VideoDeviceInfo
} from "@azure/communication-calling";
import { AzureCommunicationTokenCredential, getIdentifierRawId } from "@azure/communication-common";

export interface AcsConfig {
  /** Token endpoint that mints a VoIP ACS token (relay POST /api/token). */
  tokenUrl: string;
  /** Group-call GUID the agent joins. The customer entry point joins the same group. */
  groupId: string;
}

// No static/hardcoded group id. The ACS group is resolved DYNAMICALLY per session from the relay /
// CIF conversation context (acsGroupId on the URL query string or CIF custom params). There is no
// fixed fallback group: if none is supplied the panel waits instead of joining an arbitrary call.
// VITE_ACS_GROUP_ID is an optional LOCAL-DEV override only (never set in the hosted POC build).
export function readAcsConfig(): AcsConfig {
  const env = import.meta.env as Record<string, string | undefined>;
  return {
    tokenUrl:
      env.VITE_TOKEN_URL ??
      "https://func-acv-byoc-relay-vnusoc.azurewebsites.net/api/token",
    groupId: env.VITE_ACS_GROUP_ID ?? ""
  };
}

type TokenResponse = { userId: string; token: string; expiresOn: string; endpoint: string | null };

export class RealMediaSession implements IMediaSession {
  readonly isMock = false;
  private snapshot: SessionSnapshot;
  private listeners = new Set<MediaSessionListener>();
  private readonly ctx: AvContext;
  private readonly config: AcsConfig;

  private callClient?: CallClient;
  private callAgent?: CallAgent;
  private deviceManager?: DeviceManager;
  private call?: Call;
  private localVideoStream?: LocalVideoStream;
  private views: VideoStreamRendererView[] = [];

  constructor(ctx: AvContext = readAvContext(), config: AcsConfig = readAcsConfig()) {
    this.ctx = ctx;
    // Per-conversation group correlation: the relay/CIF supplies an acsGroupId (the same group the
    // customer joined) via the conversation context. There is NO static fallback group — if none is
    // present the resolved group is empty and the panel shows a waiting state instead of connecting.
    const resolvedGroup = (ctx.acsGroupId || config.groupId || "").trim();
    this.config = { ...config, groupId: resolvedGroup };
    this.snapshot = this.initialSnapshot();
  }

  /** True when a dynamic ACS session (acsGroupId) is available to join. */
  private hasSessionContext(): boolean {
    return this.config.groupId.trim() !== "";
  }

  private initialSnapshot(): SessionSnapshot {
    const audioOnly = this.ctx.requestedMedia === "audio";
    const refNote = this.ctx.sessionRef ? ` (ref ${this.ctx.sessionRef})` : "";
    return {
      state: "idle",
      isMock: false,
      local: { micMuted: false, cameraOff: audioOnly, sharingScreen: false },
      recording: "not-recording",
      consent: "unknown",
      participants: [],
      caseContext: caseFromContext(this.ctx),
      mode: this.ctx.mode,
      requestedMedia: this.ctx.requestedMedia,
      sessionRef: this.ctx.sessionRef,
      acsGroupId: this.config.groupId,
      message: this.hasSessionContext()
        ? {
            severity: "info",
            text: `Live ACS — ${this.ctx.requestedMedia} interaction${refNote}. Joining group ${this.config.groupId}.`
          }
        : {
            severity: "warning",
            text:
              "Waiting for an audio/video session. No session context (acsGroupId) is associated " +
              "with this conversation yet — the call starts automatically once the relay/conversation " +
              "provides one. No call is placed in the meantime."
          }
    };
  }

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

  private async fetchToken(): Promise<TokenResponse> {
    const res = await fetch(this.config.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}"
    });
    if (!res.ok) {
      throw new Error(`Token endpoint returned ${res.status}.`);
    }
    return (await res.json()) as TokenResponse;
  }

  async join(): Promise<void> {
    if (this.call) return;
    // No static group: refuse to connect until a dynamic acsGroupId is available. Show a safe
    // waiting state instead of joining an arbitrary/hardcoded group.
    if (!this.hasSessionContext()) {
      this.update(
        { state: "idle" },
        {
          severity: "warning",
          text:
            "No audio/video session context (acsGroupId) is available yet. Waiting for the " +
            "relay/conversation to supply one before connecting."
        }
      );
      return;
    }
    this.update({ state: "joining" }, { severity: "info", text: "Acquiring ACS token…" });
    try {
      const { token } = await this.fetchToken();
      const credential = new AzureCommunicationTokenCredential(token);
      this.callClient = new CallClient();
      this.callAgent = await this.callClient.createCallAgent(credential, {
        displayName: "Agent"
      });
      this.deviceManager = await this.callClient.getDeviceManager();

      const wantVideo = this.ctx.requestedMedia === "audio-video";
      let localVideoStreams: LocalVideoStream[] | undefined;
      let cameraError: string | undefined;
      if (wantVideo) {
        const { camera, error } = await this.acquireCamera();
        if (camera) {
          this.localVideoStream = new LocalVideoStream(camera);
          localVideoStreams = [this.localVideoStream];
        } else {
          cameraError = error;
        }
      }

      this.call = this.callAgent.join(
        { groupId: this.config.groupId },
        localVideoStreams ? { videoOptions: { localVideoStreams } } : {}
      );
      this.wireCall(this.call);
      const publishedVideo = Boolean(this.localVideoStream);
      this.update(
        { state: "connected", local: { ...this.snapshot.local, cameraOff: !wantVideo || !publishedVideo } },
        wantVideo && !publishedVideo
          ? {
              severity: "warning",
              text:
                "Connected to ACS group call (audio only) — your camera could not be published. " +
                (cameraError ?? "No camera was available."),
              fallbackHint:
                "If you are inside the Dynamics workspace tab, camera capture is often blocked by the " +
                "embedded iframe's permissions policy. Open the panel in a separate browser window to publish video."
            }
          : { severity: "info", text: "Connected to ACS group call." }
      );
      this.refreshParticipants();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.update(
        { state: "error" },
        {
          severity: "error",
          text: `Could not join the ACS call: ${message}`,
          fallbackHint: "Check the token endpoint and camera/microphone permissions."
        }
      );
    }
  }

  /**
   * Acquire the first available camera, distinguishing the common failure modes so the agent sees
   * WHY video could not be published (instead of silently joining audio-only). Inside the Dynamics
   * app-tab iframe, camera capture is frequently blocked by the iframe Permissions Policy — that
   * surfaces here as a NotAllowedError / permissions-policy violation from askDevicePermission.
   */
  private async acquireCamera(): Promise<{ camera?: VideoDeviceInfo; error?: string }> {
    if (!this.deviceManager) return { error: "Device manager unavailable." };
    try {
      await this.deviceManager.askDevicePermission({ audio: true, video: true });
    } catch (err) {
      const name = err instanceof Error ? err.name : "";
      const msg = err instanceof Error ? err.message : String(err);
      if (/NotAllowedError|permission/i.test(`${name} ${msg}`)) {
        return {
          error:
            "Camera/microphone permission was denied (NotAllowedError / permissions policy). " +
            "This is typical inside an embedded Dynamics iframe.",
        };
      }
      if (/NotReadableError|TrackStart/i.test(`${name} ${msg}`)) {
        return { error: "The camera is in use by another application (NotReadableError)." };
      }
      // Permission prompt may simply be unavailable; fall through and let getCameras report.
    }
    try {
      const cameras = await this.deviceManager.getCameras();
      if (cameras.length === 0) {
        return { error: "No camera devices were found (getCameras returned empty)." };
      }
      return { camera: cameras[0] };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { error: `Could not enumerate cameras: ${msg}` };
    }
  }

  private wireCall(call: Call): void {
    call.on("stateChanged", () => {
      if (call.state === "Disconnected") {
        this.update({ state: "disconnected", participants: [] }, { severity: "info", text: "Call ended." });
      }
      this.refreshParticipants();
    });
    call.on("remoteParticipantsUpdated", (e) => {
      for (const p of e.added) this.wireParticipant(p);
      this.refreshParticipants();
    });
    call.on("localVideoStreamsUpdated", () => this.refreshParticipants());
    for (const p of call.remoteParticipants) this.wireParticipant(p);
  }

  private wireParticipant(p: RemoteParticipant): void {
    p.on("stateChanged", () => this.refreshParticipants());
    p.on("isMutedChanged", () => this.refreshParticipants());
    p.on("videoStreamsUpdated", (e) => {
      for (const s of e.added) s.on("isAvailableChanged", () => this.refreshParticipants());
      this.refreshParticipants();
    });
    for (const s of p.videoStreams) s.on("isAvailableChanged", () => this.refreshParticipants());
  }

  private refreshParticipants(): void {
    const remote: Participant[] = (this.call?.remoteParticipants ?? []).map((p) => {
      const video = p.videoStreams.find((s) => s.mediaStreamType === "Video" && s.isAvailable);
      const screen = p.videoStreams.find((s) => s.mediaStreamType === "ScreenSharing" && s.isAvailable);
      return {
        id: getIdentifierRawId(p.identifier),
        displayName: p.displayName || "Customer",
        role: "customer",
        connection: mapConnection(p.state),
        micMuted: p.isMuted,
        cameraOn: Boolean(video),
        isSharingScreen: Boolean(screen)
      };
    });
    const agent: Participant = {
      id: "agent-self",
      displayName: "You (Agent)",
      role: "agent",
      connection: "connected",
      micMuted: this.snapshot.local.micMuted,
      cameraOn: !this.snapshot.local.cameraOff,
      isSharingScreen: this.snapshot.local.sharingScreen
    };
    this.update({ participants: [agent, ...remote] });
  }

  async leave(): Promise<void> {
    this.update({ state: "leaving" }, { severity: "info", text: "Leaving the ACS call…" });
    this.disposeViews();
    try {
      await this.call?.hangUp();
    } catch {
      /* ignore hang-up races */
    }
    this.call = undefined;
    this.localVideoStream = undefined;
    try {
      this.callAgent?.dispose();
    } catch {
      /* ignore */
    }
    this.callAgent = undefined;
    this.update(
      {
        state: "disconnected",
        participants: [],
        recording: "not-recording",
        local: { micMuted: false, cameraOff: this.ctx.requestedMedia === "audio", sharingScreen: false }
      },
      { severity: "info", text: "Disconnected. You can re-join." }
    );
  }

  async setMicMuted(muted: boolean): Promise<void> {
    if (this.call) {
      if (muted) await this.call.mute();
      else await this.call.unmute();
    }
    this.update({ local: { ...this.snapshot.local, micMuted: muted } });
    this.refreshParticipants();
  }

  async setCameraOff(off: boolean): Promise<void> {
    if (this.call) {
      if (off) {
        if (this.localVideoStream) await this.call.stopVideo(this.localVideoStream);
      } else {
        let camera = this.localVideoStream?.source;
        if (!camera) {
          const acquired = await this.acquireCamera();
          if (!acquired.camera) {
            this.update(
              { local: { ...this.snapshot.local, cameraOff: true } },
              {
                severity: "warning",
                text: `Camera could not be turned on. ${acquired.error ?? ""}`.trim(),
                fallbackHint:
                  "Inside the Dynamics workspace tab, camera capture is often blocked by the iframe " +
                  "permissions policy. Open the panel in a separate browser window to publish video.",
              }
            );
            this.refreshParticipants();
            return;
          }
          camera = acquired.camera;
        }
        this.localVideoStream = this.localVideoStream ?? new LocalVideoStream(camera);
        await this.call.startVideo(this.localVideoStream);
      }
    }
    this.update({ local: { ...this.snapshot.local, cameraOff: off } });
    this.refreshParticipants();
  }

  async setScreenSharing(on: boolean): Promise<void> {
    if (this.call) {
      if (on) await this.call.startScreenSharing();
      else await this.call.stopScreenSharing();
    }
    this.update({ local: { ...this.snapshot.local, sharingScreen: on } });
    this.refreshParticipants();
  }

  simulateConsent(status: ConsentStatus): void {
    const msg: PanelMessage =
      status === "declined"
        ? { severity: "warning", text: "Customer declined consent. Recording must stay off.", fallbackHint: "Continue without recording." }
        : { severity: "info", text: `Consent status: ${status}.` };
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
    this.update({ recording: status }, { severity: "info", text: `Recording status: ${status}.` });
  }

  attachVideo(stage: HTMLElement): void {
    this.disposeViews();
    stage.innerHTML = "";
    void this.renderLocal(stage);
    void this.renderRemotes(stage);
  }

  private async renderLocal(stage: HTMLElement): Promise<void> {
    if (!this.localVideoStream || this.snapshot.local.cameraOff) return;
    try {
      const renderer = new VideoStreamRenderer(this.localVideoStream);
      const view = await renderer.createView();
      this.views.push(view);
      stage.appendChild(videoTile(view.target, "You (Agent)"));
    } catch {
      /* rendering may fail if the stream stopped; ignore */
    }
  }

  private async renderRemotes(stage: HTMLElement): Promise<void> {
    for (const p of this.call?.remoteParticipants ?? []) {
      const stream: RemoteVideoStream | undefined = p.videoStreams.find((s) => s.isAvailable);
      if (!stream) continue;
      try {
        const renderer = new VideoStreamRenderer(stream);
        const view = await renderer.createView();
        this.views.push(view);
        stage.appendChild(videoTile(view.target, p.displayName || "Customer"));
      } catch {
        /* ignore individual stream render failures */
      }
    }
  }

  private disposeViews(): void {
    for (const v of this.views) {
      try {
        v.dispose();
      } catch {
        /* ignore */
      }
    }
    this.views = [];
  }
}

function mapConnection(state: string): Participant["connection"] {
  switch (state) {
    case "Connected":
      return "connected";
    case "Hold":
      return "on-hold";
    case "Disconnected":
      return "disconnected";
    default:
      return "connecting";
  }
}

function videoTile(target: HTMLElement, label: string): HTMLElement {
  const tile = document.createElement("div");
  tile.className = "amp-video-tile";
  target.classList.add("amp-video-target");
  tile.appendChild(target);
  const caption = document.createElement("span");
  caption.className = "amp-video-label";
  caption.textContent = label;
  tile.appendChild(caption);
  return tile;
}

/**
 * Factory selecting the real ACS session vs the local mock.
 *
 * Real ACS is used when EITHER:
 *   - the build sets VITE_USE_MOCKS=false (explicit live build), OR
 *   - the resolved context says mode="live" (e.g. the BYOC relay marked the routed conversation
 *     live and D365/CIF passes mode=live to the embedded widget).
 *
 * This lets a single mock-by-default hosted build (safe bare public URL) become a real in-panel
 * video widget when embedded as a CIF v2 channel provider with `?mode=live`. Opening the bare URL
 * with no params keeps mode="mock" (the default) → local mock, no ACS, no permissions prompt.
 */
export function createMediaSession(ctx: AvContext = readAvContext()): IMediaSession {
  const forcedLiveBuild = (import.meta.env.VITE_USE_MOCKS as string | undefined) === "false";
  const liveByContext = ctx.mode === "live";
  const useReal = forcedLiveBuild || liveByContext;
  return useReal ? new RealMediaSession(ctx) : new MockMediaSession(ctx);
}
