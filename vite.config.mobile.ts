// Standalone build config for the self-contained mobile (Capacitor) app.
//
// Unlike vite.config.ts (Lovable-managed, SSR + Cloudflare, loads the live
// hosted site), this config builds a client-only SPA that is bundled *inside*
// the Android/iOS app. It intentionally does NOT depend on
// @lovable.dev/vite-tanstack-config so the mobile build is independent of any
// web host. All privileged/server logic is expected to run as Supabase Edge
// Functions and be called directly from the client.
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

// The mobile app talks to its OWN Supabase backend (App-DIGIFAMAR), independent
// of the Lovable-managed `.env` (which Lovable overwrites on every sync to point
// at its own project). These are publishable, browser-safe values (anon key is
// RLS-enforced; the Maps key is HTTP-referrer + API restricted), so baking them
// into the bundled mobile build is the durable, host-independent way to repoint.
const MOBILE_SUPABASE_URL = "https://cgmwdwnijifwprgdkvxk.supabase.co";
const MOBILE_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnbXdkd25pamlmd3ByZ2RrdnhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1NzQ4NDksImV4cCI6MjA5NzE1MDg0OX0.tUbaiXg7XKMFt5JA2X87VquJl6_Nj1RsyYMmh4pzOH4";
const MOBILE_SUPABASE_PROJECT_ID = "cgmwdwnijifwprgdkvxk";

export default defineConfig({
  define: {
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(MOBILE_SUPABASE_URL),
    "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(MOBILE_SUPABASE_ANON_KEY),
    "import.meta.env.VITE_SUPABASE_PROJECT_ID": JSON.stringify(MOBILE_SUPABASE_PROJECT_ID),
  },
  plugins: [
    tsConfigPaths(),
    tailwindcss(),
    tanstackStart({
      // Produce a static SPA shell (index.html) that hydrates on the client.
      spa: { enabled: true },
    }),
    viteReact(),
  ],
});
