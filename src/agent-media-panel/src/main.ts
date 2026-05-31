// Entry point for the agent media panel (Phase 3c scaffold, mock-only).
import { createMediaSession } from "./mediaSession";
import { AgentPanel } from "./agentPanel";
import { CifBridge } from "./cif";
import { readAvContext } from "./context";
import { resolveAcsGroupId } from "./sessionResolver";
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

  // MEDIA STAGE dynamic resolution: when this panel loads inside the Visual Engagement application
  // tab, the D365 session-template slug puts a SUPPORTED context id on the URL (liveWorkItemId /
  // conversationId / convId / sessionId). If we don't already have an acsGroupId, ask the relay
  // (GET /api/session) to resolve the ACS group the customer minted, so the agent joins the SAME
  // group. No static/hardcoded group is ever used; if resolution fails the panel stays in waiting.
  const search =
    typeof window !== "undefined" ? window.location.search : "";
  if ((ctx.acsGroupId?.trim() ?? "") === "") {
    const resolved = await resolveAcsGroupId(search);
    if (resolved) {
      ctx.acsGroupId = resolved;
    }
  }

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
