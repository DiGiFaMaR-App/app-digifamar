/**
 * Server function that sends the buyer an SMS + email when the farmer posts an
 * order tracking update. Only the order's farmer may trigger it.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  orderId: z.string().uuid(),
  status: z.enum(["placed", "packed", "shipped", "delivered"]),
  note: z.string().max(280).optional(),
  carrier: z.string().max(60).optional(),
  trackingNumber: z.string().max(60).optional(),
});

export const notifyBuyerOfOrderStatusFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => Input.parse(input))
  .handler(async ({ data, context }) => {
    // The caller must be the farmer on this order (RLS-scoped read).
    const { data: order } = await context.supabase
      .from("orders")
      .select("id, buyer_id, farmer_id")
      .eq("id", data.orderId)
      .maybeSingle();

    if (!order || order.farmer_id !== context.userId) {
      return { ok: false as const, reason: "forbidden" };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: buyer }, { data: farm }] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("email, phone")
        .eq("id", order.buyer_id)
        .maybeSingle(),
      supabaseAdmin
        .from("farmer_profiles")
        .select("farm_name")
        .eq("user_id", order.farmer_id)
        .maybeSingle(),
    ]);

    const { notifyBuyerOfStatus } = await import("./order-status.server");
    const result = await notifyBuyerOfStatus({
      orderId: data.orderId,
      status: data.status,
      buyerPhone: buyer?.phone ?? null,
      buyerEmail: buyer?.email ?? null,
      farmName: farm?.farm_name ?? null,
      note: data.note ?? null,
      carrier: data.carrier ?? null,
      trackingNumber: data.trackingNumber ?? null,
    });

    return { ok: true as const, ...result };
  });
