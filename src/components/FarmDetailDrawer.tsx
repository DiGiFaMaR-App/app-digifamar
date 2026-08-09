import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Check, Link2, MapPin, Navigation } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { farmDetailQueryOptions } from "@/lib/farm-detail";

export type MapFarm = {
  user_id: string;
  farm_name: string;
  description?: string | null;
  city?: string | null;
  state?: string | null;
  certifications?: string[];
  verification_status?: string;
  distance_mi?: number | null;
  lat: number;
  lng: number;
};

interface FarmDetailDrawerProps {
  farm: MapFarm | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Element that opened the drawer — focus returns here on close. */
  returnFocusRef?: React.RefObject<HTMLElement | null>;
}

export function FarmDetailDrawer({
  farm,
  open,
  onOpenChange,
  returnFocusRef,
}: FarmDetailDrawerProps) {
  const [copied, setCopied] = useState(false);

  // Served from cache when the map prefetched this farm from ?farm=<id>.
  const { data: detail } = useQuery({
    ...farmDetailQueryOptions(farm?.user_id ?? ""),
    enabled: Boolean(farm?.user_id) && open,
  });

  const description = farm?.description ?? detail?.description ?? null;
  const certifications = farm?.certifications?.length
    ? farm.certifications
    : (detail?.certifications ?? []);
  const city = farm?.city ?? detail?.city ?? null;
  const state = farm?.state ?? detail?.state ?? null;
  const verified = (farm?.verification_status ?? detail?.verification_status) === "verified";

  const shareLink = async () => {
    if (!farm || typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("farm", farm.user_id);
    const href = url.toString();
    try {
      if (navigator.share) await navigator.share({ title: farm.farm_name, url: href });
      else await navigator.clipboard.writeText(href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* user cancelled or clipboard unavailable */
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md"
        onCloseAutoFocus={(event) => {
          const target = returnFocusRef?.current;
          if (target) {
            event.preventDefault();
            target.focus();
          }
        }}
      >
        {farm && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-1.5">
                <span className="truncate">{farm.farm_name}</span>
                {verified && (
                  <BadgeCheck className="h-4 w-4 shrink-0 text-primary" aria-label="Verified" />
                )}
              </SheetTitle>
              <SheetDescription className="flex flex-wrap items-center gap-2">
                {(city || state) && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {[city, state].filter(Boolean).join(", ")}
                  </span>
                )}
                {farm.distance_mi != null && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    <Navigation className="h-3 w-3" />
                    {farm.distance_mi.toFixed(1)} mi away
                  </span>
                )}
              </SheetDescription>
            </SheetHeader>

            <div className="mt-4 space-y-4">
              {description && <p className="text-sm text-muted-foreground">{description}</p>}

              {certifications.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {certifications.map((c) => (
                    <span
                      key={c}
                      className="rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <Button asChild>
                  <Link to="/farm/$id" params={{ id: farm.user_id }}>
                    View farm profile
                  </Link>
                </Button>
                <Button variant="outline" onClick={shareLink} className="gap-1.5">
                  {copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
                  {copied ? "Link copied" : "Copy share link"}
                </Button>
                <Button asChild variant="outline">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${farm.lat},${farm.lng}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Get directions
                  </a>
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
