import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "get_listing",
  title: "Get listing details",
  description:
    [
      "Fetch full details for a single DiGiFaMaR marketplace listing by its id.",
      "",
      "Call this after `browse_listings` when the user wants price, stock, unit, description, or the owning farmer for a specific item. Do NOT guess ids — always pass an `id` returned by `browse_listings`.",
      "",
      "Returns a text summary plus `structuredContent.listing` with:",
      "  - `id`, `name`, `category`, `price` (per `unit`), `unit`, `stock`, `description`, `farmerId`.",
      "",
      "If the id doesn't exist, the tool returns `isError: true` with an explanatory message — treat that as 'not found' rather than retrying with variants of the id.",
      "",
      "Examples:",
      '  - Real listing:  { "id": "lst_01HZX9K3ABCDEF" }',
      '  - Mock catalog:  { "id": "mock-tomato-01" }',
    ].join("\n"),
  inputSchema: {
    id: z
      .string()
      .trim()
      .min(1)
      .max(64)
      .describe(
        "Listing id, exactly as returned by `browse_listings` (e.g. 'lst_...' for real listings, or a mock catalog id like 'mock-tomato-01'). Required.",
      ),
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
