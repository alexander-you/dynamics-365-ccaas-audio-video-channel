// Agent panel UI controller. Phase 3c scaffold.
// Renders the agent media panel from a SessionSnapshot and wires controls to IMediaSession.
// The UI depends ONLY on IMediaSession — never on the ACS SDK directly.

import type { IMediaSession } from "./mediaSession";
import type { SessionSnapshot, RecordingStatus, ConsentStatus } from "./types";
import { CifBridge, makeMockIncoming, type CifStatus } from "./cif";
import { isEmbeddedIframe, buildCallWindowUrl } from "./context";

const RECORDING_LABELS: Record<RecordingStatus, string> = {
  "not-recording": "Not recording",
  starting: "Starting…",
  recording: "● Recording",
  paused: "Paused",
  stopping: "Stopping…"
};

const CONSENT_LABELS: Record<ConsentStatus, string> = {
  unknown: "Unknown",
  pending: "Pending",
  granted: "Granted",
  declined: "Declined"
};

export class AgentPanel {
  private root: HTMLElement;
  private session: IMediaSession;
  private cif: CifBridge;
  private cifStatus: CifStatus;
  private lastIncoming = "";

  // Call-window (pop-out) state. The embedded Dynamics tab can RECEIVE video but usually cannot
  // PUBLISH camera/mic (the app-tab iframe Permissions Policy blocks getUserMedia), so the agent
  // publishes from a top-level pop-out window that joins the same dynamic ACS group.
  private readonly embedded = isEmbeddedIframe();
  private callWindow: Window | null = null;
  private callWindowNote = "";
  private callWindowBlocked = false;

  constructor(root: HTMLElement, session: IMediaSession, cif: CifBridge = new CifBridge()) {
    this.root = root;
    this.session = session;
    this.cif = cif;
    this.cifStatus = cif.status;
    session.subscribe({ onSnapshot: (s) => this.render(s) });
  }

  private render(s: SessionSnapshot): void {
    const connected = s.state === "connected";
    this.root.innerHTML = `
      <header class="amp-header">
        <h1>Agent Media Panel</h1>
        <span class="badge ${s.isMock ? "badge-mock" : "badge-live"}">${s.isMock ? "MOCK MODE" : "LIVE"}</span>
        <span class="state state-${s.state}">${s.state}</span>
        <span class="cif-badge cif-${this.cifStatus.mode}" title="${esc(this.cifStatus.label)}">${esc(this.cifStatus.label)}</span>
      </header>

      ${this.renderMessage(s)}

      <section class="amp-context" aria-label="Interaction context">
        <h2>Incoming A/V context</h2>
        <dl>
          <dt>Requested media</dt><dd>${esc(s.requestedMedia)}</dd>
          <dt>Relay mode</dt><dd>${esc(s.mode)}</dd>
          <dt>Session ref</dt><dd>${s.sessionRef ? esc(s.sessionRef) : "<span class=\"muted\">(none)</span>"}</dd>
        </dl>
        <p class="muted">Resolved from the routed conversation context (relay <code>conversationcontext</code>), via URL/CIF parameters. Display-only mock.</p>
      </section>

      <section class="amp-case" aria-label="Related records">
        <h2>Related Case / Contact</h2>
        <dl>
          <dt>Case</dt><dd>${esc(s.caseContext.caseNumber)} — ${esc(s.caseContext.caseTitle)}</dd>
          <dt>Contact</dt><dd>${esc(s.caseContext.contactName)}</dd>
        </dl>
        <p class="muted">Display-only mock. Real linkage resolves to Dataverse records in a later phase.</p>
      </section>

      <section class="amp-status" aria-label="Session status">
        <div class="status-tile">
          <span class="status-label">Recording</span>
          <span class="status-value rec-${s.recording}">${RECORDING_LABELS[s.recording]}</span>
        </div>
        <div class="status-tile">
          <span class="status-label">Consent</span>
          <span class="status-value consent-${s.consent}">${CONSENT_LABELS[s.consent]}</span>
        </div>
      </section>

      <section class="amp-controls" aria-label="Call controls">
        <h2>Call controls</h2>
        <div class="btn-row">
          <button data-action="join" ${connected || s.state === "joining" ? "disabled" : ""}>Join session</button>
          <button data-action="leave" class="danger" ${connected ? "" : "disabled"}>Leave session</button>
        </div>
        <div class="btn-row">
          <button data-action="mic" ${connected ? "" : "disabled"} aria-pressed="${s.local.micMuted}">
            ${s.local.micMuted ? "Unmute mic" : "Mute mic"}
          </button>
          <button data-action="camera" ${connected ? "" : "disabled"} aria-pressed="${s.local.cameraOff}">
            ${s.local.cameraOff ? "Camera on" : "Camera off"}
          </button>
          <button data-action="share" ${connected ? "" : "disabled"} aria-pressed="${s.local.sharingScreen}">
            ${s.local.sharingScreen ? "Stop sharing" : "Share screen"}
          </button>
        </div>
      </section>

      <section class="amp-roster" aria-label="Participants">
        <h2>Participants (${s.participants.length})</h2>
        ${
          s.participants.length === 0
            ? `<p class="muted">No participants. Join the session to populate the roster${s.isMock ? " (mock)" : ""}.</p>`
            : `<ul>${s.participants
                .map(
                  (p) => `<li>
                    <span class="p-name">${esc(p.displayName)}</span>
                    <span class="p-role">${p.role}</span>
                    <span class="p-conn p-conn-${p.connection}">${p.connection}</span>
                    <span class="p-flags">${p.micMuted ? "🔇" : "🎤"} ${p.cameraOn ? "🎥" : "🚫"} ${p.isSharingScreen ? "🖥️" : ""}</span>
                  </li>`
                )
                .join("")}</ul>`
        }
      </section>

      <section class="amp-video" aria-label="Video">
        <h2>Video</h2>
        <div class="amp-video-stage"></div>
        ${connected ? "" : `<p class="muted">Join the session to show video tiles.</p>`}
        ${s.isMock ? `<p class="muted">Mock mode shows no live video. Run with <code>VITE_USE_MOCKS=false</code> for real ACS video.</p>` : ""}
      </section>

      ${this.renderCallWindow(s)}

      <section class="amp-cif" aria-label="Dynamics 365 workspace (CIF v2)">
        <h2>Dynamics 365 workspace (CIF v2)</h2>
        <p class="muted">${esc(this.cifStatus.label)}. ${
          this.cifStatus.available
            ? "Workspace actions call Microsoft.CIFramework."
            : "Outside Dynamics, these actions run as local no-ops for testing."
        }</p>
        <div class="btn-row">
          <button data-cif="simulate-incoming">Simulate incoming Audio/Video interaction</button>
        </div>
        <div class="btn-row">
          <button data-cif="accept" ${this.lastIncoming ? "" : "disabled"}>Accept</button>
          <button data-cif="reject" class="danger" ${this.lastIncoming ? "" : "disabled"}>Reject</button>
        </div>
        ${this.lastIncoming ? `<p class="muted">Last mock interaction: ${esc(this.lastIncoming)}</p>` : ""}
      </section>

      <section class="amp-sim" aria-label="Simulation">
        <h2>Simulate server signals (mock only)</h2>
        <p class="muted">In production, consent and recording status are server-authoritative (token service + Event Grid). These buttons preview those states.</p>
        <div class="btn-row">
          <button data-sim="consent:granted">Consent granted</button>
          <button data-sim="consent:declined">Consent declined</button>
          <button data-sim="consent:pending">Consent pending</button>
        </div>
        <div class="btn-row">
          <button data-sim="recording:recording">Start recording</button>
          <button data-sim="recording:paused">Pause recording</button>
          <button data-sim="recording:not-recording">Stop recording</button>
        </div>
      </section>
    `;

    this.bind();

    // Real ACS sessions render live video into the stage; mock sessions ignore this.
    const stage = this.root.querySelector<HTMLElement>(".amp-video-stage");
    if (stage) this.session.attachVideo?.(stage);
  }

  private renderMessage(s: SessionSnapshot): string {
    if (!s.message) return "";
    const m = s.message;
    return `<div class="amp-message msg-${m.severity}">
      <span>${esc(m.text)}</span>
      ${m.fallbackHint ? `<span class="fallback">Fallback: ${esc(m.fallbackHint)}</span>` : ""}
    </div>`;
  }

  /**
   * Camera/microphone publishing section. POC media-hosting pattern:
   *   "D365 embedded tab for context and control, top-level pop-out window for camera/microphone
   *    publishing when iframe permissions block WebRTC capture."
   * The embedded Dynamics tab can receive video and drive context/roster/consent/recording, but the
   * agent publishes camera+mic from a top-level pop-out that joins the SAME dynamic ACS group. No
   * static group is used and no token/secret is placed on the URL.
   */
  private renderCallWindow(s: SessionSnapshot): string {
    if (s.isMock) return "";
    const groupId = (s.acsGroupId ?? "").trim();
    if (groupId === "") return ""; // No session context yet → nothing to publish into.

    const note = this.callWindowNote
      ? `<div class="amp-message msg-${this.callWindowBlocked ? "warning" : "info"}">
           <span>${esc(this.callWindowNote)}</span>
         </div>`
      : "";

    if (this.embedded) {
      return `
      <section class="amp-callwindow" aria-label="Camera and microphone publishing">
        <h2>Camera &amp; microphone</h2>
        <p class="muted">
          This embedded Dynamics tab handles context, roster, consent and recording status, and can
          show the customer's video. Camera/microphone capture is usually blocked inside the Dynamics
          tab (iframe permissions policy), so publish your camera and microphone from a separate
          top-level window that joins the same call.
        </p>
        <div class="btn-row">
          <button data-callwindow="open" class="primary">Open call window</button>
        </div>
        ${note}
        <p class="muted">The call window joins the same session (group <code>${esc(groupId)}</code>). No static group and no tokens are placed on the URL.</p>
      </section>`;
    }

    // Top-level (pop-out / standalone) window: this IS the publishing endpoint.
    return `
      <section class="amp-callwindow" aria-label="Camera and microphone publishing">
        <h2>Camera &amp; microphone</h2>
        <p class="muted">You are in the standalone call window — camera and microphone publish from here. Keep the Dynamics tab open for context, roster, consent and recording status.</p>
      </section>`;
  }

  private bind(): void {
    this.root.querySelectorAll<HTMLButtonElement>("button[data-action]").forEach((btn) => {
      btn.addEventListener("click", () => this.onAction(btn.dataset.action!));
    });
    this.root.querySelectorAll<HTMLButtonElement>("button[data-sim]").forEach((btn) => {
      btn.addEventListener("click", () => this.onSim(btn.dataset.sim!));
    });
    this.root.querySelectorAll<HTMLButtonElement>("button[data-cif]").forEach((btn) => {
      btn.addEventListener("click", () => this.onCif(btn.dataset.cif!));
    });
    this.root.querySelectorAll<HTMLButtonElement>("button[data-callwindow]").forEach((btn) => {
      btn.addEventListener("click", () => this.openCallWindow());
    });
  }

  /**
   * Open the top-level call window: a new browser window loading the SAME hosted panel, carrying the
   * SAME dynamic acsGroupId so it joins the customer's ACS group. Because it is top-level (not an
   * iframe), it can publish the agent camera and microphone. The token is fetched at runtime by the
   * pop-out from the relay — it is never placed on the URL. If the browser blocks the pop-up, guide
   * the agent to allow pop-ups and try again.
   */
  private openCallWindow(): void {
    const s = this.session.getSnapshot();
    const groupId = (s.acsGroupId ?? "").trim();
    if (groupId === "") {
      this.callWindowBlocked = false;
      this.callWindowNote =
        "No audio/video session context (acsGroupId) is available yet. Wait for the conversation to provide one, then open the call window.";
      this.render(s);
      return;
    }

    // Re-focus an already-open call window instead of spawning another endpoint.
    if (this.callWindow && !this.callWindow.closed) {
      try {
        this.callWindow.focus();
      } catch {
        /* cross-window focus may be blocked; ignore */
      }
      this.callWindowBlocked = false;
      this.callWindowNote =
        "Call window is already open. Publish your camera and microphone from that window.";
      this.render(s);
      return;
    }

    const url = buildCallWindowUrl({
      acsGroupId: groupId,
      mode: s.mode,
      requestedMedia: s.requestedMedia,
      sessionRef: s.sessionRef
    });
    const win = window.open(url, "acvCallWindow", "width=1120,height=820,resizable=yes,scrollbars=yes");

    if (!win || win.closed || typeof win.closed === "undefined") {
      this.callWindow = null;
      this.callWindowBlocked = true;
      this.callWindowNote =
        'The browser blocked the call window pop-up. Allow pop-ups for this site, then click "Open call window" again.';
    } else {
      this.callWindow = win;
      this.callWindowBlocked = false;
      this.callWindowNote =
        "Call window opened. Publish your camera and microphone from that window. Keep this Dynamics tab open for context, roster, consent and recording status.";
      try {
        win.focus();
      } catch {
        /* ignore */
      }
    }
    this.render(s);
  }

  private async onAction(action: string): Promise<void> {
    const s = this.session.getSnapshot();
    switch (action) {
      case "join":
        await this.session.join();
        break;
      case "leave":
        await this.session.leave();
        break;
      case "mic":
        await this.session.setMicMuted(!s.local.micMuted);
        break;
      case "camera":
        await this.session.setCameraOff(!s.local.cameraOff);
        break;
      case "share":
        await this.session.setScreenSharing(!s.local.sharingScreen);
        break;
    }
  }

  private onSim(sim: string): void {
    const [kind, value] = sim.split(":");
    if (kind === "consent") this.session.simulateConsent(value as ConsentStatus);
    if (kind === "recording") this.session.simulateRecording(value as RecordingStatus);
  }

  // CIF v2 workspace actions. All are mock-safe: inside Dynamics they call Microsoft.CIFramework;
  // standalone they degrade to local no-ops (see cif.ts). No real record IDs are used.
  private async onCif(action: string): Promise<void> {
    const ctx = this.session.getSnapshot().caseContext;
    switch (action) {
      case "simulate-incoming": {
        const incoming = makeMockIncoming(ctx.contactName, ctx.caseNumber);
        this.lastIncoming = incoming.mockInteractionId;
        // Raise the notification (CIF) or auto-accept (standalone), then run the accept flow.
        const accepted = await this.cif.notifyIncoming(incoming);
        this.render(this.session.getSnapshot());
        if (accepted) await this.acceptFlow();
        break;
      }
      case "accept":
        await this.acceptFlow();
        break;
      case "reject":
        this.lastIncoming = "";
        await this.cif.setPresence("Available");
        this.render(this.session.getSnapshot());
        break;
    }
  }

  /** Accept flow: create/focus session → screen-pop → presence → join the (mock) media session. */
  private async acceptFlow(): Promise<void> {
    const ctx = this.session.getSnapshot().caseContext;
    const incoming = makeMockIncoming(ctx.contactName, ctx.caseNumber);
    await this.cif.createOrFocusSession(incoming);
    await this.cif.screenPop("contact", incoming);
    await this.cif.setPresence("Busy");
    await this.session.join();
  }
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string
  );
}
