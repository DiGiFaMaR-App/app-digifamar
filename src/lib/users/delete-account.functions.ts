/**
 * Delete-account server function — required by the Play Store data-deletion
 * obligation. Removes the user's auth row, which cascades to profile, roles,
 * conversations, messages, wallet, and disputes. Listings without sold/active
 * orders are removed. Order + ledger rows tied to closed transactions are
 * retained for financial-record compliance (the buyer/farmer FK is preserved
 * but the auth user is gone, so personal info is no longer linkable).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ConfirmDto = z.object({ confirmation: z.literal("DELETE") });

export const deleteMyAccountFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => ConfirmDto.parse(input))
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Refuse if the user has held escrow money waiting to settle.
    const { data: openOrders } = await supabaseAdmin
      .from("orders")
      .select("id")
      .or(`buyer_id.eq.${context.userId},farmer_id.eq.${context.userId}`)
      .in("status", [
        "escrow_funded",
        "awaiting_delivery",
        "shipped",
        "delivered",
        "inspection",
        "disputed",
      ])
      .limit(1);
    if (openOrders && openOrders.length > 0) {
      throw new Error(
        "You have open escrow orders. Finish or dispute them before deleting your account.",
      );
    }

    // Remove paused/active listings owned by the user.
    await supabaseAdmin.from("listings").delete().eq("farmer_id", context.userId);

    // Wipe the auth user — cascades to profiles, user_roles, wallets,
    // conversations, messages, delivery_confirmations, inspection_windows.
    const { error } = await supabaseAdmin.auth.admin.deleteUser(context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
