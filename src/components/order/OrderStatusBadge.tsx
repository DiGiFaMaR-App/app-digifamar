/**
 * Shared presentation for the order/escrow status enum.
 *
 * Labels mirror the ones already used on the order detail page so buyers and
 * farmers see identical wording in the list, the detail header and dashboards.
 * Purely presentational — it never derives or mutates order state.
 */
import { cn } from "@/lib/utils";

type Tone = "neutral" | "info" | "progress" | "success" | "warning" | "danger";

const STATUS: Record<string, { label: string; tone: Tone }> = {
  pending: { label: "Awaiting payment", tone: "neutral" },
  negotiating: { label: "Negotiating", tone: "neutral" },
  paid: { label: "Paid", tone: "info" },
  in_escrow: { label: "Funds in escrow", tone: "info" },
  escrow_funded: { label: "Funds in escrow", tone: "info" },
  awaiting_delivery: { label: "Awaiting delivery", tone: "progress" },
  shipped: { label: "Shipped", tone: "progress" },
  delivered: { label: "Delivered", tone: "progress" },
  inspection: { label: "In inspection window", tone: "progress" },
  released: { label: "Released to farmer", tone: "success" },
  refunded: { label: "Refunded", tone: "warning" },
  disputed: { label: "Disputed", tone: "danger" },
  penalized: { label: "Farmer penalized", tone: "danger" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

const TONE_CLASS: Record<Tone, string> = {
  neutral: "border-border bg-muted/50 text-muted-foreground",
  info: "border-primary/30 bg-primary/10 text-primary",
  progress: "border-accent/40 bg-accent/15 text-accent-foreground",
  success: "border-primary/40 bg-primary/15 text-primary",
  warning: "border-badge-gold/40 bg-badge-gold/15 text-foreground",
  danger: "border-destructive/40 bg-destructive/10 text-destructive",
};

export function orderStatusLabel(status: string): string {
  return STATUS[status]?.label ?? status.replace(/_/g, " ");
}

export function OrderStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const meta = STATUS[status];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize",
        TONE_CLASS[meta?.tone ?? "neutral"],
        className,
      )}
    >
      {orderStatusLabel(status)}
    </span>
  );
}
