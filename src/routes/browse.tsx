import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BadgeCheck,
  Filter,
  Grid3x3,
  Loader2,
  Map as MapIcon,
  MapPin,
  Navigation,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { FarmCard } from "@/components/Cards";
import { farms, images, type Farm } from "@/lib/mock-data";
import { haversineDistance, useGeolocation } from "@/hooks/use-geolocation";

type SortKey = "relevance" | "distance" | "rating" | "newest" | "popular";

const allCertifications = Array.from(
  new Set(farms.flatMap((f) => f.certifications)),
).sort();

const allStates = Array.from(new Set(farms.map((f) => f.state))).sort();


export const Route = createFileRoute("/browse")({
  head: () => ({
    meta: [
      { title: "Browse verified farms near you | DiGiFaMaR" },
      {
        name: "description",
        content:
          "Search verified American farms by location, distance, certifications and rating. Find trusted farmers near you on DiGiFaMaR.",
      },
      { property: "og:title", content: "Browse verified farms | DiGiFaMaR" },
      {
        property: "og:description",
        content: "Find verified farmers near you on DiGiFaMaR.",
      },
    ],
  }),
  component: Browse,
});

function Browse() {
  const [view, setView] = useState<"grid" | "map">("grid");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [query, setQuery] = useState("");
  const [maxDistance, setMaxDistance] = useState(50);
  const [verifiedOnly, setVerifiedOnly] = useState(true);
  const [topSellersOnly, setTopSellersOnly] = useState(false);
  const [selectedCerts, setSelectedCerts] = useState<string[]>([]);
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [minRating, setMinRating] = useState(0);
  const [sort, setSort] = useState<SortKey>("relevance");
  const sortTouched = useRef(false);
  const distanceTouched = useRef(false);

  const geo = useGeolocation();
  const hasCoords = geo.lat !== null && geo.lng !== null;

  // Re-score farm distances from the user's coordinates when we have them.
  const geoFarms = useMemo<Farm[]>(() => {
    if (!hasCoords) return farms;
    return farms.map((f) => ({
      ...f,
      distance: haversineDistance(geo.lat!, geo.lng!, f.lat, f.lng),
    }));
  }, [hasCoords, geo.lat, geo.lng]);

  // Once we know where the buyer is, default sort to "distance" and widen the
  // radius to cover the nearest verified farms — unless they've changed it.
  useEffect(() => {
    if (!hasCoords) return;
    if (!sortTouched.current) setSort("distance");
    if (!distanceTouched.current) {
      const nearest = geoFarms
        .filter((f) => (verifiedOnly ? f.verified : true))
        .map((f) => f.distance)
        .sort((a, b) => a - b);
      const target = nearest[Math.min(5, nearest.length - 1)] ?? 50;
      // Round up to nearest 25-mile step, clamped to slider range.
      const stepped = Math.min(100, Math.max(25, Math.ceil(target / 25) * 25));
      setMaxDistance(stepped);
    }
    // We only want this to react to coords arriving.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasCoords]);

  const handleSortChange = (next: SortKey) => {
    sortTouched.current = true;
    setSort(next);
  };
  const handleDistanceChange = (n: number) => {
    distanceTouched.current = true;
    setMaxDistance(n);
  };

  const toggle = (
    value: string,
    list: string[],
    setter: (next: string[]) => void,
  ) => {
    setter(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const clearAll = () => {
    setQuery("");
    setMaxDistance(hasCoords ? 50 : 100);
    distanceTouched.current = false;
    setVerifiedOnly(false);
    setTopSellersOnly(false);
    setSelectedCerts([]);
    setSelectedStates([]);
    setMinRating(0);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = geoFarms.filter((f) => {
      if (verifiedOnly && !f.verified) return false;
      if (topSellersOnly && !f.topSeller) return false;
      if (f.distance > maxDistance) return false;
      if (f.rating < minRating) return false;
      if (selectedStates.length && !selectedStates.includes(f.state)) return false;
      if (
        selectedCerts.length &&
        !selectedCerts.every((c) => f.certifications.includes(c))
      )
        return false;
      if (q) {
        const hay = `${f.name} ${f.location} ${f.state} ${f.description}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    list = [...list].sort((a, b) => {
      switch (sort) {
        case "distance":
          return a.distance - b.distance;
        case "rating":
          return b.rating - a.rating;
        case "newest":
          return b.established - a.established;
        case "popular":
          return b.totalSales - a.totalSales;
        default:
          return (
            Number(b.verified) - Number(a.verified) ||
            Number(!!b.topSeller) - Number(!!a.topSeller) ||
            b.rating - a.rating
          );
      }
    });

    return list;
  }, [
    geoFarms,
    query,
    maxDistance,
    verifiedOnly,
    topSellersOnly,
    selectedCerts,
    selectedStates,
    minRating,
    sort,
  ]);

  const activeFilterCount =
    (verifiedOnly ? 1 : 0) +
    (topSellersOnly ? 1 : 0) +
    selectedCerts.length +
    selectedStates.length +
    (minRating > 0 ? 1 : 0) +
    (distanceTouched.current ? 1 : 0);


  const filterProps = {
    maxDistance,
    setMaxDistance,
    verifiedOnly,
    setVerifiedOnly,
    topSellersOnly,
    setTopSellersOnly,
    selectedCerts,
    selectedStates,
    minRating,
    setMinRating,
    toggle,
    setSelectedCerts,
    setSelectedStates,
    clearAll,
  };

  return (
    <SiteLayout>
      <h1 className="sr-only">Browse verified American farms near you</h1>

      <div className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-6">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search farms by name, city or state..."
              className="pl-9"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="md:hidden"
              onClick={() => setFiltersOpen(true)}
            >
              <SlidersHorizontal className="mr-1 h-4 w-4" /> Filters
              {activeFilterCount > 0 && (
                <span className="ml-1.5 rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                  {activeFilterCount}
                </span>
              )}
            </Button>
            <div className="flex rounded-md border border-border bg-background p-0.5">
              {(
                [
                  { v: "grid", Icon: Grid3x3, label: "Grid view" },
                  { v: "map", Icon: MapIcon, label: "Map view" },
                ] as const
              ).map(({ v, Icon, label }) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`flex h-8 w-9 items-center justify-center rounded transition-colors ${
                    view === v
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                  aria-label={label}
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>
            <select
              value={sort}
              onChange={(e) => handleSortChange(e.target.value as SortKey)}
              className="h-9 rounded-md border border-border bg-background px-2 text-sm"
            >
              <option value="relevance">Sort: Relevance</option>
              <option value="distance">Nearest first</option>
              <option value="rating">Top rated</option>
              <option value="popular">Most popular</option>
              <option value="newest">Newest farms</option>
            </select>
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6">
        <aside className="hidden w-64 shrink-0 md:block">
          <Filters {...filterProps} />
        </aside>

        {filtersOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/60 md:hidden"
            onClick={() => setFiltersOpen(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 top-0 h-full w-80 max-w-[85%] overflow-y-auto bg-background p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-bold">Filters</h2>
                <button
                  onClick={() => setFiltersOpen(false)}
                  aria-label="Close filters"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <Filters {...filterProps} />
              <Button
                className="mt-4 w-full"
                onClick={() => setFiltersOpen(false)}
              >
                Show {filtered.length} farms
              </Button>
            </div>
          </div>
        )}

        <section className="flex-1 min-w-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">{filtered.length}</strong>{" "}
              farms found
              {maxDistance < 100 ? ` within ${maxDistance} mi` : ""}
              {selectedStates.length === 1 ? ` in ${selectedStates[0]}` : ""}
            </p>
            {activeFilterCount > 0 && (
              <button
                onClick={clearAll}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Reset {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""}
              </button>
            )}
          </div>

          {view === "map" ? (
            <MapPlaceholder farms={filtered} />
          ) : filtered.length === 0 ? (
            <EmptyState onReset={clearAll} />
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((f) => (
                <FarmCard key={f.id} farm={f} />
              ))}
            </div>
          )}
        </section>
      </div>
    </SiteLayout>
  );
}

type FilterProps = {
  maxDistance: number;
  setMaxDistance: (n: number) => void;
  verifiedOnly: boolean;
  setVerifiedOnly: (v: boolean) => void;
  topSellersOnly: boolean;
  setTopSellersOnly: (v: boolean) => void;
  selectedCerts: string[];
  selectedStates: string[];
  minRating: number;
  setMinRating: (n: number) => void;
  toggle: (value: string, list: string[], setter: (n: string[]) => void) => void;
  setSelectedCerts: (n: string[]) => void;
  setSelectedStates: (n: string[]) => void;
  clearAll: () => void;
};

function Filters(props: FilterProps) {
  const {
    maxDistance,
    setMaxDistance,
    verifiedOnly,
    setVerifiedOnly,
    topSellersOnly,
    setTopSellersOnly,
    selectedCerts,
    selectedStates,
    minRating,
    setMinRating,
    toggle,
    setSelectedCerts,
    setSelectedStates,
    clearAll,
  } = props;

  return (
    <div className="space-y-6 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-bold">
          <Filter className="h-4 w-4" /> Filters
        </h3>
        <button
          onClick={clearAll}
          className="text-xs text-primary hover:underline"
        >
          Clear all
        </button>
      </div>

      <Section label={`Distance: ${maxDistance} mi`}>
        <Slider
          value={[maxDistance]}
          onValueChange={(v) => setMaxDistance(v[0])}
          min={5}
          max={100}
          step={5}
        />
        <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
          <span>5 mi</span>
          <span>100 mi</span>
        </div>
      </Section>

      <Section label="Trust">
        <div className="space-y-2 text-sm">
          <label className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <BadgeCheck className="h-4 w-4 text-primary" /> Verified only
            </span>
            <Switch checked={verifiedOnly} onCheckedChange={setVerifiedOnly} />
          </label>
          <label className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-badge-gold" /> Top sellers
            </span>
            <Switch
              checked={topSellersOnly}
              onCheckedChange={setTopSellersOnly}
            />
          </label>
        </div>
      </Section>

      <Section label={`Min rating: ${minRating > 0 ? `${minRating.toFixed(1)}★` : "any"}`}>
        <Slider
          value={[minRating]}
          onValueChange={(v) => setMinRating(v[0])}
          min={0}
          max={5}
          step={0.5}
        />
      </Section>

      <Section label="State">
        <div className="max-h-40 space-y-1.5 overflow-y-auto pr-1 text-sm">
          {allStates.map((s) => (
            <label key={s} className="flex items-center gap-2">
              <Checkbox
                checked={selectedStates.includes(s)}
                onCheckedChange={() =>
                  toggle(s, selectedStates, setSelectedStates)
                }
              />
              {s}
            </label>
          ))}
        </div>
      </Section>

      <Section label="Certifications">
        <div className="space-y-1.5 text-sm">
          {allCertifications.map((c) => (
            <label key={c} className="flex items-center gap-2">
              <Checkbox
                checked={selectedCerts.includes(c)}
                onCheckedChange={() =>
                  toggle(c, selectedCerts, setSelectedCerts)
                }
              />
              {c}
            </label>
          ))}
        </div>
      </Section>
    </div>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-border pt-4 first:border-t-0 first:pt-0">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      {children}
    </div>
  );
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-leaf-soft text-primary">
        <Search className="h-5 w-5" />
      </div>
      <h3 className="mt-3 font-bold">No farms match these filters</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Try widening the distance or removing a few certifications.
      </p>
      <Button onClick={onReset} variant="outline" className="mt-4">
        Reset filters
      </Button>
    </div>
  );
}

function MapPlaceholder({ farms: list }: { farms: Farm[] }) {
  return (
    <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-border bg-leaf-soft/50">
      <img
        src={images.heroFarm}
        alt="Map view of verified farms"
        loading="lazy"
        className="h-full w-full object-cover opacity-25"
      />
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="max-w-sm rounded-xl bg-card/95 px-6 py-5 text-center shadow-lg">
          <MapIcon className="mx-auto h-8 w-8 text-primary" />
          <p className="mt-2 font-semibold">
            {list.length} farms ready to map
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Live Google Maps with farm pins, clustering, and "search this area"
            ships in the next release.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-1.5">
            {list.slice(0, 6).map((f) => (
              <Link
                key={f.id}
                to="/farm/$id"
                params={{ id: f.id }}
                className="rounded-full bg-leaf-soft px-2.5 py-1 text-[11px] font-medium text-primary hover:bg-primary hover:text-primary-foreground"
              >
                📍 {f.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
