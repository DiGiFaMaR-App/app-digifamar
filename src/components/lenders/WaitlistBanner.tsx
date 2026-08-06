import { Clock } from "lucide-react";
import { type ReactNode } from "react";

/**
 * Persistent "Coming Soon — Waitlist" notice.
 * Rendered anywhere real funding or disbursement would eventually happen,
 * so it is unambiguous that the lending program is not live.
 */
export function WaitlistBanner({
  title = "Coming Soon — Waitlist",
  children,
  className = "",
}: {
  title?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="note"
      className={`flex items-start gap-3 rounded-xl border border-primary/30 bg-leaf-soft/60 p-4 ${className}`}
    >
      <Clock className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
      <div className="text-sm">
        <p className="font-semibold text-foreground">{title}</p>
        <p className="mt-0.5 text-muted-foreground">
          {children ??
            "The DiGiFaMaR lending program is not live. No funds are being raised, lent, or disbursed today — we're collecting interest only."}
        </p>
      </div>
    </div>
  );
}
