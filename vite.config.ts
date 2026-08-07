// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/tanstack/vite";

// Browser-safe backend configuration. Keeping these publishable values in the
// build config prevents production builds from depending on a tracked .env.
const publicBackendUrl = "https://qegnvdgnlhnzfnzaifaw.supabase.co";
const publicBackendKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlZ252ZGdubGhuemZuemFpZmF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5MTYzOTAsImV4cCI6MjA5NTQ5MjM5MH0.jeCglDR6bbZbgUtHlo7jLAqr9CGjlVrlqVtVDBsi0lo";

// Lovable-managed Google Maps browser key (referrer-restricted, safe to embed).
const mapsBrowserKey =
  process.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY"] ||
  "AIzaSyBmvJph4LmrbtW7skeczzpBIyb9WWzFKo4";
const mapsTrackingId =
  process.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID"] ||
  "864c0baff8aba230d11fdab98fc4f8c5";

// PostHog project token and host (public, browser-exposed — safe to embed).
const posthogToken =
  process.env["VITE_PUBLIC_POSTHOG_PROJECT_TOKEN"] ||
  "phc_mUxmrLDkwy3XKWHrFowKjfF6UJidEBgV9P8BWTunEF2W";
const posthogHost = process.env["VITE_PUBLIC_POSTHOG_HOST"] || "https://us.i.posthog.com";

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    plugins: [mcpPlugin()],
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(publicBackendUrl),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(publicBackendKey),
      "import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY":
        JSON.stringify(mapsBrowserKey),
      "import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID":
        JSON.stringify(mapsTrackingId),
      "import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN": JSON.stringify(posthogToken),
      "import.meta.env.VITE_PUBLIC_POSTHOG_HOST": JSON.stringify(posthogHost),
    },
  },
});

