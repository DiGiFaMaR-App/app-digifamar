import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Check, Clock, Loader2, Lock, MapPin, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { verifyAdminSessionFn } from "@/lib/admin/admin.functions";
import { LenderCard, LenderShell, SectionTitle } from "./-ui";
import {
  fmtUSDFull,
  institutionTypeLabel,
  type LenderApplication,
  NAVY,
  pendingApplications,
} from "./-data";

export const Route = createFileRoute("/lenders/admin")({
  head: () => ({ meta: [{ title: "Lender Applications — Admin" }] }),
  // Server-side admin gate. RLS already blocks non-admin writes, but this
  // prevents non-admins from rendering the admin UI at all (no client-bypass
  // via React DevTools / state mutation).
  beforeLoad: async () => {
    try {
      await verifyAdminSessionFn();
    } catch {
      throw redirect({ to: "/lenders/login" });
    }
  },
  component: LenderAdmin,
});

type Access = "checking" | "admin" | "denied";

// Minimal typing for the not-yet-in-generated-types lender_applications table.
type RawApplication = {
  id: string;
  institution_name: string;
  institution_type: string;
  charter_number: string | null;
  lending_states: string[] | null;
  min_loan_amount: number;
  max_loan_amount: number;
  contact_name: string | null;
  contact_email: string;
  status: LenderApplication["status"];
  created_at: string;
};

function mapRow(r: RawApplication): LenderApplication {
  return {
    id: r.id,
    institutionName: r.institution_name,
    institutionType: r.institution_type,
    charterNumber: r.charter_number ?? "",
    lendingStates: r.lending_states ?? [],
    minLoanAmount: r.min_loan_amount,
    maxLoanAmount: r.max_loan_amount,
    contactName: r.contact_name ?? "",
    contactEmail: r.contact_email,
    status: r.status,
    submittedAt: (r.created_at ?? "").slice(0, 10),
  };
}

function LenderAdmin() {
  const [access, setAccess] = useState<Access>("checking");
  const [apps, setApps] = useState<LenderApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  // Verify the signed-in user holds the admin role before showing the queue.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const user = userData.user;
        if (!user) {
          if (!cancelled) setAccess("denied");
          return;
        }
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);
        const isAdmin = (roles ?? []).some((r: { role: string }) => r.role === "admin");
        if (!cancelled) setAccess(isAdmin ? "admin" : "denied");
      } catch {
        if (!cancelled) setAccess("denied");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load the pending queue once access is confirmed (mock fallback if unprovisioned).
  useEffect(() => {
    if (access !== "admin") return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await (
          supabase as unknown as {
            from: (t: string) => {
              select: (c: string) => {
                eq: (
                  k: string,
                  v: string,
                ) => {
                  order: (
                    c: string,
                    o: { ascending: boolean },
                  ) => Promise<{ data: RawApplication[] | null; error: unknown }>;
                };
              };
            };
          }
        )
          .from("lender_applications")
          .select("*")
          .eq("status", "pending")
          .order("created_at", { ascending: false });
        if (error) throw error;
        if (!cancelled) setApps(data && data.length ? data.map(mapRow) : pendingApplications);
      } catch {
        if (!cancelled) setApps(pendingApplications);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [access]);

  const decide = async (id: string, status: "approved" | "rejected") => {
    setActing(id);
    try {
      const { error } = await (
        supabase as unknown as {
          from: (t: string) => {
            update: (v: unknown) => {
              eq: (k: string, val: string) => Promise<{ error: { message: string } | null }>;
            };
          };
        }
      )
        .from("lender_applications")
        .update({ status, reviewed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw new Error(error.message);
      setApps((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      // Surface failures so genuine admins notice when writes fail (no silent swallow).
      toast.error("Decision failed", {
        description: err instanceof Error ? err.message : "Database rejected the update.",
      });
    } finally {
      setActing(null);
    }
  };

  const pendingCount = apps.length;
  const totalCeiling = useMemo(() => apps.reduce((s, a) => s + a.maxLoanAmount, 0), [apps]);

  if (access === "checking") {
    return (
      <LenderShell>
        <div className="grid place-items-center py-24 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p className="mt-2 text-sm">Verifying admin access…</p>
        </div>
      </LenderShell>
    );
  }

  if (access === "denied") {
    return (
      <LenderShell>
        <div className="mx-auto max-w-md pt-16 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rose-500/10">
            <Lock className="h-6 w-6 text-rose-400" />
          </span>
          <h1 className="mt-4 text-xl font-extrabold">Admin access required</h1>
          <p className="mt-2 text-sm text-slate-400">
            The lender application queue is restricted to DiGiFaMaR administrators. Sign in with an
            admin account to continue.
          </p>
          <Link
            to="/lenders/login"
            className="mt-5 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white"
            style={{ backgroundColor: NAVY.accent }}
          >
            Sign in
          </Link>
        </div>
      </LenderShell>
    );
  }

  return (
    <LenderShell>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-slate-500">
            <ShieldCheck className="h-3.5 w-3.5" /> Admin
          </p>
          <h1 className="text-2xl font-extrabold sm:text-3xl">Pending lender applications</h1>
        </div>
        <div className="flex gap-2">
          <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300">
            <Clock className="mr-1 inline h-3.5 w-3.5" />
            {pendingCount} pending
          </span>
          <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300">
            {fmtUSDFull(totalCeiling)} ceiling
          </span>
        </div>
      </div>

      <LenderCard className="mt-5 overflow-hidden">
        {loading ? (
          <div className="grid place-items-center py-20 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : apps.length === 0 ? (
          <div className="grid place-items-center py-20 text-center">
            <Check className="h-7 w-7 text-emerald-400" />
            <p className="mt-2 text-sm font-semibold">Queue clear</p>
            <p className="text-xs text-slate-500">No applications awaiting review.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-[11px] uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3 font-semibold">Institution</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Charter</th>
                  <th className="px-4 py-3 font-semibold">States</th>
                  <th className="px-4 py-3 font-semibold">Loan range</th>
                  <th className="px-4 py-3 font-semibold">Submitted</th>
                  <th className="px-4 py-3 text-right font-semibold">Decision</th>
                </tr>
              </thead>
              <tbody>
                {apps.map((a) => (
                  <tr
                    key={a.id}
                    className="border-b border-white/5 last:border-0 hover:bg-white/[0.03]"
                  >
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-100">{a.institutionName}</p>
                      <p className="text-xs text-slate-500">
                        {a.contactName ? `${a.contactName} · ` : ""}
                        {a.contactEmail}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {institutionTypeLabel(a.institutionType)}
                    </td>
                    <td className="px-4 py-3 text-slate-400">{a.charterNumber || "—"}</td>
                    <td className="px-4 py-3">
                      <span className="flex max-w-[180px] flex-wrap gap-1 text-xs text-slate-400">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        {a.lendingStates.length ? a.lendingStates.join(", ") : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {fmtUSDFull(a.minLoanAmount)} – {fmtUSDFull(a.maxLoanAmount)}
                    </td>
                    <td className="px-4 py-3 text-slate-400">{a.submittedAt}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => decide(a.id, "approved")}
                          disabled={acting === a.id}
                          className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold text-white transition disabled:opacity-50"
                          style={{ backgroundColor: "#059669" }}
                        >
                          {acting === a.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Check className="h-3.5 w-3.5" />
                          )}
                          Approve
                        </button>
                        <button
                          onClick={() => decide(a.id, "rejected")}
                          disabled={acting === a.id}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-500/40 px-3 py-1.5 text-xs font-bold text-rose-300 transition hover:bg-rose-500/10 disabled:opacity-50"
                        >
                          <X className="h-3.5 w-3.5" /> Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </LenderCard>

      <p className="mt-3 text-xs text-slate-500">
        Approving an application provisions a{" "}
        <Link to="/lenders/login" className="font-semibold" style={{ color: "#93B4FF" }}>
          lender account
        </Link>{" "}
        and notifies the institution by email.
      </p>
    </LenderShell>
  );
}
