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

// Google Maps browser key. Prefer the project's own key (GOOGLE_API_KEY), which is
// referrer-allowed for the custom domain; fall back to the Lovable-managed connector key
// (only valid on *.lovable.app / *.lovableproject.com).
const mapsBrowserKey =
  process.env["GOOGLE_API_KEY"] ||
  process.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY"] ||
  "AIzaSyBmvJph4LmrbtW7skeczzpBIyb9WWzFKo4";
const mapsTrackingId =
  process.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID"] ||
  "864c0baff8aba230d11fdab98fc4f8c5";

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    plugins: [mcpPlugin()],
    resolve: {
      alias: {
        "entities/lib/decode.js": path.resolve(__dirname, "node_modules/entities/lib/decode.js"),
        "entities/lib/encode.js": path.resolve(__dirname, "node_modules/entities/lib/encode.js"),
        entities: path.resolve(__dirname, "node_modules/entities"),
      },
    },
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(publicBackendUrl),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(publicBackendKey),
      "import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY":
        JSON.stringify(mapsBrowserKey),
      "import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID":
        JSON.stringify(mapsTrackingId),
    },
  },
});

