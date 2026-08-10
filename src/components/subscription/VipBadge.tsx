import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/** Premium trust mark for farmers on an active VIP badge subscription. */
export function VipBadge({ className, showLabel = true }: { className?: string; showLabel?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-accent/20 px-2.5 py-1 text-xs font-semibold text-accent-foreground ring-1 ring-accent/40",
        className,
      )}
      title="VIP verified farm"
    >
      <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
      {showLabel ? "VIP verified" : <span className="sr-only">VIP verified</span>}
    </span>
  );
}
