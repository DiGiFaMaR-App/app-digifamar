import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.digifamar.app",
  appName: "DiGiFaMaR",
  webDir: "dist/client",
  // Self-contained build: the client-only SPA is bundled INSIDE the app
  // (see vite.config.mobile.ts + scripts/build-mobile.mjs). The WebView loads
  // the bundled assets from the local origin — no external web host required.
  // Privileged/server logic runs as Supabase Edge Functions, called directly
  // from the client.
};

export default config;
