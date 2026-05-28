import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Filter,
  Grid3x3,
  List,
  Map as MapIcon,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ProductCard } from "@/components/Cards";
import { categories, certifications, products, images } from "@/lib/mock-data";

export const Route = createFileRoute("/browse")({
  head: () => ({
    meta: [
      { title: "Browse farms & fresh products | DiGiFaMaR" },
      {
        name: "description",
        content:
          "Search verified American farms by location, category, delivery speed, certifications, and price. Find farm-fresh food near you.",
      },
      { property: "og:title", content: "Browse fresh produce | DiGiFaMaR" },
      {
        property: "og:description",
        content: "Find verified farms near you on DiGiFaMaR.",
      },
      { property: "og:url", content: "https://farmer-forward.lovable.app/browse" },
    ],
    links: [{ rel: "canonical", href: "https://farmer-forward.lovable.app/browse" }],
  }),
  component: Browse,
});

function Browse() {
  const [view, setView] = useState<"grid" | "list" | "map">("grid");
  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <SiteLayout>
      <div className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-6">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search products or farms..."
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="md:hidden"
              onClick={() => setFiltersOpen(true)}
            >
              <SlidersHorizontal className="mr-1 h-4 w-4" /> Filters
            </Button>
            <div className="flex rounded-md border border-border bg-background p-0.5">
              {(
                [
                  { v: "grid", Icon: Grid3x3 },
                  { v: "list", Icon: List },
                  { v: "map", Icon: MapIcon },
                ] as const
              ).map(({ v, Icon }) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`flex h-8 w-9 items-center justify-center rounded transition-colors ${
                    view === v
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                  aria-label={`${v} view`}
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>
            <select className="h-9 rounded-md border border-border bg-background px-2 text-sm">
              <option>Sort: Relevance</option>
              <option>Distance</option>
              <option>Price: Low → High</option>
              <option>Price: High → Low</option>
              <option>Rating</option>
              <option>Newest</option>
            </select>
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6">
        <aside className="hidden w-64 shrink-0 md:block">
          <Filters />
        </aside>

        {filtersOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 md:hidden">
            <div className="absolute right-0 top-0 h-full w-80 max-w-[85%] overflow-y-auto bg-background p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-bold">Filters</h2>
                <button onClick={() => setFiltersOpen(false)}>
                  <X className="h-5 w-5" />
                </button>
              </div>
              <Filters />
            </div>
          </div>
        )}

        <section className="flex-1 min-w-0">
          <p className="mb-4 text-sm text-muted-foreground">
            <strong className="text-foreground">{products.length * 31}</strong>{" "}
            products found near you
          </p>

          {view === "map" ? (
            <MapPlaceholder />
          ) : view === "list" ? (
            <ListView />
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </section>
      </div>
    </SiteLayout>
  );
}

function Filters() {
  return (
    <div className="space-y-6 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-bold">
          <Filter className="h-4 w-4" /> Filters
        </h3>
        <button className="text-xs text-primary hover:underline">
          Clear all
        </button>
      </div>

      <Section label="Location">
        <Input placeholder="City, state, or zip" />
      </Section>

      <Section label="Distance: 25 miles">
        <Slider defaultValue={[25]} min={5} max={100} step={5} />
        <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
          <span>5</span>
          <span>100 mi</span>
        </div>
      </Section>

      <Section label="Delivery Speed">
        <div className="space-y-1.5 text-sm">
          {["⚡ 24-Hour Local", "📦 48-Hour Standard", "🚜 Farm Pickup"].map(
            (l) => (
              <label key={l} className="flex items-center gap-2">
                <Checkbox defaultChecked />
                {l}
              </label>
            )
          )}
        </div>
      </Section>

      <Section label="Category">
        <div className="space-y-1.5 text-sm">
          {categories.map((c) => (
            <label key={c.slug} className="flex items-center gap-2">
              <Checkbox />
              <span>
                {c.emoji} {c.name}
              </span>
            </label>
          ))}
        </div>
      </Section>

      <Section label="Price: $0 — $50">
        <Slider defaultValue={[0, 50]} min={0} max={500} step={5} />
      </Section>

      <Section label="Certifications">
        <div className="space-y-1.5 text-sm">
          {certifications.map((c) => (
            <label key={c} className="flex items-center gap-2">
              <Checkbox />
              {c}
            </label>
          ))}
        </div>
      </Section>

      <Section label="Verified farms only">
        <Switch defaultChecked />
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

function ListView() {
  return (
    <div className="space-y-3">
      {products.map((p) => (
        <div
          key={p.id}
          className="card-lift flex gap-4 rounded-xl border border-border bg-card p-3"
        >
          <img
            src={p.image}
            alt={p.name}
            loading="lazy"
            className="h-24 w-24 shrink-0 rounded-lg object-cover sm:h-28 sm:w-28"
          />
          <div className="flex flex-1 flex-col justify-between">
            <div>
              <h3 className="font-semibold">{p.name}</h3>
              <p className="text-xs text-muted-foreground">{p.variety}</p>
            </div>
            <div className="flex items-end justify-between">
              <p className="text-lg font-bold">
                ${p.price.toFixed(2)}
                <span className="text-xs font-normal text-muted-foreground">
                  /{p.unit}
                </span>
              </p>
              <Button size="sm">Add to cart</Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function MapPlaceholder() {
  return (
    <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-border bg-leaf-soft/50">
      <img
        src={images.heroFarm}
        alt="Map view of farms"
        loading="lazy"
        className="h-full w-full object-cover opacity-30"
      />
      <div className="absolute inset-0 grid place-items-center">
        <div className="rounded-xl bg-card/95 px-6 py-5 text-center shadow-lg">
          <MapIcon className="mx-auto h-8 w-8 text-primary" />
          <p className="mt-2 font-semibold">Interactive map coming soon</p>
          <p className="mt-1 max-w-xs text-xs text-muted-foreground">
            Google Maps with live farm pins, clustering, and "search this
            area" — enabled in the next build phase.
          </p>
        </div>
      </div>
      <div className="absolute bottom-3 left-3 rounded-lg bg-card/95 px-3 py-2 text-xs shadow">
        <p className="font-semibold">Legend</p>
        <p className="mt-1 flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-primary" /> Farms
        </p>
        <p className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-secondary" /> Products
        </p>
      </div>
    </div>
  );
}
