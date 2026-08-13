import { FlaskConical } from "lucide-react";

/**
 * Sandbox banner. The public catalog ships with a demo dataset so a first-time
 * visitor (or a prospective buyer of the business) can walk the full
 * browse → cart → escrow checkout lifecycle without any setup. It must always
 * be obvious that these listings are sample data, not real users or orders.
 */
export function DemoNotice({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex items-start gap-2.5 rounded-xl border border-accent/40 bg-accent/10 px-3.5 py-2.5 text-xs leading-relaxed text-foreground/80 ${className}`}
      role="note"
    >
      <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
      <p>
        <span className="font-semibold text-foreground">Demo catalog.</span> Listings, farms and
        ratings shown here are sample data for evaluation. Checkout runs in sandbox mode — a 10%
        platform fee plus separate escrow and payment-processing charges are shown at checkout.
      </p>
    </div>
  );
}
