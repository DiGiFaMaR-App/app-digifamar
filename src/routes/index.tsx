import { createFileRoute, Link } from "@tanstack/react-router";
import { Fragment, useState } from "react";
import {
  MapPin,
  ArrowRight,
  Shield,
  CheckCircle2,
  Star,
  ShoppingCart,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SiteLayout } from "@/components/SiteLayout";
import { products, getFarm } from "@/lib/mock-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DiGiFaMaR — From American Farms, Direct To You" },
      {
        name: "description",
        content:
          "Escrow-protected marketplace connecting verified farmers with buyers across all 50 states.",
      },
      { property: "og:title", content: "DiGiFaMaR — From American Farms, Direct To You" },
      {
        property: "og:description",
        content:
          "Escrow-protected marketplace connecting verified farmers with buyers across all 50 states.",
      },
      { property: "og:url", content: "https://app.digifamar.com/" },
    ],
    links: [{ rel: "canonical", href: "https://app.digifamar.com/" }],
  }),
  component: HomePage,
});

// ─────────────────────────────────────────────────────────────────
// HERO
// ─────────────────────────────────────────────────────────────────
function HeroSection() {
  const [location, setLocation] = useState("");
  const [detecting, setDetecting] = useState(false);

  function detectLocation() {
    setDetecting(true);
    if (!navigator.geolocation) {
      setLocation("Your area");
      setDetecting(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation(
          `${pos.coords.latitude.toFixed(2)}°N, ${pos.coords.longitude.toFixed(2)}°W`,
        );
        setDetecting(false);
      },
      () => {
        setLocation("Your area");
        setDetecting(false);
      },
      { timeout: 5000 },
    );
  }

  return (
    <section
      className="relative overflow-hidden px-4 py-24 sm:py-32 text-center"
      style={{
        background:
          "radial-gradient(ellipse at 50% -5%, #1e3d1e 0%, #060F06 65%)",
      }}
    >
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 40% at 50% 0%, rgba(45,122,46,0.18) 0%, transparent 70%)",
        }}
      />

      <div className="relative mx-auto max-w-3xl">
        {/* Pre-badge */}
        <div
          className="mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold"
          style={{
            borderColor: "rgba(45,122,46,0.45)",
            backgroundColor: "rgba(45,122,46,0.12)",
            color: "#4ADE80",
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: 7,
              height: 7,
              borderRadius: "50%",
              backgroundColor: "#4ADE80",
            }}
          />
          10,000+ Verified Farmers Nationwide
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white mb-5 leading-[1.1]">
          From American Farms,
          <br />
          <span style={{ color: "#4ADE80" }}>Direct To You</span>
        </h1>

        <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
          Escrow-protected marketplace connecting verified farmers with buyers
          across all 50 states
        </p>

        {/* Geolocation search */}
        <div className="flex flex-col sm:flex-row gap-2 max-w-xl mx-auto mb-8">
          <div className="relative flex-1">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Enter ZIP code or city…"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="pl-9 h-12 bg-card border-border text-foreground"
            />
          </div>
          <Button
            variant="outline"
            onClick={detectLocation}
            disabled={detecting}
            className="h-12 gap-2 whitespace-nowrap shrink-0"
          >
            <MapPin className="h-4 w-4" />
            {detecting ? "Detecting…" : "Detect Location"}
          </Button>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">
          <Button
            asChild
            size="lg"
            className="h-12 px-8 font-bold text-[#060F06] hover:opacity-90 transition-opacity"
            style={{ backgroundColor: "#4ADE80" }}
          >
            <Link to="/market">
              Browse Marketplace
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="h-12 px-8 font-semibold border-border hover:border-primary/40"
          >
            <Link to="/signup">Sell on DiGiFaMaR</Link>
          </Button>
        </div>

        {/* Trust badges */}
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <span>🔒 Secured by Escrow.com</span>
          <span className="hidden sm:inline" aria-hidden>·</span>
          <span>📍 50 States</span>
          <span className="hidden sm:inline" aria-hidden>·</span>
          <span>🌾 10,000+ Verified Farmers</span>
          <span className="hidden sm:inline" aria-hidden>·</span>
          <span>⭐ 98% Delivery Rate</span>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────
// HOW IT WORKS
// ─────────────────────────────────────────────────────────────────
const HOW_STEPS = [
  {
    icon: "🗺️",
    title: "Find Local Farms",
    desc: "Browse verified farms near you by product, distance, and certifications.",
  },
  {
    icon: "🔐",
    title: "Order with Escrow",
    desc: "Your payment is held securely by Escrow.com until delivery is confirmed.",
  },
  {
    icon: "🌾",
    title: "Receive Farm Fresh",
    desc: "Confirm delivery with your 6-digit code — funds release to the farmer automatically.",
  },
];

function HowItWorks() {
  return (
    <section className="py-20 px-4" style={{ backgroundColor: "#060F06" }}>
      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-12">
          <p
            className="text-xs font-bold tracking-[0.2em] uppercase mb-3"
            style={{ color: "#4ADE80" }}
          >
            Simple Process
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            How It Works
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {HOW_STEPS.map((step, i) => (
            <div
              key={step.title}
              className="relative rounded-2xl p-7 border"
              style={{
                backgroundColor: "#132013",
                borderColor: "rgba(45,122,46,0.25)",
              }}
            >
              {/* Step number + icon */}
              <div className="flex items-center gap-3 mb-5">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold"
                  style={{
                    backgroundColor: "rgba(74,222,128,0.12)",
                    color: "#4ADE80",
                  }}
                >
                  {i + 1}
                </div>
                <span className="text-2xl">{step.icon}</span>
              </div>
              <h3 className="text-base font-semibold text-white mb-2">
                {step.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {step.desc}
              </p>

              {/* Connector arrow between cards (desktop) */}
              {i < HOW_STEPS.length - 1 && (
                <div
                  className="hidden md:flex absolute -right-5 top-1/2 -translate-y-1/2 h-8 w-8 items-center justify-center rounded-full border z-10 text-xs font-bold"
                  style={{
                    backgroundColor: "#132013",
                    borderColor: "rgba(45,122,46,0.4)",
                    color: "#4ADE80",
                  }}
                >
                  →
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────
// ESCROW SECTION
// ─────────────────────────────────────────────────────────────────
const ESCROW_STEPS = [
  { icon: "💳", label: "Buyer Pays" },
  { icon: "🔒", label: "Funds Escrowed" },
  { icon: "🔢", label: "Buyer Gets 6-Digit Code" },
  { icon: "🚚", label: "Farmer Delivers" },
  { icon: "✅", label: "Buyer Confirms" },
  { icon: "📤", label: "Release Code Sent" },
  { icon: "⌨️", label: "Farmer Enters Code" },
  { icon: "💰", label: "Funds Released" },
];

function EscrowSection() {
  return (
    <section
      className="py-20 px-4"
      style={{
        background:
          "linear-gradient(180deg, #060F06 0%, #091409 50%, #060F06 100%)",
      }}
    >
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <div
            className="inline-flex items-center gap-2 mb-5 rounded-full border px-4 py-1.5 text-sm font-semibold"
            style={{
              borderColor: "rgba(45,122,46,0.4)",
              backgroundColor: "rgba(45,122,46,0.1)",
              color: "#4ADE80",
            }}
          >
            <Shield className="h-4 w-4" />
            Powered by Escrow.com
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            Every Transaction Protected by Escrow.com
          </h2>
          <p className="mt-3 text-muted-foreground max-w-md mx-auto text-sm">
            Funds are held in trust until you confirm receipt — no payment
            risk, ever.
          </p>
        </div>

        {/* 8-step flow — scrollable on mobile */}
        <div className="overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
          <div className="flex items-center min-w-max mx-auto">
            {ESCROW_STEPS.map((step, i) => (
              <Fragment key={step.label}>
                <div className="flex flex-col items-center gap-2.5 w-[100px] sm:w-28">
                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-full text-2xl border-2"
                    style={{
                      borderColor: "#2D7A2E",
                      backgroundColor: "#132013",
                    }}
                  >
                    {step.icon}
                  </div>
                  <span className="text-xs text-center text-muted-foreground leading-tight px-1">
                    {step.label}
                  </span>
                </div>
                {i < ESCROW_STEPS.length - 1 && (
                  <div
                    className="w-5 h-0.5 shrink-0 mb-5"
                    style={{ backgroundColor: "rgba(45,122,46,0.5)" }}
                  />
                )}
              </Fragment>
            ))}
          </div>
        </div>

        {/* Auto-refund badge */}
        <div className="mt-8 flex justify-center">
          <div
            className="inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold"
            style={{
              borderColor: "rgba(74,222,128,0.35)",
              backgroundColor: "rgba(74,222,128,0.08)",
              color: "#4ADE80",
            }}
          >
            <CheckCircle2 className="h-4 w-4" />
            Auto refund if delivery exceeds 72 hours
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────
// FEATURED PRODUCTS
// ─────────────────────────────────────────────────────────────────
type FeaturedProduct = (typeof products)[0];

function ProductCard({
  product,
  farmName,
  distance,
}: {
  product: FeaturedProduct;
  farmName: string;
  distance: number;
}) {
  function handleAddToCart() {
    toast.success(`${product.name} added to cart`, {
      description: "Escrow-protected purchase",
    });
  }

  return (
    <div
      className="rounded-2xl overflow-hidden border flex flex-col card-lift"
      style={{
        backgroundColor: "#132013",
        borderColor: "rgba(45,122,46,0.2)",
      }}
    >
      <div className="relative h-44 overflow-hidden bg-muted">
        <img
          src={product.image}
          alt={product.name}
          className="h-full w-full object-cover"
        />
        {product.organic && (
          <span
            className="absolute top-2 left-2 rounded-full px-2 py-0.5 text-xs font-bold"
            style={{ backgroundColor: "#2D7A2E", color: "#fff" }}
          >
            Organic
          </span>
        )}
        <span
          className="absolute top-2 right-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold border"
          style={{
            backgroundColor: "rgba(19,32,19,0.9)",
            borderColor: "rgba(45,122,46,0.5)",
            color: "#4ADE80",
          }}
        >
          🔒 Escrow
        </span>
      </div>

      <div className="p-4 flex flex-col flex-1">
        <p className="text-xs text-muted-foreground mb-0.5 truncate">
          {farmName}
        </p>
        <h3 className="font-semibold text-white text-sm mb-2 leading-snug">
          {product.name}
        </h3>

        <div className="flex items-center gap-1 mb-4 text-xs text-muted-foreground">
          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
          <span>
            {product.rating} ({product.reviews})
          </span>
          <span className="ml-auto flex items-center gap-0.5">
            <MapPin className="h-3 w-3" />
            {distance} mi
          </span>
        </div>

        <div className="mt-auto flex items-center justify-between gap-2">
          <span className="text-lg font-bold text-white">
            ${product.price}
            <span className="text-xs font-normal text-muted-foreground">
              /{product.unit}
            </span>
          </span>
          <Button
            size="sm"
            onClick={handleAddToCart}
            className="h-8 px-3 text-xs font-bold text-[#060F06] gap-1.5 shrink-0 hover:opacity-90"
            style={{ backgroundColor: "#4ADE80" }}
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}

const FEATURED_DISTANCES: Record<string, number> = {
  "blue-ridge": 8.2,
  "sunrise-orchards": 14.6,
  "morning-glory": 22.1,
  "golden-meadow": 31.4,
  "river-bend": 5.7,
  "homestead-hollow": 12.9,
};

function FeaturedProducts() {
  const featured = products.slice(0, 4);

  return (
    <section className="py-20 px-4" style={{ backgroundColor: "#060F06" }}>
      <div className="mx-auto max-w-6xl">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p
              className="text-xs font-bold tracking-[0.2em] uppercase mb-2"
              style={{ color: "#4ADE80" }}
            >
              Fresh Today
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              Featured Products
            </h2>
          </div>
          <Link
            to="/market"
            className="hidden sm:flex items-center gap-1 text-sm font-semibold transition-opacity hover:opacity-80"
            style={{ color: "#4ADE80" }}
          >
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {featured.map((product) => {
            const farm = getFarm(product.farmId);
            return (
              <ProductCard
                key={product.id}
                product={product}
                farmName={farm?.name ?? "Local Farm"}
                distance={FEATURED_DISTANCES[product.farmId] ?? 20}
              />
            );
          })}
        </div>

        <div className="mt-8 flex justify-center sm:hidden">
          <Button
            asChild
            variant="outline"
            className="gap-2"
          >
            <Link to="/market">
              View All Products <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────
// SUPPLY CHAIN COMPARISON
// ─────────────────────────────────────────────────────────────────
const TRADITIONAL_POINTS = [
  { icon: "📉", text: "Farmer receives ~25% of retail price", highlight: true },
  { icon: "📦", text: "75% markup through wholesaler + distributor", highlight: true },
  { icon: "🗓️", text: "5–10 days from farm to shelf" },
  { icon: "❌", text: "No direct farmer relationship" },
  { icon: "🚫", text: "No escrow or buyer protection" },
];

const DIGIFAMAR_POINTS = [
  { icon: "📈", text: "Farmer keeps 92% of sale price", highlight: true },
  { icon: "💰", text: "8% platform fee only", highlight: true },
  { icon: "⚡", text: "24–48 hour direct delivery" },
  { icon: "🤝", text: "Direct farmer relationship" },
  { icon: "🔒", text: "Full escrow protection on every order" },
];

function SupplyChainComparison() {
  return (
    <section
      className="py-20 px-4"
      style={{ backgroundColor: "#060F06" }}
    >
      <div className="mx-auto max-w-4xl">
        <div className="text-center mb-12">
          <p
            className="text-xs font-bold tracking-[0.2em] uppercase mb-3"
            style={{ color: "#4ADE80" }}
          >
            The DiGiFaMaR Difference
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            Why Direct Beats Traditional
          </h2>
          <p className="mt-3 text-muted-foreground text-sm">
            See what cutting out the middleman means for farmers and buyers
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Traditional */}
          <div
            className="rounded-2xl p-6 border"
            style={{
              backgroundColor: "rgba(31,10,10,0.8)",
              borderColor: "rgba(127,29,29,0.35)",
            }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div
                className="h-10 w-10 rounded-full flex items-center justify-center text-xl"
                style={{ backgroundColor: "rgba(127,29,29,0.2)" }}
              >
                ❌
              </div>
              <h3 className="text-lg font-semibold text-white">
                Traditional Supply Chain
              </h3>
            </div>
            <div className="space-y-3 mb-6">
              {TRADITIONAL_POINTS.map((pt, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2.5 text-sm"
                  style={{ color: pt.highlight ? "#f87171" : "#6b7280" }}
                >
                  <span className="mt-0.5 shrink-0">{pt.icon}</span>
                  <span>{pt.text}</span>
                </div>
              ))}
            </div>
            <div
              className="rounded-xl py-3 text-center text-xl font-bold"
              style={{
                backgroundColor: "rgba(127,29,29,0.2)",
                color: "#f87171",
              }}
            >
              Farmer keeps ~25%
            </div>
          </div>

          {/* DiGiFaMaR */}
          <div
            className="rounded-2xl p-6 border"
            style={{
              backgroundColor: "#132013",
              borderColor: "rgba(45,122,46,0.45)",
            }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div
                className="h-10 w-10 rounded-full flex items-center justify-center text-xl"
                style={{ backgroundColor: "rgba(45,122,46,0.2)" }}
              >
                ✅
              </div>
              <h3 className="text-lg font-semibold text-white">
                DiGiFaMaR Direct
              </h3>
            </div>
            <div className="space-y-3 mb-6">
              {DIGIFAMAR_POINTS.map((pt, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2.5 text-sm"
                  style={{ color: pt.highlight ? "#4ADE80" : "#9ca3af" }}
                >
                  <span className="mt-0.5 shrink-0">{pt.icon}</span>
                  <span>{pt.text}</span>
                </div>
              ))}
            </div>
            <div
              className="rounded-xl py-3 text-center text-xl font-bold"
              style={{
                backgroundColor: "rgba(45,122,46,0.18)",
                color: "#4ADE80",
              }}
            >
              Farmer keeps 92%
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────
// TESTIMONIALS
// ─────────────────────────────────────────────────────────────────
const TESTIMONIALS = [
  {
    name: "Robert M.",
    role: "Kansas Wheat Farmer",
    avatar: "🌾",
    text: "DiGiFaMaR changed everything for us. I went from selling to a middleman at rock-bottom prices to getting fair market value directly from buyers across the country.",
  },
  {
    name: "Jennifer K.",
    role: "Texas Restaurant Owner",
    avatar: "🍽️",
    text: "The escrow protection gives me peace of mind. My funds are safe and the produce is guaranteed fresh or I get a full refund. We've completely eliminated our traditional distributor.",
  },
  {
    name: "Sarah W.",
    role: "Oregon Organic Farm",
    avatar: "🌿",
    text: "Getting verified on DiGiFaMaR took less than a week. Within a month we had 200+ orders from buyers who actually appreciate organic farming.",
  },
  {
    name: "David T.",
    role: "Texas Cattle Rancher",
    avatar: "🐄",
    text: "The 6-digit delivery confirmation system is brilliant. No disputes, no fraud. Buyers get what they pay for, ranchers get paid instantly after confirmation.",
  },
  {
    name: "Maria R.",
    role: "Florida Grocery Buyer",
    avatar: "🛒",
    text: "I source for three stores now entirely through DiGiFaMaR. The quality is exceptional and prices are better than any distributor I've worked with in 15 years.",
  },
  {
    name: "Thomas W.",
    role: "Iowa Corn Farmer",
    avatar: "🌽",
    text: "Last harvest I moved 40 tons of specialty corn through DiGiFaMaR at prices I couldn't get anywhere else. The platform handles everything — payment, logistics, escrow.",
  },
];

function Testimonials() {
  return (
    <section className="py-20 overflow-hidden" style={{ backgroundColor: "#060F06" }}>
      <div className="mx-auto max-w-6xl px-4 mb-12 text-center">
        <p
          className="text-xs font-bold tracking-[0.2em] uppercase mb-3"
          style={{ color: "#4ADE80" }}
        >
          Trusted By Thousands
        </p>
        <h2 className="text-3xl sm:text-4xl font-bold text-white">
          What Our Community Says
        </h2>
      </div>

      {/* Horizontally scrollable row */}
      <div className="flex gap-4 overflow-x-auto px-4 pb-4 scrollbar-hide snap-x snap-mandatory">
        {TESTIMONIALS.map((t) => (
          <div
            key={t.name}
            className="shrink-0 w-80 rounded-2xl border p-6 snap-start flex flex-col"
            style={{
              backgroundColor: "#132013",
              borderColor: "rgba(45,122,46,0.22)",
            }}
          >
            {/* Avatar + name */}
            <div className="flex items-center gap-3 mb-4">
              <div
                className="h-11 w-11 rounded-full flex items-center justify-center text-2xl shrink-0"
                style={{ backgroundColor: "rgba(45,122,46,0.12)" }}
              >
                {t.avatar}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-white text-sm truncate">{t.name}</p>
                <p className="text-xs text-muted-foreground truncate">{t.role}</p>
              </div>
            </div>

            {/* Stars */}
            <div className="mb-3 text-sm" style={{ color: "#4ADE80" }}>
              ★★★★★
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed flex-1">
              "{t.text}"
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────
// FARMER CTA
// ─────────────────────────────────────────────────────────────────
function FarmerCTA() {
  return (
    <section
      className="py-24 px-4 text-center"
      style={{
        background:
          "linear-gradient(135deg, #060F06 0%, #132013 50%, #060F06 100%)",
      }}
    >
      <div className="mx-auto max-w-2xl">
        <p className="text-5xl mb-6">🌾</p>
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
          Ready to Sell Direct?
        </h2>
        <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
          Join 10,000+ verified American farmers already selling direct on
          DiGiFaMaR. Keep 92% of every sale — no middlemen, no surprises.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            asChild
            size="lg"
            className="h-12 px-8 font-bold text-[#060F06] hover:opacity-90 transition-opacity"
            style={{ backgroundColor: "#4ADE80" }}
          >
            <Link to="/signup">
              Start Selling — Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="h-12 px-8 font-semibold"
          >
            <Link to="/how-it-works">Learn How It Works</Link>
          </Button>
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          No upfront cost · Free verification · Setup in under 10 minutes
        </p>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────
function HomePage() {
  return (
    <SiteLayout>
      <HeroSection />
      <HowItWorks />
      <EscrowSection />
      <FeaturedProducts />
      <SupplyChainComparison />
      <Testimonials />
      <FarmerCTA />
    </SiteLayout>
  );
}
