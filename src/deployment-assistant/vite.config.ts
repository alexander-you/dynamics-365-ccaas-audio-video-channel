import { defineConfig } from "vite";

// Phase 3.5 scaffold. Static, local-only deployment assistant.
// No proxy to Azure or Dynamics — this prototype never calls remote APIs.
export default defineConfig({
  server: {
    port: 5180
  }
});
