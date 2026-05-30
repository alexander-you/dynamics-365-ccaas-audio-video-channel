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

  // CIF-embedded live experience: when the panel loads as a real (live) widget — i.e. embedded as a
  // CIF v2 channel provider with mode=live — auto-join the ACS group so the agent's video appears
  // in the Communication Panel without a manual click. join() is idempotent and the UI still shows
  // the controls. Standalone/mock loads (the safe bare public URL) never reach this branch.
  if (!session.isMock) {
    void session.join();
  }
}

void boot(root);
