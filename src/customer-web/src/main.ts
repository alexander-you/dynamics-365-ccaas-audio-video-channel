// Customer entry-point flow: consent -> device check -> join -> in-call controls.
// Phase 3 scaffold; C5 wires real ACS. In real mode (VITE_USE_MOCKS=false) the relay token
// endpoint is used and the customer joins the same ACS group call as the agent.
import { tokenService, issueRelayToken, requestInbound } from "./api";
import { checkDevices } from "./media";
import { createCallController, readGroupId, type CallController } from "./call";
import type { ConsentResult, EntryPoint } from "./types";

const IS_REAL = (import.meta.env.VITE_USE_MOCKS ?? "true") === "false";
const REQUESTED_MEDIA = "audio-video";
const CUSTOMER_NAME = "Audio/Video web customer";

const DISCLOSURE_TEXT =
  "This session may be recorded for quality and support purposes. By continuing, you consent " +
  "to audio and video recording. You can decline and use another support channel instead.";

const ENTRY_POINT: EntryPoint = "Public";
const CHANNEL_CONFIG = import.meta.env.VITE_CHANNEL_CONFIG ?? "default";

// --- element helpers -------------------------------------------------------
const $ = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el as T;
};

const steps = {
  consent: $("consent-step"),
  device: $("device-step"),
  call: $("call-step")
};

function show(step: keyof typeof steps): void {
  Object.values(steps).forEach((el) => el.classList.add("hidden"));
  steps[step].classList.remove("hidden");
}

function showError(message: string): void {
  const el = $("error");
  el.textContent = message;
  el.classList.remove("hidden");
}

function clearError(): void {
  $("error").classList.add("hidden");
}

// --- state -----------------------------------------------------------------
let sessionId: string | undefined;
let controller: CallController | undefined;
let micMuted = false;
let cameraOff = false;

// --- step 1: consent -------------------------------------------------------
function initConsent(): void {
  ($("consent-text")).textContent = DISCLOSURE_TEXT;
  const checkbox = $<HTMLInputElement>("consent-checkbox");
  const accept = $<HTMLButtonElement>("consent-accept");

  checkbox.addEventListener("change", () => (accept.disabled = !checkbox.checked));

  accept.addEventListener("click", async () => {
    clearError();
    accept.disabled = true;
    try {
      if (IS_REAL) {
        // The POC relay only exposes /api/token. Session creation + consent persistence are
        // mock-only POC features, so in real mode we acknowledge consent client-side and proceed.
        sessionId = crypto.randomUUID();
        await runDeviceCheck();
        show("device");
        return;
      }

      // Create the session first so consent can be tied to it.
      const session = await tokenService.createSession({
        entryPoint: ENTRY_POINT,
        anonymous: true,
        channelConfig: CHANNEL_CONFIG,
        channelMode: "Video"
      });
      sessionId = session.sessionId;

      const result: ConsentResult = await tokenService.captureConsent({
        sessionId: session.sessionId,
        consentType: "Recording",
        value: "Granted",
        disclosureChannel: "WebEntryPoint",
        disclosureText: DISCLOSURE_TEXT
      });

      if (!result.accepted) {
        showError("Consent was not recorded. Please try again.");
        accept.disabled = false;
        return;
      }
      await runDeviceCheck();
      show("device");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Could not start the session.");
      accept.disabled = false;
    }
  });

  $("consent-decline").addEventListener("click", () => {
    showError("You declined recording. Please use another support channel.");
  });
}

// --- step 2: device check --------------------------------------------------
async function runDeviceCheck(): Promise<void> {
  const list = $("device-status");
  list.innerHTML = "<li>Checking devices…</li>";
  const result = await checkDevices();

  const items: string[] = [];
  items.push(line("Camera", result.cameraAvailable, result.cameraLabel));
  items.push(line("Microphone", result.microphoneAvailable, result.microphoneLabel));
  if (result.error) items.push(`<li class="bad">${escapeHtml(result.error)}</li>`);
  list.innerHTML = items.join("");

  const join = $<HTMLButtonElement>("join");
  join.disabled = !(result.cameraAvailable && result.microphoneAvailable);
}

function line(label: string, ok: boolean, detail?: string): string {
  const cls = ok ? "good" : "bad";
  const mark = ok ? "✓" : "✗";
  const text = detail ? `${label}: ${escapeHtml(detail)}` : label;
  return `<li class="${cls}">${mark} ${text}</li>`;
}

function initDeviceStep(): void {
  $("device-recheck").addEventListener("click", () => void runDeviceCheck());
  $("join").addEventListener("click", () => void joinCall());
}

// --- step 3: join + in-call ------------------------------------------------
async function joinCall(): Promise<void> {
  clearError();
  if (!sessionId) {
    showError("No active session. Please restart.");
    return;
  }
  try {
    const token = IS_REAL
      ? await issueRelayToken()
      : await tokenService.issueToken({
          anonymous: true,
          entryPoint: ENTRY_POINT,
          channelConfig: CHANNEL_CONFIG
        });

    // Routing plane: in real mode, create a routed D365 conversation so an agent receives a
    // work item. The ACS group id is passed as context so the accepting agent can join the
    // same call. A failure here must not block the media call (the call can still proceed).
    let conversationNote = "";
    if (IS_REAL) {
      try {
        const inbound = await requestInbound(CUSTOMER_NAME, {
          mode: "live",
          requestedMedia: REQUESTED_MEDIA,
          acsGroupId: readGroupId(),
          sessionRef: sessionId ?? "",
          entryPoint: ENTRY_POINT,
          source: "customer-web"
        });
        conversationNote = inbound.conversationId
          ? ` Routed conversation ${inbound.conversationId} created for an agent.`
          : "";
      } catch (err) {
        conversationNote =
          " (Could not create the routed conversation; the call will still connect.)";
        console.warn("inbound failed", err);
      }
    }

    controller = createCallController();
    await controller.join(token, $<HTMLVideoElement>("preview"));

    const status = controller.isMock
      ? "Connected (mock mode — local preview only, no remote agent)."
      : `Connected to the ACS call. Waiting for the agent to join the same session…${conversationNote}`;
    $("call-status").textContent = status;

    // Reuse the preview element for the in-call video.
    const callVideo = $<HTMLVideoElement>("preview");
    callVideo.classList.remove("hidden");
    show("call");
  } catch (err) {
    showError(err instanceof Error ? err.message : "Could not join the session.");
  }
}

function initCallControls(): void {
  $("toggle-mic").addEventListener("click", async () => {
    if (!controller) return;
    micMuted = !micMuted;
    await controller.setMicMuted(micMuted);
    $("toggle-mic").textContent = micMuted ? "Unmute" : "Mute";
  });

  $("toggle-cam").addEventListener("click", async () => {
    if (!controller) return;
    cameraOff = !cameraOff;
    await controller.setCameraOff(cameraOff);
    $("toggle-cam").textContent = cameraOff ? "Start video" : "Stop video";
  });

  $("hangup").addEventListener("click", async () => {
    await controller?.hangUp();
    controller = undefined;
    $("call-status").textContent = "You have left the session.";
  });
}

// --- utils -----------------------------------------------------------------
function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string
  );
}

// --- bootstrap -------------------------------------------------------------
initConsent();
initDeviceStep();
initCallControls();
show("consent");

// Reflect the active mode in the header badge.
($("phase-badge")).textContent = IS_REAL
  ? "Live mode — real ACS call (joins the agent's group session)"
  : "Phase 3 scaffold — mock mode (no real call is placed)";
