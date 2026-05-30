// CIF v2 client-side bridge for the agent media panel (Phase 4A).
//
// PURPOSE: make the mock panel behave as a Channel Integration Framework (CIF) v2 widget when it is
// embedded in a Dynamics 365 agent workspace, while still running standalone outside Dynamics.
//
// SAFETY / SCOPE (mock only):
// - No real ACS tokens, no ACS calls, no Dataverse writes, no secrets, no tenant-specific values.
// - No hardcoded real record IDs. Screen-pop uses entity logical names + mock search text only.
// - Outside Dynamics, `Microsoft.CIFramework` is absent and every method degrades to a no-op + log.
//
// The CIF client library (`Microsoft.CIFramework`) is injected by the Dynamics host into the widget
// iframe at runtime. We never bundle or fetch it ourselves.

import type { AvContext, RequestedMedia } from "./context";

/** Minimal shape of the CIF v2 client API we use. The host provides the real implementation. */
interface CIFrameworkApi {
  // Raises an incoming notification in the workspace. Returns the user's action result as JSON.
  notifyEvent(input: Record<string, unknown>): Promise<string>;
  // Creates a workspace session (multi-session) and returns the session id.
  createSession(input: Record<string, unknown>): Promise<string>;
  // Focuses/sets the current session.
  setSessionTitle?(input: Record<string, unknown>): Promise<string>;
  // Opens a record (screen-pop) or searches and opens.
  searchAndOpenRecords(
    entityLogicalName: string,
    queryParameters: string,
    searchOnly: boolean
  ): Promise<string>;
  // Presence (best-effort; availability depends on the workspace app).
  setPresence?(presenceInfo: string): Promise<string>;
  getPresence?(): Promise<string>;
  // Returns environment/config for the widget, including any custom parameters the channel
  // provider was configured with. Shape is host-defined; we parse defensively.
  getEnvironment?(): Promise<string>;
  // Subscribes to CIF lifecycle events (e.g., "onpagenavigate").
  addHandler?(eventName: string, handler: (...args: unknown[]) => void): void;
}

interface CIFGlobal {
  Microsoft?: { CIFramework?: CIFrameworkApi };
}

export type CifMode = "cif" | "standalone";

export interface CifStatus {
  mode: CifMode;
  /** Human-readable status line for the panel header. */
  label: string;
  /** True when the CIF v2 client API is present in this frame. */
  available: boolean;
}

/** A mock incoming interaction payload (no real IDs, no tenant values). */
export interface MockIncomingInteraction {
  channel: "audio-video";
  contactName: string;
  caseNumber: string;
  /** A made-up correlation id for the mock interaction. */
  mockInteractionId: string;
}

function getApi(): CIFrameworkApi | undefined {
  const g = window as unknown as CIFGlobal;
  return g.Microsoft?.CIFramework;
}

/**
 * CifBridge — thin, defensive wrapper over the CIF v2 client API.
 * Every method is safe to call in standalone mode (logs + resolves without throwing).
 */
export class CifBridge {
  private readonly api = getApi();

  get status(): CifStatus {
    return this.api
      ? { mode: "cif", available: true, label: "Running inside Dynamics 365 CIF" }
      : { mode: "standalone", available: false, label: "Running standalone mock mode" };
  }

  /**
   * Raise an incoming-notification in the workspace (CIF) or simulate it (standalone).
   * Returns true when the agent accepts, false when rejected/timed-out.
   * NOTE: in mock mode this never connects real media — it only drives the workspace UX.
   */
  async notifyIncoming(interaction: MockIncomingInteraction): Promise<boolean> {
    if (!this.api) {
      // Standalone: no host to render a notification; treat as auto-accepted for local testing.
      log("notifyIncoming (standalone) → auto-accept", interaction);
      return true;
    }
    try {
      const input = {
        templateName: "", // a POC notification template name would go here once created
        templateParameters: {
          title: "Incoming Audio/Video request",
          channel: interaction.channel,
          contactName: interaction.contactName,
          caseNumber: interaction.caseNumber
        },
        // Accept/Reject actions are defined by the notification template in Dynamics.
        cancelAutomatically: true,
        timeout: 30
      };
      const resultJson = await this.api.notifyEvent(input);
      const result = safeParse(resultJson);
      const accepted = Boolean(
        result && (result["actionName"] === "accept" || result["Accept"] === true)
      );
      log("notifyIncoming (cif) → result", { resultJson, accepted });
      return accepted;
    } catch (err) {
      log("notifyIncoming (cif) error", err);
      return false;
    }
  }

  /** Create or focus a workspace session for the interaction. No-op in standalone. */
  async createOrFocusSession(interaction: MockIncomingInteraction): Promise<string | null> {
    if (!this.api) {
      log("createOrFocusSession (standalone) → skipped", interaction);
      return null;
    }
    try {
      const input = {
        templateName: "", // a POC session template name would go here once created
        templateParameters: {
          title: `A/V — ${interaction.contactName}`,
          caseNumber: interaction.caseNumber
        }
      };
      const sessionId = await this.api.createSession(input);
      log("createOrFocusSession (cif) → sessionId", sessionId);
      return sessionId;
    } catch (err) {
      log("createOrFocusSession (cif) error", err);
      return null;
    }
  }

  /**
   * Screen-pop to a Contact, Case, or placeholder context.
   * Uses entity logical names + mock search text only — NO hardcoded record IDs.
   */
  async screenPop(
    target: "contact" | "incident" | "placeholder",
    interaction: MockIncomingInteraction
  ): Promise<void> {
    if (!this.api) {
      log("screenPop (standalone) → skipped", { target, interaction });
      return;
    }
    try {
      if (target === "placeholder") {
        // No custom Audio/Video Session table exists yet (deferred). Open a new-record search stub.
        log("screenPop (cif) placeholder → no custom table yet; skipping record open");
        return;
      }
      const entity = target; // "contact" | "incident"
      const searchText =
        target === "contact" ? interaction.contactName : interaction.caseNumber;
      // searchOnly=true performs a search without forcing creation; host decides record open.
      const result = await this.api.searchAndOpenRecords(entity, `?search=${encodeURIComponent(searchText)}`, true);
      log("screenPop (cif) → result", { entity, searchText, result });
    } catch (err) {
      log("screenPop (cif) error", err);
    }
  }

  /** Best-effort presence set. Safe no-op when unavailable. */
  async setPresence(presence: string): Promise<void> {
    if (!this.api?.setPresence) {
      log("setPresence (unavailable) → skipped", presence);
      return;
    }
    try {
      await this.api.setPresence(presence);
      log("setPresence (cif) → ok", presence);
    } catch (err) {
      log("setPresence (cif) error", err);
    }
  }

  /**
   * Read A/V context overrides from the CIF environment (custom parameters the channel provider was
   * configured with). Returns only the keys present; the caller merges these over the URL/defaults.
   * Best-effort and mock-safe: returns {} in standalone mode or on any parse failure.
   */
  async getContextOverrides(): Promise<Partial<AvContext>> {
    if (!this.api?.getEnvironment) {
      log("getContextOverrides (unavailable) → {}");
      return {};
    }
    try {
      const envJson = await this.api.getEnvironment();
      const env = safeParse(envJson) ?? {};
      // Custom params may be nested under a few host-defined keys; check the common ones.
      const raw =
        (env["customParams"] as unknown) ??
        (env["customparams"] as unknown) ??
        (env["appConfigParams"] as unknown) ??
        env;
      const params =
        typeof raw === "string" ? safeParse(raw) ?? {} : (raw as Record<string, unknown>);
      const out: Partial<AvContext> = {};
      const str = (v: unknown): string | undefined =>
        typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
      if (str(params["mode"])) out.mode = str(params["mode"]);
      if (str(params["sessionRef"])) out.sessionRef = str(params["sessionRef"]);
      if (str(params["acsGroupId"])) out.acsGroupId = str(params["acsGroupId"]);
      if (str(params["caseNumber"])) out.caseNumber = str(params["caseNumber"]);
      if (str(params["caseTitle"])) out.caseTitle = str(params["caseTitle"]);
      if (str(params["contactName"])) out.contactName = str(params["contactName"]);
      const media = str(params["requestedMedia"])?.toLowerCase();
      if (media === "audio" || media === "audio-video") {
        out.requestedMedia = media as RequestedMedia;
      }
      log("getContextOverrides (cif) → overrides", out);
      return out;
    } catch (err) {
      log("getContextOverrides (cif) error", err);
      return {};
    }
  }
}

/** Build a mock incoming interaction with a random correlation id (no tenant data). */
export function makeMockIncoming(contactName: string, caseNumber: string): MockIncomingInteraction {
  return {
    channel: "audio-video",
    contactName,
    caseNumber,
    mockInteractionId: `mock-${Math.random().toString(36).slice(2, 10)}`
  };
}

function safeParse(json: string): Record<string, unknown> | null {
  try {
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function log(message: string, detail?: unknown): void {
  // Console-only diagnostics; safe to ship (no secrets/tenant values).
  // eslint-disable-next-line no-console
  console.info(`[CIF] ${message}`, detail ?? "");
}
