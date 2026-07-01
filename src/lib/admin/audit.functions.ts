/**
 * Audit log reader — admin only.
 * Lists recent entries from `public.audit_logs` with optional filters.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdminRole } from "@/lib/admin/authorization";

const ListInput = z.object({
  limit: z.number().int().min(1).max(500).optional(),
  action: z.string().trim().min(1).optional(),
  resourceType: z.string().trim().min(1).optional(),
  resourceId: z.string().trim().min(1).optional(),
  actorId: z.string().uuid().optional(),
});

export const listAuditLogsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => ListInput.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdminRole(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("audit_logs")
      .select(
        "id, actor_id, actor_role, action, resource_type, resource_id, outcome, metadata, ip, user_agent, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 100);
    if (data.action) q = q.eq("action", data.action);
    if (data.resourceType) q = q.eq("resource_type", data.resourceType);
    if (data.resourceId) q = q.eq("resource_id", data.resourceId);
    if (data.actorId) q = q.eq("actor_id", data.actorId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
