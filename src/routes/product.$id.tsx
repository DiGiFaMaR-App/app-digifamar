import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import {
  BadgeCheck,
  Heart,
  Leaf,
  MapPin,
  MessageSquare,
  Minus,
  Package,
  Plus,
  ShieldCheck,
  Sparkles,
  Star,
  Truck,
  Zap,
} from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { ProductCard } from "@/components/Cards";
import { getFarm, getProduct, products } from "@/lib/mock-data";

export const Route = createFileRoute("/product/$id")({
  loader: ({ params }) => {
    const product = getProduct(params.id);
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData }) => {
    const p = loaderData?.product;
    if (!p) return { meta: [{ title: "Product not found | DiGiFaMaR" }] };
    return {
      meta: [
        { title: `${p.name} — ${p.variety ?? ""} | DiGiFaMaR` },
        { name: "description", content: p.description },
        { property: "og:title", content: `${p.name} | DiGiFaMaR` },
        { property: "og:description", content: p.description },
        { property: "og:type", content: "product" },
        { property: "og:image", content: p.image },
      ],
    };
  },
  component: ProductPage,
});

function ProductPage() {
  const { product } = Route.useLoaderData();
  const farm = getFarm(product.farmId);
  const [qty, setQty] = useState(1);
  const similar = products.filter((p) => p.id !== product.id).slice(0, 4);

  return (
    <SiteLayout>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-4 text-xs text-muted-foreground">
          <Link to="/browse" className="hover:text-primary">
            Browse
          </Link>{" "}
          / <span className="capitalize">{product.category}</span> /{" "}
          <span className="text-foreground">{product.name}</span>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted">
              <img
                src={product.image}
                alt={product.name}
                className="h-full w-full object-cover"
              />
              <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
                <Sparkles className="h-3.5 w-3.5" />
                AI Freshness Grade {product.freshnessGrade} ·{" "}
                {product.freshnessScore}/10
              </span>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {[product.image, product.image, product.image, product.image].map(
                (img, i) => (
                  <div
                    key={i}
                    className="aspect-square overflow-hidden rounded-lg border border-border bg-muted"
                  >
                    <img
                      src={img}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </div>
                )
              )}
            </div>
          </div>

          <div className="space-y-5">
            <div>
              {product.organic && (
                <span className="inline-flex items-center gap-1 rounded-full bg-badge-organic px-2.5 py-0.5 text-xs font-semibold text-badge-organic-foreground">
                  <Leaf className="h-3 w-3" /> USDA Organic
                </span>
              )}
              <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">
                {product.name}
              </h1>
              {product.variety && (
                <p className="mt-1 text-muted-foreground">{product.variety}</p>
              )}
              <div className="mt-2 flex items-center gap-3 text-sm">
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-badge-gold text-badge-gold" />
                  {product.rating} ({product.reviews} reviews)
                </span>
                <span className="text-muted-foreground">
                  Only{" "}
                  <strong className="text-foreground">{product.stock}</strong>{" "}
                  {product.unit} remaining
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-3xl font-extrabold">
                ${product.price.toFixed(2)}
                <span className="text-base font-normal text-muted-foreground">
                  /{product.unit}
                </span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Minimum order: 1 {product.unit}
              </p>
              <div className="mt-4 flex items-center gap-3">
                <div className="flex items-center rounded-lg border border-border">
                  <button
                    onClick={() => setQty(Math.max(1, qty - 1))}
                    className="px-3 py-2 hover:bg-muted"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-10 text-center font-semibold">{qty}</span>
                  <button
                    onClick={() => setQty(qty + 1)}
                    className="px-3 py-2 hover:bg-muted"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <Button
                  size="lg"
                  className="flex-1 bg-secondary text-secondary-foreground hover:bg-secondary-hover"
                >
                  Add to cart · ${(product.price * qty).toFixed(2)}
                </Button>
                <Button size="lg" variant="outline" aria-label="Save">
                  <Heart className="h-5 w-5" />
                </Button>
              </div>

              <div className="mt-5 space-y-2 border-t border-border pt-4">
                <DeliveryRow
                  icon={Zap}
                  label="24-Hour Local Delivery"
                  price="$6.99"
                  active={product.delivery === "24h"}
                />
                <DeliveryRow
                  icon={Package}
                  label="48-Hour Standard"
                  price="$3.99"
                />
                <DeliveryRow icon={Truck} label="Farm Pickup" price="Free" />
              </div>
            </div>

            {farm && (
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex gap-4">
                  <img
                    src={farm.image}
                    alt={farm.name}
                    loading="lazy"
                    className="h-16 w-16 rounded-lg object-cover"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-bold">{farm.name}</h3>
                      <BadgeCheck className="h-4 w-4 text-badge-verified" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <MapPin className="mr-0.5 inline h-3 w-3" />
                      {farm.location} · {farm.distance.toFixed(1)} mi away
                    </p>
                    <p className="mt-0.5 text-xs">
                      <Star className="mr-0.5 inline h-3 w-3 fill-badge-gold text-badge-gold" />
                      {farm.rating} ({farm.reviews} reviews) ·{" "}
                      {farm.totalSales.toLocaleString()} sales
                    </p>
                  </div>
                </div>
                <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                  {farm.description}
                </p>
                <div className="mt-4 flex gap-2">
                  <Button asChild size="sm" variant="outline" className="flex-1">
                    <Link to="/farm/$id" params={{ id: farm.id }}>
                      View farm
                    </Link>
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1">
                    <MessageSquare className="mr-1 h-4 w-4" /> Message
                  </Button>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-leaf-soft p-4 text-sm">
              <ShieldCheck className="h-5 w-5 shrink-0 text-primary" />
              <p>
                <strong>Escrow protected.</strong> Your payment is held safely
                until you confirm delivery. 72-hour refund guarantee.
              </p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="description" className="mt-12">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="description">Description</TabsTrigger>
            <TabsTrigger value="farm">Farm Story</TabsTrigger>
            <TabsTrigger value="nutrition">Nutrition</TabsTrigger>
            <TabsTrigger value="reviews">Reviews ({product.reviews})</TabsTrigger>
            <TabsTrigger value="shipping">Shipping</TabsTrigger>
          </TabsList>
          <TabsContent value="description" className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            {product.description} Harvested and packed within hours of shipment,
            this product is graded by our AI freshness analyzer to ensure
            consistent peak quality.
          </TabsContent>
          <TabsContent value="farm" className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            {farm?.description}
          </TabsContent>
          <TabsContent value="nutrition" className="mt-4 max-w-md text-sm">
            <table className="w-full text-left">
              <tbody className="divide-y divide-border">
                {[
                  ["Calories", "32 / serving"],
                  ["Carbs", "7 g"],
                  ["Protein", "1.5 g"],
                  ["Fiber", "2.1 g"],
                ].map(([k, v]) => (
                  <tr key={k}>
                    <td className="py-2 text-muted-foreground">{k}</td>
                    <td className="py-2 font-semibold">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TabsContent>
          <TabsContent value="reviews" className="mt-4 max-w-3xl space-y-4">
            {[
              { n: "Anna R.", t: "Absolutely incredible. Will buy again!" },
              { n: "Michael P.", t: "Arrived in perfect condition, very fresh." },
              { n: "Jenna H.", t: "Best I've had in years. Worth every penny." },
            ].map((r, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{r.n}</p>
                  <div className="flex text-badge-gold">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-current" />
                    ))}
                  </div>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{r.t}</p>
              </div>
            ))}
          </TabsContent>
          <TabsContent value="shipping" className="mt-4 max-w-3xl text-sm text-muted-foreground">
            Shipped from {farm?.location}. 24-hour local delivery available
            within 50 miles. 48-hour standard ships nationwide via refrigerated
            carrier.
          </TabsContent>
        </Tabs>

        <section className="mt-16">
          <h2 className="text-2xl font-extrabold">You might also like</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {similar.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      </div>
    </SiteLayout>
  );
}

function DeliveryRow({
  icon: Icon,
  label,
  price,
  active,
}: {
  icon: React.ElementType;
  label: string;
  price: string;
  active?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${
        active ? "border-primary bg-leaf-soft" : "border-border"
      }`}
    >
      <span className="flex items-center gap-2">
        <Icon className="h-4 w-4" /> {label}
      </span>
      <span className="font-semibold">{price}</span>
    </div>
  );
}
