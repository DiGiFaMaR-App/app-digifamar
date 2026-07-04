import { defineMcp } from "@lovable.dev/mcp-js";
import browseListingsTool from "./tools/browse-listings";
import getListingTool from "./tools/get-listing";

export default defineMcp({
  name: "digifamar-mcp",
  title: "Digifamar Marketplace MCP",
  version: "0.1.0",
  instructions:
    "Tools for the Digifamar farm-to-buyer marketplace. Use `browse_listings` to search produce and `get_listing` to fetch details for a specific listing.",
  tools: [browseListingsTool, getListingTool],
});
