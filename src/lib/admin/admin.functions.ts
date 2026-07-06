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
      .select(
        "id, order_id, raised_by, reason, evidence_urls, state, resolution, created_at, resolved_at",
      )
      .in("state", ["open", "under_review"])
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const verifyAdminSessionFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdminRole(context.userId);
    return { ok: true };
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

export const listUsersFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ search: z.string().optional() }).parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const sb = await assertAdmin(context);
    let q = sb
      .from("profiles")
      .select("id, full_name, email, phone, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    const s = data.search?.trim();
    if (s) q = q.or(`email.ilike.%${s}%,full_name.ilike.%${s}%`);
    const { data: profiles, error } = await q;
    if (error) throw new Error(error.message);
    const ids = (profiles ?? []).map((p) => p.id);
    const { data: roles } = ids.length
      ? await sb.from("user_roles").select("user_id, role").in("user_id", ids)
      : { data: [] as Array<{ user_id: string; role: string }> };
    const roleMap = new Map<string, string[]>();
    (roles ?? []).forEach((r) => {
      const arr = roleMap.get(r.user_id) ?? [];
      arr.push(r.role);
      roleMap.set(r.user_id, arr);
    });
    return (profiles ?? []).map((p) => ({ ...p, roles: roleMap.get(p.id) ?? [] }));
  });

export const listAllOrdersFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({ status: z.string().optional(), limit: z.number().int().min(1).max(500).optional() })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const sb = await assertAdmin(context);
    let q = sb
      .from("orders")
      .select("id, buyer_id, farmer_id, listing_id, qty, total_cents, status, created_at")
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 200);
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const listAllListingsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ search: z.string().optional() }).parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const sb = await assertAdmin(context);
    let q = sb
      .from("listings")
      .select(
        "id, farmer_id, title, category, price_cents, unit, qty_available, status, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(300);
    const s = data.search?.trim();
    if (s) q = q.ilike("title", `%${s}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const setListingStatusFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({ id: z.string().uuid(), status: z.enum(["active", "paused", "removed"]) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const sb = await assertAdmin(context);
    const { logAudit } = await import("@/lib/audit/log.server");
    const { error } = await sb.from("listings").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit({
      actorId: context.userId,
      actorRole: "admin",
      action: "admin.listing.status",
      resourceType: "listing",
      resourceId: data.id,
      outcome: "success",
      metadata: { status: data.status },
    });
    return { ok: true };
  });

export const listAllConversationsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = await assertAdmin(context);
    const { data, error } = await sb
      .from("conversations")
      .select("id, buyer_id, farmer_id, product_id, last_message_at, created_at")
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listMessagesForConversationFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ conversationId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = await assertAdmin(context);
    const { logAudit } = await import("@/lib/audit/log.server");
    const { data: rows, error } = await sb
      .from("messages")
      .select("id, sender_id, content, flagged, created_at")
      .eq("conversation_id", data.conversationId)
      .order("created_at", { ascending: true })
      .limit(500);
    if (error) throw new Error(error.message);
    await logAudit({
      actorId: context.userId,
      actorRole: "admin",
      action: "admin.chat.read",
      resourceType: "conversation",
      resourceId: data.conversationId,
      outcome: "success",
    });
    return rows ?? [];
  });
