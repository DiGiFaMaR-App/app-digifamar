// Standalone build config for the self-contained mobile (Capacitor) app.
//
// Unlike vite.config.ts (Lovable-managed, SSR + Cloudflare, loads the live
// hosted site), this config builds a client-only SPA that is bundled *inside*
// the Android/iOS app. It intentionally does NOT depend on
// @lovable.dev/vite-tanstack-config so the mobile build is independent of any
// web host. All privileged/server logic is expected to run as Supabase Edge
// Functions and be called directly from the client.
import { defineConfig, loadEnv } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ mode }) => {
  // Load publishable browser-safe values from the committed .env so the mobile
  // build is self-contained and does not depend on Lovable-managed config.
  const env = loadEnv(mode, process.cwd());

  return {
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(env.VITE_SUPABASE_URL),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(
        env.VITE_SUPABASE_PUBLISHABLE_KEY,
      ),
      "import.meta.env.VITE_SUPABASE_PROJECT_ID": JSON.stringify(env.VITE_SUPABASE_PROJECT_ID),
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
  };
});
