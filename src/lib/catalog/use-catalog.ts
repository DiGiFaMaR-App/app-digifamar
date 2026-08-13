/**
 * Catalog — React Query hooks that surface live Supabase listings to the UI.
 *
 * Production rule: real `listings` rows always win. The bundled sample catalog
 * is only used when the marketplace has no live listings at all, and in that
 * case the hooks report `source: "demo"` so every surface can label the data as
 * sample data instead of passing it off as real farmers and inventory.
 *
 * When a live listing happens to share a slug with a sample product, the sample
 * row is used purely for presentational decoration (photo, freshness grade,
 * delivery window); price, stock and availability always come from the database.
 */
import { useQuery } from "@tanstack/react-query";
import { fetchActiveListings, fetchListingBySlug, type ListingRow } from "./catalog";
import { getProduct, products as mockProducts, type Product } from "@/lib/mock-data";

const FALLBACK_IMAGE = mockProducts[0].image;

export type CatalogSource = "live" | "demo";

export type CatalogList = { products: Product[]; source: CatalogSource };
export type CatalogItem = { product: Product | null; source: CatalogSource };

export function listingToProduct(listing: ListingRow): Product {
  const base = getProduct(listing.slug);
  return {
    id: listing.slug,
    name: listing.title,
    variety: base?.variety,
    // Live listings are owned by a real farmer account; fall back to the
    // sample farm only for the demo catalog.
    farmId: base?.farmId ?? listing.farmer_id,
    category: listing.category,
    price: listing.price_cents / 100,
    unit: listing.unit,
    image: listing.images?.[0] ?? base?.image ?? FALLBACK_IMAGE,
    delivery: base?.delivery ?? "48h",
    organic: base?.organic,
    rating: base?.rating ?? 5,
    reviews: base?.reviews ?? 0,
    stock: listing.qty_available,
    freshnessGrade: base?.freshnessGrade ?? "A",
    freshnessScore: base?.freshnessScore ?? 9,
    description: listing.description ?? base?.description ?? "",
  };
}

export function useCatalogProducts() {
  return useQuery({
    queryKey: ["catalog", "listings"],
    queryFn: async (): Promise<CatalogList> => {
      const rows = await fetchActiveListings();
      if (rows.length > 0) {
        return { products: rows.map(listingToProduct), source: "live" };
      }
      return { products: mockProducts, source: "demo" };
    },
  });
}

export function useCatalogProduct(slug: string) {
  return useQuery({
    queryKey: ["catalog", "listing", slug],
    queryFn: async (): Promise<CatalogItem> => {
      const row = await fetchListingBySlug(slug);
      if (row && row.status === "active") {
        return { product: listingToProduct(row), source: "live" };
      }
      return { product: getProduct(slug) ?? null, source: "demo" };
    },
  });
}
