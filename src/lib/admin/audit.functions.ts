/**
 * Audit log reader — CLIENT module (admin only via RLS).
 * Lists recent entries from `public.audit_logs`. Shape preserved.
 */
import { supabase } from "@/integrations/supabase/client";

type ListInput = {
  limit?: number;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  actorId?: string;
};

export const listAuditLogsFn = async ({ data }: { data?: ListInput } = {}) => {
  const d = data ?? {};
  let q = supabase
    .from("audit_logs")
    .select(
      "id, actor_id, actor_role, action, resource_type, resource_id, outcome, metadata, ip, user_agent, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(d.limit ?? 100);
  if (d.action) q = q.eq("action", d.action);
  if (d.resourceType) q = q.eq("resource_type", d.resourceType);
  if (d.resourceId) q = q.eq("resource_id", d.resourceId);
  if (d.actorId) q = q.eq("actor_id", d.actorId);
  const { data: rows, error } = await q;
  if (error) throw new Error(error.message);
  return rows ?? [];
};
