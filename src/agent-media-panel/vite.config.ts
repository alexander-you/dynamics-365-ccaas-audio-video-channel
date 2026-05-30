import { defineConfig } from "vite";

// Phase 3c scaffold, hosted in Phase 4A as a CIF v2 mock widget.
// Static, mock-only agent media panel — no proxy, no real ACS/Dataverse calls (VITE_USE_MOCKS=true).
// `base` is set for GitHub Pages project-site hosting at
// https://<owner>.github.io/dynamics-365-ccaas-audio-video-channel/ so asset URLs resolve under the
// repository subpath. Port 5190 keeps local dev distinct from customer-web (5173) and the deployment
// assistant (5180).
export default defineConfig({
  base: "/dynamics-365-ccaas-audio-video-channel/",
  server: {
    port: 5190
  }
});
