/**
 * Brand constants — single source of truth for logo, social cards and colors.
 *
 * Social cards must be absolute URLs (crawlers do not resolve relative paths),
 * so CDN pointers are joined onto the canonical site origin.
 */
import logoAsset from "@/assets/digifamar-logo-v10.png.asset.json";
import ogDefault from "@/assets/og-default.jpg.asset.json";
import ogMarket from "@/assets/og-market.jpg.asset.json";
import ogLenders from "@/assets/og-lenders.jpg.asset.json";

export const SITE_ORIGIN = "https://app.digifamar.com";

export const abs = (path: string) => (path.startsWith("http") ? path : `${SITE_ORIGIN}${path}`);

export const BRAND = {
  name: "DiGiFaMaR",
  tagline: "From American farms, direct to you",
  logoUrl: logoAsset.url,
  logoAbsoluteUrl: abs(logoAsset.url),
  faviconUrl: "/favicon.png",
  appleTouchIconUrl: "/apple-touch-icon.png",
  og: {
    default: abs(ogDefault.url),
    market: abs(ogMarket.url),
    lenders: abs(ogLenders.url),
  },
} as const;

/** Real, monitored DiGiFaMaR inboxes — the only addresses shown to users. */
export const BRAND_EMAILS = {
  /** Customer support, orders, escrow, privacy and legal questions. */
  support: "support@digifamar.com",
  /** General enquiries, press, partnerships, tips. */
  info: "info@digifamar.com",
  /** Lending programme, lender partners and farmer financing. */
  lenders: "lenders@digifamar.com",
} as const;

/** Hex values mirrored from the design tokens in `src/styles.css` (sampled from the logo). */
export const BRAND_COLORS = [
  { name: "Navy", token: "--primary", hex: "#0B2A6F", use: "Primary actions, headings, dark surfaces" },
  { name: "Navy Hover", token: "--primary-hover", hex: "#133A8C", use: "Hover / pressed state of primary" },
  { name: "Sky", token: "--primary-glow", hex: "#2B57C4", use: "Focus rings, glows, highlights" },
  { name: "Flag Red", token: "--destructive", hex: "#C8102E", use: "Alerts, destructive actions, hero CTA" },
  { name: "Field Green", token: "--leaf", hex: "#1E7A32", use: "Agriculture accents, success states" },
  { name: "Canvas", token: "--background", hex: "#FFFFFF", use: "Page background (light mode)" },
  { name: "Mist", token: "--muted", hex: "#F4F7FC", use: "Cards, subtle fills" },
  { name: "Ink", token: "--foreground", hex: "#0F1A33", use: "Body text" },
] as const;

