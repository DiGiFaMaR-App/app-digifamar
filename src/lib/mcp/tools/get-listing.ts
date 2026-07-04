import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "get_listing",
  title: "Get listing details",
  description: "Fetch full details for a single Digifamar marketplace listing by id.",
  inputSchema: {
    id: z.string().trim().min(1).describe("Listing id (e.g. 'lst_...' or a mock catalog id)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id }) => {
    const { ListingsService } = await import("@/lib/listings/service.server");
    const listing = ListingsService.findById(id);
    if (!listing) {
      return {
        content: [{ type: "text", text: `No listing found with id ${id}.` }],
        isError: true,
      };
    }
    return {
      content: [
        {
          type: "text",
          text: `${listing.name} (${listing.category})\nPrice: ${listing.price} per ${listing.unit}\nStock: ${listing.stock}\n${listing.description ?? ""}`,
        },
      ],
      structuredContent: { listing },
    };
  },
});
