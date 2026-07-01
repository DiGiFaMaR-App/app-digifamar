import { Link } from "@tanstack/react-router";
import { Star, MapPin, BadgeCheck, Zap, Package, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type Product, type Farm, getFarm } from "@/lib/mock-data";

export function ProductCard({ product }: { product: Product }) {
  const farm = getFarm(product.farmId);
  return (
    <div className="card-lift group flex flex-col overflow-hidden rounded-xl border border-border bg-card">
      <Link
        to="/product/$id"
        params={{ id: product.id }}
        className="relative block aspect-[4/3] overflow-hidden bg-muted"
      >
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute left-2 top-2 flex flex-wrap gap-1">
          {product.organic && (
            <span className="inline-flex items-center gap-1 rounded-full bg-badge-organic px-2 py-0.5 text-[10px] font-semibold text-badge-organic-foreground">
              <Leaf className="h-3 w-3" /> Organic
            </span>
          )}
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              product.delivery === "24h"
                ? "bg-badge-delivery text-badge-delivery-foreground"
                : "bg-muted text-foreground"
            }`}
          >
            {product.delivery === "24h" ? (
              <Zap className="h-3 w-3" />
            ) : (
              <Package className="h-3 w-3" />
            )}
            {product.delivery}
          </span>
        </div>
        <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-card/95 px-2 py-0.5 text-[10px] font-bold text-primary">
          Grade {product.freshnessGrade}
        </span>
      </Link>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <Link
          to="/product/$id"
          params={{ id: product.id }}
          className="line-clamp-1 font-semibold hover:text-primary"
        >
          {product.name}
        </Link>
        {farm && (
          <Link
            to="/farm/$id"
            params={{ id: farm.id }}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
          >
            <BadgeCheck className="h-3.5 w-3.5 text-badge-verified" />
            <span className="truncate">{farm.name}</span>
            <span className="ml-auto inline-flex items-center gap-0.5">
              <MapPin className="h-3 w-3" /> {farm.distance.toFixed(1)}mi
            </span>
          </Link>
        )}
        <div className="mt-1 flex items-end justify-between">
          <div>
            <p className="text-lg font-bold text-foreground">
              ${product.price.toFixed(2)}
              <span className="text-xs font-normal text-muted-foreground">/{product.unit}</span>
            </p>
            <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Star className="h-3 w-3 fill-badge-gold text-badge-gold" />
              {product.rating} ({product.reviews})
            </p>
          </div>
          <Button size="sm" className="rounded-full">
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}

export function FarmCard({ farm }: { farm: Farm }) {
  return (
    <Link
      to="/farm/$id"
      params={{ id: farm.id }}
      className="card-lift group flex flex-col overflow-hidden rounded-xl border border-border bg-card"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        <img
          src={farm.image}
          alt={farm.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {farm.topSeller && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-badge-gold px-2.5 py-0.5 text-[11px] font-bold text-badge-gold-foreground">
            ⭐ Top Seller
          </span>
        )}
        {farm.verified && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-badge-verified px-2.5 py-0.5 text-[11px] font-semibold text-badge-verified-foreground">
            <BadgeCheck className="h-3.5 w-3.5" /> Verified
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-foreground group-hover:text-primary">{farm.name}</h3>
          <span className="flex shrink-0 items-center gap-0.5 text-sm font-semibold">
            <Star className="h-4 w-4 fill-badge-gold text-badge-gold" />
            {farm.rating}
          </span>
        </div>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" /> {farm.location} · {farm.distance.toFixed(1)} mi
        </p>
        <p className="line-clamp-2 text-sm text-muted-foreground">{farm.description}</p>
        <div className="mt-1 flex flex-wrap gap-1">
          {farm.certifications.slice(0, 2).map((c) => (
            <span
              key={c}
              className="rounded-full bg-leaf-soft px-2 py-0.5 text-[10px] font-medium text-primary"
            >
              {c}
            </span>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
          <span className="text-xs text-muted-foreground">
            {farm.totalSales.toLocaleString()} sales · est. {farm.established}
          </span>
          <span className="text-xs font-semibold text-primary">Shop Now →</span>
        </div>
      </div>
    </Link>
  );
}
