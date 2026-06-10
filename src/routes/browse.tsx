import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MapPin,
  Package,
  Search,
  Sprout,
  X,
} from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { searchBrowse, type BrowseResults } from "@/lib/browse.functions";
import { geocodeAddress } from "@/lib/geocode.functions";

export const Route = createFileRoute("/browse")({
  head: () => ({
    meta: [
      { title: "Browse verified farms & fresh produce near you | DiGiFaMaR" },
      {
        name: "description",
        content:
          "Search verified American farms and fresh listings by name, city, ZIP or state. Find trusted farmers within 50 miles on DiGiFaMaR.",
      },
      { property: "og:title", content: "Browse verified farms | DiGiFaMaR" },
      {
        property: "og:description",
        content:
          "Search verified American farms and fresh listings within 50 miles of any ZIP.",
      },
    ],
  }),
  component: Browse,
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

const DEBOUNCE_MS = 300;
const ZIP_RE = /^\d{5}(-\d{4})?$/;

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function Browse() {
  const [input, setInput] = useState("");
  const [page, setPage] = useState(1);
  const debounced = useDebounced(input.trim(), DEBOUNCE_MS);

  // Reset page whenever the query text changes.
  useEffect(() => {
    setPage(1);
  }, [debounced]);

  // If the input looks like a ZIP, geocode it for the 50-mile radius filter.
  const zipMatch = useMemo(() => {
    const m = debounced.match(ZIP_RE);
    return m ? m[0] : null;
  }, [debounced]);

  const originQuery = useQuery({
    queryKey: ["browse-origin", zipMatch],
    queryFn: () =>
      zipMatch
        ? geocodeAddress({ data: { zip: zipMatch, country: "USA" } })
        : Promise.resolve(null),
    enabled: !!zipMatch,
    staleTime: 1000 * 60 * 60,
  });

  const origin = originQuery.data;
  const hasOrigin = !!origin;

  const results = useQuery<BrowseResults>({
    queryKey: [
      "browse-search",
      debounced,
      page,
      origin?.lat ?? null,
      origin?.lng ?? null,
    ],
    queryFn: () =>
      searchBrowse({
        data: {
          q: debounced,
          page,
          originLat: origin?.lat ?? null,
          originLng: origin?.lng ?? null,
          maxMiles: 50,
        },
      }),
    enabled: !zipMatch || !originQuery.isFetching,
    placeholderData: keepPreviousData,
  });

  const data = results.data;
  const totalPages = data
    ? Math.max(
        1,
        Math.ceil(Math.max(data.totalFarms, data.totalListings) / data.pageSize),
      )
    : 1;

  const isEmpty =
    !!data &&
    data.farms.length === 0 &&
    data.listings.length === 0 &&
    !results.isFetching;

  return (
    <SiteLayout>
      <h1 className="sr-only">Browse verified American farms and listings</h1>

      <div className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-6">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Search by ZIP, city, farm or product name..."
              aria-label="Search farms and listings"
              className="pl-9"
            />
            {input && (
              <button
                onClick={() => setInput("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {results.isFetching && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching…
            </div>
          )}
        </div>
        {hasOrigin && origin && (
          <div className="mx-auto flex max-w-7xl items-center gap-1.5 px-4 pb-3 text-xs text-muted-foreground sm:px-6">
            <MapPin className="h-3 w-3" /> Showing results within 50 mi of{" "}
            <strong className="text-foreground">{origin.formatted}</strong>
          </div>
        )}
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-10">
        {!data && results.isLoading && (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
          </div>
        )}

        {data && (
          <>
            <section>
              <SectionHeader
                icon={<Sprout className="h-4 w-4" />}
                label="Farms"
                count={data.totalFarms}
              />
              {data.farms.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  No farms match your search.
                </p>
              ) : (
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {data.farms.map((f) => (
                    <FarmResultCard key={f.user_id} farm={f} />
                  ))}
                </div>
              )}
            </section>

            <section>
              <SectionHeader
                icon={<Package className="h-4 w-4" />}
                label="Listings"
                count={data.totalListings}
              />
              {data.listings.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  No listings match your search.
                </p>
              ) : (
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {data.listings.map((l) => (
                    <ListingResultCard key={l.id} listing={l} />
                  ))}
                </div>
              )}
            </section>

            {isEmpty && (
              <div className="rounded-xl border border-dashed border-border bg-card/50 p-10 text-center">
                <p className="font-semibold">No results found</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Try a different ZIP, city, farm or product name.
                </p>
              </div>
            )}

            {totalPages > 1 && (
              <nav className="flex items-center justify-center gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </Button>
                <span className="px-3 text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </nav>
            )}
          </>
        )}

        {results.error && (
          <p className="text-center text-sm text-destructive">
            Search failed: {(results.error as Error).message}
          </p>
        )}
      </div>
    </SiteLayout>
  );
}

function SectionHeader({
  icon,
  label,
  count,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
  return (
    <div className="flex items-baseline justify-between border-b border-border pb-2">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        {icon} {label}
      </h2>
      <span className="text-xs text-muted-foreground">
        <strong className="text-foreground">{count}</strong> result
        {count === 1 ? "" : "s"}
      </span>
    </div>
  );
}

function FarmResultCard({
  farm,
}: {
  farm: BrowseResults["farms"][number];
}) {
  return (
    <Link
      to="/farm/$id"
      params={{ id: farm.user_id }}
      className="block rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/40"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold leading-tight">{farm.farm_name}</h3>
        {farm.verification_status === "verified" && (
          <BadgeCheck className="h-4 w-4 shrink-0 text-primary" />
        )}
      </div>
      {(farm.city || farm.state) && (
        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          {[farm.city, farm.state].filter(Boolean).join(", ")}
          {farm.distance_mi != null && (
            <span className="ml-1">· {farm.distance_mi.toFixed(1)} mi</span>
          )}
        </p>
      )}
      {farm.description && (
        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
          {farm.description}
        </p>
      )}
      {farm.certifications.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {farm.certifications.slice(0, 3).map((c) => (
            <span
              key={c}
              className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
            >
              {c}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}

function ListingResultCard({
  listing,
}: {
  listing: BrowseResults["listings"][number];
}) {
  const price = (listing.price_cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
  return (
    <Link
      to="/farm/$id"
      params={{ id: listing.farmer_id }}
      className="block overflow-hidden rounded-xl border border-border bg-card transition-colors hover:bg-muted/40"
    >
      {listing.images[0] ? (
        <img
          src={listing.images[0]}
          alt={listing.title}
          loading="lazy"
          className="aspect-[4/3] w-full object-cover"
        />
      ) : (
        <div className="aspect-[4/3] w-full bg-muted" />
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-tight">{listing.title}</h3>
          <span className="shrink-0 text-sm font-bold text-primary">
            {price}
            <span className="text-xs text-muted-foreground">/{listing.unit}</span>
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {listing.category}
          {listing.farm_name ? ` · ${listing.farm_name}` : ""}
          {listing.distance_mi != null
            ? ` · ${listing.distance_mi.toFixed(1)} mi`
            : ""}
        </p>
      </div>
    </Link>
  );
}
