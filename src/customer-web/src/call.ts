// Call controller abstraction. Phase 3 scaffold.
//
// MockCallController uses only local media (getUserMedia) and never touches ACS, so the
// whole flow is testable end-to-end without provisioned Azure resources.
//
// RealCallController is a placeholder that will use the ACS Calling SDK
// (@azure/communication-calling) once real ACS is approved (later phase). It is intentionally
// not wired up yet — IssueToken returns mock tokens in Phase 3.
import type { TokenResponse } from "./types";
import { getPreviewStream } from "./media";

export interface CallController {
  readonly isMock: boolean;
  join(token: TokenResponse, localVideo: HTMLVideoElement): Promise<void>;
  setMicMuted(muted: boolean): Promise<void>;
  setCameraOff(off: boolean): Promise<void>;
  hangUp(): Promise<void>;
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

  async join(_token: TokenResponse, _localVideo: HTMLVideoElement): Promise<void> {
    // Placeholder. Real implementation (later phase, after ACS approval):
    //   const { CallClient } = await import("@azure/communication-calling");
    //   const { AzureCommunicationTokenCredential } = await import("@azure/communication-common");
    //   const credential = new AzureCommunicationTokenCredential(token.token);
    //   const agent = await new CallClient().createCallAgent(credential);
    //   agent.join({ roomId: token.roomId! });
    throw new Error(
      "RealCallController is not implemented in Phase 3. Set VITE_USE_MOCKS=true until ACS is approved."
    );
  }

  setMicMuted(): Promise<void> {
    throw new Error("RealCallController is not implemented in Phase 3.");
  }
  setCameraOff(): Promise<void> {
    throw new Error("RealCallController is not implemented in Phase 3.");
  }
  hangUp(): Promise<void> {
    throw new Error("RealCallController is not implemented in Phase 3.");
  }
}

export function createCallController(): CallController {
  const useMocks = (import.meta.env.VITE_USE_MOCKS ?? "true") !== "false";
  return useMocks ? new MockCallController() : new RealCallController();
}
