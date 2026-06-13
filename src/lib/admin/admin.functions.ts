/**
 * Admin module — server functions for the internal admin panel.
 * All callers must be in the `admin` role (checked server-side).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { userId: string }) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!data) throw new Error("Forbidden");
  return supabaseAdmin;
}

export const listOpenDisputesFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = await assertAdmin(context);
    const { data, error } = await sb
      .from("disputes")
      .select("id, order_id, raised_by, reason, evidence_urls, state, resolution, created_at, resolved_at")
      .in("state", ["open", "under_review"])
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listLedgerForOrderFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ orderId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = await assertAdmin(context);
    const { data: rows, error } = await sb
      .from("escrow_ledger")
      .select("*")
      .eq("order_id", data.orderId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const RoleUpdateDto = z.object({
  userId: z.string().uuid(),
  role: z.enum(["admin", "farmer", "buyer"]),
  action: z.enum(["grant", "revoke"]),
});

export const setUserRoleFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => RoleUpdateDto.parse(input))
  .handler(async ({ data, context }) => {
    const sb = await assertAdmin(context);
    if (data.action === "grant") {
      const { error } = await sb
        .from("user_roles")
        .insert({ user_id: data.userId, role: data.role });
      if (error && !error.message.toLowerCase().includes("duplicate")) {
        throw new Error(error.message);
      }
    } else {
      const { error } = await sb
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", data.role);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });
