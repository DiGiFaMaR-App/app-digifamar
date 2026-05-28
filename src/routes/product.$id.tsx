import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, BadgeCheck, Lock, MapPin, ShieldCheck, Sparkles, Star, Truck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { getFarm, getProduct } from "@/lib/mock-data";

export const Route = createFileRoute("/product/$id")({
  head: ({ params }) => {
    const p = getProduct(params.id);
    const url = `https://farmer-forward.lovable.app/product/${params.id}`;
    const title = p ? `${p.name} — DiGiFaMaR` : "Product — DiGiFaMaR";
    const desc = p?.description ?? "Farm-fresh product on DiGiFaMaR.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
        { property: "og:type", content: "product" },
        ...(p?.image ? [{ property: "og:image", content: p.image }] : []),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: p
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Product",
                name: p.name,
                image: p.image,
                description: p.description,
                offers: {
                  "@type": "Offer",
                  price: p.price,
                  priceCurrency: "USD",
                  availability: "https://schema.org/InStock",
                  url,
                },
              }),
            },
          ]
        : [],
    };
  },
  loader: ({ params }) => {
    const p = getProduct(params.id);
    if (!p) throw notFound();
    return { product: p };
  },
  component: ProductPage,
  notFoundComponent: () => (
    <AppShell><div className="p-10 text-center text-muted-foreground">Product not found.</div></AppShell>
  ),
});

function ProductPage() {
  const { product } = Route.useLoaderData() as { product: NonNullable<ReturnType<typeof getProduct>> };
  const farm = getFarm(product.farmId);
  const navigate = useNavigate();

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-4 pt-4 sm:px-6">
        <Link to="/market" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to marketplace
        </Link>

        <div className="mt-4 grid gap-6 md:grid-cols-2">
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <img src={product.image} alt={product.name} className="h-full w-full object-cover aspect-square" />
          </div>

          <div className="flex flex-col">
            <div className="flex flex-wrap items-center gap-2">
              {product.delivery === "24h" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-bold text-primary-foreground">
                  <Sparkles className="h-3 w-3" /> Fresh today
                </span>
              )}
              {product.organic && (
                <span className="rounded-full bg-badge-organic px-2.5 py-0.5 text-[11px] font-bold text-badge-organic-foreground">
                  Organic
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                Freshness {product.freshnessScore}/10 · Grade {product.freshnessGrade}
              </span>
            </div>

            <h1 className="mt-3 text-2xl font-extrabold sm:text-3xl">{product.name}</h1>
            {product.variety && <p className="text-sm text-muted-foreground">{product.variety}</p>}

            <div className="mt-3 flex items-baseline gap-2">
              <p className="text-3xl font-extrabold text-primary">${product.price.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">/ {product.unit}</p>
              <p className="ml-auto flex items-center gap-1 text-sm">
                <Star className="h-4 w-4 fill-badge-gold text-badge-gold" /> {product.rating}
                <span className="text-muted-foreground">({product.reviews})</span>
              </p>
            </div>

            <p className="mt-4 text-sm text-muted-foreground">{product.description}</p>

            {/* Farm profile */}
            {farm && (
              <Link
                to="/market"
                className="mt-5 flex items-center gap-3 rounded-xl border border-border bg-card/60 p-3 hover:border-primary/40"
              >
                <img src={farm.image} alt={farm.name} className="h-12 w-12 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1 text-sm font-semibold">
                    <BadgeCheck className="h-4 w-4 text-primary" /> {farm.name}
                  </p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {farm.location} · {farm.distance.toFixed(1)} mi
                  </p>
                </div>
                <span className="text-xs font-semibold text-primary">View →</span>
              </Link>
            )}

            {/* Escrow card */}
            <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-primary">
                <ShieldCheck className="h-4 w-4" /> Escrow-protected checkout
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Your payment is held securely until you confirm delivery. The farmer is paid the moment you mark your order received with a 6-digit code. Full refund if anything's off — 72 hours.
              </p>
              <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Lock className="h-3 w-3 text-primary" /> Stripe-secured</span>
                <span className="inline-flex items-center gap-1"><Truck className="h-3 w-3 text-primary" /> {product.delivery === "24h" ? "24-hour" : "48-hour"} delivery</span>
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <Button
                size="lg"
                onClick={() => navigate({ to: "/payment-success", search: { id: product.id } })}
                className="flex-1 h-12 bg-primary text-primary-foreground hover:bg-primary-hover shadow-[0_0_30px_-8px_color-mix(in_oklab,var(--primary)_60%,transparent)]"
              >
                Buy now · ${product.price.toFixed(2)}
              </Button>
              <Button size="lg" variant="outline" className="h-12">
                Add to cart
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
