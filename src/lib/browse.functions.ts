/**
 * Browse/search — CLIENT module (self-contained app).
 *
 * Calls the server-side search_browse Postgres function. Distance,
 * filtering, and pagination all happen in the database; the client never
 * receives raw farmer/listing GPS coordinates.
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

export const searchBrowse = async ({ data }: { data: unknown }): Promise<BrowseResults> => {
  const input = inputSchema.parse(data);

  // Supabase generated types don't yet include the new RPC, so cast to any.
  const { data: result, error } = await (supabase as any).rpc("search_browse", {
    origin_lat: input.originLat ?? null,
    origin_lng: input.originLng ?? null,
    max_miles: input.maxMiles,
    q: input.q,
    page: input.page,
    page_size: PAGE_SIZE,
  });

  if (error) throw new Error(error.message);

  const typed = result as BrowseResults;
  return {
    farms: typed.farms.map((f) => ({
      ...f,
      certifications: f.certifications ?? [],
      distance_mi: f.distance_mi ?? null,
    })),
    listings: typed.listings.map((l) => ({
      ...l,
      images: l.images ?? [],
      farm_name: l.farm_name ?? null,
      distance_mi: l.distance_mi ?? null,
    })),
    totalFarms: typed.totalFarms ?? 0,
    totalListings: typed.totalListings ?? 0,
    page: typed.page ?? input.page,
    pageSize: typed.pageSize ?? PAGE_SIZE,
  };
};
