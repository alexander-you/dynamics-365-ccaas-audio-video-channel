// MediaEngine — the ACS Calling engine for the Visual Engagement Media Host PCF control.
//
// FAITHFULLY ADAPTED from the proven src/agent-media-panel/src/mediaSession.ts (RealMediaSession):
// same flow — fetch a VoIP token from the relay -> AzureCommunicationTokenCredential ->
// CallClient.createCallAgent -> join({ groupId }) -> publish local audio (+ video when requested)
// -> render local + remote video -> clean up on destroy. The differences are purely structural:
//   * configuration comes from PCF inputs (MediaEngineConfig), not Vite env;
//   * no panel-UI snapshot fields (case/recording/consent) — the PCF renders a lean MediaSnapshot;
//   * destroy() is wired to the PCF lifecycle for deterministic cleanup of tracks + call resources.
//
// SECURITY: no static/hardcoded acsGroupId, no token/secret in code. The token is minted at runtime
// by the relay; only the (non-secret) dynamic group GUID is used.
//
// BUNDLE NOTE: the ACS Calling/Common SDKs (~5.5 MiB minified) CANNOT be bundled into a PCF — that
// exceeds the platform's hard 5 MB per-component limit (pcf-1045), and PCF forbids code-splitting
// (pcf-scripts forces webpack maxChunks:1, "the PCF runtime cannot handle chunked bundles"). So the
// SDK is built into a standalone IIFE (sdk-host/) that this engine loads at RUNTIME via a <script>
// tag from a configurable URL (MediaEngineConfig.sdkUrl), reading the resulting window.AcvAcs global.
// Only TYPE-only imports of the SDK remain here (erased at compile), so the PCF bundle stays tiny.

import type {
  CallClient as CallClientType,
  CallAgent,
  Call,
  DeviceManager,
  RemoteParticipant,
  VideoStreamRendererView,
  VideoDeviceInfo,
  LocalVideoStream as LocalVideoStreamType,
  VideoStreamRenderer as VideoStreamRendererType
} from "@azure/communication-calling";

import type {
  MediaEngineConfig,
  MediaEngineListener,
  MediaSnapshot,
  MediaDiagnostics,
  MediaMessage,
  SessionState,
  Participant,
  ParticipantConnectionState
} from "./types";

/** The ACS SDK surface this engine uses — provided at runtime via the standalone window.AcvAcs global. */
interface AcsSdk {
  CallClient: typeof import("@azure/communication-calling").CallClient;
  LocalVideoStream: typeof import("@azure/communication-calling").LocalVideoStream;
  VideoStreamRenderer: typeof import("@azure/communication-calling").VideoStreamRenderer;
  AzureCommunicationTokenCredential: typeof import("@azure/communication-common").AzureCommunicationTokenCredential;
  getIdentifierRawId: typeof import("@azure/communication-common").getIdentifierRawId;
}

declare global {
  interface Window {
    AcvAcs?: AcsSdk;
  }
}

let acsSdkPromise: Promise<AcsSdk> | undefined;

/** Inject a <script> once and resolve when it has loaded (or reuse an in-flight/finished load). */
function loadScriptOnce(src: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (typeof document === "undefined") {
      reject(new Error("No document available to load the ACS SDK."));
      return;
    }
    const selector = `script[data-acv-acs-sdk="${CSS && CSS.escape ? CSS.escape(src) : src}"]`;
    const existing = document.querySelector<HTMLScriptElement>(selector);
    if (existing) {
      if (existing.dataset.loaded === "true" || window.AcvAcs) {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error(`Failed to load ACS SDK from ${src}.`)), {
        once: true
      });
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.dataset.acvAcsSdk = src;
    script.addEventListener(
      "load",
      () => {
        script.dataset.loaded = "true";
        resolve();
      },
      { once: true }
    );
    script.addEventListener("error", () => reject(new Error(`Failed to load ACS SDK from ${src}.`)), {
      once: true
    });
    document.head.appendChild(script);
  });
}

/** Load (and cache) the standalone ACS SDK from the configured URL, exposing window.AcvAcs. */
async function loadAcsSdk(sdkUrl: string): Promise<AcsSdk> {
  if (!acsSdkPromise) {
    acsSdkPromise = (async (): Promise<AcsSdk> => {
      if (typeof window !== "undefined" && window.AcvAcs) {
        return window.AcvAcs;
      }
      const url = (sdkUrl || "").trim();
      if (!url) {
        throw new Error("No ACS SDK URL configured (sdkUrl). The standalone SDK must be hosted and pointed to.");
      }
      await loadScriptOnce(url);
      if (typeof window === "undefined" || !window.AcvAcs) {
        throw new Error(`ACS SDK loaded from ${url} but window.AcvAcs is missing.`);
      }
      return window.AcvAcs;
    })();
  }
  return acsSdkPromise;
}

interface TokenResponse {
  userId: string;
  token: string;
  expiresOn: string;
  endpoint: string | null;
}

/** True when running inside an iframe (e.g. the model-driven app-shell content frame). */
function isEmbeddedIframe(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function mapConnection(state: string): ParticipantConnectionState {
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

export class MediaEngine {
  private snapshot: MediaSnapshot;
  private listeners = new Set<MediaEngineListener>();
  private readonly config: MediaEngineConfig;

  private acs?: AcsSdk;
  private callClient?: CallClientType;
  private callAgent?: CallAgent;
  private deviceManager?: DeviceManager;
  private call?: Call;
  private localVideoStream?: LocalVideoStreamType;
  private views: VideoStreamRendererView[] = [];
  private stage?: HTMLElement;

  private diag: MediaDiagnostics = {
    embedded: isEmbeddedIframe(),
    cameraPermission: "unknown",
    microphonePermission: "unknown",
    getUserMedia: "not-attempted",
    localVideoStreamCreated: false,
    startVideo: "not-attempted",
    localPreviewRendered: false,
    videoPublished: false
  };

  constructor(config: MediaEngineConfig) {
    this.config = { ...config, groupId: (config.groupId || "").trim() };
    this.snapshot = this.initialSnapshot();
  }

  private hasSessionContext(): boolean {
    return this.config.groupId.trim() !== "";
  }

  private initialSnapshot(): MediaSnapshot {
    const audioOnly = this.config.requestedMedia === "audio";
    return {
      state: "idle",
      isMock: this.config.mode === "mock",
      hasContext: this.hasSessionContext(),
      acsGroupId: this.config.groupId,
      mode: this.config.mode,
      requestedMedia: this.config.requestedMedia,
      sessionRef: this.config.sessionRef,
      local: { micMuted: false, cameraOff: audioOnly },
      participants: [],
      diagnostics: { ...this.diag },
      message: this.hasSessionContext()
        ? { severity: "info", text: `Live ACS — joining group ${this.config.groupId}.` }
        : {
            severity: "warning",
            text:
              "Waiting for an audio/video session. No session context (acsGroupId) is associated " +
              "with this conversation yet. No call is placed in the meantime."
          }
    };
  }

  subscribe(listener: MediaEngineListener): () => void {
    this.listeners.add(listener);
    listener.onSnapshot(this.snapshot);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getSnapshot(): MediaSnapshot {
    return this.snapshot;
  }

  /** Update the group id at runtime (e.g. a newly-resolved acsGroupId from PCF updateView). */
  setGroupId(groupId: string): void {
    const next = (groupId || "").trim();
    if (next === this.config.groupId) return;
    this.config.groupId = next;
    this.update({ acsGroupId: next, hasContext: this.hasSessionContext() });
  }

  private update(patch: Partial<MediaSnapshot>, message?: MediaMessage): void {
    this.snapshot = { ...this.snapshot, ...patch, message: message ?? this.snapshot.message };
    for (const l of this.listeners) l.onSnapshot(this.snapshot);
  }

  private pushDiag(): void {
    this.update({ diagnostics: { ...this.diag } });
  }

  private async queryPermissions(): Promise<void> {
    const perms = (navigator as Navigator & { permissions?: Permissions }).permissions;
    if (!perms?.query) return;
    const read = async (name: string): Promise<MediaDiagnostics["cameraPermission"]> => {
      try {
        const status = await perms.query({ name: name as PermissionName });
        return status.state as MediaDiagnostics["cameraPermission"];
      } catch {
        return "unknown";
      }
    };
    this.diag.cameraPermission = await read("camera");
    this.diag.microphonePermission = await read("microphone");
  }

  private classifyCaptureError(err: unknown): { message: string; permissionsPolicy?: string } {
    const name = err instanceof Error ? err.name : "";
    const msg = err instanceof Error ? err.message : String(err);
    const full = `${name}: ${msg}`.trim();
    if (/permissions policy|permission policy|disallowed by permissions|feature is not enabled/i.test(full)) {
      return { message: full, permissionsPolicy: full };
    }
    if (/NotAllowedError/i.test(full)) {
      return {
        message: full,
        permissionsPolicy: this.diag.embedded
          ? `${full} (camera/microphone not delegated to this surface)`
          : undefined
      };
    }
    return { message: full };
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
      const acs = await loadAcsSdk(this.config.sdkUrl);
      this.acs = acs;
      const credential = new acs.AzureCommunicationTokenCredential(token);
      this.callClient = new acs.CallClient();
      this.callAgent = await this.callClient.createCallAgent(credential, { displayName: "Agent" });
      this.deviceManager = await this.callClient.getDeviceManager();

      const wantVideo = this.config.requestedMedia === "audio-video";
      let localVideoStreams: LocalVideoStreamType[] | undefined;
      let cameraError: string | undefined;
      if (wantVideo) {
        const { camera, error } = await this.acquireCamera();
        if (camera) {
          this.localVideoStream = new acs.LocalVideoStream(camera);
          this.diag.localVideoStreamCreated = true;
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
      this.diag.videoPublished = publishedVideo;
      if (wantVideo) this.diag.startVideo = publishedVideo ? "success" : "failed";
      this.pushDiag();
      this.update(
        { state: "connected", local: { ...this.snapshot.local, cameraOff: !wantVideo || !publishedVideo } },
        wantVideo && !publishedVideo
          ? {
              severity: "warning",
              text:
                "Connected to ACS group call (audio only) — your camera could not be published. " +
                (cameraError ?? "No camera was available."),
              hint: "See the media diagnostics for the exact browser / Permissions-Policy error."
            }
          : { severity: "info", text: "Connected to ACS group call." }
      );
      this.refreshParticipants();
      if (this.stage) this.attachVideo(this.stage);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.update(
        { state: "error" },
        {
          severity: "error",
          text: `Could not join the ACS call: ${message}`,
          hint: "Check the token endpoint and camera/microphone permissions."
        }
      );
    }
  }

  private async acquireCamera(): Promise<{ camera?: VideoDeviceInfo; error?: string }> {
    if (!this.deviceManager) return { error: "Device manager unavailable." };
    this.diag.embedded = isEmbeddedIframe();
    try {
      await this.deviceManager.askDevicePermission({ audio: true, video: true });
      this.diag.getUserMedia = "success";
      this.diag.lastError = undefined;
      this.diag.permissionsPolicyError = undefined;
      void this.queryPermissions().then(() => this.pushDiag());
    } catch (err) {
      const name = err instanceof Error ? err.name : "";
      const msg = err instanceof Error ? err.message : String(err);
      const { message, permissionsPolicy } = this.classifyCaptureError(err);
      this.diag.getUserMedia = "failed";
      this.diag.lastError = message;
      this.diag.permissionsPolicyError = permissionsPolicy;
      void this.queryPermissions().then(() => this.pushDiag());
      if (/NotAllowedError|permission/i.test(`${name} ${msg}`)) {
        return { error: "Camera/microphone permission was denied (NotAllowedError / permissions policy)." };
      }
      if (/NotReadableError|TrackStart/i.test(`${name} ${msg}`)) {
        return { error: "The camera is in use by another application (NotReadableError)." };
      }
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
      if (this.stage) this.attachVideo(this.stage);
    });
    call.on("localVideoStreamsUpdated", () => this.refreshParticipants());
    for (const p of call.remoteParticipants) this.wireParticipant(p);
  }

  private wireParticipant(p: RemoteParticipant): void {
    p.on("stateChanged", () => this.refreshParticipants());
    p.on("isMutedChanged", () => this.refreshParticipants());
    p.on("videoStreamsUpdated", (e) => {
      for (const s of e.added) s.on("isAvailableChanged", () => {
        this.refreshParticipants();
        if (this.stage) this.attachVideo(this.stage);
      });
      this.refreshParticipants();
      if (this.stage) this.attachVideo(this.stage);
    });
    for (const s of p.videoStreams) {
      s.on("isAvailableChanged", () => {
        this.refreshParticipants();
        if (this.stage) this.attachVideo(this.stage);
      });
    }
  }

  private refreshParticipants(): void {
    const remote: Participant[] = (this.call?.remoteParticipants ?? []).map((p) => {
      const video = p.videoStreams.find((s) => s.mediaStreamType === "Video" && s.isAvailable);
      return {
        id: this.acs?.getIdentifierRawId(p.identifier) ?? p.displayName ?? "customer",
        displayName: p.displayName || "Customer",
        role: "customer",
        connection: mapConnection(p.state),
        micMuted: p.isMuted,
        cameraOn: Boolean(video)
      };
    });
    const agent: Participant = {
      id: "agent-self",
      displayName: "You (Agent)",
      role: "agent",
      connection: "connected",
      micMuted: this.snapshot.local.micMuted,
      cameraOn: !this.snapshot.local.cameraOff
    };
    this.update({ participants: [agent, ...remote] });
  }

  /** Render the local self-preview and the first available remote video into the supplied stage. */
  attachVideo(stage: HTMLElement): void {
    this.stage = stage;
    void this.renderVideo(stage);
  }

  private async renderVideo(stage: HTMLElement): Promise<void> {
    this.disposeViews();
    stage.innerHTML = "";
    const acs = this.acs;
    if (!acs) return;

    // Local self-preview.
    if (this.localVideoStream && !this.snapshot.local.cameraOff) {
      try {
        const renderer = new acs.VideoStreamRenderer(this.localVideoStream);
        const view = await renderer.createView();
        this.views.push(view);
        const tile = document.createElement("div");
        tile.className = "acv-tile acv-tile-local";
        tile.appendChild(view.target);
        const label = document.createElement("span");
        label.className = "acv-tile-label";
        label.textContent = "You";
        tile.appendChild(label);
        stage.appendChild(tile);
        this.diag.localPreviewRendered = true;
        this.pushDiag();
      } catch {
        /* preview render failed; ignore */
      }
    }

    // First available remote video.
    for (const p of this.call?.remoteParticipants ?? []) {
      const stream = p.videoStreams.find((s) => s.mediaStreamType === "Video" && s.isAvailable);
      if (!stream) continue;
      try {
        const renderer = new acs.VideoStreamRenderer(stream);
        const view = await renderer.createView();
        this.views.push(view);
        const tile = document.createElement("div");
        tile.className = "acv-tile acv-tile-remote";
        tile.appendChild(view.target);
        const label = document.createElement("span");
        label.className = "acv-tile-label";
        label.textContent = p.displayName || "Customer";
        tile.appendChild(label);
        stage.appendChild(tile);
      } catch {
        /* remote render failed; ignore */
      }
    }
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
        this.diag.videoPublished = false;
        this.pushDiag();
      } else {
        let camera = this.localVideoStream?.source;
        if (!camera) {
          const acquired = await this.acquireCamera();
          if (!acquired.camera) {
            this.diag.startVideo = "failed";
            this.pushDiag();
            this.update(
              { local: { ...this.snapshot.local, cameraOff: true } },
              {
                severity: "warning",
                text: `Camera could not be turned on. ${acquired.error ?? ""}`.trim(),
                hint: "See the media diagnostics for the exact browser / Permissions-Policy error."
              }
            );
            this.refreshParticipants();
            return;
          }
          camera = acquired.camera;
        }
        this.localVideoStream = this.localVideoStream ?? (this.acs ? new this.acs.LocalVideoStream(camera) : undefined);
        if (!this.localVideoStream) {
          this.diag.startVideo = "failed";
          this.pushDiag();
          this.update({ local: { ...this.snapshot.local, cameraOff: true } });
          this.refreshParticipants();
          return;
        }
        this.diag.localVideoStreamCreated = true;
        try {
          await this.call.startVideo(this.localVideoStream);
          this.diag.startVideo = "success";
          this.diag.videoPublished = true;
        } catch (err) {
          const { message, permissionsPolicy } = this.classifyCaptureError(err);
          this.diag.startVideo = "failed";
          this.diag.lastError = message;
          this.diag.permissionsPolicyError = permissionsPolicy ?? this.diag.permissionsPolicyError;
        }
        this.pushDiag();
      }
    }
    this.update({ local: { ...this.snapshot.local, cameraOff: off } });
    this.refreshParticipants();
    if (this.stage) this.attachVideo(this.stage);
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
        local: { micMuted: false, cameraOff: this.config.requestedMedia === "audio" }
      },
      { severity: "info", text: "Disconnected." }
    );
  }

  /** Deterministic teardown for the PCF destroy() lifecycle. */
  async destroy(): Promise<void> {
    this.disposeViews();
    try {
      await this.call?.hangUp();
    } catch {
      /* ignore */
    }
    try {
      this.callAgent?.dispose();
    } catch {
      /* ignore */
    }
    this.call = undefined;
    this.callAgent = undefined;
    this.callClient = undefined;
    this.localVideoStream = undefined;
    this.stage = undefined;
    this.listeners.clear();
  }
}
