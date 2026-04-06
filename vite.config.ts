import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// GitHub Pages serves the site from a subpath: <user>.github.io/japanese-phrases/
// Set base accordingly so asset URLs resolve correctly. Override locally with
// `vite build --base=/` if you ever need root deploys.
const base = process.env.VITE_BASE_PATH ?? "/japanese-phrases/";

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["audio/*.m4a", "favicon.svg"],
      workbox: {
        // Cache audio files generously — they're static and we want them offline.
        globPatterns: ["**/*.{js,css,html,svg,m4a,woff2}"],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
      },
      manifest: {
        name: "Japanese Phrase Learner",
        short_name: "JP Phrases",
        description: "Personal flash-card app for trip prep",
        theme_color: "#0f172a",
        background_color: "#0f172a",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        icons: [
          {
            src: "favicon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ],
});
