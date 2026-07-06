import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  BadgeCheck,
  Loader2,
  MapPin,
  Navigation,
  PackageOpen,
  ShieldCheck,
  Sprout,
  Truck,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { getFarmDetail, type FarmDetail } from "@/lib/farm-detail.functions";

type Props = {
  farmId: string | null;
  farmName?: string | null;
  distanceMi?: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function estimateDelivery(distanceMi: number | null | undefined): {
  label: string;
  detail: string;
} {
  if (distanceMi == null) {
    return { label: "Contact farm", detail: "Delivery windows vary by area." };
  }
  if (distanceMi <= 15) return { label: "Same-day or next-day", detail: "Local pickup or delivery available." };
  if (distanceMi <= 50) return { label: "1–2 days", detail: "Regional delivery from the farm." };
  if (distanceMi <= 150) return { label: "2–4 days", detail: "Refrigerated shipping recommended." };
  return { label: "3–5 days", detail: "Long-haul shipping — freshness varies by product." };
}

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export function FarmDetailSheet({
  farmId,
  farmName,
  distanceMi,
  open,
  onOpenChange,
}: Props) {
  const query = useQuery<FarmDetail | null>({
    queryKey: ["farm-detail", farmId],
    queryFn: () => getFarmDetail({ data: { userId: farmId! } }),
    enabled: !!farmId && open,
    staleTime: 60_000,
  });

  const farm = query.data;
  const verified = farm?.verification_status === "verified";
  const eta = estimateDelivery(distanceMi ?? null);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto p-0 sm:max-w-lg"
      >
        <div className="border-b border-border bg-card px-6 pt-6 pb-5">
          <SheetHeader className="space-y-1 text-left">
            <div className="flex items-center gap-2">
              <SheetTitle className="text-xl font-extrabold tracking-tight">
                {farm?.farm_name || farmName || "Farm details"}
              </SheetTitle>
              {verified && (
                <BadgeCheck
                  className="h-5 w-5 shrink-0 text-primary"
                  aria-label="Verified"
                />
              )}
            </div>
            {(farm?.city || farm?.state) && (
              <SheetDescription className="flex items-center gap-1 text-sm">
                <MapPin className="h-3.5 w-3.5" />
                {[farm?.city, farm?.state].filter(Boolean).join(", ")}
                {distanceMi != null && (
                  <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    <Navigation className="h-3 w-3" />
                    {distanceMi.toFixed(1)} mi away
                  </span>
                )}
              </SheetDescription>
            )}
          </SheetHeader>
        </div>

        <div className="space-y-6 px-6 py-6">
          {query.isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading farm details…
            </div>
          )}

          {query.isError && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
              We couldn't load this farm right now. Please try again.
            </div>
          )}

          {!query.isLoading && !query.isError && !farm && (
            <div className="rounded-md border border-dashed border-border bg-card/50 p-4 text-sm text-muted-foreground">
              No public details available for this farm yet.
            </div>
          )}

          {farm && (
            <>
              {/* Verification */}
              <section>
                <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5" /> Verification
                </h3>
                <div
                  className={`rounded-lg border p-3 text-sm ${
                    verified
                      ? "border-primary/40 bg-primary/5"
                      : "border-border bg-card/50"
                  }`}
                >
                  <p className="font-semibold capitalize">
                    {verified ? "Verified farm" : farm.verification_status.replace("_", " ")}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {verified
                      ? "Identity, location, and practices confirmed by DiGiFaMaR."
                      : "This farm hasn't completed verification yet. Buy with extra care."}
                  </p>
                  {farm.certifications?.length > 0 && (
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {farm.certifications.map((c) => (
                        <li
                          key={c}
                          className="rounded-full bg-background px-2 py-0.5 text-xs font-medium text-foreground ring-1 ring-border"
                        >
                          {c}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>

              {/* Delivery ETA */}
              <section>
                <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Truck className="h-3.5 w-3.5" /> Estimated delivery
                </h3>
                <div className="rounded-lg border border-border bg-card/50 p-3 text-sm">
                  <p className="font-semibold">{eta.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{eta.detail}</p>
                </div>
              </section>

              {/* Products */}
              <section>
                <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Sprout className="h-3.5 w-3.5" /> Available products
                  <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                    {farm.listings.length}
                  </span>
                </h3>

                {farm.listings.length === 0 ? (
                  <div className="flex items-start gap-2 rounded-lg border border-dashed border-border bg-card/50 p-3 text-sm text-muted-foreground">
                    <PackageOpen className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      No active listings right now. Message the farm to ask what's in season.
                    </span>
                  </div>
                ) : (
                  <ul className="grid grid-cols-2 gap-2">
                    {farm.listings.map((l) => (
                      <li key={l.id}>
                        <Link
                          to="/product/$id"
                          params={{ id: l.id }}
                          className="group block overflow-hidden rounded-lg border border-border bg-card transition hover:border-primary/60 hover:shadow-md"
                        >
                          <div className="aspect-square w-full overflow-hidden bg-muted">
                            {l.images?.[0] ? (
                              <img
                                src={l.images[0]}
                                alt={l.title}
                                loading="lazy"
                                className="h-full w-full object-cover transition group-hover:scale-105"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                <PackageOpen className="h-6 w-6" />
                              </div>
                            )}
                          </div>
                          <div className="p-2">
                            <p className="truncate text-sm font-medium group-hover:text-primary">
                              {l.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatPrice(l.price_cents)} / {l.unit}
                            </p>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <div className="flex flex-col gap-2 pt-2 sm:flex-row">
                <Button asChild className="flex-1">
                  <Link to="/farm/$id" params={{ id: farm.user_id }}>
                    View full farm page
                  </Link>
                </Button>
                <Button asChild variant="outline" className="flex-1">
                  <Link to="/chat/farm/$farmId" params={{ farmId: farm.user_id }}>
                    Message farm
                  </Link>
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
