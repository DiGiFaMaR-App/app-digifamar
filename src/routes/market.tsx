import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { MapPin, Search, Star, Sparkles, BadgeCheck, Filter } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ProductSheet } from "@/components/ProductSheet";
import { useReveal } from "@/hooks/use-reveal";
import { categories, products, getFarm, type Product } from "@/lib/mock-data";

export const Route = createFileRoute("/market")({
  head: () => ({
    meta: [
      { title: "Marketplace — DiGiFaMaR" },
      { name: "description", content: "Browse fresh produce from verified American farms near you, with escrow-protected checkout and 24-48 hour delivery." },
      { property: "og:title", content: "Marketplace — DiGiFaMaR" },
      { property: "og:description", content: "Browse fresh produce from verified American farms near you." },
      { property: "og:url", content: "https://farmer-forward.lovable.app/market" },
    ],
    links: [{ rel: "canonical", href: "https://farmer-forward.lovable.app/market" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "DiGiFaMaR Marketplace",
          url: "https://farmer-forward.lovable.app/market",
          description: "Fresh produce from verified American farms.",
        }),
      },
    ],
  }),
  component: Marketplace,
});

const PRICE_TIERS = [
  { label: "Any price", min: 0, max: Infinity },
  { label: "Under $10", min: 0, max: 10 },
  { label: "$10–$25", min: 10, max: 25 },
  { label: "$25+", min: 25, max: Infinity },
];
const DISTANCES = [10, 25, 50, 100];

function Marketplace() {
  const [location, setLocation] = useState("Detecting location…");
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [tier, setTier] = useState(0);
  const [maxDist, setMaxDist] = useState(100);
  const [active, setActive] = useState<Product | null>(null);

  const detect = () => {
    setLocation("Locating…");
    if (!navigator.geolocation) return setLocation("Asheville, NC");
    navigator.geolocation.getCurrentPosition(
      () => setLocation("Your area · auto-detected"),
      () => setLocation("Asheville, NC"),
      { timeout: 4000 },
    );
  };

  const filtered = useMemo(() => {
    const t = PRICE_TIERS[tier];
    return products.filter((p) => {
      const f = getFarm(p.farmId);
      if (cat !== "all" && p.category !== cat) return false;
      if (p.price < t.min || p.price > t.max) return false;
      if (f && f.distance > maxDist) return false;
      if (query && !`${p.name} ${p.variety ?? ""} ${f?.name ?? ""}`.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [cat, tier, maxDist, query]);

  const gridRef = useReveal<HTMLDivElement>({ stagger: 0.05, y: 32, scale: 0.96 });

  return (
    <AppShell role="buyer">
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
        <div className="flex flex-col gap-3">
          <button
            onClick={detect}
            className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-card"
          >
            <MapPin className="h-3.5 w-3.5" /> {location}
          </button>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tomatoes, honey, farms…"
              className="h-12 pl-10 bg-card/60 backdrop-blur"
            />
          </div>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          <Chip active={cat === "all"} onClick={() => setCat("all")}>All</Chip>
          {categories.map((c) => (
            <Chip key={c.slug} active={cat === c.slug} onClick={() => setCat(c.slug)}>
              <span>{c.emoji}</span> {c.name}
            </Chip>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 text-muted-foreground"><Filter className="h-3.5 w-3.5" /> Filters:</span>
          {PRICE_TIERS.map((p, i) => (
            <Chip key={p.label} active={tier === i} onClick={() => setTier(i)} small>{p.label}</Chip>
          ))}
          <span className="ml-2 text-muted-foreground">Within</span>
          {DISTANCES.map((d) => (
            <Chip key={d} active={maxDist === d} onClick={() => setMaxDist(d)} small>{d} mi</Chip>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3">
          <div className="flex items-center gap-2 text-sm">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="font-semibold text-primary">Fresh today</span>
            <span className="text-muted-foreground">· {filtered.filter(p => p.delivery === "24h").length} items harvested in the last 24h</span>
          </div>
        </div>

        <div
          ref={gridRef}
          className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4"
        >
          {filtered.map((p) => {
            const farm = getFarm(p.farmId);
            return (
              <button
                key={p.id}
                data-reveal
                onClick={() => setActive(p)}
                className="card-lift group flex flex-col overflow-hidden rounded-2xl border border-border bg-card text-left"
              >
                <div className="relative aspect-square overflow-hidden bg-muted">
                  <img
                    src={p.image}
                    alt={p.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  {p.delivery === "24h" && (
                    <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                      <Sparkles className="h-3 w-3" /> Fresh today
                    </span>
                  )}
                  {p.organic && (
                    <span className="absolute right-2 top-2 rounded-full bg-badge-organic px-2 py-0.5 text-[10px] font-bold text-badge-organic-foreground">
                      Organic
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1 p-3">
                  <p className="line-clamp-1 text-sm font-semibold">{p.name}</p>
                  {farm && (
                    <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <BadgeCheck className="h-3 w-3 text-primary" />
                      <span className="truncate">{farm.name}</span>
                    </p>
                  )}
                  <div className="mt-1 flex items-center justify-between">
                    <p className="text-base font-bold text-primary">${p.price.toFixed(2)}<span className="text-[10px] font-normal text-muted-foreground">/{p.unit}</span></p>
                    <p className="flex items-center gap-0.5 text-[11px]">
                      <Star className="h-3 w-3 fill-badge-gold text-badge-gold" />
                      {p.rating}
                    </p>
                  </div>
                  {farm && (
                    <p className="text-[10px] text-muted-foreground">{farm.distance.toFixed(1)} mi away</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="mt-12 text-center text-sm text-muted-foreground">
            No products match those filters.{" "}
            <Button variant="link" onClick={() => { setCat("all"); setTier(0); setMaxDist(100); setQuery(""); }}>
              Reset
            </Button>
          </div>
        )}
      </div>

      <ProductSheet product={active} open={!!active} onOpenChange={(v) => !v && setActive(null)} />
    </AppShell>
  );
}

function Chip({
  active,
  onClick,
  children,
  small = false,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  small?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border whitespace-nowrap transition ${
        small ? "px-3 py-1 text-[11px]" : "px-3 py-1.5 text-xs"
      } font-semibold ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card/60 text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
