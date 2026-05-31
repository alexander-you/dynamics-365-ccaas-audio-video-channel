import { IInputs, IOutputs } from "./generated/ManifestTypes";
import { MediaEngine } from "./media/mediaEngine";
import { buildMediaEngineConfig, PcfInputValues } from "./media/pcfConfig";
import { resolveAcsGroupIdFromSearch } from "./media/sessionResolver";
import type { MediaSnapshot, MediaDiagnostics, DiagOutcome } from "./media/types";

/**
 * Visual Engagement Media Host — same-origin Dynamics-hosted media surface (POC).
 *
 * Lifecycle:
 *   init       — build the DOM (status + video stage + controls + diagnostics), build the engine
 *                config from PCF inputs + URL, instantiate MediaEngine, subscribe to snapshots,
 *                attach the video stage, then join (or, if no acsGroupId yet, try to resolve one
 *                via the relay /api/session, otherwise stay in the waiting state).
 *   updateView — re-read inputs; if a newly-resolved acsGroupId arrives, update the engine and join.
 *   destroy    — tear down the engine (hang up, dispose call agent, dispose renderers, stop tracks).
 *
 * No static acsGroupId, no token/secret in code: the dynamic group comes from inputs/URL/relay and
 * the VoIP token is minted at runtime by the relay.
 */
export class AcvMediaHost implements ComponentFramework.StandardControl<IInputs, IOutputs> {
  private container!: HTMLDivElement;
  private statusEl!: HTMLDivElement;
  private stageEl!: HTMLDivElement;
  private controlsEl!: HTMLDivElement;
  private diagEl!: HTMLDivElement;
  private micBtn!: HTMLButtonElement;
  private camBtn!: HTMLButtonElement;

  private engine?: MediaEngine;
  private unsubscribe?: () => void;
  private lastGroupId = "";
  private joinAttempted = false;
  private resolving = false;

  public init(
    context: ComponentFramework.Context<IInputs>,
    _notifyOutputChanged: () => void,
    _state: ComponentFramework.Dictionary,
    container: HTMLDivElement
  ): void {
    this.container = container;
    container.classList.add("acv-media-host");

    this.statusEl = document.createElement("div");
    this.statusEl.className = "acv-status info";

    this.stageEl = document.createElement("div");
    this.stageEl.className = "acv-stage";

    this.controlsEl = document.createElement("div");
    this.controlsEl.className = "acv-controls";
    this.micBtn = document.createElement("button");
    this.micBtn.textContent = "Mute mic";
    this.micBtn.addEventListener("click", () => void this.toggleMic());
    this.camBtn = document.createElement("button");
    this.camBtn.textContent = "Turn camera off";
    this.camBtn.addEventListener("click", () => void this.toggleCamera());
    this.controlsEl.appendChild(this.micBtn);
    this.controlsEl.appendChild(this.camBtn);

    this.diagEl = document.createElement("div");
    this.diagEl.className = "acv-diag";

    container.appendChild(this.statusEl);
    container.appendChild(this.stageEl);
    container.appendChild(this.controlsEl);
    container.appendChild(this.diagEl);

    const inputs = this.readInputs(context);
    const search = typeof window !== "undefined" ? window.location.search : "";
    const config = buildMediaEngineConfig(inputs, search);

    this.engine = new MediaEngine(config);
    this.lastGroupId = config.groupId;
    this.unsubscribe = this.engine.subscribe({ onSnapshot: (s) => this.render(s) });
    this.engine.attachVideo(this.stageEl);

    if (config.groupId.trim() !== "") {
      this.joinAttempted = true;
      void this.engine.join();
    } else {
      void this.tryResolveAndJoin(config.tokenUrl, search);
    }
  }

  public updateView(context: ComponentFramework.Context<IInputs>): void {
    if (!this.engine) return;
    const inputs = this.readInputs(context);
    const search = typeof window !== "undefined" ? window.location.search : "";
    const config = buildMediaEngineConfig(inputs, search);

    if (config.groupId.trim() !== "" && config.groupId !== this.lastGroupId) {
      this.lastGroupId = config.groupId;
      this.engine.setGroupId(config.groupId);
      if (!this.joinAttempted) {
        this.joinAttempted = true;
        void this.engine.join();
      }
    } else if (config.groupId.trim() === "" && !this.joinAttempted && !this.resolving) {
      void this.tryResolveAndJoin(config.tokenUrl, search);
    }
  }

  public getOutputs(): IOutputs {
    return {};
  }

  public destroy(): void {
    this.unsubscribe?.();
    void this.engine?.destroy();
    this.engine = undefined;
  }

  private readInputs(context: ComponentFramework.Context<IInputs>): PcfInputValues {
    const p = context.parameters as unknown as Record<string, { raw?: string | null }>;
    const val = (name: string): string | undefined => {
      const raw = p?.[name]?.raw;
      return typeof raw === "string" && raw.trim() !== "" ? raw : undefined;
    };
    return {
      acsGroupId: val("acsGroupId"),
      contextId: val("contextId"),
      tokenUrl: val("tokenUrl"),
      sdkUrl: val("sdkUrl"),
      requestedMedia: val("requestedMedia"),
      mode: val("mode")
    };
  }

  private async tryResolveAndJoin(tokenUrl: string, search: string): Promise<void> {
    if (this.resolving || !this.engine) return;
    this.resolving = true;
    try {
      const groupId = await resolveAcsGroupIdFromSearch(search, tokenUrl);
      if (groupId && this.engine) {
        this.lastGroupId = groupId;
        this.engine.setGroupId(groupId);
        if (!this.joinAttempted) {
          this.joinAttempted = true;
          await this.engine.join();
        }
      }
    } finally {
      this.resolving = false;
    }
  }

  private async toggleMic(): Promise<void> {
    if (!this.engine) return;
    const s = this.engine.getSnapshot();
    await this.engine.setMicMuted(!s.local.micMuted);
  }

  private async toggleCamera(): Promise<void> {
    if (!this.engine) return;
    const s = this.engine.getSnapshot();
    await this.engine.setCameraOff(!s.local.cameraOff);
  }

  private render(s: MediaSnapshot): void {
    const sev = s.message?.severity ?? "info";
    this.statusEl.className = `acv-status ${sev}`;
    const hint = s.message?.hint ? `<span class="acv-status-hint">${escapeHtml(s.message.hint)}</span>` : "";
    this.statusEl.innerHTML = `${escapeHtml(s.message?.text ?? "")}${hint}`;

    const connected = s.state === "connected";
    this.micBtn.disabled = !connected;
    this.camBtn.disabled = !connected || s.requestedMedia === "audio";
    this.micBtn.textContent = s.local.micMuted ? "Unmute mic" : "Mute mic";
    this.camBtn.textContent = s.local.cameraOff ? "Turn camera on" : "Turn camera off";

    this.diagEl.innerHTML = this.renderDiagnostics(s.diagnostics);
  }

  private renderDiagnostics(d: MediaDiagnostics): string {
    const outcome = (o: DiagOutcome | boolean): string => {
      const ok = o === true || o === "success";
      const bad = o === false || o === "failed";
      const text = typeof o === "boolean" ? (o ? "yes" : "no") : o;
      const cls = ok ? "ok" : bad ? "bad" : "";
      return `<span class="${cls}">${text}</span>`;
    };
    const rows: [string, string][] = [
      ["Embedded iframe", outcome(d.embedded)],
      ["Camera permission", escapeHtml(d.cameraPermission)],
      ["Microphone permission", escapeHtml(d.microphonePermission)],
      ["getUserMedia", outcome(d.getUserMedia)],
      ["Local video stream", outcome(d.localVideoStreamCreated)],
      ["startVideo", outcome(d.startVideo)],
      ["Local preview rendered", outcome(d.localPreviewRendered)],
      ["Video published", outcome(d.videoPublished)]
    ];
    if (d.lastError) rows.push(["Last error", `<span class="bad">${escapeHtml(d.lastError)}</span>`]);
    if (d.permissionsPolicyError)
      rows.push(["Permissions-Policy", `<span class="bad">${escapeHtml(d.permissionsPolicyError)}</span>`]);
    const body = rows.map(([k, v]) => `<tr><td>${escapeHtml(k)}</td><td>${v}</td></tr>`).join("");
    return `<details><summary>Media diagnostics</summary><table>${body}</table></details>`;
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
