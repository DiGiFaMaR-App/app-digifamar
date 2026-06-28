/**
 * Audit logger — server-only.
 *
 * Writes append-only entries to `public.audit_logs` via the service role.
 * Never throws into the caller's critical path: an audit failure must not
 * break the underlying action. We log to console and swallow.
 *
 * Categories used (action prefix):
 *   admin.*     — role grants, settings, dispute resolution
 *   escrow.*    — fund, release, refund, penalty
 *   otp.*       — generate, verify_success, verify_failure
 *   delivery.*  — confirm
 */

type Outcome = "success" | "failure" | "denied";

export interface AuditEntry {
  actorId: string | null;
  actorRole?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  outcome?: Outcome;
  metadata?: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
}

export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("audit_logs").insert({
      actor_id: entry.actorId,
      actor_role: entry.actorRole ?? null,
      action: entry.action,
      resource_type: entry.resourceType,
      resource_id: entry.resourceId ?? null,
      outcome: entry.outcome ?? "success",
      metadata: (entry.metadata ?? {}) as never,
      ip: entry.ip ?? null,
      user_agent: entry.userAgent ?? null,
    });
    if (error) {
      console.error("[audit] insert failed", error.message, entry);
    }
  } catch (e) {
    console.error("[audit] unexpected error", e, entry);
  }
}

/** Extract IP + user agent from a Request, when available. */
export function requestContext(request?: Request | null): { ip: string | null; userAgent: string | null } {
  if (!request) return { ip: null, userAgent: null };
  const h = request.headers;
  const ip =
    h.get("cf-connecting-ip") ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    null;
  const userAgent = h.get("user-agent");
  return { ip, userAgent };
}
