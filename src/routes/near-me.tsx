import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  BadgeCheck,
  Crosshair,
  Loader2,
  MapPin,
  Navigation,
  Sprout,
} from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { BrowseMap } from "@/components/BrowseMap";
import { Button } from "@/components/ui/button";
import { GeoPermissionHelp } from "@/components/GeoPermissionHelp";
import { LocationAutocompleteInput } from "@/components/LocationAutocompleteInput";
import { FarmDetailSheet } from "@/components/FarmDetailSheet";
import { useGeolocation, haversineDistance } from "@/hooks/use-geolocation";
import { searchBrowse, type BrowseResults } from "@/lib/browse.functions";

const RADIUS_OPTIONS = [10, 25, 50, 100] as const;

export const Route = createFileRoute("/near-me")({
  head: () => ({
    meta: [
      { title: "Find farms near me | DiGiFaMaR" },
      {
        name: "description",
        content:
          "Use your current location to discover verified American farms nearby. See distances, a live map, and jump straight to each farm.",
      },
      { property: "og:title", content: "Find farms near me | DiGiFaMaR" },
      {
        property: "og:description",
        content: "Verified farms within your chosen radius, mapped from your current location.",
      },
    ],
  }),
  component: NearMe,
  errorComponent: ({ error, reset }) => (
    <SiteLayout>
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <h1 className="text-2xl font-bold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <Button className="mt-6" onClick={reset}>
          Try again
        </Button>
      </div>
    </SiteLayout>
  ),
  notFoundComponent: () => (
    <SiteLayout>
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <h1 className="text-2xl font-bold">Page not found</h1>
      </div>
    </SiteLayout>
  ),
});




function NearMe() {
  const geo = useGeolocation();
  const [radius, setRadius] = useState<(typeof RADIUS_OPTIONS)[number]>(25);
  

  const hasCoords = geo.lat != null && geo.lng != null;

  const origin = useMemo(
    () =>
      hasCoords
        ? {
            lat: geo.lat as number,
            lng: geo.lng as number,
            formatted:
              [geo.city, geo.state].filter(Boolean).join(", ") || "your current location",
            city: geo.city,
            state: geo.state,
            zip: null,
          }
        : null,
    [hasCoords, geo.lat, geo.lng, geo.city, geo.state],
  );

  const results = useQuery<BrowseResults>({
    queryKey: ["near-me", geo.lat, geo.lng, radius],
    queryFn: () =>
      searchBrowse({
        data: {
          q: "",
          page: 1,
          originLat: geo.lat,
          originLng: geo.lng,
          maxMiles: radius,
        },
      }),
    enabled: hasCoords,
    placeholderData: keepPreviousData,
  });

  const farms = (results.data?.farms ?? [])
    .filter((f) => f.distance_mi != null && (f.distance_mi as number) <= radius)
    .sort((a, b) => (a.distance_mi ?? 0) - (b.distance_mi ?? 0));




  return (
    <SiteLayout>
      <h1 className="sr-only">Find verified farms near you</h1>

      <section className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                Find farms near me
              </p>
              <h2 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
                {geo.loading
                  ? "Detecting your location…"
                  : hasCoords
                    ? `Farms near ${origin?.formatted}`
                    : "Share your location to see nearby farms"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                We use your device location only to filter results. Nothing is stored.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex overflow-hidden rounded-md border border-border">
                {RADIUS_OPTIONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRadius(r)}
                    className={`px-3 py-1.5 text-xs font-medium ${
                      radius === r
                        ? "bg-primary text-primary-foreground"
                        : "bg-background text-muted-foreground hover:text-foreground"
                    }`}
                    aria-pressed={radius === r}
                  >
                    {r} mi
                  </button>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={geo.detect}
                disabled={geo.loading}
              >
                {geo.loading ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Locating…
                  </>
                ) : (
                  <>
                    <Crosshair className="mr-1.5 h-4 w-4" /> Use my location
                  </>
                )}
              </Button>
            </div>
          </div>

          {geo.error && (
            <div className="mt-4">
              <GeoPermissionHelp
                error={geo.error}
                loading={geo.loading}
                onRetry={geo.detect}
                onManualSubmit={(v) => {
                  void geo.setManualLocation(v);
                }}
              />
            </div>
          )}

          {!geo.error && !geo.loading && !hasCoords && (
            <div className="mt-3">
              <LocationAutocompleteInput
                id="manual-loc"
                loading={geo.loading}
                onSubmit={(v) => {
                  void geo.setManualLocation(v);
                }}
              />
            </div>
          )}
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="order-2 lg:order-1">
          <div className="flex items-center gap-2">
            <Sprout className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Nearby farms
            </h2>
            {results.isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          </div>

          {!hasCoords && !geo.loading && (
            <p className="mt-4 rounded-md border border-dashed border-border bg-card/50 p-6 text-sm text-muted-foreground">
              Allow location access above, or enter a city/ZIP to start searching.
            </p>
          )}

          {hasCoords && results.isLoading && (
            <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Finding farms within {radius} miles…
            </div>
          )}

          {hasCoords && !results.isLoading && farms.length === 0 && (
            <div className="mt-4 rounded-xl border border-dashed border-border bg-card/50 p-6 text-center">
              <p className="font-semibold">
                No farms within {radius} miles of {origin?.formatted}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Verified farms are sparse in some areas. Try a larger radius or search nearby ZIPs and cities.
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                {RADIUS_OPTIONS.filter((r) => r > radius).map((r) => (
                  <Button
                    key={r}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setRadius(r)}
                  >
                    Try {r} miles
                  </Button>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>Or search a different area below</span>
              </div>
              <div className="mx-auto mt-2 max-w-md">
                <LocationAutocompleteInput
                  id="empty-state-loc"
                  label="ZIP or city"
                  placeholder="e.g. 90210 or Portland, OR"
                  onSubmit={(v) => {
                    void geo.setManualLocation(v);
                  }}
                />
              </div>
            </div>
          )}

          <ul className="mt-4 space-y-3">
            {farms.map((f) => {
              const dist =
                f.distance_mi ??
                (origin ? haversineDistance(origin.lat, origin.lng, 0, 0) : null);
              return (
                <li
                  key={f.user_id}
                  className="group rounded-xl border border-border bg-card p-4 transition hover:border-primary/60 hover:shadow-md"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedFarm({
                        id: f.user_id,
                        name: f.farm_name,
                        distance: dist,
                      })
                    }
                    aria-label={`View details for ${f.farm_name}`}
                    className="flex w-full items-start justify-between gap-3 text-left"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="truncate font-semibold group-hover:text-primary">
                          {f.farm_name}
                        </h3>
                        {f.verification_status === "verified" && (
                          <BadgeCheck
                            className="h-4 w-4 shrink-0 text-primary"
                            aria-label="Verified"
                          />
                        )}
                      </div>
                      {(f.city || f.state) && (
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {[f.city, f.state].filter(Boolean).join(", ")}
                        </p>
                      )}
                      {f.description && (
                        <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
                          {f.description}
                        </p>
                      )}
                    </div>
                    {dist != null && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                        <Navigation className="h-3 w-3" />
                        {dist.toFixed(1)} mi
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="order-1 lg:order-2 lg:sticky lg:top-20 lg:h-fit">
          <BrowseMap origin={origin} />
          {origin && (
            <p className="mt-2 text-xs text-muted-foreground">
              Centered on {origin.formatted} · {radius}-mile radius
            </p>
          )}
        </div>
      </div>
    </SiteLayout>
  );
}
