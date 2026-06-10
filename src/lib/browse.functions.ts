import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const PAGE_SIZE = 20;
const DEFAULT_RADIUS_MI = 50;

const inputSchema = z.object({
  q: z.string().trim().max(200).default(""),
  page: z.number().int().min(1).max(500).default(1),
  originLat: z.number().min(-90).max(90).nullable().optional(),
  originLng: z.number().min(-180).max(180).nullable().optional(),
  maxMiles: z.number().min(1).max(500).default(DEFAULT_RADIUS_MI),
});

export type BrowseFarm = {
  user_id: string;
  farm_name: string;
  description: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  lat: number | null;
  lng: number | null;
  certifications: string[];
  verification_status: string;
  distance_mi: number | null;
};

export type BrowseListing = {
  id: string;
  farmer_id: string;
  title: string;
  slug: string;
  category: string;
  price_cents: number;
  unit: string;
  images: string[];
  lat: number | null;
  lng: number | null;
  farm_name: string | null;
  distance_mi: number | null;
};

export type BrowseResults = {
  farms: BrowseFarm[];
  listings: BrowseListing[];
  totalFarms: number;
  totalListings: number;
  page: number;
  pageSize: number;
};

function haversineMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 3958.7613; // Earth radius in miles
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export const searchBrowse = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<BrowseResults> => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const q = data.q.trim();
    const page = data.page;
    const offset = (page - 1) * PAGE_SIZE;
    const hasOrigin =
      typeof data.originLat === "number" && typeof data.originLng === "number";

    // Escape ILIKE wildcards.
    const safe = q.replace(/[%_\\]/g, (m) => `\\${m}`);
    const like = `%${safe}%`;

    // ── Farms ──────────────────────────────────────────────────────
    type FarmRow = {
      user_id: string;
      farm_name: string;
      description: string | null;
      city: string | null;
      state: string | null;
      zip: string | null;
      lat: number | null;
      lng: number | null;
      certifications: string[];
      verification_status: string;
    };

    // We don't have type generation for new columns yet — cast to any for new cols.
    const farmsBase = supabaseAdmin
      .from("farmer_profiles")
      .select(
        "user_id, farm_name, description, city, state, zip, lat, lng, certifications, verification_status",
        { count: "exact" },
      );
    const farmsQuery = q
      ? farmsBase.or(
          `farm_name.ilike.${like},city.ilike.${like},state.ilike.${like},zip.ilike.${like}`,
        )
      : farmsBase;

    // When we have an origin we need to compute distance, so pull a larger
    // window then paginate post-filter. Cap at 500.
    const farmsLimit = hasOrigin ? 500 : PAGE_SIZE;
    const farmsRangeStart = hasOrigin ? 0 : offset;
    const farmsRangeEnd = hasOrigin ? farmsLimit - 1 : offset + PAGE_SIZE - 1;

    const { data: farmRows, count: farmCount, error: farmErr } = await farmsQuery
      .order("verification_status", { ascending: true })
      .order("farm_name", { ascending: true })
      .range(farmsRangeStart, farmsRangeEnd);
    if (farmErr) throw new Error(farmErr.message);

    let farms: BrowseFarm[] = ((farmRows ?? []) as FarmRow[]).map((r) => ({
      ...r,
      distance_mi:
        hasOrigin && r.lat != null && r.lng != null
          ? haversineMiles(data.originLat!, data.originLng!, r.lat, r.lng)
          : null,
    }));

    let totalFarms = farmCount ?? farms.length;
    if (hasOrigin) {
      farms = farms.filter(
        (f) => f.distance_mi != null && f.distance_mi <= data.maxMiles,
      );
      totalFarms = farms.length;
      farms.sort((a, b) => (a.distance_mi ?? 999) - (b.distance_mi ?? 999));
      farms = farms.slice(offset, offset + PAGE_SIZE);
    }

    // ── Listings ───────────────────────────────────────────────────
    type ListingRow = {
      id: string;
      farmer_id: string;
      title: string;
      slug: string;
      category: string;
      price_cents: number;
      unit: string;
      images: string[];
      lat: number | null;
      lng: number | null;
    };

    const listingsBase = supabaseAdmin
      .from("listings")
      .select(
        "id, farmer_id, title, slug, category, price_cents, unit, images, lat, lng",
        { count: "exact" },
      )
      .eq("status", "active");
    const listingsQuery = q
      ? listingsBase.or(`title.ilike.${like},category.ilike.${like}`)
      : listingsBase;

    const listingsLimit = hasOrigin ? 500 : PAGE_SIZE;
    const listingsRangeStart = hasOrigin ? 0 : offset;
    const listingsRangeEnd = hasOrigin
      ? listingsLimit - 1
      : offset + PAGE_SIZE - 1;

    const { data: listingRows, count: listingCount, error: listingErr } =
      await listingsQuery
        .order("created_at", { ascending: false })
        .range(listingsRangeStart, listingsRangeEnd);
    if (listingErr) throw new Error(listingErr.message);

    const rows = (listingRows ?? []) as ListingRow[];

    // Look up farm names for these listings (single round-trip).
    const farmerIds = Array.from(new Set(rows.map((r) => r.farmer_id)));
    let farmNameMap = new Map<string, string>();
    if (farmerIds.length) {
      const { data: farmsForListings } = await supabaseAdmin
        .from("farmer_profiles")
        .select("user_id, farm_name")
        .in("user_id", farmerIds);
      farmNameMap = new Map(
        (farmsForListings ?? []).map((f: { user_id: string; farm_name: string }) => [
          f.user_id,
          f.farm_name,
        ]),
      );
    }

    let listings: BrowseListing[] = rows.map((r) => ({
      ...r,
      farm_name: farmNameMap.get(r.farmer_id) ?? null,
      distance_mi:
        hasOrigin && r.lat != null && r.lng != null
          ? haversineMiles(data.originLat!, data.originLng!, r.lat, r.lng)
          : null,
    }));

    let totalListings = listingCount ?? listings.length;
    if (hasOrigin) {
      listings = listings.filter(
        (l) => l.distance_mi != null && l.distance_mi <= data.maxMiles,
      );
      totalListings = listings.length;
      listings.sort(
        (a, b) => (a.distance_mi ?? 999) - (b.distance_mi ?? 999),
      );
      listings = listings.slice(offset, offset + PAGE_SIZE);
    }

    return {
      farms,
      listings,
      totalFarms,
      totalListings,
      page,
      pageSize: PAGE_SIZE,
    };
  });
