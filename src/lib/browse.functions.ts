/**
 * Browse/search — CLIENT module (self-contained app).
 *
 * Queries Supabase directly from the browser: the public `public_farms` view
 * (safe farm columns; no street address) and the public `listings` table
 * ("Active listings are public" RLS). Distance filtering/sorting is done
 * client-side with haversine. No server function, no web host.
 */
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

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

function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.7613;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export const searchBrowse = async ({ data }: { data: unknown }): Promise<BrowseResults> => {
  const input = inputSchema.parse(data);
  const q = input.q.trim();
  const page = input.page;
  const offset = (page - 1) * PAGE_SIZE;
  const hasOrigin = typeof input.originLat === "number" && typeof input.originLng === "number";
  const safe = q.replace(/[%_\\]/g, (m) => `\\${m}`);
  const like = `%${safe}%`;

  // ── Farms (public view) ─────────────────────────────────────────
  const farmsBase = supabase
    .from("public_farms")
    .select(
      "user_id, farm_name, description, city, state, zip, lat, lng, certifications, verification_status",
      { count: "exact" },
    );
  const farmsQuery = q
    ? farmsBase.or(
        `farm_name.ilike.${like},city.ilike.${like},state.ilike.${like},zip.ilike.${like}`,
      )
    : farmsBase;
  const farmsRangeStart = hasOrigin ? 0 : offset;
  const farmsRangeEnd = hasOrigin ? 499 : offset + PAGE_SIZE - 1;
  const {
    data: farmRows,
    count: farmCount,
    error: farmErr,
  } = await farmsQuery
    .order("verification_status", { ascending: true })
    .order("farm_name", { ascending: true })
    .range(farmsRangeStart, farmsRangeEnd);
  if (farmErr) throw new Error(farmErr.message);

  type FarmRow = BrowseFarm & { lat: number | null; lng: number | null };
  let farms: BrowseFarm[] = ((farmRows ?? []) as FarmRow[]).map((r) => {
    const distance_mi =
      hasOrigin && r.lat != null && r.lng != null
        ? haversineMiles(input.originLat!, input.originLng!, r.lat, r.lng)
        : null;
    const { lat: _lat, lng: _lng, ...rest } = r;
    void _lat;
    void _lng;
    return { ...rest, certifications: rest.certifications ?? [], distance_mi };
  });
  let totalFarms = farmCount ?? farms.length;
  if (hasOrigin) {
    farms = farms.filter((f) => f.distance_mi != null && f.distance_mi <= input.maxMiles);
    totalFarms = farms.length;
    farms.sort((a, b) => (a.distance_mi ?? 999) - (b.distance_mi ?? 999));
    farms = farms.slice(offset, offset + PAGE_SIZE);
  }

  // ── Listings (public) ───────────────────────────────────────────
  const listingsBase = supabase
    .from("listings")
    .select("id, farmer_id, title, slug, category, price_cents, unit, images, lat, lng", {
      count: "exact",
    })
    .eq("status", "active");
  const listingsQuery = q
    ? listingsBase.or(`title.ilike.${like},category.ilike.${like}`)
    : listingsBase;
  const listingsRangeStart = hasOrigin ? 0 : offset;
  const listingsRangeEnd = hasOrigin ? 499 : offset + PAGE_SIZE - 1;
  const {
    data: listingRows,
    count: listingCount,
    error: listingErr,
  } = await listingsQuery
    .order("created_at", { ascending: false })
    .range(listingsRangeStart, listingsRangeEnd);
  if (listingErr) throw new Error(listingErr.message);

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
  const rows = (listingRows ?? []) as ListingRow[];

  const farmerIds = Array.from(new Set(rows.map((r) => r.farmer_id)));
  let farmNameMap = new Map<string, string>();
  if (farmerIds.length) {
    const { data: farmsForListings } = await supabase
      .from("public_farms")
      .select("user_id, farm_name")
      .in("user_id", farmerIds);
    farmNameMap = new Map(
      (farmsForListings ?? [])
        .filter((f): f is { user_id: string; farm_name: string } => !!f.user_id && !!f.farm_name)
        .map((f) => [f.user_id, f.farm_name] as [string, string]),
    );
  }

  let listings: BrowseListing[] = rows.map((r) => {
    const distance_mi =
      hasOrigin && r.lat != null && r.lng != null
        ? haversineMiles(input.originLat!, input.originLng!, r.lat, r.lng)
        : null;
    const { lat: _lat, lng: _lng, ...rest } = r;
    void _lat;
    void _lng;
    return {
      ...rest,
      images: rest.images ?? [],
      farm_name: farmNameMap.get(r.farmer_id) ?? null,
      distance_mi,
    };
  });
  let totalListings = listingCount ?? listings.length;
  if (hasOrigin) {
    listings = listings.filter((l) => l.distance_mi != null && l.distance_mi <= input.maxMiles);
    totalListings = listings.length;
    listings.sort((a, b) => (a.distance_mi ?? 999) - (b.distance_mi ?? 999));
    listings = listings.slice(offset, offset + PAGE_SIZE);
  }

  return { farms, listings, totalFarms, totalListings, page, pageSize: PAGE_SIZE };
};
