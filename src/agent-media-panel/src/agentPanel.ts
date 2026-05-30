// Agent panel UI controller. Phase 3c scaffold.
// Renders the agent media panel from a SessionSnapshot and wires controls to IMediaSession.
// The UI depends ONLY on IMediaSession — never on the ACS SDK directly.

import type { IMediaSession } from "./mediaSession";
import type { SessionSnapshot, RecordingStatus, ConsentStatus } from "./types";
import { CifBridge, makeMockIncoming, type CifStatus } from "./cif";

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
            ? `<p class="muted">No participants. Join the session to populate the roster (mock).</p>`
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
  }

  private renderMessage(s: SessionSnapshot): string {
    if (!s.message) return "";
    const m = s.message;
    return `<div class="amp-message msg-${m.severity}">
      <span>${esc(m.text)}</span>
      ${m.fallbackHint ? `<span class="fallback">Fallback: ${esc(m.fallbackHint)}</span>` : ""}
    </div>`;
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
