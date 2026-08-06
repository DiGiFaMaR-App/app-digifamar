/**
 * Thin server-function wrappers for the lender portal (declarations only).
 *
 * None of these functions disburse funds, create a loan, or make an automated
 * credit decision. `decideLenderApplicationFn` records a human admin's choice;
 * `recomputeRecommendationsFn` refreshes informational scores.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const UUID = /^[0-9a-f-]{36}$/i;

export type DecideApplicationInput = {
  applicationId: string;
  status: "approved" | "rejected";
  reviewNotes?: string | null;
};

export const decideLenderApplicationFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: DecideApplicationInput) => {
    if (!UUID.test(data.applicationId)) throw new Error("Invalid application id");
    if (data.status !== "approved" && data.status !== "rejected") {
      throw new Error("Invalid decision");
    }
    const notes = (data.reviewNotes ?? "").trim().slice(0, 2000);
    return { ...data, reviewNotes: notes || null };
  })
  .handler(async ({ data, context }) => {
    const { assertAdmin, decideApplication } = await import("./lenders.server");
    await assertAdmin(context.userId);
    return decideApplication({ ...data, actorId: context.userId });
  });

export const recomputeRecommendationsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin, recomputeRecommendations } = await import("./lenders.server");
    await assertAdmin(context.userId);
    return recomputeRecommendations();
  });

/** Provisions the signed-in user's lender profile if an approved application matches. */
export const ensureLenderProfileFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { ensureLenderProfileForUser } = await import("./lenders.server");
    const email = (context.claims as { email?: string } | null)?.email ?? null;
    return ensureLenderProfileForUser(context.userId, email);
  });

export const getFarmerLendingDetailFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { farmerId: string }) => {
    if (!UUID.test(data.farmerId)) throw new Error("Invalid farmer id");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { assertLenderOrAdmin, getFarmerLendingDetail } = await import("./lenders.server");
    await assertLenderOrAdmin(context.userId);
    return getFarmerLendingDetail(data.farmerId);
  });
