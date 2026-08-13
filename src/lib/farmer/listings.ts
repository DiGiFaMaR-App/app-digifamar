/**
 * Farmer listings — real marketplace CRUD.
 *
 * The farmer dashboard previously wrote a view-model shape (`name`,
 * `price_per_unit`, `is_active`, `image_url`) that does not exist on the
 * `listings` table, so every publish attempt failed and the marketplace stayed
 * empty. This module is the single mapping layer between the dashboard's
 * view-model and the authoritative `listings` schema:
 *
 *   title, slug, category, price_cents, unit, qty_available, images[], status
 *
 * Images are uploaded to the private `product-images` bucket under
 * `<user id>/…` (enforced by storage RLS) and stored as long-lived signed URLs
 * so the public marketplace, OG cards and the mobile app can all render them.
 */
import { supabase } from "@/integrations/supabase/client";

/** Ten years — the marketplace needs stable image URLs for public listings. */
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 365 * 10;

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export interface FarmerListing {
  id: string;
  farmer_id: string;
  name: string;
  slug: string;
  category: string;
  price_per_unit: number;
  unit: string;
  description: string | null;
  is_active: boolean;
  image_url: string | null;
  stock: number;
}

export interface ListingDraft {
  name: string;
  category: string;
  price_per_unit: string;
  unit: string;
  stock: string;
  description: string;
  is_active: boolean;
  image_url: string;
}

export const emptyListingDraft: ListingDraft = {
  name: "",
  category: "vegetables",
  price_per_unit: "",
  unit: "lb",
  stock: "1",
  description: "",
  is_active: true,
  image_url: "",
};

type ListingRow = {
  id: string;
  farmer_id: string;
  title: string;
  slug: string;
  category: string;
  price_cents: number;
  unit: string;
  qty_available: number;
  description: string | null;
  images: string[] | null;
  status: string;
};

function toViewModel(row: ListingRow): FarmerListing {
  return {
    id: row.id,
    farmer_id: row.farmer_id,
    name: row.title,
    slug: row.slug,
    category: row.category,
    price_per_unit: (Number(row.price_cents) || 0) / 100,
    unit: row.unit,
    description: row.description,
    is_active: row.status === "active",
    image_url: row.images?.[0] ?? null,
    stock: Number(row.qty_available) || 0,
  };
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Slugs are unique across the marketplace, so suffix on collision. */
async function uniqueSlug(base: string): Promise<string> {
  const root = slugify(base) || "listing";
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = attempt === 0 ? root : `${root}-${Math.random().toString(36).slice(2, 6)}`;
    const { data } = await supabase.from("listings").select("id").eq("slug", candidate).maybeSingle();
    if (!data) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}

export async function fetchFarmerListings(farmerId: string): Promise<FarmerListing[]> {
  const { data, error } = await supabase
    .from("listings")
    .select("id, farmer_id, title, slug, category, price_cents, unit, qty_available, description, images, status")
    .eq("farmer_id", farmerId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as ListingRow[]).map(toViewModel);
}

export function validateListingDraft(draft: ListingDraft): string | null {
  if (!draft.name.trim()) return "Product name is required";
  const price = parseFloat(draft.price_per_unit);
  if (!Number.isFinite(price) || price <= 0) return "Enter a price greater than $0.00";
  const stock = parseInt(draft.stock, 10);
  if (!Number.isFinite(stock) || stock < 0) return "Enter the quantity available";
  if (!draft.category) return "Pick a category";
  if (!draft.unit) return "Pick a unit";
  return null;
}

export async function saveFarmerListing(
  farmerId: string,
  draft: ListingDraft,
  editId?: string,
): Promise<FarmerListing> {
  const payload = {
    title: draft.name.trim(),
    category: draft.category,
    price_cents: Math.round(parseFloat(draft.price_per_unit) * 100),
    unit: draft.unit,
    qty_available: parseInt(draft.stock, 10) || 0,
    description: draft.description.trim() || null,
    images: draft.image_url.trim() ? [draft.image_url.trim()] : [],
    status: draft.is_active ? "active" : "paused",
  };

  if (editId) {
    const { data, error } = await supabase
      .from("listings")
      .update(payload)
      .eq("id", editId)
      .eq("farmer_id", farmerId)
      .select("id, farmer_id, title, slug, category, price_cents, unit, qty_available, description, images, status")
      .single();
    if (error) throw new Error(error.message);
    return toViewModel(data as ListingRow);
  }

  const slug = await uniqueSlug(payload.title);
  const { data, error } = await supabase
    .from("listings")
    .insert({ ...payload, slug, farmer_id: farmerId })
    .select("id, farmer_id, title, slug, category, price_cents, unit, qty_available, description, images, status")
    .single();
  if (error) throw new Error(error.message);
  return toViewModel(data as ListingRow);
}

export async function setListingActive(id: string, farmerId: string, active: boolean) {
  const { error } = await supabase
    .from("listings")
    .update({ status: active ? "active" : "paused" })
    .eq("id", id)
    .eq("farmer_id", farmerId);
  if (error) throw new Error(error.message);
}

/** Uploads a product photo and returns a durable signed URL. */
export async function uploadProductImage(farmerId: string, file: File): Promise<string> {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error("Use a JPG, PNG or WebP image");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Image must be 5 MB or smaller");
  }
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${farmerId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("product-images")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(error.message);

  const { data, error: signError } = await supabase.storage
    .from("product-images")
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (signError || !data?.signedUrl) throw new Error(signError?.message ?? "Could not link image");
  return data.signedUrl;
}
