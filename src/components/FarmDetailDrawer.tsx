import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { BadgeCheck, Check, Link2, MapPin, Navigation } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

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
}

export function FarmDetailDrawer({ farm, open, onOpenChange }: FarmDetailDrawerProps) {
  const [copied, setCopied] = useState(false);

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
      <SheetContent side="right" className="w-full sm:max-w-md">
        {farm && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-1.5">
                <span className="truncate">{farm.farm_name}</span>
                {farm.verification_status === "verified" && (
                  <BadgeCheck className="h-4 w-4 shrink-0 text-primary" aria-label="Verified" />
                )}
              </SheetTitle>
              <SheetDescription className="flex flex-wrap items-center gap-2">
                {(farm.city || farm.state) && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {[farm.city, farm.state].filter(Boolean).join(", ")}
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
              {farm.description && (
                <p className="text-sm text-muted-foreground">{farm.description}</p>
              )}

              {farm.certifications && farm.certifications.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {farm.certifications.map((c) => (
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
