import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Heart, MapPin } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { RequireAuth } from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";
import { FarmDetailDrawer, type MapFarm } from "@/components/FarmDetailDrawer";
import { SaveFarmButton } from "@/components/SaveFarmButton";
import { savedFarmsQueryOptions, type SavedFarm } from "@/lib/saved-farms";

export const Route = createFileRoute("/saved")({
  head: () => ({
    meta: [
      { title: "Saved Farms — DiGiFaMaR" },
      {
        name: "description",
        content: "Your favorite DiGiFaMaR farms, saved for quick access and reordering.",
      },
      { property: "og:title", content: "Saved Farms — DiGiFaMaR" },
      {
        property: "og:description",
        content: "Your favorite DiGiFaMaR farms, saved for quick access and reordering.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <RequireAuth>
      <SavedPage />
    </RequireAuth>
  ),
});

function toMapFarm(f: SavedFarm): MapFarm {
  return {
    user_id: f.farm_id,
    farm_name: f.farm_name,
    description: f.description,
    city: f.city,
    state: f.state,
    certifications: f.certifications,
    verification_status: f.verification_status,
    lat: f.lat ?? 0,
    lng: f.lng ?? 0,
  };
}

function SavedPage() {
  const { data, isLoading, error } = useQuery(savedFarmsQueryOptions());
  const [selected, setSelected] = useState<MapFarm | null>(null);
  const [open, setOpen] = useState(false);

  return (
    <SiteLayout>
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-extrabold sm:text-4xl">Saved farms</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Farms you've hearted. Open one for details, directions, or a share link.
        </p>

        {isLoading && <p className="mt-8 text-sm text-muted-foreground">Loading your farms…</p>}
        {error && (
          <p className="mt-8 text-sm text-destructive">
            {error instanceof Error ? error.message : "Could not load saved farms."}
          </p>
        )}

        {!isLoading && !error && (data ?? []).length === 0 && (
          <div className="mt-8 rounded-2xl border border-dashed border-border bg-muted/20 p-10 text-center">
            <Heart className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-base font-medium">No saved farms yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Tap the heart on any farm to keep it here.
            </p>
            <Button asChild className="mt-4">
              <Link to="/browse" search={{ farm: undefined }}>
                Browse farms
              </Link>
            </Button>
          </div>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(data ?? []).map((f) => (
            <div key={f.farm_id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 font-semibold">
                    <span className="truncate">{f.farm_name}</span>
                    {(f.verification_status === "verified" ||
                      f.verification_status === "approved") && (
                      <BadgeCheck className="h-4 w-4 shrink-0 text-primary" aria-label="Verified" />
                    )}
                  </p>
                  {(f.city || f.state) && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {[f.city, f.state].filter(Boolean).join(", ")}
                    </p>
                  )}
                </div>
                <SaveFarmButton farmId={f.farm_id} farmName={f.farm_name} className="px-2" />
              </div>

              {f.description && (
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{f.description}</p>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    setSelected(toMapFarm(f));
                    setOpen(true);
                  }}
                >
                  Quick view
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link to="/browse" search={{ farm: f.farm_id }}>
                    Show on map
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <FarmDetailDrawer farm={selected} open={open} onOpenChange={setOpen} />
    </SiteLayout>
  );
}
