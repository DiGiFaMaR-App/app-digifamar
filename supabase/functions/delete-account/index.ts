// Delete-account Edge Function (Play Store data-deletion obligation).
//
// Ported from src/lib/users/delete-account.functions.ts. Requires the service
// role to wipe the auth user (cascades to profile/roles/wallet/chat). Refuses
// while the user has escrow money mid-flight.
import { corsHeaders, errorResponse, jsonResponse } from "../_shared/cors.ts";
import { adminClient, getUser } from "../_shared/supabase.ts";

const sb = adminClient();
const OPEN_STATES = [
  "escrow_funded",
  "awaiting_delivery",
  "shipped",
  "delivered",
  "inspection",
  "disputed",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);
  try {
    const user = await getUser(req);
    if (!user) return errorResponse("Unauthorized", 401);
    const body = await req.json().catch(() => ({}));
    if (body.confirmation !== "DELETE") return errorResponse("Confirmation required", 400);

    const { data: openOrders } = await sb
      .from("orders")
      .select("id")
      .or(`buyer_id.eq.${user.id},farmer_id.eq.${user.id}`)
      .in("status", OPEN_STATES)
      .limit(1);
    if (openOrders && openOrders.length > 0) {
      return errorResponse(
        "You have open escrow orders. Finish or dispute them before deleting your account.",
        409,
      );
    }

    await sb.from("listings").delete().eq("farmer_id", user.id);
    const { error } = await sb.auth.admin.deleteUser(user.id);
    if (error) return errorResponse(error.message, 400);
    return jsonResponse({ ok: true });
  } catch (e) {
    return errorResponse((e as Error)?.message ?? "delete-account error", 400);
  }
});
