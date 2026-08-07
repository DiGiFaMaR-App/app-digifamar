import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "browse_listings",
  title: "Browse marketplace listings",
  description: [
    "Search active produce listings on the DiGiFaMaR farm-to-buyer marketplace.",
    "",
    "Use this tool to discover what farmers currently have available. All filters are optional; call with no arguments to get the newest listings across every category.",
    "",
    "Returns a text summary plus `structuredContent` with:",
    "  - `total` (number): count of matching listings",
    "  - `items` (array): each item has `id`, `name`, `category`, `price` (numeric, per `unit`), `unit` (e.g. 'kg', 'crate'), `stock`, `description`, `farmerId`.",
    "",
    "Use the returned `id` with the `get_listing` tool to fetch full details for a specific listing.",
    "",
    "Examples:",
    "  - Newest 20 listings:            {}",
    '  - Search by name:                { "search": "tomato" }',
    '  - Filter by category:            { "category": "Vegetables" }',
    '  - Combined + custom page size:   { "search": "organic", "category": "Fruits", "limit": 10 }',
  ].join("\n"),
  inputSchema: {
    search: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .optional()
      .describe(
        "Case-insensitive substring matched against listing names (e.g. 'tomato', 'mango'). Omit to skip name filtering.",
      ),
    category: z
      .string()
      .trim()
      .min(1)
      .max(64)
      .optional()
      .describe(
        "Category label to filter by. Common values: 'Vegetables', 'Fruits', 'Grains', 'Dairy', 'Herbs', 'Livestock'. Case-sensitive exact match.",
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .describe("Maximum number of listings to return. Defaults to 20. Max 50."),
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
