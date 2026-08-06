import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Loader2, Lock, RefreshCw, Search, ShieldCheck, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { verifyAdminSessionFn } from "@/lib/admin/admin.functions";
import { LenderCard, LenderShell } from "./-ui";
import { NAVY } from "./-data";
import {
  LeadDrawer,
  STATUSES,
  STATUS_STYLE,
  type Lead,
  type LeadStatus,
} from "./-LeadDrawer";

export const Route = createFileRoute("/lenders/leads")({
  head: () => ({
    meta: [
      { title: "Lender Leads — DiGiFaMaR Admin" },
      {
        name: "description",
        content:
          "Admin queue for DiGiFaMaR lender interest leads: filter by status and entity type, update lead status, and export to CSV.",
      },
      { property: "og:title", content: "Lender Leads — DiGiFaMaR Admin" },
      {
        property: "og:description",
        content: "Filter, triage and export lender interest leads captured from the lenders page.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  // Server-verified admin gate — non-admins never render the queue.
  beforeLoad: async () => {
    try {
      await verifyAdminSessionFn();
    } catch {
      throw redirect({ to: "/lenders/login" });
    }
  },
  component: LenderLeadsAdmin,
});

// Lead shape, status list and status colors are shared with the detail drawer.


const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

const entityLabel = (t: string) => (t === "institutional" ? "Institutional" : "Individual");

/** RFC-4180 style escaping so notes with commas/quotes/newlines survive Excel. */
function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(rows: Lead[]): string {
  const header = [
    "id",
    "name",
    "email",
    "phone",
    "entity_type",
    "status",
    "interest_notes",
    "created_at",
  ];
  const lines = rows.map((r) =>
    [
      r.id,
      r.name,
      r.email,
      r.phone ?? "",
      r.entity_type,
      r.status,
      r.interest_notes ?? "",
      r.created_at,
    ]
      .map(csvCell)
      .join(","),
  );
  return [header.join(","), ...lines].join("\r\n");
}

function LenderLeadsAdmin() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<"all" | LeadStatus>("all");
  const [entityFilter, setEntityFilter] = useState<"all" | "individual" | "institutional">("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const { data, error } = await supabase
      .from("lender_leads")
      .select("id, name, email, phone, entity_type, interest_notes, status, created_at")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) {
      setLoadError(error.message);
      setLeads([]);
    } else {
      setLeads((data ?? []) as Lead[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const updateStatus = async (id: string, status: LeadStatus) => {
    const previous = leads;
    setSaving(id);
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
    const { error } = await supabase.from("lender_leads").update({ status }).eq("id", id);
    setSaving(null);
    if (error) {
      // Never swallow a write failure — roll back and tell the admin.
      setLeads(previous);
      toast.error("Status update failed", { description: error.message });
      return;
    }
    toast.success(`Marked as ${status}`);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((l) => {
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (entityFilter !== "all" && l.entity_type !== entityFilter) return false;
      if (!q) return true;
      return (
        l.name.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q) ||
        (l.phone ?? "").toLowerCase().includes(q) ||
        (l.interest_notes ?? "").toLowerCase().includes(q)
      );
    });
  }, [leads, statusFilter, entityFilter, search]);

  const exportCsv = () => {
    if (!filtered.length) {
      toast.error("Nothing to export", { description: "No leads match the current filters." });
      return;
    }
    const blob = new Blob([toCsv(filtered)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lender-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} lead${filtered.length === 1 ? "" : "s"}`);
  };

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    leads.forEach((l) => {
      map[l.status] = (map[l.status] ?? 0) + 1;
    });
    return map;
  }, [leads]);

  const selectClass =
    "rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 outline-none focus:border-white/25";

  return (
    <LenderShell>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-slate-500">
            <ShieldCheck className="h-3.5 w-3.5" /> Admin
          </p>
          <h1 className="text-2xl font-extrabold sm:text-3xl">Lender interest leads</h1>
          <p className="mt-1 text-sm text-slate-400">
            Captured from{" "}
            <Link to="/lenders/apply" className="font-semibold" style={{ color: "#93B4FF" }}>
              /lenders/apply
            </Link>
            . No KYC or capital is collected — these are interest signups only.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300">
            <Users className="mr-1 inline h-3.5 w-3.5" />
            {leads.length} total
          </span>
          {STATUSES.filter((s) => counts[s]).map((s) => (
            <span
              key={s}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold"
              style={{ backgroundColor: STATUS_STYLE[s]!.bg, color: STATUS_STYLE[s]!.fg }}
            >
              {counts[s]} {s}
            </span>
          ))}
        </div>
      </div>

      <LenderCard className="mt-5 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, phone or notes"
              aria-label="Search leads"
              className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-slate-200 placeholder:text-slate-500 outline-none focus:border-white/25"
            />
          </label>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | LeadStatus)}
            aria-label="Filter by status"
            className={selectClass}
          >
            <option value="all">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            value={entityFilter}
            onChange={(e) =>
              setEntityFilter(e.target.value as "all" | "individual" | "institutional")
            }
            aria-label="Filter by entity type"
            className={selectClass}
          >
            <option value="all">All entity types</option>
            <option value="individual">Individual</option>
            <option value="institutional">Institutional</option>
          </select>

          <button
            onClick={() => void load()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>

          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold text-white"
            style={{ backgroundColor: NAVY.accent }}
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </LenderCard>

      <LenderCard className="mt-4 overflow-hidden">
        {loading ? (
          <div className="grid place-items-center py-20 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : loadError ? (
          <div className="grid place-items-center py-16 text-center">
            <Lock className="h-6 w-6 text-rose-400" />
            <p className="mt-2 text-sm font-semibold">Could not load leads</p>
            <p className="mt-1 max-w-md text-xs text-slate-500">{loadError}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="grid place-items-center py-20 text-center">
            <Users className="h-6 w-6 text-slate-500" />
            <p className="mt-2 text-sm font-semibold">No leads match these filters</p>
            <p className="text-xs text-slate-500">Try clearing the search or status filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-[11px] uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3 font-semibold">Lead</th>
                  <th className="px-4 py-3 font-semibold">Entity</th>
                  <th className="px-4 py-3 font-semibold">Notes</th>
                  <th className="px-4 py-3 font-semibold">Received</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Update</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => {
                  const style = STATUS_STYLE[l.status] ?? STATUS_STYLE["archived"]!;
                  return (
                    <tr
                      key={l.id}
                      className="border-b border-white/5 last:border-0 hover:bg-white/[0.03]"
                    >
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-100">{l.name}</p>
                        <p className="text-xs text-slate-500">
                          {l.email}
                          {l.phone ? ` · ${l.phone}` : ""}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{entityLabel(l.entity_type)}</td>
                      <td className="max-w-[280px] px-4 py-3 text-xs text-slate-400">
                        {l.interest_notes ? (
                          <span className="line-clamp-3">{l.interest_notes}</span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-400">
                        {fmtDate(l.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="rounded-full px-2.5 py-1 text-[11px] font-bold capitalize"
                          style={{ backgroundColor: style.bg, color: style.fg }}
                        >
                          {l.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {saving === l.id && (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
                          )}
                          <select
                            value={STATUSES.includes(l.status as LeadStatus) ? l.status : ""}
                            onChange={(e) => void updateStatus(l.id, e.target.value as LeadStatus)}
                            disabled={saving === l.id}
                            aria-label={`Update status for ${l.name}`}
                            className={`${selectClass} py-1.5 text-xs disabled:opacity-50`}
                          >
                            {!STATUSES.includes(l.status as LeadStatus) && (
                              <option value="">{l.status}</option>
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

      <p className="mt-3 text-xs text-slate-500">
        Showing {filtered.length} of {leads.length} leads. CSV export includes exactly the rows
        currently visible under your filters.
      </p>
    </LenderShell>
  );
}
