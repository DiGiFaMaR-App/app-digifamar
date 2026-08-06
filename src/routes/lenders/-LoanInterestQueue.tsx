import { useCallback, useEffect, useState } from "react";
import { Loader2, Sprout } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { updateLeadStatusFn } from "@/lib/lenders/lead-notifications.functions";
import { LenderCard } from "./-ui";
import { STATUSES, STATUS_STYLE, type LeadStatus } from "./-LeadDrawer";

type LoanInterest = {
  id: string;
  farmer_id: string;
  requested_amount_range: string;
  purpose_notes: string | null;
  status: string;
  created_at: string;
};

/**
 * Farmer loan-interest triage queue. Intentionally independent of
 * `lender_leads` — there is no link between a lender and a farmer at this
 * waitlist stage. Status changes route through the same notifying server fn.
 */
export function LoanInterestQueue() {
  const [rows, setRows] = useState<LoanInterest[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await supabase
      .from("farmer_loan_interest")
      .select("id, farmer_id, requested_amount_range, purpose_notes, status, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (err) {
      setError(err.message);
      setRows([]);
    } else {
      setError(null);
      const list = (data ?? []) as LoanInterest[];
      setRows(list);
      const ids = [...new Set(list.map((r) => r.farmer_id))];
      if (ids.length) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", ids);
        const map: Record<string, string> = {};
        (profiles ?? []).forEach((p) => {
          map[p.id] = p.full_name || p.email || p.id.slice(0, 8);
        });
        setNames(map);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const updateStatus = async (id: string, status: LeadStatus) => {
    const previous = rows;
    setSaving(id);
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    try {
      const res = await updateLeadStatusFn({
        data: { kind: "farmer_loan_interest", id, status },
      });
      toast.success(`Marked as ${status}`, {
        description: res.notified
          ? res.emailSent
            ? `${res.adminsNotified} admin notification(s) sent.`
            : `Admins notified in-app. Email not sent: ${res.emailError ?? "unknown reason"}`
          : undefined,
      });
    } catch (e) {
      setRows(previous);
      toast.error("Status update failed", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setSaving(null);
    }
  };

  return (
    <LenderCard className="mt-6 overflow-hidden">
      <div className="border-b border-white/10 px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-100">
          <Sprout className="h-4 w-4" /> Farmer loan interest
        </h2>
        <p className="mt-0.5 text-xs text-slate-400">
          Farmers who expressed interest from their dashboard. Separate from lender leads — no
          matching happens yet.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 px-4 py-8 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : error ? (
        <p className="px-4 py-6 text-sm text-rose-300">{error}</p>
      ) : rows.length === 0 ? (
        <p className="px-4 py-6 text-sm text-slate-400">No farmer loan interest yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Farmer</th>
                <th className="px-4 py-2 font-medium">Amount range</th>
                <th className="px-4 py-2 font-medium">Notes</th>
                <th className="px-4 py-2 font-medium">Submitted</th>
                <th className="px-4 py-2 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const style = STATUS_STYLE[r.status] ?? STATUS_STYLE["archived"]!;
                return (
                  <tr key={r.id} className="border-t border-white/5">
                    <td className="px-4 py-2.5 text-slate-100">{names[r.farmer_id] ?? "Farmer"}</td>
                    <td className="px-4 py-2.5 text-slate-300">{r.requested_amount_range}</td>
                    <td className="max-w-[280px] truncate px-4 py-2.5 text-slate-400">
                      {r.purpose_notes || "—"}
                    </td>
                    <td className="px-4 py-2.5 text-slate-400">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-2">
                        <span
                          className="rounded-md px-2 py-0.5 text-[11px] font-semibold"
                          style={{ backgroundColor: style.bg, color: style.fg }}
                        >
                          {r.status}
                        </span>
                        {saving === r.id && (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
                        )}
                        <select
                          value={STATUSES.includes(r.status as LeadStatus) ? r.status : ""}
                          onChange={(e) => void updateStatus(r.id, e.target.value as LeadStatus)}
                          disabled={saving === r.id}
                          aria-label="Update loan interest status"
                          className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-white/25 disabled:opacity-50"
                        >
                          {!STATUSES.includes(r.status as LeadStatus) && (
                            <option value="">{r.status}</option>
                          )}
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </LenderCard>
  );
}
