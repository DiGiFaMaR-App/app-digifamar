import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "browse_listings",
  title: "Browse marketplace listings",
  description:
    "Search active produce listings on the Digifamar marketplace. Optionally filter by category or search text.",
  inputSchema: {
    search: z.string().trim().min(1).optional().describe("Text to match against listing names."),
    category: z.string().trim().min(1).optional().describe("Category to filter by."),
    limit: z.number().int().min(1).max(50).optional().describe("Max results (default 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, category, limit }) => {
    const { ListingsService } = await import("@/lib/listings/service.server");
    const { items, total } = ListingsService.list({
      search,
      category,
      limit: limit ?? 20,
      offset: 0,
    });
    return {
      content: [
        {
          type: "text",
          text: `Found ${total} listing(s). Showing ${items.length}:\n${items
            .map((l) => `- ${l.name} (${l.category}) — ${l.price} per ${l.unit} [id: ${l.id}]`)
            .join("\n")}`,
        },
      ],
      structuredContent: { total, items },
    };
  },
});
