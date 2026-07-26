/**
 * Catalog — React Query hooks that surface live Supabase listings to the UI.
 *
 * Uses the server-side `search_browse` RPC so distance, filtering, and farm
 * joins happen in Postgres. The returned products carry a real `farm` object
 * populated from `farmer_profiles` when the listing is matched.
 */
import { useQuery } from "@tanstack/react-query";
import {
  searchBrowse,
  type BrowseFarm,
  type BrowseListing,
} from "@/lib/browse.functions";
import { type Farm, type Product } from "@/lib/mock-data";

const FALLBACK_PRODUCT_IMAGE = "https://placehold.co/400x300?text=Product";
const FALLBACK_FARM_IMAGE = "https://placehold.co/400x300?text=Farm";

function buildFarm(browseFarm: BrowseFarm, distance: number | null): Farm {
  const location = [browseFarm.city, browseFarm.state]
    .filter((v): v is string => !!v)
    .join(", ") || "USA";

  const isOrganic = (browseFarm.certifications ?? []).some((c) =>
    c.toLowerCase().includes("organic"),
  );

  return {
    id: browseFarm.user_id,
    name: browseFarm.farm_name,
    location,
    state: browseFarm.state || "",
    rating: 0,
    reviews: 0,
    distance: distance ?? 0,
    lat: 0,
    lng: 0,
    verified: browseFarm.verification_status === "approved",
    image: FALLBACK_FARM_IMAGE,
    description: browseFarm.description || "",
    certifications: browseFarm.certifications ?? [],
    established: 0,
    totalSales: 0,
    topSeller: isOrganic && (browseFarm.certifications ?? []).length >= 2,
  };
}

export function listingToProduct(
  listing: BrowseListing,
  farms: BrowseFarm[],
): Product {
  const farm = farms.find((f) => f.user_id === listing.farmer_id);
  const isOrganic = (listing.category || "").toLowerCase().includes("organic")
    || (farm?.certifications ?? []).some((c) => c.toLowerCase().includes("organic"));

  return {
    id: listing.slug,
    name: listing.title,
    farmId: listing.farmer_id,
    farm: farm ? buildFarm(farm, listing.distance_mi) : undefined,
    category: listing.category,
    price: listing.price_cents / 100,
    unit: listing.unit,
    image: listing.images?.[0] ?? FALLBACK_PRODUCT_IMAGE,
    delivery: "48h",
    organic: isOrganic,
    rating: 0,
    reviews: 0,
    stock: listing.qty_available ?? 0,
    freshnessGrade: "A",
    freshnessScore: 9,
    description: listing.description || "",
  };
}

export function useCatalogProducts() {
  return useQuery({
    queryKey: ["catalog", "listings"],
    queryFn: async (): Promise<Product[]> => {
      const { listings, farms } = await searchBrowse({ data: {} });
      return listings.map((l) => listingToProduct(l, farms));
    },
  });
}

export function useCatalogProduct(slug: string) {
  return useQuery({
    queryKey: ["catalog", "listing", slug],
    queryFn: async (): Promise<Product | null> => {
      const { listings, farms } = await searchBrowse({ data: { q: slug } });
      const listing = listings.find((l) => l.slug === slug);
      return listing ? listingToProduct(listing, farms) : null;
    },
  });
}
