import { auth, defineMcp } from "@lovable.dev/mcp-js";
import browseListingsTool from "./tools/browse-listings";
import getListingTool from "./tools/get-listing";

// The OAuth issuer must be the direct Supabase host (not the .lovable.cloud
// proxy), and the project ref is the one Supabase value that survives publish
// unchanged. Vite inlines VITE_SUPABASE_PROJECT_ID at build time.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "digifamar-mcp",
  title: "Digifamar Marketplace MCP",
  version: "0.1.0",
  instructions:
    "Tools for the Digifamar farm-to-buyer marketplace. Use `browse_listings` to search produce and `get_listing` to fetch details for a specific listing.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [browseListingsTool, getListingTool],
});
