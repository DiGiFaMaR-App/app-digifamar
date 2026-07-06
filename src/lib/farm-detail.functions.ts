import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type FarmDetailListing = {
  id: string;
  title: string;
  slug: string;
  category: string;
  price_cents: number;
  unit: string;
  images: string[];
};

export type FarmDetail = {
  user_id: string;
  farm_name: string;
  description: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  certifications: string[];
  verification_status: string;
  listings: FarmDetailListing[];
};

export const getFarmDetail = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ userId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data }): Promise<FarmDetail | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: farm, error: farmErr } = await supabaseAdmin
      .from("farmer_profiles")
      .select(
        "user_id, farm_name, description, city, state, zip, certifications, verification_status",
      )
      .eq("user_id", data.userId)
      .maybeSingle();
    if (farmErr) throw new Error(farmErr.message);
    if (!farm) return null;

    const { data: listingRows, error: listErr } = await supabaseAdmin
      .from("listings")
      .select("id, title, slug, category, price_cents, unit, images")
      .eq("farmer_id", data.userId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(24);
    if (listErr) throw new Error(listErr.message);

    return {
      ...(farm as Omit<FarmDetail, "listings">),
      listings: (listingRows ?? []) as FarmDetailListing[],
    };
  });
