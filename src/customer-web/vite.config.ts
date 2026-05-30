import { defineConfig } from "vite";

// Phase 3 scaffold. Dev server runs on 5173 to match the token-service CORS allow-list
// in local.settings.json.example.
export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      // Forward API calls to the local Functions host to avoid CORS during dev.
      "/api": {
        target: "http://localhost:7071",
        changeOrigin: true
      }
    }
  }
});
