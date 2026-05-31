// Entry point for the agent media panel (Phase 3c scaffold, mock-only).
import { createMediaSession } from "./mediaSession";
import { AgentPanel } from "./agentPanel";
import { CifBridge } from "./cif";
import { readAvContext } from "./context";
import "./styles.css";

const root = document.getElementById("app");
if (!root) {
  throw new Error("Missing #app root element.");
}

// Resolve the incoming A/V context. Base values come from the URL query string (works standalone
// and as a CIF widget); inside Dynamics, CIF environment custom params take precedence.
const cif = new CifBridge();

async function boot(rootEl: HTMLElement): Promise<void> {
  const base = readAvContext();
  const overrides = await cif.getContextOverrides();
  const ctx = { ...base, ...overrides };
  const session = createMediaSession(ctx);
  new AgentPanel(rootEl, session, cif);

  // CIF v2: when embedded as a provider in an (Omnichannel/Copilot Service) workspace, the provider
  // panel often loads MINIMIZED — so the widget can be running yet invisible. Make it visible.
  // No-op in standalone mode (the CIF API is absent).
  void cif.revealPanel();

  // Two roles for the SAME hosted panel, distinguished by the `surface` URL marker:
  //  • CONTROLLER (no `surface=tab`): the provider panel loaded alongside the native Omnichannel
  //    Communication Panel. It does NOT replace the chat — it surfaces the Visual Engagement media
  //    stage as its OWN application tab (Application Tab Template `alex_acv_media_tab_poc`) via the
  //    app-tab API.
  //  • MEDIA STAGE (`surface=tab`): the panel loaded INSIDE that application tab. It joins the ACS
  //    group call when an acsGroupId is present, otherwise stays in the safe waiting state. It never
  //    opens another tab (this is what prevents tab-spawning recursion).
  // NOTE: passing the dynamic acsGroupId into the media-stage URL is the remaining live-validation
  // step — see docs/cif-v2-configuration.md §10.7. Until then the media stage loads in waiting state
  // (no static group is ever used).
  const surface = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : ""
  ).get("surface");
  const isMediaStage = surface === "tab" || (ctx.acsGroupId?.trim() ?? "") !== "";

  if (!session.isMock) {
    if (isMediaStage) {
      void session.join();
    } else {
      void cif.openMediaTab();
    }
  }
}

void boot(root);
