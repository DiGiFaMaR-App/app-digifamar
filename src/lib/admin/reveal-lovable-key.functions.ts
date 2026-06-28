/**
 * TEMPORARY admin-only reveal of LOVABLE_API_KEY so it can be copied into
 * GitHub Actions secrets. Delete this file (and the /admin/reveal-key route)
 * after the value is copied. The handler logs every access to audit_logs.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdminRole } from "@/lib/admin/authorization";

export const revealLovableApiKeyFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdminRole(context.userId);
    const value = process.env.LOVABLE_API_KEY;
    const { logAudit } = await import("@/lib/audit/log.server");
    await logAudit({
      actorId: context.userId,
      actorRole: "admin",
      action: "admin.lovable_api_key.reveal",
      resourceType: "secret",
      resourceId: "LOVABLE_API_KEY",
      metadata: { present: !!value, length: value?.length ?? 0 },
    });
    if (!value) throw new Error("LOVABLE_API_KEY is not set on the server");
    return { value };
  });
