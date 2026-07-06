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
  server: {
    androidScheme: "https",
    // Serve the bundled assets under a virtual origin that is on the Google
    // Maps browser key's HTTP-referrer allowlist. Content is still 100% local
    // (no `server.url`), but the WebView's origin/referrer becomes
    // https://app.digifamar.com, so the Maps JS API accepts requests instead
    // of rejecting the default `localhost` origin.
    hostname: "app.digifamar.com",
  },
};

export default config;
