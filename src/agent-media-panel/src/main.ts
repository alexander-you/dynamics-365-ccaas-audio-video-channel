// Entry point for the agent media panel (Phase 3c scaffold, mock-only).
import { createMediaSession } from "./mediaSession";
import { AgentPanel } from "./agentPanel";
import "./styles.css";

const root = document.getElementById("app");
if (!root) {
  throw new Error("Missing #app root element.");
}

const session = createMediaSession();
new AgentPanel(root, session);
