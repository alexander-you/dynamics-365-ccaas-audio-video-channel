// Camera/microphone checks using the browser MediaDevices API. Phase 3 scaffold.
// This works the same in mock and real mode — it is pure browser capability detection.
import type { DeviceCheckResult } from "./types";

export async function checkDevices(): Promise<DeviceCheckResult> {
  if (!navigator.mediaDevices?.getUserMedia) {
    return {
      cameraAvailable: false,
      microphoneAvailable: false,
      error: "This browser does not support camera/microphone access."
    };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    const cam = stream.getVideoTracks()[0];
    const mic = stream.getAudioTracks()[0];
    const result: DeviceCheckResult = {
      cameraAvailable: Boolean(cam),
      microphoneAvailable: Boolean(mic),
      cameraLabel: cam?.label,
      microphoneLabel: mic?.label
    };
    // Stop the probe tracks; the call flow re-acquires media when joining.
    stream.getTracks().forEach((t) => t.stop());
    return result;
  } catch (err) {
    return {
      cameraAvailable: false,
      microphoneAvailable: false,
      error: err instanceof Error ? err.message : "Could not access camera/microphone."
    };
  }
}

export async function getPreviewStream(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({ audio: true, video: true });
}
