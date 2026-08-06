import { useMemo, useState } from "react";
import {
  Building2,
  Check,
  Clock,
  Copy,
  FileText,
  Loader2,
  Mail,
  Phone,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { NAVY } from "./-data";

export type Lead = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  entity_type: string;
  interest_notes: string | null;
  status: string;
  created_at: string;
};

export type LeadStatus = "new" | "contacted" | "qualified" | "archived";

export const STATUSES: LeadStatus[] = ["new", "contacted", "qualified", "archived"];

export const STATUS_STYLE: Record<string, { bg: string; fg: string }> = {
  new: { bg: "rgba(29,78,216,0.18)", fg: "#93B4FF" },
  contacted: { bg: "rgba(217,119,6,0.16)", fg: "#FCD34D" },
  qualified: { bg: "rgba(5,150,105,0.16)", fg: "#6EE7B7" },
  archived: { bg: "rgba(148,163,184,0.14)", fg: "#CBD5E1" },
};

const fmtFull = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

function relative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days > 1) return `${days} days ago`;
  if (days === 1) return "yesterday";
  const hours = Math.floor(diff / 3_600_000);
  if (hours >= 1) return `${hours}h ago`;
  const mins = Math.max(1, Math.floor(diff / 60_000));
  return `${mins}m ago`;
}

function Field({
  icon: Icon,
  label,
  value,
  copyable,
}: {
  icon: typeof Mail;
  label: string;
  value: string | null;
  copyable?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-500">
          <Icon className="h-3.5 w-3.5" /> {label}
        </p>
        <p className="mt-0.5 break-words text-sm text-slate-100">{value || "—"}</p>
      </div>
      {copyable && value && (
        <button
          onClick={() => void copy()}
          aria-label={`Copy ${label}`}
          className="shrink-0 rounded-md border border-white/10 p-1.5 text-slate-400 hover:bg-white/10 hover:text-slate-200"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      )}
    </div>
  );
}

/**
 * Full applicant profile + activity history for one lender lead.
 * Activity is derived from the lead row itself (submission + current status);
 * there is no separate audit table for lender_leads, so nothing here is invented.
 */
export function LeadDrawer({
  lead,
  open,
  onOpenChange,
  onStatusChange,
  saving,
}: {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange: (id: string, status: LeadStatus) => void | Promise<void>;
  saving: boolean;
}) {
  const timeline = useMemo(() => {
    if (!lead) return [];
    const items: { title: string; detail: string; at: string | null; tone: string }[] = [
      {
        title: "Interest form submitted",
        detail: `${lead.name} applied via /lenders/apply as ${
          lead.entity_type === "institutional" ? "an institutional" : "an individual"
        } lender.`,
        at: lead.created_at,
        tone: STATUS_STYLE["new"]!.fg,
      },
    ];
    if (lead.status !== "new") {
      items.push({
        title: `Marked ${lead.status}`,
        detail: "Status set by an admin from the leads queue.",
        at: null,
        tone: (STATUS_STYLE[lead.status] ?? STATUS_STYLE["archived"]!).fg,
      });
    } else {
      items.push({
        title: "Awaiting outreach",
        detail: "No admin has actioned this lead yet.",
        at: null,
        tone: "#94A3B8",
      });
    }
    return items;
  }, [lead]);

  if (!lead) return null;
  const style = STATUS_STYLE[lead.status] ?? STATUS_STYLE["archived"]!;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto border-l border-white/10 text-slate-100 sm:max-w-md"
        style={{ backgroundColor: NAVY.card }}
      >
        <SheetHeader className="space-y-1 text-left">
          <SheetTitle className="text-xl font-extrabold text-slate-100">{lead.name}</SheetTitle>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="rounded-full px-2.5 py-1 text-[11px] font-bold capitalize"
              style={{ backgroundColor: style.bg, color: style.fg }}
            >
              {lead.status}
            </span>
            <span className="text-xs text-slate-500">
              Received {relative(lead.created_at)} · {fmtFull(lead.created_at)}
            </span>
          </div>
        </SheetHeader>

        <div className="mt-5 space-y-2.5">
          <Field icon={Mail} label="Email" value={lead.email} copyable />
          <Field icon={Phone} label="Phone" value={lead.phone} copyable />
          <Field
            icon={lead.entity_type === "institutional" ? Building2 : User}
            label="Entity type"
            value={lead.entity_type === "institutional" ? "Institutional" : "Individual"}
          />
        </div>

        <div className="mt-5">
          <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-500">
            <FileText className="h-3.5 w-3.5" /> Interest notes
          </p>
          <div className="mt-2 whitespace-pre-wrap rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm leading-relaxed text-slate-200">
            {lead.interest_notes?.trim() || (
              <span className="text-slate-500">No notes provided.</span>
            )}
          </div>
        </div>

        <div className="mt-5">
          <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-500">
            <Clock className="h-3.5 w-3.5" /> Activity history
          </p>
          <ol className="mt-3 space-y-4 border-l border-white/10 pl-4">
            {timeline.map((t, i) => (
              <li key={i} className="relative">
                <span
                  className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full ring-4"
                  style={{ backgroundColor: t.tone, boxShadow: `0 0 0 4px ${NAVY.card}` }}
                />
                <p className="text-sm font-semibold text-slate-100">{t.title}</p>
                <p className="text-xs text-slate-400">{t.detail}</p>
                {t.at && <p className="mt-0.5 text-[11px] text-slate-500">{fmtFull(t.at)}</p>}
              </li>
            ))}
          </ol>
          <p className="mt-3 text-[11px] text-slate-500">
            Activity is derived from this lead record — individual status changes aren&apos;t
            timestamped yet.
          </p>
        </div>

        <div className="mt-6 border-t border-white/10 pt-4">
          <p className="text-[11px] uppercase tracking-wider text-slate-500">Update status</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {STATUSES.map((s) => {
              const active = lead.status === s;
              const st = STATUS_STYLE[s]!;
              return (
                <button
                  key={s}
                  disabled={saving || active}
                  onClick={() => void onStatusChange(lead.id, s)}
                  className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold capitalize transition disabled:opacity-60"
                  style={{
                    backgroundColor: active ? st.bg : "rgba(255,255,255,0.04)",
                    color: active ? st.fg : "#CBD5E1",
                    borderColor: active ? st.fg + "55" : "rgba(255,255,255,0.1)",
                  }}
                >
                  {saving && !active ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                  {s}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-[11px] text-slate-500">Lead ID {lead.id}</p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
