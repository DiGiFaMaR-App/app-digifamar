/**
 * Orders — client-side data access (self-contained mobile app).
 *
 * Buyers create and read orders directly against Supabase. Integrity is
 * enforced in the database, not the client:
 *   - RLS restricts INSERT to `buyer_id = auth.uid()` and SELECT to the buyer,
 *     the listing's farmer, or an admin.
 *   - The `validate_order_insert` BEFORE trigger recomputes `farmer_id`,
 *     `status`, `subtotal_cents`, the platform/escrow fees and `total_cents`
 *     from the referenced listing, so a client can only ever supply
 *     `listing_id`, `qty`, `buyer_id` and `shipping_address`.
 *
 * Escrow funding (Escrow.com) needs a server secret and is handled by the
 * Phase 2b Edge Function; freshly created orders start in `pending`.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { OrderStatus } from "./dto";
import { notifyOrderStatus, type OrderNotifyStatus } from "@/lib/notifications/notify-order";

export type OrderRow = Tables<"orders">;

export type CartLine = { slug: string; qty: number };

/**
 * Delivery details captured at checkout and persisted on every order row so
 * both parties work from the same fulfilment instructions.
 */
export type DeliveryDetails = {
  method: string;
  feeCents: number;
  contactPhone?: string | null;
  notes?: string | null;
};

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Please sign in to complete checkout.");
  return data.user.id;
}

/**
 * Create one order row per cart line (an order is a single listing purchase in
 * this schema). Cart lines reference listings by slug, so resolve them to the
 * active listing ids first, then let the DB trigger price each order.
 */
export async function createOrdersFromCart(
  lines: CartLine[],
  shippingAddress: string,
  delivery: DeliveryDetails = { method: "standard", feeCents: 0 },
): Promise<OrderRow[]> {
  if (lines.length === 0) throw new Error("Your cart is empty.");
  const buyerId = await requireUserId();

  const slugs = [...new Set(lines.map((l) => l.slug))];
  const { data: listings, error: listErr } = await supabase
    .from("listings")
    .select("id, slug, farmer_id")
    .in("slug", slugs)
    .eq("status", "active");
  if (listErr) throw listErr;

  const bySlug = new Map((listings ?? []).map((l) => [l.slug, l]));
  const rows = lines.map((line) => {
    const listing = bySlug.get(line.slug);
    if (!listing) throw new Error(`This item is no longer available: ${line.slug}`);
    // `farmer_id` is re-derived from the listing by the DB trigger; we pass it
    // (the same value) to satisfy the generated NOT NULL insert type.
    return {
      buyer_id: buyerId,
      farmer_id: listing.farmer_id,
      listing_id: listing.id,
      qty: line.qty,
      shipping_address: shippingAddress,
      delivery_method: delivery.method,
      // Recorded for the fulfilment record only; the DB trigger owns the
      // subtotal / platform fee / escrow fee / total math.
      delivery_fee_cents: Math.round(delivery.feeCents / lines.length),
      delivery_contact_phone: delivery.contactPhone?.trim() || null,
      delivery_notes: delivery.notes?.trim() || null,
    };
  });

  const { data, error } = await supabase.from("orders").insert(rows).select();
  if (error) throw error;
  // In-app notifications are written by a DB trigger; add email/SMS.
  await Promise.all((data ?? []).map((o) => notifyOrderStatus(o.id, "placed")));
  return data ?? [];
}

/** Orders visible to the caller (own buys + own sales + admin), newest first. */
export async function listMyOrders(): Promise<OrderRow[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getOrder(id: string): Promise<OrderRow | null> {
  const { data, error } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

/** Status transitions are gated by RLS + the order-update trigger. */
export async function setOrderStatus(id: string, status: OrderStatus): Promise<OrderRow> {
  const { data, error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  await notifyOrderStatus(id, status as OrderNotifyStatus);
  return data;
}
