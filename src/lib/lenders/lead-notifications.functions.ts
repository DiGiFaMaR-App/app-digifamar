/**
 * Thin server-function wrapper (see tss-serverfn-split): declarations only.
 * All logic lives in ./lead-notifications.server.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdminRole } from "@/lib/admin/authorization";
import { updateLeadStatusAndNotify } from "./lead-notifications.server";

export type UpdateLeadStatusInput = {
  kind: "lender_lead" | "farmer_loan_interest";
  id: string;
  status: string;
};

export const updateLeadStatusFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: UpdateLeadStatusInput) => {
    if (data.kind !== "lender_lead" && data.kind !== "farmer_loan_interest") {
      throw new Error("Invalid lead kind");
    }
    if (!/^[0-9a-f-]{36}$/i.test(data.id)) throw new Error("Invalid lead id");
    if (!["new", "contacted", "qualified", "archived"].includes(data.status)) {
      throw new Error("Invalid status");
    }
    return data;
  })
  .handler(async ({ data, context }) => {
    await assertAdminRole(context.userId);
    return updateLeadStatusAndNotify({ ...data, actorId: context.userId });
  });
