import { CheckCircle2, Circle, Loader2, Truck } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  TRACKING_LABEL,
  TRACKING_STEPS,
  currentStepIndex,
  orderTrackingQueryOptions,
  useAddTrackingUpdate,
  type TrackingStatus,
} from "@/lib/order-tracking";
import { cn } from "@/lib/utils";

interface OrderTimelineProps {
  orderId: string;
  /** Show the farmer's "post an update" controls. */
  canUpdate?: boolean;
  /** Compact mode renders the step bar only (used in dashboard lists). */
  compact?: boolean;
  /** Fallback timestamp for the implicit "placed" step. */
  placedAt?: string | null;
}

export function OrderTimeline({
  orderId,
  canUpdate = false,
  compact = false,
  placedAt,
}: OrderTimelineProps) {
  const { data: events = [], isLoading } = useQuery(orderTrackingQueryOptions(orderId));
  const add = useAddTrackingUpdate(orderId);

  const [status, setStatus] = useState<TrackingStatus>("packed");
  const [note, setNote] = useState("");
  const [carrier, setCarrier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");

  const reached = currentStepIndex(events);
  const latestByStep = new Map(events.map((e) => [e.status, e]));

  const submit = () => {
    add.mutate(
      { status, note, carrier, trackingNumber },
      {
        onSuccess: () => {
          toast.success("Tracking update posted — the buyer has been notified");
          setNote("");
          setCarrier("");
          setTrackingNumber("");
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Could not post update"),
      },
    );
  };

  return (
    <div className={compact ? "" : "rounded-2xl border border-border bg-card p-4 sm:p-5"}>
      {!compact && (
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
          <Truck className="h-4 w-4 text-primary" /> Delivery timeline
        </h2>
      )}

      {isLoading ? (
        <p className="mt-3 text-sm text-muted-foreground">Loading timeline…</p>
      ) : (
        <ol className={cn("mt-3 space-y-3", compact && "mt-0 flex gap-2 space-y-0")}>
          {TRACKING_STEPS.map((step, i) => {
            const done = i <= reached || (step === "placed" && Boolean(placedAt));
            const event = latestByStep.get(step);
            const at = event?.created_at ?? (step === "placed" ? placedAt : null);

            if (compact) {
              return (
                <li
                  key={step}
                  className={cn(
                    "flex-1 rounded-full border px-2 py-1 text-center text-[10px] font-semibold",
                    done
                      ? "border-primary/50 bg-primary/15 text-primary"
                      : "border-border text-muted-foreground",
                  )}
                >
                  {TRACKING_LABEL[step].split(" ")[0]}
                </li>
              );
            }

            return (
              <li key={step} className="flex gap-3">
                {done ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                ) : (
                  <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground/50" />
                )}
                <div className="min-w-0">
                  <p className={cn("text-sm font-semibold", !done && "text-muted-foreground")}>
                    {TRACKING_LABEL[step]}
                  </p>
                  {at && (
                    <p className="text-xs text-muted-foreground">{new Date(at).toLocaleString()}</p>
                  )}
                  {event?.note && <p className="mt-0.5 text-xs">{event.note}</p>}
                  {(event?.carrier || event?.tracking_number) && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {[event.carrier, event.tracking_number].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {canUpdate && !compact && (
        <div className="mt-5 space-y-2 border-t border-border pt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Post a tracking update
          </p>
          <div className="flex flex-wrap gap-2">
            {TRACKING_STEPS.filter((s) => s !== "placed").map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                aria-pressed={status === s}
                className={cn(
                  "min-h-11 rounded-full border px-3 text-sm capitalize",
                  status === s
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border text-muted-foreground hover:bg-accent",
                )}
              >
                {s}
              </button>
            ))}
          </div>
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={280}
            placeholder="Note for the buyer (optional)"
          />
          {status === "shipped" && (
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                maxLength={60}
                placeholder="Carrier (optional)"
              />
              <Input
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                maxLength={60}
                placeholder="Tracking number (optional)"
              />
            </div>
          )}
          <Button onClick={submit} disabled={add.isPending}>
            {add.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Post update
          </Button>
        </div>
      )}
    </div>
  );
}
