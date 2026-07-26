import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  BadgeCheck,
  CheckCircle2,
  Lock,
  MapPin,
  ShieldCheck,
  ShoppingCart,
  Star,
  Truck,
  X,
} from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useCart } from "@/hooks/use-cart";
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
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const farm = product ? getFarm(product.farmId) : null;

  if (!product) return null;

  const cartItem = product
    ? {
        productId: product.id,
        name: product.name,
        unitPrice: product.price,
        unit: product.unit,
        image: product.image,
        farmId: product.farmId,
      }
    : null;

  const handleAddToCart = () => {
    if (!cartItem) return;
    add(cartItem);
    setAdded(true);
    toast.success("Added to cart");
  };

  const handleBuyNow = () => {
    if (!cartItem) return;
    add(cartItem);
    onOpenChange(false);
    navigate({ to: "/checkout" });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[92vh] rounded-t-3xl p-0 sm:h-[85vh]">
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground hover:bg-muted"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="h-full overflow-y-auto px-5 pb-8 pt-6 sm:px-8">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-muted">
            <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
            <div className="absolute left-3 top-3 rounded-full bg-background/90 px-2.5 py-1 text-xs font-semibold text-foreground backdrop-blur">
              {product.category}
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
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

          <EscrowInfo product={product} />

          <div className="mt-5 flex gap-2">
            <Button
              size="lg"
              onClick={handleBuyNow}
              className="flex-1 h-12 bg-primary text-primary-foreground hover:bg-primary-hover shadow-[0_0_30px_-8px_color-mix(in_oklab,var(--primary)_60%,transparent)]"
            >
              <ShoppingCart className="mr-1 h-4 w-4" /> Buy now · ${product.price.toFixed(2)}
            </Button>
            <Button size="lg" variant="outline" className="h-12" onClick={handleAddToCart}>
              {added ? (
                <>
                  <CheckCircle2 className="mr-1 h-5 w-5" /> Added
                </>
              ) : (
                "Add to cart"
              )}
            </Button>
          </div>

          <TrustBadges />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function EscrowInfo({ product }: { product: Product }) {
  return (
    <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-primary">
        <ShieldCheck className="h-4 w-4" /> Escrow-protected checkout
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Your payment is held until you confirm delivery with a 6-digit code. Full refund within 72
        hours if anything&apos;s off.
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
  );
}

function TrustBadges() {
  const items = [
    { icon: Lock, label: "256-bit SSL" },
    { icon: ShieldCheck, label: "Escrow protected" },
    { icon: BadgeCheck, label: "Verified farm" },
    { icon: Truck, label: "72h refund" },
  ];
  return (
    <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map((it) => (
        <div
          key={it.label}
          className="flex items-center gap-2 rounded-lg border border-border bg-card/60 px-3 py-2 text-[11px] font-semibold text-muted-foreground"
        >
          <it.icon className="h-3.5 w-3.5 text-primary" /> {it.label}
        </div>
      ))}
    </div>
  );
}
