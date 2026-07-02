/**
 * DiGiFaMaR marketplace assistant — deterministic intent engine.
 *
 * This powers the in-app AI assistant. It runs fully client-side over the
 * catalog so the assistant works with zero external dependencies (no API key,
 * no network) and is trivially unit-testable. When a server-side LLM key is
 * configured it can be layered on top for free-form phrasing (see
 * assistant.functions.ts), but the deterministic engine is always the fallback
 * and the source of truth for structured results (product matches + links).
 */
import { categories, products as allProducts, type Product } from "@/lib/mock-data";
import { ESCROW_FEE_RATE, formatRate, PLATFORM_FEE_RATE } from "@/lib/cart/fees";

/** Param-less in-app routes the assistant is allowed to link to. */
export type AssistantRoute =
  | "/market"
  | "/how-it-works"
  | "/buyer-protection"
  | "/hacks"
  | "/signup/farmer"
  | "/lending";

export type AssistantLink = { label: string; to: AssistantRoute };

export type AssistantIntent = "greeting" | "search" | "recommend" | "help" | "fallback";

export type AssistantResult = {
  intent: AssistantIntent;
  reply: string;
  products: Product[];
  links: AssistantLink[];
  suggestions: string[];
};

export type ParsedQuery = {
  keywords: string[];
  category: string | null;
  organic: boolean;
  priceMin: number | null;
  priceMax: number | null;
  sort: "price-asc" | "rating-desc" | "fresh-desc" | "relevance";
};

const MAX_RESULTS = 6;

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  vegetables: [
    "vegetable",
    "vegetables",
    "veg",
    "veggie",
    "veggies",
    "tomato",
    "tomatoes",
    "greens",
    "lettuce",
    "kale",
    "spinach",
    "pepper",
    "peppers",
    "squash",
    "carrot",
    "carrots",
    "onion",
    "salad",
  ],
  fruits: ["fruit", "fruits", "apple", "apples", "berry", "berries", "peach", "melon", "citrus"],
  "dairy-eggs": ["dairy", "egg", "eggs", "milk", "cheese", "butter", "yogurt"],
  "meat-poultry": ["meat", "chicken", "beef", "pork", "poultry", "lamb"],
  "honey-preserves": ["honey", "jam", "jams", "preserve", "preserves", "syrup"],
  grains: ["grain", "grains", "bean", "beans", "legume", "legumes", "lentil", "rice", "wheat"],
  herbs: ["herb", "herbs", "spice", "spices", "basil", "mint", "thyme", "cilantro"],
  flowers: ["flower", "flowers", "plant", "plants", "bouquet"],
  artisan: ["artisan", "sourdough", "bread", "baked"],
  "nuts-seeds": ["nut", "nuts", "seed", "seeds", "almond", "pecan", "walnut"],
};

const STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "i",
  "im",
  "me",
  "my",
  "to",
  "for",
  "of",
  "in",
  "on",
  "at",
  "and",
  "or",
  "with",
  "do",
  "does",
  "you",
  "your",
  "have",
  "has",
  "any",
  "some",
  "please",
  "find",
  "show",
  "get",
  "want",
  "need",
  "looking",
  "look",
  "buy",
  "buying",
  "near",
  "around",
  "here",
  "there",
  "under",
  "below",
  "over",
  "above",
  "less",
  "more",
  "than",
  "cheap",
  "cheapest",
  "cheaper",
  "lowest",
  "budget",
  "best",
  "top",
  "rated",
  "highest",
  "fresh",
  "freshest",
  "organic",
  "is",
  "are",
  "what",
  "whats",
  "which",
  "can",
  "could",
  "would",
  "give",
  "recommend",
  "suggest",
  "something",
  "anything",
  "produce",
  "product",
  "products",
  "farm",
  "farms",
]);

function normalize(text: string): string {
  return text.toLowerCase().trim();
}

function tokenize(text: string): string[] {
  return normalize(text)
    .replace(/[^a-z0-9$.\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/** Extract structured filters + free-text keywords from a natural query. */
export function parseQuery(text: string): ParsedQuery {
  const lower = normalize(text);

  const priceMaxMatch = lower.match(
    /(?:under|below|less than|cheaper than|max|up to|no more than|within)\s*\$?\s*(\d+(?:\.\d+)?)/,
  );
  const priceMinMatch = lower.match(
    /(?:over|above|more than|at least|min|minimum|starting at)\s*\$?\s*(\d+(?:\.\d+)?)/,
  );
  const priceMax = priceMaxMatch ? Number(priceMaxMatch[1]) : null;
  const priceMin = priceMinMatch ? Number(priceMinMatch[1]) : null;

  const organic = /\borganic\b/.test(lower);

  let category: string | null = null;
  for (const [slug, words] of Object.entries(CATEGORY_KEYWORDS)) {
    if (words.some((w) => new RegExp(`\\b${w}\\b`).test(lower))) {
      category = slug;
      break;
    }
  }

  let sort: ParsedQuery["sort"] = "relevance";
  if (/\b(cheap|cheapest|cheaper|lowest|least expensive|budget)\b/.test(lower)) sort = "price-asc";
  else if (/\b(best|top[- ]?rated|highest rated|best rated|most popular)\b/.test(lower))
    sort = "rating-desc";
  else if (/\b(fresh|freshest)\b/.test(lower)) sort = "fresh-desc";

  const keywords = tokenize(text).filter(
    (t) => !STOPWORDS.has(t) && !/^\$?\d/.test(t) && t.length > 1,
  );

  return { keywords, category, organic, priceMin, priceMax, sort };
}

function searchableText(p: Product): string {
  return `${p.name} ${p.variety ?? ""} ${p.category} ${p.description}`.toLowerCase();
}

function matchScore(p: Product, keywords: string[]): number {
  if (keywords.length === 0) return 0;
  const hay = searchableText(p);
  return keywords.reduce((n, kw) => (hay.includes(kw) ? n + 1 : n), 0);
}

/** Filter + rank the catalog for a parsed query. */
export function searchProducts(parsed: ParsedQuery, catalog: Product[] = allProducts): Product[] {
  const scored = catalog
    .map((p) => ({ p, score: matchScore(p, parsed.keywords) }))
    .filter(({ p, score }) => {
      if (parsed.organic && !p.organic) return false;
      if (parsed.category && p.category !== parsed.category) return false;
      if (parsed.priceMin != null && p.price < parsed.priceMin) return false;
      if (parsed.priceMax != null && p.price > parsed.priceMax) return false;
      // If the user typed free-text keywords, require at least one match.
      if (parsed.keywords.length > 0 && score === 0) return false;
      return true;
    });

  scored.sort((a, b) => {
    switch (parsed.sort) {
      case "price-asc":
        return a.p.price - b.p.price;
      case "rating-desc":
        return b.p.rating - a.p.rating;
      case "fresh-desc":
        return b.p.freshnessScore - a.p.freshnessScore;
      default:
        return b.score - a.score || b.p.rating - a.p.rating;
    }
  });

  return scored.map(({ p }) => p).slice(0, MAX_RESULTS);
}

function describeFilters(parsed: ParsedQuery): string {
  const parts: string[] = [];
  if (parsed.organic) parts.push("organic");
  if (parsed.category) {
    const name = categories.find((c) => c.slug === parsed.category)?.name.toLowerCase();
    if (name) parts.push(name);
  }
  if (parsed.priceMin != null) parts.push(`over $${parsed.priceMin}`);
  if (parsed.priceMax != null) parts.push(`under $${parsed.priceMax}`);
  if (parsed.sort === "price-asc") parts.push("cheapest first");
  if (parsed.sort === "rating-desc") parts.push("top-rated first");
  if (parsed.sort === "fresh-desc") parts.push("freshest first");
  return parts.join(", ");
}

type HelpTopic = { test: RegExp; build: () => AssistantResult };

const HELP_TOPICS: HelpTopic[] = [
  {
    test: /\b(escrow|protected|held|safe|secure|otp|release code)\b/,
    build: () => ({
      intent: "help",
      reply:
        "Every DiGiFaMaR order is escrow-protected. Your payment is held by Escrow.com and only " +
        "released to the farmer after your goods are delivered and you confirm receipt with a " +
        "6-digit code. If something's wrong, you're covered by buyer protection.",
      products: [],
      links: [
        { label: "How buyer protection works", to: "/buyer-protection" },
        { label: "How it works", to: "/how-it-works" },
      ],
      suggestions: ["What are the fees?", "How do I become a seller?"],
    }),
  },
  {
    test: /\b(fee|fees|commission|charge|charges|cost|cut|percentage|percent)\b/,
    build: () => ({
      intent: "help",
      reply:
        `Checkout adds two fees on the item subtotal: a ${formatRate(PLATFORM_FEE_RATE)} platform ` +
        `fee and a ${formatRate(ESCROW_FEE_RATE)} escrow fee, plus a distance-based delivery fee ` +
        "(free if you pick up at the farm). You see the full breakdown before you pay.",
      products: [],
      links: [{ label: "See how it works", to: "/how-it-works" }],
      suggestions: ["How does escrow work?", "Show me organic vegetables"],
    }),
  },
  {
    test: /\b(deliver|delivery|shipping|ship|how fast|when will|arrive)\b/,
    build: () => ({
      intent: "help",
      reply:
        "Farmers ship fresh — most items arrive within 24–48h. At checkout you choose Standard, " +
        "Express, or free farm pickup; the delivery fee is based on how far you are from the farm, " +
        "with the first 10 miles free.",
      products: [],
      links: [{ label: "Browse the market", to: "/market" }],
      suggestions: ["Find produce near me", "What's the freshest right now?"],
    }),
  },
  {
    test: /\b(sell|selling|become a (seller|farmer)|list my|i'?m a farmer|vendor|farmer account)\b/,
    build: () => ({
      intent: "help",
      reply:
        "Love that! You can sell on DiGiFaMaR by creating a farmer account — set up your farm " +
        "profile, list products, and start receiving escrow-protected orders. It only takes a few " +
        "minutes.",
      products: [],
      links: [
        { label: "Become a seller", to: "/signup/farmer" },
        { label: "Farm Hacks & selling tips", to: "/hacks" },
      ],
      suggestions: ["How does escrow work?", "What are the fees?"],
    }),
  },
  {
    test: /\b(loan|loans|lending|financing|finance|credit|capital)\b/,
    build: () => ({
      intent: "help",
      reply:
        "DiGiFaMaR offers farmer lending to help growers fund seeds, equipment, and expansion. " +
        "You can explore financing options from the lending hub.",
      products: [],
      links: [{ label: "Explore lending", to: "/lending" }],
      suggestions: ["How do I become a seller?", "Show me what's fresh"],
    }),
  },
];

const GREETING = /^(hi|hello|hey|yo|howdy|hiya|good (morning|afternoon|evening|day)|greetings)\b/;

const DEFAULT_SUGGESTIONS = [
  "Find organic vegetables under $6",
  "What's the freshest right now?",
  "How does escrow work?",
  "Recommend something for a salad",
];

function greetingResult(): AssistantResult {
  return {
    intent: "greeting",
    reply:
      "Hi! I'm your DiGiFaMaR assistant. I can help you find fresh products from local farms, " +
      "explain how escrow-protected ordering works, or point you to the right place. What are you " +
      "looking for?",
    products: [],
    links: [{ label: "Browse the market", to: "/market" }],
    suggestions: DEFAULT_SUGGESTIONS,
  };
}

function recommendResult(parsed: ParsedQuery, catalog: Product[]): AssistantResult {
  // Prefer any parsed filters, but always rank by a freshness×rating quality score.
  const pool = searchProducts({ ...parsed, sort: "relevance", keywords: parsed.keywords }, catalog);
  const ranked = (pool.length ? pool : catalog.filter((p) => p.stock > 0))
    .slice()
    .sort((a, b) => b.freshnessScore * b.rating - a.freshnessScore * a.rating)
    .slice(0, 4);

  return {
    intent: "recommend",
    reply: ranked.length
      ? "Here are a few standouts right now — top-rated and freshly harvested:"
      : "I couldn't find a great match, but the full market is worth a browse.",
    products: ranked,
    links: [{ label: "Browse everything", to: "/market" }],
    suggestions: ["Show me organic options", "Find the cheapest greens"],
  };
}

function searchResult(text: string, parsed: ParsedQuery, catalog: Product[]): AssistantResult {
  const results = searchProducts(parsed, catalog);
  const filterText = describeFilters(parsed);
  const kw = parsed.keywords.join(" ");

  if (results.length === 0) {
    return {
      intent: "search",
      reply: `I couldn't find anything matching ${
        kw || filterText || `"${text.trim()}"`
      }. Try broadening your search or browse the full market.`,
      products: [],
      links: [{ label: "Browse the market", to: "/market" }],
      suggestions: DEFAULT_SUGGESTIONS,
    };
  }

  const subject = [kw, filterText].filter(Boolean).join(", ") || "fresh picks";
  return {
    intent: "search",
    reply: `Found ${results.length} ${results.length === 1 ? "match" : "matches"} for ${subject}:`,
    products: results,
    links: [{ label: "See all in the market", to: "/market" }],
    suggestions: ["Only organic", "Cheapest first", "How does escrow work?"],
  };
}

const RECOMMEND_RE =
  /\b(recommend|suggest|ideas?|what should i|what'?s good|for (a )?(salad|dinner|breakfast|lunch|snack))\b/;
const SEARCH_HINT_RE =
  /\b(find|show|looking|want|need|buy|cheap|cheapest|fresh|organic|under|over|price|\$)\b/;

/**
 * Turn a natural-language message into a structured assistant response.
 * Order of precedence: greeting → help topics → recommendation → search →
 * fallback (which still attempts a catalog search before giving up).
 */
export function respond(text: string, catalog: Product[] = allProducts): AssistantResult {
  const trimmed = text.trim();
  if (!trimmed) return greetingResult();

  const lower = normalize(trimmed);
  if (GREETING.test(lower) && lower.split(/\s+/).length <= 4) return greetingResult();

  for (const topic of HELP_TOPICS) {
    if (topic.test.test(lower)) return topic.build();
  }

  const parsed = parseQuery(trimmed);

  if (RECOMMEND_RE.test(lower)) return recommendResult(parsed, catalog);

  const hasFilters =
    parsed.keywords.length > 0 ||
    parsed.category != null ||
    parsed.organic ||
    parsed.priceMin != null ||
    parsed.priceMax != null;

  if (SEARCH_HINT_RE.test(lower) || hasFilters) {
    return searchResult(trimmed, parsed, catalog);
  }

  // Fallback: try a search anyway; if nothing, offer guidance.
  const attempt = searchResult(trimmed, parsed, catalog);
  if (attempt.products.length > 0) return attempt;

  return {
    intent: "fallback",
    reply:
      "I can help you find fresh products, compare prices, or explain how DiGiFaMaR's " +
      "escrow-protected ordering works. Try asking for something like \u201corganic tomatoes " +
      "under $6\u201d or \u201chow does escrow work?\u201d",
    products: [],
    links: [{ label: "Browse the market", to: "/market" }],
    suggestions: DEFAULT_SUGGESTIONS,
  };
}
