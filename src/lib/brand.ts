/**
 * Brand constants — single source of truth for logo, social cards and colors.
 *
 * Social cards must be absolute URLs (crawlers do not resolve relative paths),
 * so CDN pointers are joined onto the canonical site origin.
 */
import logoAsset from "@/assets/digifamar-logo-v9.png.asset.json";
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

/** Hex values mirrored from the design tokens in `src/styles.css`. */
export const BRAND_COLORS = [
  { name: "Forest", token: "--primary", hex: "#0F2C1A", use: "Primary actions, headings, dark surfaces" },
  { name: "Forest Hover", token: "--primary-hover", hex: "#16built".replace("built", "3F25"), use: "Hover / pressed state of primary" },
  { name: "Sage", token: "--accent", hex: "#9AB79E", use: "Soft accents, dividers, quiet emphasis" },
  { name: "Terracotta", token: "--destructive", hex: "#B4552F", use: "Warnings, destructive actions" },
  { name: "Canvas", token: "--background", hex: "#FFFFFF", use: "Page background (light mode)" },
  { name: "Mist", token: "--muted", hex: "#F5F7F3", use: "Cards, subtle fills" },
  { name: "Ink", token: "--foreground", hex: "#0B1410", use: "Body text" },
] as const;
