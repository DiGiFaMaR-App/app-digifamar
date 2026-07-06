/**
 * Catalog — React Query hooks that surface live Supabase listings to the UI.
 *
 * Live listing rows carry the authoritative commercial fields (title, price,
 * quantity, availability). The presentational decoration (imagery, freshness
 * grade, delivery window, rating) still lives in the bundled mock catalog and
 * is merged in by slug until those fields are modelled in the database. This
 * keeps the rich marketplace UI intact while the data source becomes real.
 */
import { useQuery } from "@tanstack/react-query";
import { fetchActiveListings, fetchListingBySlug, type ListingRow } from "./catalog";
import { getProduct, products as mockProducts, type Product } from "@/lib/mock-data";

const FALLBACK_IMAGE = mockProducts[0].image;

export function listingToProduct(listing: ListingRow): Product {
  const base = getProduct(listing.slug);
  return {
    id: listing.slug,
    name: listing.title,
    variety: base?.variety,
    farmId: base?.farmId ?? "",
    category: listing.category,
    price: listing.price_cents / 100,
    unit: listing.unit,
    image: base?.image ?? FALLBACK_IMAGE,
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
    queryFn: async (): Promise<Product[]> => {
      const rows = await fetchActiveListings();
      return rows.map(listingToProduct);
    },
  });
}

export function useCatalogProduct(slug: string) {
  return useQuery({
    queryKey: ["catalog", "listing", slug],
    queryFn: async (): Promise<Product | null> => {
      const row = await fetchListingBySlug(slug);
      return row ? listingToProduct(row) : null;
    },
  });
}
