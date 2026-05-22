import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  BadgeCheck,
  Heart,
  MapPin,
  MessageSquare,
  Star,
} from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/Cards";
import { farms, getFarm, getProductsByFarm, products } from "@/lib/mock-data";

export const Route = createFileRoute("/farm/$id")({
  loader: ({ params }) => {
    const farm = getFarm(params.id);
    if (!farm) throw notFound();
    return { farm };
  },
  head: ({ loaderData }) => {
    const f = loaderData?.farm;
    if (!f) return { meta: [{ title: "Farm not found | DiGiFaMaR" }] };
    return {
      meta: [
        { title: `${f.name} — ${f.location} | DiGiFaMaR` },
        { name: "description", content: f.description },
        { property: "og:title", content: `${f.name} | DiGiFaMaR` },
        { property: "og:description", content: f.description },
        { property: "og:type", content: "profile" },
        { property: "og:image", content: f.image },
      ],
    };
  },
  component: FarmPage,
});

function FarmPage() {
  const { farm } = Route.useLoaderData();
  const farmProducts = getProductsByFarm(farm.id);
  const fallback = farmProducts.length ? farmProducts : products.slice(0, 3);
  const nearby = farms.filter((f) => f.id !== farm.id).slice(0, 3);

  return (
    <SiteLayout>
      <div className="relative h-64 sm:h-80">
        <img
          src={farm.image}
          alt={farm.name}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
      </div>

      <div className="mx-auto -mt-16 max-w-7xl px-4 sm:px-6">
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-extrabold sm:text-4xl">
                  {farm.name}
                </h1>
                {farm.verified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-badge-verified px-2 py-0.5 text-xs font-semibold text-badge-verified-foreground">
                    <BadgeCheck className="h-3.5 w-3.5" /> Verified
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                <MapPin className="mr-0.5 inline h-4 w-4" />
                {farm.location} · est. {farm.established}
              </p>
              <p className="mt-2 flex items-center gap-3 text-sm">
                <span className="flex items-center gap-0.5">
                  <Star className="h-4 w-4 fill-badge-gold text-badge-gold" />
                  <strong>{farm.rating}</strong> ({farm.reviews} reviews)
                </span>
                <span>·</span>
                <span className="text-muted-foreground">
                  {farm.totalSales.toLocaleString()} total sales
                </span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button>
                <Heart className="mr-1 h-4 w-4" /> Follow farm
              </Button>
              <Button variant="outline">
                <MessageSquare className="mr-1 h-4 w-4" /> Message
              </Button>
            </div>
          </div>
          <p className="mt-4 max-w-3xl text-sm text-muted-foreground">
            {farm.description}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {farm.certifications.map((c) => (
              <span
                key={c}
                className="rounded-full bg-leaf-soft px-3 py-1 text-xs font-semibold text-primary"
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <section>
          <h2 className="text-2xl font-extrabold">
            Products from {farm.name.split(" ")[0]}
          </h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {fallback.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>

        <section className="mt-16 grid gap-8 md:grid-cols-3">
          <div className="md:col-span-2 rounded-2xl border border-border bg-card p-6">
            <h2 className="text-xl font-bold">About the farmer</h2>
            <div className="mt-4 flex gap-4">
              <img
                src={farm.image}
                alt=""
                loading="lazy"
                className="h-20 w-20 rounded-full object-cover"
              />
              <p className="text-sm text-muted-foreground">
                Family-run for {2026 - farm.established} years. Our practices
                center on soil health, animal welfare, and feeding our neighbors
                better food. We're proud to ship across America through
                DiGiFaMaR.
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-xl font-bold">Find us</h2>
            <div className="mt-3 aspect-square overflow-hidden rounded-xl bg-leaf-soft">
              <div className="grid h-full place-items-center">
                <div className="text-center">
                  <MapPin className="mx-auto h-8 w-8 text-primary" />
                  <p className="mt-2 text-sm font-semibold">{farm.location}</p>
                  <p className="text-xs text-muted-foreground">
                    Interactive map next phase
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-16">
          <h2 className="text-2xl font-extrabold">Nearby farms</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-3">
            {nearby.map((f) => (
              <Link
                key={f.id}
                to="/farm/$id"
                params={{ id: f.id }}
                className="card-lift overflow-hidden rounded-xl border border-border bg-card"
              >
                <img
                  src={f.image}
                  alt={f.name}
                  loading="lazy"
                  className="h-32 w-full object-cover"
                />
                <div className="p-3">
                  <p className="font-semibold">{f.name}</p>
                  <p className="text-xs text-muted-foreground">{f.location}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </SiteLayout>
  );
}
