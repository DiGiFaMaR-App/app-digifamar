import { useNavigate } from "@tanstack/react-router";
import { BadgeCheck, Lock, MapPin, ShieldCheck, Sparkles, Star, Truck, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { getFarm, type Product } from "@/lib/mock-data";

export function ProductSheet({
  product,
  open,
  onOpenChange,
}: {
  product: Product | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  const [active, setActive] = useState(0);
  const farm = product ? getFarm(product.farmId) : null;

  if (!product) return null;
  // Synthesize a small "gallery" by reusing the product + farm images
  const gallery = [product.image, farm?.image, product.image].filter(Boolean) as string[];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[92vh] overflow-y-auto border-t border-border bg-background p-0 sm:rounded-t-3xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border/60 bg-background/85 px-4 py-3 backdrop-blur">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Product details
          </span>
          <button
            onClick={() => onOpenChange(false)}
            aria-label="Close"
            className="rounded-full p-1.5 text-muted-foreground hover:bg-card hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mx-auto max-w-3xl px-4 pb-10 pt-4 sm:px-6">
          {/* Gallery */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <img
              src={gallery[active]}
              alt={product.name}
              className="aspect-square w-full object-cover"
            />
          </div>
          {gallery.length > 1 && (
            <div className="mt-2 flex gap-2">
              {gallery.map((src, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  className={`h-14 w-14 overflow-hidden rounded-lg border-2 transition ${
                    i === active ? "border-primary" : "border-border opacity-70 hover:opacity-100"
                  }`}
                >
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-2">
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

          <h2 className="mt-3 text-2xl font-extrabold sm:text-3xl">{product.name}</h2>
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

          {farm && (
            <div className="mt-5 flex items-center gap-3 rounded-xl border border-border bg-card/60 p-3">
              <img src={farm.image} alt={farm.name} className="h-12 w-12 rounded-lg object-cover" />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1 text-sm font-semibold">
                  <BadgeCheck className="h-4 w-4 text-primary" /> {farm.name}
                </p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" /> {farm.location} · {farm.distance.toFixed(1)} mi
                </p>
              </div>
              <span className="text-xs font-semibold text-primary">★ {farm.rating}</span>
            </div>
          )}

          <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-primary">
              <ShieldCheck className="h-4 w-4" /> Escrow-protected checkout
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Your payment is held until you confirm delivery with a 6-digit code. Full refund within 72 hours if anything's off.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Lock className="h-3 w-3 text-primary" /> Stripe-secured
              </span>
              <span className="inline-flex items-center gap-1">
                <Truck className="h-3 w-3 text-primary" />{" "}
                {product.delivery === "24h" ? "24-hour" : "48-hour"} delivery
              </span>
            </div>
          </div>

          <div className="mt-5 flex gap-2">
            <Button
              size="lg"
              onClick={() => {
                onOpenChange(false);
                navigate({ to: "/payment-success", search: { id: product.id } });
              }}
              className="flex-1 h-12 bg-primary text-primary-foreground hover:bg-primary-hover shadow-[0_0_30px_-8px_color-mix(in_oklab,var(--primary)_60%,transparent)]"
            >
              Buy now · ${product.price.toFixed(2)}
            </Button>
            <Button size="lg" variant="outline" className="h-12">
              Add to cart
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
