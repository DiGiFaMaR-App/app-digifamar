import { describe, expect, it } from "vitest";
import { formatResultText, parseQuery, respond, respondText, searchProducts } from "./engine";
import type { Product } from "@/lib/mock-data";

/** Small deterministic catalog so assertions don't depend on live mock data. */
const CATALOG: Product[] = [
  {
    id: "toms",
    name: "Heirloom Tomatoes",
    variety: "Brandywine",
    farmId: "f1",
    category: "vegetables",
    price: 5,
    unit: "lb",
    image: "",
    delivery: "24h",
    organic: true,
    rating: 4.9,
    reviews: 10,
    stock: 12,
    freshnessGrade: "A",
    freshnessScore: 9.5,
    description: "Vine-ripened heirloom tomatoes for salads.",
  },
  {
    id: "kale",
    name: "Curly Kale",
    farmId: "f1",
    category: "vegetables",
    price: 3,
    unit: "bunch",
    image: "",
    delivery: "24h",
    organic: false,
    rating: 4.2,
    reviews: 4,
    stock: 30,
    freshnessGrade: "A",
    freshnessScore: 8.0,
    description: "Fresh curly kale greens.",
  },
  {
    id: "apples",
    name: "Honeycrisp Apples",
    farmId: "f2",
    category: "fruits",
    price: 8,
    unit: "lb",
    image: "",
    delivery: "48h",
    organic: true,
    rating: 4.7,
    reviews: 20,
    stock: 5,
    freshnessGrade: "B",
    freshnessScore: 7.0,
    description: "Crisp sweet apples.",
  },
  {
    id: "honey",
    name: "Raw Wildflower Honey",
    farmId: "f3",
    category: "honey-preserves",
    price: 12,
    unit: "jar",
    image: "",
    delivery: "48h",
    organic: false,
    rating: 5.0,
    reviews: 40,
    stock: 8,
    freshnessGrade: "A",
    freshnessScore: 6.0,
    description: "Raw unfiltered honey.",
  },
];

describe("parseQuery", () => {
  it("extracts content keywords and drops stopwords", () => {
    const q = parseQuery("find me some organic tomatoes please");
    expect(q.keywords).toContain("tomatoes");
    expect(q.keywords).not.toContain("find");
    expect(q.keywords).not.toContain("me");
    expect(q.keywords).not.toContain("organic");
  });

  it("detects the organic flag", () => {
    expect(parseQuery("organic kale").organic).toBe(true);
    expect(parseQuery("kale").organic).toBe(false);
  });

  it("maps keywords to a category", () => {
    expect(parseQuery("show me apples").category).toBe("fruits");
    expect(parseQuery("some honey").category).toBe("honey-preserves");
    expect(parseQuery("hello there").category).toBeNull();
  });

  it("parses an upper price bound", () => {
    const q = parseQuery("tomatoes under $6");
    expect(q.priceMax).toBe(6);
    expect(q.priceMin).toBeNull();
  });

  it("parses a lower price bound", () => {
    const q = parseQuery("honey over $10");
    expect(q.priceMin).toBe(10);
    expect(q.priceMax).toBeNull();
  });

  it("infers sort preference from wording", () => {
    expect(parseQuery("cheapest greens").sort).toBe("price-asc");
    expect(parseQuery("best rated honey").sort).toBe("rating-desc");
    expect(parseQuery("freshest veg").sort).toBe("fresh-desc");
    expect(parseQuery("tomatoes").sort).toBe("relevance");
  });
});

describe("searchProducts", () => {
  it("matches on free-text keywords", () => {
    const res = searchProducts(parseQuery("tomatoes"), CATALOG);
    expect(res.map((p) => p.id)).toEqual(["toms"]);
  });

  it("filters to organic only", () => {
    const res = searchProducts(parseQuery("organic"), CATALOG);
    expect(res.every((p) => p.organic)).toBe(true);
    expect(res.map((p) => p.id).sort()).toEqual(["apples", "toms"]);
  });

  it("filters by category", () => {
    const res = searchProducts(parseQuery("fruits"), CATALOG);
    expect(res.map((p) => p.id)).toEqual(["apples"]);
  });

  it("applies an upper price bound", () => {
    const res = searchProducts(parseQuery("vegetables under $4"), CATALOG);
    expect(res.map((p) => p.id)).toEqual(["kale"]);
  });

  it("sorts cheapest first", () => {
    const res = searchProducts(parseQuery("cheapest vegetables"), CATALOG);
    expect(res.map((p) => p.id)).toEqual(["kale", "toms"]);
  });

  it("sorts top-rated first", () => {
    const res = searchProducts(parseQuery("best vegetables"), CATALOG);
    expect(res.map((p) => p.id)).toEqual(["toms", "kale"]);
  });

  it("returns nothing when keywords match no product", () => {
    const res = searchProducts(parseQuery("bicycle"), CATALOG);
    expect(res).toEqual([]);
  });
});

describe("respond", () => {
  it("greets on a bare hello", () => {
    expect(respond("hi", CATALOG).intent).toBe("greeting");
    expect(respond("", CATALOG).intent).toBe("greeting");
  });

  it("routes escrow questions to the help intent", () => {
    const r = respond("how does escrow work?", CATALOG);
    expect(r.intent).toBe("help");
    expect(r.links.some((l) => l.to === "/buyer-protection")).toBe(true);
  });

  it("routes fee questions to the help intent", () => {
    const r = respond("what are your fees?", CATALOG);
    expect(r.intent).toBe("help");
    expect(r.reply.toLowerCase()).toContain("platform");
  });

  it("routes selling questions to the farmer signup", () => {
    const r = respond("how do I sell my produce?", CATALOG);
    expect(r.intent).toBe("help");
    expect(r.links.some((l) => l.to === "/signup/farmer")).toBe(true);
  });

  it("handles a product search with results", () => {
    const r = respond("find organic tomatoes under $6", CATALOG);
    expect(r.intent).toBe("search");
    expect(r.products.map((p) => p.id)).toEqual(["toms"]);
  });

  it("returns an empty search result with guidance when nothing matches", () => {
    const r = respond("find spaceships", CATALOG);
    expect(r.intent).toBe("search");
    expect(r.products).toEqual([]);
    expect(r.links.some((l) => l.to === "/market")).toBe(true);
  });

  it("recommends standouts ranked by quality", () => {
    const r = respond("what's good right now?", CATALOG);
    expect(r.intent).toBe("recommend");
    expect(r.products.length).toBeGreaterThan(0);
    expect(r.products.length).toBeLessThanOrEqual(4);
  });

  it("treats an unknown keyword as a search that finds nothing", () => {
    const r = respond("qwxyz", CATALOG);
    expect(r.intent).toBe("search");
    expect(r.products).toEqual([]);
  });

  it("falls back with guidance when a filterless message has no catalog to search", () => {
    const r = respond("the a an", []);
    expect(r.intent).toBe("fallback");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });

  it("always returns a non-empty reply", () => {
    for (const msg of ["hi", "tomatoes", "how does escrow work?", "asdf", ""]) {
      expect(respond(msg, CATALOG).reply.length).toBeGreaterThan(0);
    }
  });
});

describe("formatResultText / respondText", () => {
  it("flattens products into priced bullet lines", () => {
    const result = respond("find tomatoes", CATALOG);
    const text = formatResultText(result);
    expect(text).toContain(result.reply);
    expect(text).toContain("• Heirloom Tomatoes — $5.00/lb");
    expect(text).toContain("(organic, ★4.9)");
  });

  it("includes suggestion hints", () => {
    const text = formatResultText(respond("", CATALOG));
    expect(text).toContain("Try:");
  });

  it("respondText runs the engine and returns a plain string", () => {
    const text = respondText("how does escrow work?", CATALOG);
    expect(text).toContain("6-digit code");
  });
});
