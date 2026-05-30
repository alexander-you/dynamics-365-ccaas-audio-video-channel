// Call controller abstraction. Phase 3 scaffold; RealCallController wired for C5.
//
// MockCallController uses only local media (getUserMedia) and never touches ACS, so the
// whole flow is testable end-to-end without provisioned Azure resources.
//
// RealCallController (C5) uses the ACS Calling SDK (@azure/communication-calling) to join the
// SAME group call the agent panel joins, giving a real two-party customer↔agent test.
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
  VideoStreamRendererView
} from "@azure/communication-calling";
import { AzureCommunicationTokenCredential } from "@azure/communication-common";
import type { TokenResponse } from "./types";
import { getPreviewStream } from "./media";

export interface CallController {
  readonly isMock: boolean;
  join(token: TokenResponse, localVideo: HTMLVideoElement): Promise<void>;
  setMicMuted(muted: boolean): Promise<void>;
  setCameraOff(off: boolean): Promise<void>;
  hangUp(): Promise<void>;
}

// Group GUID the agent panel joins by default; the customer joins the same group.
const DEFAULT_GROUP_ID = "7a9f5c2e-0b1d-4e6a-9c3f-1a2b3c4d5e6f";

export function readGroupId(): string {
  const env = import.meta.env as Record<string, string | undefined>;
  return env.VITE_ACS_GROUP_ID ?? DEFAULT_GROUP_ID;
}

export class MockCallController implements CallController {
  readonly isMock = true;
  private stream?: MediaStream;
  private videoEl?: HTMLVideoElement;

  async join(_token: TokenResponse, localVideo: HTMLVideoElement): Promise<void> {
    this.videoEl = localVideo;
    this.stream = await getPreviewStream();
    localVideo.srcObject = this.stream;
  }

  async setMicMuted(muted: boolean): Promise<void> {
    this.stream?.getAudioTracks().forEach((t) => (t.enabled = !muted));
  }

  async setCameraOff(off: boolean): Promise<void> {
    this.stream?.getVideoTracks().forEach((t) => (t.enabled = !off));
  }

  async hangUp(): Promise<void> {
    this.stream?.getTracks().forEach((t) => t.stop());
    if (this.videoEl) this.videoEl.srcObject = null;
    this.stream = undefined;
  }
}

export class RealCallController implements CallController {
  readonly isMock = false;
  private readonly groupId = readGroupId();
  private callClient?: CallClient;
  private callAgent?: CallAgent;
  private deviceManager?: DeviceManager;
  private call?: Call;
  private localVideoStream?: LocalVideoStream;
  private views: VideoStreamRendererView[] = [];
  private localContainer?: HTMLElement;
  private remoteContainer?: HTMLElement;

  async join(token: TokenResponse, localVideo: HTMLVideoElement): Promise<void> {
    // ACS renders into dedicated containers (VideoStreamRenderer targets), so hide the
    // mock <video> preview element used in mock mode.
    localVideo.classList.add("hidden");
    localVideo.srcObject = null;
    this.localContainer = document.getElementById("local-video") ?? undefined;
    this.remoteContainer = document.getElementById("remote-video") ?? undefined;

    const credential = new AzureCommunicationTokenCredential(token.token);
    this.callClient = new CallClient();
    this.callAgent = await this.callClient.createCallAgent(credential, { displayName: "Customer" });
    this.deviceManager = await this.callClient.getDeviceManager();

    try {
      await this.deviceManager.askDevicePermission({ audio: true, video: true });
    } catch {
      /* permission prompt may be unavailable; continue */
    }

    const cameras = await this.deviceManager.getCameras();
    const localVideoStreams: LocalVideoStream[] = [];
    if (cameras[0]) {
      this.localVideoStream = new LocalVideoStream(cameras[0]);
      localVideoStreams.push(this.localVideoStream);
    }

    this.call = this.callAgent.join(
      { groupId: this.groupId },
      localVideoStreams.length ? { videoOptions: { localVideoStreams } } : {}
    );
    this.wireCall(this.call);
    if (this.localVideoStream) await this.renderLocal(this.localVideoStream);
  }

  private wireCall(call: Call): void {
    call.on("remoteParticipantsUpdated", (e) => {
      for (const p of e.added) this.wireParticipant(p);
    });
    for (const p of call.remoteParticipants) this.wireParticipant(p);
  }

  private wireParticipant(p: RemoteParticipant): void {
    for (const s of p.videoStreams) this.handleRemoteStream(s);
    p.on("videoStreamsUpdated", (e) => {
      for (const s of e.added) this.handleRemoteStream(s);
    });
  }

  private handleRemoteStream(stream: RemoteVideoStream): void {
    const render = (): void => {
      if (stream.isAvailable) void this.renderRemote(stream);
    };
    stream.on("isAvailableChanged", render);
    render();
  }

  private async renderLocal(stream: LocalVideoStream): Promise<void> {
    if (!this.localContainer) return;
    try {
      const renderer = new VideoStreamRenderer(stream);
      const view = await renderer.createView();
      this.views.push(view);
      this.localContainer.innerHTML = "";
      this.localContainer.appendChild(view.target);
    } catch {
      /* ignore local render failures */
    }
  }

  private async renderRemote(stream: RemoteVideoStream): Promise<void> {
    if (!this.remoteContainer) return;
    try {
      const renderer = new VideoStreamRenderer(stream);
      const view = await renderer.createView();
      this.views.push(view);
      this.remoteContainer.innerHTML = "";
      this.remoteContainer.appendChild(view.target);
    } catch {
      /* ignore remote render failures */
    }
  }

  async setMicMuted(muted: boolean): Promise<void> {
    if (!this.call) return;
    if (muted) await this.call.mute();
    else await this.call.unmute();
  }

  async setCameraOff(off: boolean): Promise<void> {
    if (!this.call) return;
    if (off) {
      if (this.localVideoStream) await this.call.stopVideo(this.localVideoStream);
    } else {
      const camera = this.localVideoStream?.source ?? (await this.deviceManager?.getCameras())?.[0];
      if (camera) {
        this.localVideoStream = this.localVideoStream ?? new LocalVideoStream(camera);
        await this.call.startVideo(this.localVideoStream);
        await this.renderLocal(this.localVideoStream);
      }
    }
  }

  async hangUp(): Promise<void> {
    for (const v of this.views) {
      try {
        v.dispose();
      } catch {
        /* ignore */
      }
    }
    this.views = [];
    if (this.localContainer) this.localContainer.innerHTML = "";
    if (this.remoteContainer) this.remoteContainer.innerHTML = "";
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
  }
}

export function createCallController(): CallController {
  const useMocks = (import.meta.env.VITE_USE_MOCKS ?? "true") !== "false";
  return useMocks ? new MockCallController() : new RealCallController();
}
