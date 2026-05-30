import { defineConfig } from "vite";

// Phase 3c scaffold. Static, local-only agent media panel.
// No proxy and no remote calls — this prototype runs entirely in mock mode and is NOT
// embedded in Dynamics 365. Port 5190 keeps it distinct from customer-web (5173) and the
// deployment assistant (5180).
export default defineConfig({
  server: {
    port: 5190
  }
});
