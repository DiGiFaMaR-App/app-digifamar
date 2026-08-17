import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { BadgeCheck, Clock, Crosshair, Loader2, MapPin, Navigation, Sprout } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { BrowseMap } from "@/components/BrowseMap";
import { Button } from "@/components/ui/button";
import { GeoPermissionHelp } from "@/components/GeoPermissionHelp";
import { LocationAutocompleteInput } from "@/components/LocationAutocompleteInput";
import { useGeolocation, haversineDistance } from "@/hooks/use-geolocation";
import { searchBrowse, type BrowseResults } from "@/lib/browse.functions";
import { estimateDeliveryWindow } from "@/lib/delivery-window";

const RADIUS_OPTIONS = [10, 25, 50, 100] as const;
const SORT_OPTIONS = [
  { value: "distance", label: "Distance" },
  { value: "delivery", label: "Fastest delivery" },
  { value: "name", label: "Farm name" },
] as const;
type SortKey = (typeof SORT_OPTIONS)[number]["value"];

export const Route = createFileRoute("/near-me")({
  validateSearch: (search: Record<string, unknown>) => ({
    farm: typeof search.farm === "string" && search.farm ? search.farm : undefined,
  }),
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
  const { farm: farmParam } = Route.useSearch();
  const navigate = Route.useNavigate();
  const selectFarm = (farmId: string | null) =>
    navigate({ search: { farm: farmId ?? undefined }, replace: true });
  const [radius, setRadius] = useState<(typeof RADIUS_OPTIONS)[number]>(25);
  const [sort, setSort] = useState<SortKey>("distance");
  const [mapUnavailable, setMapUnavailable] = useState(false);

  const hasCoords = geo.lat != null && geo.lng != null;

  const origin = useMemo(
    () =>
      hasCoords
        ? {
            lat: geo.lat as number,
            lng: geo.lng as number,
            formatted: [geo.city, geo.state].filter(Boolean).join(", ") || "your current location",
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
    .sort((a, b) => {
      if (sort === "name") return (a.farm_name ?? "").localeCompare(b.farm_name ?? "");
      if (sort === "delivery") {
        const aw = estimateDeliveryWindow(a.distance_mi);
        const bw = estimateDeliveryWindow(b.distance_mi);
        const diff = (aw?.minDays ?? 99) - (bw?.minDays ?? 99);
        if (diff !== 0) return diff;
      }
      return (a.distance_mi ?? 0) - (b.distance_mi ?? 0);
    });

  const mapFarms = farms
    .filter((f) => f.lat != null && f.lng != null)
    .map((f) => ({ ...f, lat: f.lat as number, lng: f.lng as number }));


  return (
    <SiteLayout>
      <h1 className="sr-only">Find verified farms near you</h1>

      <section className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary via-primary to-primary-glow text-primary-foreground">
        {/* decorative color blooms */}
        <div
          aria-hidden
          className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-destructive/30 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 top-10 h-64 w-64 rounded-full bg-leaf/40 blur-3xl"
        />
        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/90 ring-1 ring-white/25 backdrop-blur">
                <Sprout className="h-3.5 w-3.5" /> Find farms near me
              </span>
              <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                {geo.loading
                  ? "Detecting your location…"
                  : hasCoords
                    ? `Farms near ${origin?.formatted}`
                    : "Share your location to see nearby farms"}
              </h2>
              <p className="mt-1 text-sm text-white/75">
                We use your device location only to filter results. Nothing is stored.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex overflow-hidden rounded-lg border border-white/25 bg-white/10 backdrop-blur">
                {RADIUS_OPTIONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRadius(r)}
                    className={`px-3 py-1.5 text-xs font-semibold transition ${
                      radius === r
                        ? "bg-white text-primary shadow-sm"
                        : "text-white/80 hover:bg-white/15 hover:text-white"
                    }`}
                    aria-pressed={radius === r}
                  >
                    {r} mi
                  </button>
                ))}
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={geo.detect}
                disabled={geo.loading}
                className="border-0 bg-white text-primary hover:bg-white/90"
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
            <div className="mt-4 rounded-xl bg-white/10 p-1 ring-1 ring-white/20 backdrop-blur">
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

          <div className="mt-5 max-w-xl">
            <label
              htmlFor="near-me-place-search"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-white/80"
            >
              Search an address, city or ZIP
            </label>
            <LocationAutocompleteInput
              id="near-me-place-search"
              label="Address, city or ZIP"
              placeholder="Start typing an address, city or ZIP…"
              loading={geo.loading}
              onSubmit={(v) => {
                void geo.setManualLocation(v);
              }}
            />
            {hasCoords && (
              <p className="mt-1.5 text-xs text-white/75">
                Showing farms near {origin?.formatted}. Pick another place to move the search.
              </p>
            )}
          </div>

          {hasCoords && farms.length > 0 && (
            <div className="mt-5 grid grid-cols-3 gap-3 sm:max-w-md">
              <div className="rounded-xl bg-white/12 px-3 py-2 ring-1 ring-white/20 backdrop-blur">
                <p className="text-lg font-extrabold text-white">{farms.length}</p>
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/75">Farms found</p>
              </div>
              <div className="rounded-xl bg-leaf/30 px-3 py-2 ring-1 ring-white/20 backdrop-blur">
                <p className="text-lg font-extrabold text-white">
                  {farms.filter((f) => f.verification_status === "verified").length}
                </p>
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/75">Verified</p>
              </div>
              <div className="rounded-xl bg-destructive/30 px-3 py-2 ring-1 ring-white/20 backdrop-blur">
                <p className="text-lg font-extrabold text-white">
                  {Math.min(...farms.map((f) => f.distance_mi ?? 0)).toFixed(1)} mi
                </p>
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/75">Closest</p>
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className={mapUnavailable ? "order-1" : "order-2 lg:order-1"}>
          <div className="flex flex-wrap items-center gap-2">
            <Sprout className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Nearby farms
            </h2>
            {results.isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <div className="ml-auto flex items-center gap-1.5">
              <label
                htmlFor="near-me-sort"
                className="text-xs font-medium text-muted-foreground"
              >
                Sort by
              </label>
              <select
                id="near-me-sort"
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="rounded-md border border-border bg-background px-2 py-1 text-xs font-medium"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {mapUnavailable && (
            <p className="mt-3 rounded-md border border-border bg-muted/50 p-3 text-xs text-muted-foreground">
              The map couldn&apos;t load, so we&apos;ve put the sortable farm list first. Everything
              below still works normally.
            </p>
          )}

          {!hasCoords && !geo.loading && (
            <p className="mt-4 rounded-md border border-dashed border-border bg-card/50 p-6 text-sm text-muted-foreground">
              Allow location access above, or enter an address, city or ZIP to start searching — no
              GPS permission needed.
            </p>
          )}

          {hasCoords && results.isLoading && (
            <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Finding farms within {radius} miles…
            </div>
          )}

          {hasCoords && !results.isLoading && farms.length === 0 && (
            <div className="mt-4 rounded-xl border border-dashed border-border bg-card/50 p-6 text-center">
              <p className="font-semibold">No farms within {radius} miles</p>
              <p className="mt-1 text-sm text-muted-foreground">Try widening the radius above.</p>
            </div>
          )}

          <ul className="mt-4 space-y-3">
            {farms.map((f) => {
              const dist =
                f.distance_mi ?? (origin ? haversineDistance(origin.lat, origin.lng, 0, 0) : null);
              const window = estimateDeliveryWindow(dist);
              return (
                <li
                  key={f.user_id}
                  className="group rounded-xl border border-border bg-card p-4 transition hover:border-primary/60 hover:shadow-md"
                >
                  <button
                    type="button"
                    onClick={() => selectFarm(f.user_id)}
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
                      {window && (
                        <p
                          className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                          title={window.detail}
                        >
                          <Clock className="h-3 w-3" />
                          Est. delivery: {window.label}
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
          {farms.length > 0 && (
            <p className="mt-3 text-[11px] text-muted-foreground">
              Delivery windows are estimates based on distance. Farmers set their own delivery
              terms at checkout.
            </p>
          )}
        </div>

        <div
          className={
            mapUnavailable
              ? "order-2 lg:sticky lg:top-20 lg:h-fit"
              : "order-1 lg:order-2 lg:sticky lg:top-20 lg:h-fit"
          }
        >
          <BrowseMap
            origin={origin}
            farms={mapFarms}
            selectedFarmId={farmParam ?? null}
            onSelectFarm={selectFarm}
            onGoogleUnavailableChange={setMapUnavailable}
          />

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
