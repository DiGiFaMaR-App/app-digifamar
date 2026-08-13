/**
 * Admin-only go-live readiness report — thin server-function wrapper.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { ReadinessReport } from "./readiness.server";

export type { ReadinessCheck, ReadinessReport, ReadinessStatus } from "./readiness.server";

export const getGoLiveReadinessFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ReadinessReport> => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Admins only");

    const { buildReport, collectConfigChecks, supplyChecks } = await import("./readiness.server");

    const [listings, farmers, payouts] = await Promise.all([
      context.supabase
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
      context.supabase
        .from("farmer_profiles")
        .select("user_id", { count: "exact", head: true })
        .eq("verification_status", "verified"),
      context.supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("stripe_account_status", "active"),
    ]);

    const { stripeEnv, checks } = collectConfigChecks();
    return buildReport(stripeEnv, [
      ...checks,
      ...supplyChecks({
        activeListings: listings.count ?? 0,
        verifiedFarmers: farmers.count ?? 0,
        payoutReadyFarmers: payouts.count ?? 0,
      }),
    ]);
  });
