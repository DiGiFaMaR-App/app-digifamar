import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Check, Clock, Loader2, Lock, MapPin, RefreshCw, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { verifyAdminSessionFn } from "@/lib/admin/admin.functions";
import {
  decideLenderApplicationFn,
  recomputeRecommendationsFn,
} from "@/lib/lenders/lenders.functions";
import { LenderCard, LenderShell } from "./-ui";
import { fmtUSDFull, institutionTypeLabel, type LenderApplication, NAVY } from "./-data";

export const Route = createFileRoute("/lenders/admin")({
  head: () => ({
    meta: [
      { title: "Lender Applications — DiGiFaMaR Admin" },
      {
        name: "description",
        content:
          "Human review queue for institutional lender applications on DiGiFaMaR. Approvals grant read-only portal access only.",
      },
      { property: "og:title", content: "Lender Applications — DiGiFaMaR Admin" },
      { property: "og:description", content: "Review and decide institutional lender applications." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  // Server-side admin gate. RLS already blocks non-admin writes, but this
  // prevents non-admins from rendering the admin UI at all.
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
type StatusFilter = "pending" | "approved" | "rejected";

type Row = {
  id: string;
  institution_name: string;
  institution_type: string;
  charter_number: string | null;
  lending_states: string[] | null;
  min_loan_amount: number;
  max_loan_amount: number;
  contact_name: string | null;
  contact_email: string;
  contact_phone: string | null;
  status: string;
  review_notes: string | null;
  created_at: string;
};

function mapRow(r: Row): LenderApplication {
  return {
    id: r.id,
    institutionName: r.institution_name,
    institutionType: r.institution_type,
    charterNumber: r.charter_number ?? "",
    lendingStates: r.lending_states ?? [],
    minLoanAmount: Number(r.min_loan_amount),
    maxLoanAmount: Number(r.max_loan_amount),
    contactName: r.contact_name ?? "",
    contactEmail: r.contact_email,
    contactPhone: r.contact_phone ?? "",
    status: (r.status as LenderApplication["status"]) ?? "pending",
    reviewNotes: r.review_notes ?? "",
    submittedAt: (r.created_at ?? "").slice(0, 10),
  };
}

function LenderAdmin() {
  const [access, setAccess] = useState<Access>("checking");
  const [apps, setApps] = useState<LenderApplication[]>([]);
  const [filter, setFilter] = useState<StatusFilter>("pending");
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [recomputing, setRecomputing] = useState(false);

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
        const isAdmin = (roles ?? []).some((r) => r.role === "admin");
        if (!cancelled) setAccess(isAdmin ? "admin" : "denied");
      } catch {
        if (!cancelled) setAccess("denied");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load the queue for the selected status straight from lender_applications.
  useEffect(() => {
    if (access !== "admin") return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("lender_applications")
        .select(
          "id, institution_name, institution_type, charter_number, lending_states, min_loan_amount, max_loan_amount, contact_name, contact_email, contact_phone, status, review_notes, created_at",
        )
        .eq("status", filter)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (error) {
        toast.error("Could not load applications", { description: error.message });
        setApps([]);
      } else {
        setApps((data ?? []).map((r) => mapRow(r as Row)));
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [access, filter]);

  const decide = async (id: string, status: "approved" | "rejected") => {
    setActing(id);
    try {
      const res = await decideLenderApplicationFn({
        data: { applicationId: id, status, reviewNotes: notes[id] ?? null },
      });
      setApps((prev) => prev.filter((a) => a.id !== id));
      toast.success(status === "approved" ? "Application approved" : "Application rejected", {
        description: res.message,
      });
    } catch (err) {
      toast.error("Decision failed", {
        description: err instanceof Error ? err.message : "The update was rejected.",
      });
    } finally {
      setActing(null);
    }
  };

  const recompute = async () => {
    setRecomputing(true);
    try {
      const res = await recomputeRecommendationsFn();
      toast.success("Trade insights refreshed", {
        description: `${res.farmers} farms scored from marketplace data. Informational only.`,
      });
    } catch (err) {
      toast.error("Recompute failed", {
        description: err instanceof Error ? err.message : "Unable to refresh insights.",
      });
    } finally {
      setRecomputing(false);
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
          <h1 className="text-2xl font-extrabold sm:text-3xl">Lender applications</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300">
            <Clock className="mr-1 inline h-3.5 w-3.5" />
            {pendingCount} {filter}
          </span>
          <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300">
            {fmtUSDFull(totalCeiling)} ceiling
          </span>
          <button
            onClick={recompute}
            disabled={recomputing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${recomputing ? "animate-spin" : ""}`} />
            Recompute trade insights
          </button>
        </div>
      </div>

      <div className="mt-4 flex gap-1.5">
        {(["pending", "approved", "rejected"] as StatusFilter[]).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${
              filter === s ? "text-white" : "text-slate-400 hover:text-slate-200"
            }`}
            style={
              filter === s
                ? { backgroundColor: NAVY.accent }
                : { backgroundColor: "rgba(255,255,255,0.05)" }
            }
          >
            {s}
          </button>
        ))}
      </div>

      <LenderCard className="mt-4 overflow-hidden">
        {loading ? (
          <div className="grid place-items-center py-20 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : apps.length === 0 ? (
          <div className="grid place-items-center py-20 text-center">
            <Check className="h-7 w-7 text-emerald-400" />
            <p className="mt-2 text-sm font-semibold">Nothing here</p>
            <p className="text-xs text-slate-500">No {filter} applications.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-[11px] uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3 font-semibold">Institution</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Charter</th>
                  <th className="px-4 py-3 font-semibold">States</th>
                  <th className="px-4 py-3 font-semibold">Loan range</th>
                  <th className="px-4 py-3 font-semibold">Submitted</th>
                  <th className="px-4 py-3 text-right font-semibold">
                    {filter === "pending" ? "Decision" : "Review notes"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {apps.map((a) => (
                  <tr
                    key={a.id}
                    className="border-b border-white/5 align-top last:border-0 hover:bg-white/[0.03]"
                  >
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-100">{a.institutionName}</p>
                      <p className="text-xs text-slate-500">
                        {a.contactName ? `${a.contactName} · ` : ""}
                        {a.contactEmail}
                        {a.contactPhone ? ` · ${a.contactPhone}` : ""}
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
                      {filter === "pending" ? (
                        <div className="flex flex-col items-end gap-2">
                          <textarea
                            value={notes[a.id] ?? ""}
                            onChange={(e) =>
                              setNotes((p) => ({ ...p, [a.id]: e.target.value.slice(0, 2000) }))
                            }
                            placeholder="Review notes (optional)"
                            rows={2}
                            className="w-56 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-slate-100 outline-none focus:border-[#1D4ED8]"
                          />
                          <div className="flex gap-2">
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
                        </div>
                      ) : (
                        <p className="max-w-[220px] text-right text-xs text-slate-400">
                          {a.reviewNotes || "—"}
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </LenderCard>

      <p className="mt-3 text-xs text-slate-500">
        Approving grants read-only lender portal access for the institution&apos;s contact email —
        it never creates a loan, an offer, or any transfer of funds. Every credit decision happens
        off-platform.
      </p>
    </LenderShell>
  );
}
