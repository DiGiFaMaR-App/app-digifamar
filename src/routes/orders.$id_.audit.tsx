import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  BadgeCheck,
  Banknote,
  Clock,
  KeyRound,
  ShieldAlert,
  ShieldCheck,
  Timer,
  XCircle,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/orders/$id_/audit")({
  head: () => ({
    meta: [
      { title: "Escrow Release Audit Log — DiGiFaMaR" },
      {
        name: "description",
        content:
          "Full escrow trail for this order: delivery code issuance, verification attempts, expiry, confirmations, and final payout status.",
      },
      { property: "og:title", content: "Escrow Release Audit Log — DiGiFaMaR" },
      {
        property: "og:description",
        content:
          "Every release-code attempt, OTP generation, confirmation, expiry and payout event for your escrow-protected order.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RequireAuth>
      <OrderAuditPage />
    </RequireAuth>
  ),
});

type OrderRow = {
  id: string;
  buyer_id: string;
  farmer_id: string;
  status: string;
  total_cents: number;
  subtotal_cents: number;
  platform_fee_cents: number;
  escrow_fee_cents: number;
  created_at: string;
  updated_at: string;
};

type ConfirmationRow = {
  id: string;
  otp_expires_at: string;
  confirmed_at: string | null;
  attempts: number;
  created_at: string;
};

type LedgerRow = {
  id: string;
  entry_type: string;
  amount_cents: number;
  balance_after_cents: number;
  notes: string | null;
  created_at: string;
};

type WindowRow = {
  opens_at: string;
  closes_at: string;
  auto_release_at: string;
  released_at: string | null;
  created_at: string;
};

type EventRow = {
  id: string;
  type: string;
  payload: Record<string, unknown> | null;
  created_at: string;
};

type Tone = "neutral" | "success" | "warning" | "danger";

type Entry = {
  key: string;
  at: string;
  icon: typeof KeyRound;
  title: string;
  detail: string;
  tone: Tone;
  actor: "Buyer" | "Farmer" | "System";
};

const TONE_CLASS: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground",
  success: "bg-primary/15 text-primary",
  warning: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  danger: "bg-destructive/15 text-destructive",
};

function dollars(cents: number) {
  return `$${(Math.abs(cents) / 100).toFixed(2)}`;
}

function when(iso: string) {
  return new Date(iso).toLocaleString();
}

const LEDGER_LABEL: Record<string, { title: string; tone: Tone }> = {
  hold: { title: "Funds held in escrow", tone: "neutral" },
  fund: { title: "Escrow funded by buyer", tone: "neutral" },
  release: { title: "Escrow released to farmer", tone: "success" },
  payout: { title: "Payout to farmer wallet", tone: "success" },
  refund: { title: "Refunded to buyer", tone: "warning" },
  fee: { title: "Platform / escrow fee taken", tone: "neutral" },
  penalty: { title: "Penalty applied", tone: "danger" },
};

function buildTimeline(
  order: OrderRow,
  confirmations: ConfirmationRow[],
  ledger: LedgerRow[],
  windows: WindowRow[],
  events: EventRow[],
): Entry[] {
  const out: Entry[] = [];

  out.push({
    key: `order-${order.id}`,
    at: order.created_at,
    icon: ShieldCheck,
    title: "Order created",
    detail: `Total ${dollars(order.total_cents)} (subtotal ${dollars(order.subtotal_cents)}, platform fee ${dollars(order.platform_fee_cents)}, escrow fee ${dollars(order.escrow_fee_cents)}).`,
    tone: "neutral",
    actor: "Buyer",
  });

  confirmations.forEach((c, i) => {
    const expired = !c.confirmed_at && new Date(c.otp_expires_at).getTime() < Date.now();
    out.push({
      key: `otp-gen-${c.id}`,
      at: c.created_at,
      icon: KeyRound,
      title: `Delivery release code generated${confirmations.length > 1 ? ` (#${i + 1})` : ""}`,
      detail: `Code issued to the buyer, valid until ${when(c.otp_expires_at)}. The code itself is never stored or shown here — only its hash lives on the server.`,
      tone: "neutral",
      actor: "Buyer",
    });

    if (c.attempts > 0) {
      out.push({
        key: `otp-attempts-${c.id}`,
        at: c.confirmed_at ?? c.otp_expires_at,
        icon: c.attempts >= 5 ? ShieldAlert : Clock,
        title:
          c.attempts >= 5
            ? `Code locked after ${c.attempts} failed attempts`
            : `${c.attempts} failed release-code attempt${c.attempts === 1 ? "" : "s"}`,
        detail:
          c.attempts >= 5
            ? "Maximum of 5 attempts reached — the buyer must issue a fresh code before delivery can be confirmed."
            : `Entered by the farmer at handover. ${5 - c.attempts} attempt(s) remained.`,
        tone: c.attempts >= 5 ? "danger" : "warning",
        actor: "Farmer",
      });
    }

    if (c.confirmed_at) {
      out.push({
        key: `otp-ok-${c.id}`,
        at: c.confirmed_at,
        icon: BadgeCheck,
        title: "Delivery confirmed with valid code",
        detail: "The farmer entered the buyer's release code correctly and delivery was recorded.",
        tone: "success",
        actor: "Farmer",
      });
    } else if (expired) {
      out.push({
        key: `otp-exp-${c.id}`,
        at: c.otp_expires_at,
        icon: XCircle,
        title: "Release code expired unused",
        detail: "The code lapsed before it was verified. Funds stayed in escrow.",
        tone: "danger",
        actor: "System",
      });
    }
  });

  windows.forEach((w, i) => {
    out.push({
      key: `win-${i}`,
      at: w.opens_at ?? w.created_at,
      icon: Timer,
      title: "Inspection window opened",
      detail: `Buyer can inspect until ${when(w.closes_at)}. Auto-release to the farmer scheduled for ${when(w.auto_release_at)}.`,
      tone: "neutral",
      actor: "System",
    });
    if (w.released_at) {
      out.push({
        key: `win-rel-${i}`,
        at: w.released_at,
        icon: Banknote,
        title: "Inspection window closed — escrow released",
        detail: "Payout to the farmer was authorised at the end of the inspection window.",
        tone: "success",
        actor: "System",
      });
    }
  });

  ledger.forEach((l) => {
    const meta = LEDGER_LABEL[l.entry_type] ?? {
      title: l.entry_type.replace(/_/g, " "),
      tone: "neutral" as Tone,
    };
    out.push({
      key: `ledger-${l.id}`,
      at: l.created_at,
      icon: Banknote,
      title: meta.title,
      detail: `${l.amount_cents < 0 ? "−" : "+"}${dollars(l.amount_cents)} · escrow balance after: ${dollars(l.balance_after_cents)}${l.notes ? ` · ${l.notes}` : ""}`,
      tone: meta.tone,
      actor: "System",
    });
  });

  events.forEach((e) => {
    out.push({
      key: `event-${e.id}`,
      at: e.created_at,
      icon: Clock,
      title: e.type.replace(/_/g, " "),
      detail: e.payload ? JSON.stringify(e.payload) : "Order event recorded.",
      tone: "neutral",
      actor: "System",
    });
  });

  return out.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}

const PAYOUT_TONE: Record<string, Tone> = {
  released: "success",
  refunded: "warning",
  disputed: "danger",
  penalized: "danger",
  cancelled: "danger",
};

function OrderAuditPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();

  const [order, setOrder] = useState<OrderRow | null>(null);
  const [confirmations, setConfirmations] = useState<ConfirmationRow[]>([]);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [windows, setWindows] = useState<WindowRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const { data: o } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
      if (cancelled) return;
      if (!o) {
        setOrder(null);
        setLoading(false);
        return;
      }
      setOrder(o as OrderRow);

      const [c, l, w, e] = await Promise.all([
        supabase
          .from("delivery_confirmations")
          .select("id, otp_expires_at, confirmed_at, attempts, created_at")
          .eq("order_id", id)
          .order("created_at", { ascending: true }),
        supabase
          .from("escrow_ledger")
          .select("id, entry_type, amount_cents, balance_after_cents, notes, created_at")
          .eq("order_id", id)
          .order("created_at", { ascending: true }),
        supabase
          .from("inspection_windows")
          .select("opens_at, closes_at, auto_release_at, released_at, created_at")
          .eq("order_id", id)
          .order("created_at", { ascending: true }),
        supabase
          .from("order_events")
          .select("id, type, payload, created_at")
          .eq("order_id", id)
          .order("created_at", { ascending: true }),
      ]);
      if (cancelled) return;
      setConfirmations((c.data ?? []) as ConfirmationRow[]);
      setLedger((l.data ?? []) as LedgerRow[]);
      setWindows((w.data ?? []) as WindowRow[]);
      setEvents((e.data ?? []) as EventRow[]);
      setLoading(false);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const role = useMemo(() => {
    if (!order || !user) return null;
    if (order.buyer_id === user.id) return "buyer" as const;
    if (order.farmer_id === user.id) return "farmer" as const;
    return null;
  }, [order, user]);

  const timeline = useMemo(
    () => (order ? buildTimeline(order, confirmations, ledger, windows, events) : []),
    [order, confirmations, ledger, windows, events],
  );

  const totalAttempts = confirmations.reduce((n, c) => n + (c.attempts ?? 0), 0);
  const confirmed = confirmations.some((c) => c.confirmed_at);

  if (loading) {
    return (
      <AppShell role="buyer">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center text-muted-foreground">
          Loading audit log…
        </div>
      </AppShell>
    );
  }

  if (!order || !role) {
    return (
      <AppShell role="buyer">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center text-muted-foreground">
          You don&apos;t have access to this order&apos;s audit log.
        </div>
      </AppShell>
    );
  }

  const payoutTone: Tone = PAYOUT_TONE[order.status] ?? "neutral";

  return (
    <AppShell role={role === "farmer" ? "farmer" : "buyer"}>
      <div className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:px-6">
        <Link
          to="/orders/$id"
          params={{ id }}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to order
        </Link>

        <header className="mt-4 rounded-2xl border border-border bg-card p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Escrow release audit
          </p>
          <h1 className="mt-1 text-xl font-bold sm:text-2xl">Order {order.id.slice(0, 8)}…</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Viewing as <span className="font-semibold text-foreground">{role}</span>. Every code
            issuance, verification attempt, expiry and payout movement is listed below. Release
            codes themselves are hashed server-side and never displayed here.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Codes issued" value={String(confirmations.length)} />
            <Stat label="Failed attempts" value={String(totalAttempts)} />
            <Stat label="Delivery confirmed" value={confirmed ? "Yes" : "No"} />
            <Stat label="Ledger entries" value={String(ledger.length)} />
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-border bg-background/40 p-3">
            <div>
              <p className="text-xs text-muted-foreground">Final escrow payout status</p>
              <p className="text-sm font-semibold">
                {order.status === "released"
                  ? `Released to farmer — ${dollars(order.subtotal_cents)}`
                  : order.status === "refunded"
                    ? `Refunded to buyer — ${dollars(order.total_cents)}`
                    : `Not yet paid out (${order.status.replace(/_/g, " ")})`}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${TONE_CLASS[payoutTone]}`}
            >
              {order.status.replace(/_/g, " ")}
            </span>
          </div>
        </header>

        <section className="mt-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Timeline
          </h2>
          <ol className="relative space-y-3 border-l border-border pl-5">
            {timeline.map((entry) => {
              const Icon = entry.icon;
              return (
                <li key={entry.key} className="relative">
                  <span
                    className={`absolute -left-[30px] flex h-6 w-6 items-center justify-center rounded-full ${TONE_CLASS[entry.tone]}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="rounded-xl border border-border bg-card p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold capitalize">{entry.title}</p>
                      <span className="text-xs text-muted-foreground">{when(entry.at)}</span>
                    </div>
                    <p className="mt-1 break-words text-xs text-muted-foreground">{entry.detail}</p>
                    <span className="mt-2 inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      {entry.actor}
                    </span>
                  </div>
                </li>
              );
            })}
            {timeline.length === 0 && (
              <li className="text-sm text-muted-foreground">No escrow activity recorded yet.</li>
            )}
          </ol>
        </section>
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/40 p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-lg font-bold">{value}</p>
    </div>
  );
}
