/**
 * Admin module — server functions for the internal admin panel.
 * All callers must be in the `admin` role (checked server-side).
 * Every mutating action writes an audit_logs entry.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdminRole } from "@/lib/admin/authorization";

async function assertAdmin(context: { userId: string }) {
  await assertAdminRole(context.userId);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
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
    const { logAudit } = await import("@/lib/audit/log.server");

    let outcome: "success" | "failure" = "success";
    let errorMsg: string | null = null;
    try {
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
    } catch (e) {
      outcome = "failure";
      errorMsg = e instanceof Error ? e.message : String(e);
      await logAudit({
        actorId: context.userId,
        actorRole: "admin",
        action: data.action === "grant" ? "admin.role.grant" : "admin.role.revoke",
        resourceType: "user_role",
        resourceId: data.userId,
        outcome,
        metadata: { role: data.role, error: errorMsg },
      });
      throw e;
    }

    await logAudit({
      actorId: context.userId,
      actorRole: "admin",
      action: data.action === "grant" ? "admin.role.grant" : "admin.role.revoke",
      resourceType: "user_role",
      resourceId: data.userId,
      outcome,
      metadata: { role: data.role },
    });
    return { ok: true };
  });
