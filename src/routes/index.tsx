import { createFileRoute, Link } from "@tanstack/react-router";
import { Fragment, useState } from "react";
import {
  MapPin,
  ArrowRight,
  Shield,
  CheckCircle2,
  Star,
  ShoppingCart,
  Sparkles,
  Leaf,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SiteLayout } from "@/components/SiteLayout";
import { products, getFarm } from "@/lib/mock-data";
import heroFarm from "@/assets/hero-farm.jpg";
import farmerPortrait from "@/assets/farmer-portrait.jpg";

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
// Shared bits
// ─────────────────────────────────────────────────────────────────
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-sage">{children}</p>
  );
}

function SectionHeading({
  eyebrow,
  title,
  sub,
  align = "center",
}: {
  eyebrow: string;
  title: string;
  sub?: string;
  align?: "center" | "left";
}) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="text-3xl font-bold sm:text-4xl">{title}</h2>
      {sub && <p className="mt-4 text-base leading-relaxed text-muted-foreground">{sub}</p>}
    </div>
  );
}

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
        setLocation(`${pos.coords.latitude.toFixed(2)}°N, ${pos.coords.longitude.toFixed(2)}°W`);
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
    <section className="relative overflow-hidden bg-hero-canvas text-hero-ink">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-52 left-1/2 h-[40rem] w-[70rem] -translate-x-1/2 rounded-full opacity-25 blur-3xl"
        style={{ background: "radial-gradient(closest-side, var(--hero-accent), transparent)" }}
      />

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.08fr_1fr] lg:gap-16 lg:px-8">
        {/* Copy column — mobile-first stack, matching the Canva hero */}
        <div className="text-center lg:text-left">
          <h1 className="font-display text-[2.5rem] font-extrabold leading-[1.04] tracking-tight sm:text-6xl lg:text-[4.25rem]">
            America&rsquo;s Farmers.
            <br />
            Direct to Market.
            <br />
            <span className="text-hero-accent">No Middlemen.</span>
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-hero-ink/85 sm:text-lg lg:mx-0">
            Where We Prioritize Our Customers — an escrow-protected marketplace connecting verified
            U.S. farmers directly with buyers.
          </p>

          {/* CTAs — full-width stacked on phones, inline from sm up */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <Button
              asChild
              size="lg"
              className="h-14 w-full rounded-full bg-hero-cta px-8 text-base font-bold text-hero-cta-foreground shadow-lifted hover:bg-hero-cta/90 sm:w-auto"
            >
              <Link to="/market">
                Browse the marketplace
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              className="h-14 w-full rounded-full bg-hero-accent px-8 text-base font-bold text-hero-accent-foreground shadow-lifted hover:bg-hero-accent/90 sm:w-auto"
            >
              <Link to="/signup">Sell your harvest</Link>
            </Button>
          </div>

          {/* Location search */}
          <div className="mx-auto mt-6 flex max-w-xl flex-col gap-3 rounded-2xl border border-hero-hairline bg-hero-cta-foreground/40 p-2.5 sm:flex-row lg:mx-0">
            <div className="relative flex-1">
              <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-hero-ink/70" />
              <Input
                placeholder="Enter ZIP code or city…"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                aria-label="ZIP code or city"
                className="h-12 border-transparent bg-transparent pl-10 text-hero-ink shadow-none placeholder:text-hero-ink/55 focus-visible:ring-0"
              />
            </div>
            <Button
              onClick={detectLocation}
              disabled={detecting}
              className="h-12 shrink-0 gap-2 whitespace-nowrap rounded-xl border border-hero-hairline bg-transparent text-hero-ink hover:bg-hero-ink/10"
            >
              <MapPin className="h-4 w-4" />
              {detecting ? "Detecting…" : "Detect location"}
            </Button>
          </div>

          {/* Trust row — three pills, exactly as in the Canva hero */}
          <ul className="mt-8 flex flex-wrap justify-center gap-2.5 lg:justify-start">
            {[
              { icon: Shield, label: "Escrow-protected payments" },
              { icon: CheckCircle2, label: "Verified farmers" },
              { icon: MapPin, label: "All 50 states" },
            ].map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="inline-flex items-center gap-2 rounded-full border border-hero-hairline px-4 py-2 text-xs font-semibold text-hero-ink/90 sm:text-sm"
              >
                <Icon className="h-4 w-4 text-hero-accent" />
                {label}
              </li>
            ))}
          </ul>
        </div>

        {/* Produce image — lower block on mobile, right card on desktop */}
        <div className="relative">
          <div className="overflow-hidden rounded-3xl border border-hero-hairline shadow-lifted">
            <img
              src={heroFarm}
              alt="Freshly harvested American produce ready for direct delivery"
              loading="eager"
              className="h-64 w-full object-cover sm:h-80 lg:h-[30rem]"
            />
          </div>
          <div className="absolute -bottom-5 left-4 rounded-2xl border border-hero-hairline bg-hero-canvas/95 px-5 py-4 shadow-lifted backdrop-blur sm:left-6">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-hero-ink/70">
              Farmer payout
            </p>
            <p className="mt-1 text-2xl font-bold text-hero-accent">90%</p>
            <p className="text-xs text-hero-ink/75">
              of the sale price, before escrow &amp; payment fees
            </p>
          </div>
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
    title: "Find local farms",
    desc: "Browse verified farms near you by product, distance, and certifications.",
  },
  {
    icon: "🔐",
    title: "Order with escrow",
    desc: "Your payment is held securely in escrow until delivery is confirmed.",
  },
  {
    icon: "🌾",
    title: "Receive farm fresh",
    desc: "Confirm delivery with your 6-digit code — funds release to the farmer automatically.",
  },
];

function HowItWorks() {
  return (
    <section className="bg-background px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="Simple process"
          title="How it works"
          sub="Three steps from browsing to a confirmed, protected delivery."
        />

        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
          {HOW_STEPS.map((step, i) => (
            <div
              key={step.title}
              className="card-lift relative rounded-2xl border border-border bg-card p-8"
            >
              <div className="mb-6 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-leaf-soft text-sm font-bold text-primary">
                  {i + 1}
                </span>
                <span className="text-2xl">{step.icon}</span>
              </div>
              <h3 className="text-lg font-semibold">{step.title}</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
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
  { icon: "💳", label: "Buyer pays" },
  { icon: "🔒", label: "Funds escrowed" },
  { icon: "🔢", label: "Buyer gets 6-digit code" },
  { icon: "🚚", label: "Farmer delivers" },
  { icon: "✅", label: "Buyer confirms" },
  { icon: "📤", label: "Release code sent" },
  { icon: "⌨️", label: "Farmer enters code" },
  { icon: "💰", label: "Funds released" },
];

function EscrowSection() {
  return (
    <section className="border-y border-border bg-surface-1 px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-1.5 text-xs font-semibold text-primary shadow-soft">
            <Shield className="h-4 w-4" />
            Escrow-protected payments
          </div>
          <h2 className="text-3xl font-bold sm:text-4xl">
            Every transaction protected by escrow
          </h2>
          <p className="mt-4 text-base text-muted-foreground">
            Funds are held by our escrow partner until you confirm receipt, subject to the applicable terms.
          </p>
        </div>

        <div className="scrollbar-hide -mx-4 mt-14 overflow-x-auto px-4 pb-4">
          <div className="mx-auto flex min-w-max items-start">
            {ESCROW_STEPS.map((step, i) => (
              <Fragment key={step.label}>
                <div className="flex w-[104px] flex-col items-center gap-3 sm:w-28">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-background text-2xl shadow-soft">
                    {step.icon}
                  </div>
                  <span className="px-1 text-center text-xs leading-tight text-muted-foreground">
                    {step.label}
                  </span>
                </div>
                {i < ESCROW_STEPS.length - 1 && (
                  <div className="mt-7 h-px w-5 shrink-0 bg-border" />
                )}
              </Fragment>
            ))}
          </div>
        </div>

        <div className="mt-10 flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-5 py-2.5 text-sm font-semibold text-primary shadow-soft">
            <CheckCircle2 className="h-4 w-4 text-sage" />
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

function FeaturedCard({
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
    <div className="card-lift flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <div className="relative h-48 overflow-hidden bg-muted">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
        />
        {product.organic && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-badge-organic px-2.5 py-0.5 text-[11px] font-semibold text-badge-organic-foreground">
            <Leaf className="h-3 w-3" /> Organic
          </span>
        )}
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-border/60 bg-card/95 px-2.5 py-0.5 text-[11px] font-semibold text-primary shadow-soft backdrop-blur">
          🔒 Escrow
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="truncate text-xs text-muted-foreground">{farmName}</p>
        <h3 className="mt-1 text-sm font-semibold leading-snug">{product.name}</h3>

        <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
          <Star className="h-3 w-3 fill-badge-gold text-badge-gold" />
          <span>
            {product.rating} ({product.reviews})
          </span>
          <span className="ml-auto flex items-center gap-0.5">
            <MapPin className="h-3 w-3" />
            {distance} mi
          </span>
        </div>

        <div className="mt-5 flex items-center justify-between gap-2">
          <span className="text-lg font-bold">
            ${product.price}
            <span className="text-xs font-normal text-muted-foreground">/{product.unit}</span>
          </span>
          <Button size="sm" onClick={handleAddToCart} className="gap-1.5">
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
    <section className="bg-background px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading
            align="left"
            eyebrow="Fresh today"
            title="Featured products"
            sub="Harvested in the last 24 hours and ready to ship."
          />
          <Link
            to="/market"
            className="hidden items-center gap-1 text-sm font-semibold text-primary hover:underline sm:flex"
          >
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((product) => {
            const farm = getFarm(product.farmId);
            return (
              <FeaturedCard
                key={product.id}
                product={product}
                farmName={farm?.name ?? "Local Farm"}
                distance={FEATURED_DISTANCES[product.farmId] ?? 20}
              />
            );
          })}
        </div>

        <div className="mt-10 flex justify-center sm:hidden">
          <Button asChild variant="outline" className="gap-2">
            <Link to="/market">
              View all products <ArrowRight className="h-4 w-4" />
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
  { icon: "📈", text: "Farmer receives 90% of the sale price", highlight: true },
  { icon: "💰", text: "10% platform fee (escrow & payment fees separate)", highlight: true },
  { icon: "⚡", text: "24–48 hour direct delivery" },
  { icon: "🤝", text: "Direct farmer relationship" },
  { icon: "🔒", text: "Full escrow protection on every order" },
];

function SupplyChainComparison() {
  return (
    <section className="border-y border-border bg-surface-1 px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <SectionHeading
          eyebrow="The DiGiFaMaR difference"
          title="Why direct beats traditional"
          sub="See what cutting out the middleman means for farmers and buyers."
        />

        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Traditional */}
          <div className="rounded-2xl border border-border bg-background p-8">
            <div className="mb-7 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-clay-soft text-xl">
                ❌
              </span>
              <h3 className="text-lg font-semibold text-muted-foreground">
                Traditional supply chain
              </h3>
            </div>
            <ul className="mb-7 space-y-3.5">
              {TRADITIONAL_POINTS.map((pt) => (
                <li
                  key={pt.text}
                  className={`flex items-start gap-2.5 text-sm ${
                    pt.highlight ? "font-medium text-clay" : "text-muted-foreground"
                  }`}
                >
                  <span className="mt-0.5 shrink-0">{pt.icon}</span>
                  <span>{pt.text}</span>
                </li>
              ))}
            </ul>
            <div className="rounded-xl bg-clay-soft py-3.5 text-center text-xl font-bold text-clay">
              Farmer keeps ~25%
            </div>
          </div>

          {/* DiGiFaMaR */}
          <div className="rounded-2xl border border-primary/25 bg-background p-8 shadow-lifted">
            <div className="mb-7 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-leaf-soft text-xl">
                ✅
              </span>
              <h3 className="text-lg font-semibold">DiGiFaMaR direct</h3>
            </div>
            <ul className="mb-7 space-y-3.5">
              {DIGIFAMAR_POINTS.map((pt) => (
                <li
                  key={pt.text}
                  className={`flex items-start gap-2.5 text-sm ${
                    pt.highlight ? "font-medium text-primary" : "text-muted-foreground"
                  }`}
                >
                  <span className="mt-0.5 shrink-0">{pt.icon}</span>
                  <span>{pt.text}</span>
                </li>
              ))}
            </ul>
            <div className="rounded-xl bg-leaf-soft py-3.5 text-center text-xl font-bold text-primary">
              Farmer receives 90% before external charges
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
    text: "The escrow protection gives me peace of mind. Funds stay in escrow until I confirm delivery, and I can open a dispute if something is off. We've completely eliminated our traditional distributor.",
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
    text: "The 6-digit delivery confirmation system is brilliant. Buyers get what they pay for, and we get paid as soon as delivery is confirmed.",
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
    <section className="overflow-hidden bg-background py-24">
      <div className="mx-auto mb-14 max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Trusted by thousands"
          title="What our community says"
          sub="Farmers, ranchers and buyers building direct relationships every day."
        />
      </div>

      <div className="scrollbar-hide flex snap-x snap-mandatory gap-6 overflow-x-auto px-4 pb-6 sm:px-6 lg:px-8">
        {TESTIMONIALS.map((t) => (
          <figure
            key={t.name}
            className="flex w-80 shrink-0 snap-start flex-col rounded-2xl border border-border bg-card p-7 shadow-soft"
          >
            <div className="mb-3 flex items-center gap-1 text-badge-gold">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-3.5 w-3.5 fill-badge-gold" />
              ))}
            </div>
            <blockquote className="flex-1 text-sm leading-relaxed text-muted-foreground">
              “{t.text}”
            </blockquote>
            <figcaption className="mt-6 flex items-center gap-3 border-t border-border pt-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary text-2xl">
                {t.avatar}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{t.name}</span>
                <span className="block truncate text-xs text-muted-foreground">{t.role}</span>
              </span>
            </figcaption>
          </figure>
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
    <section className="px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-3xl bg-primary text-primary-foreground shadow-lifted">
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
          <div className="p-10 sm:p-14">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-3.5 py-1.5 text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5" /> For farmers
            </p>
            <h2 className="text-3xl font-bold text-primary-foreground sm:text-4xl">
              Ready to sell direct?
            </h2>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-primary-foreground/80">
              Sell direct to buyers on DiGiFaMaR and receive 90% of the sale price — our platform
              fee is a flat 10%, with escrow and payment-processing charges billed separately.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" variant="secondary">
                <Link to="/signup">
                  Start selling — free
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="ghost"
                className="border border-primary-foreground/25 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              >
                <Link to="/how-it-works">Learn how it works</Link>
              </Button>
            </div>

            <p className="mt-6 text-xs text-primary-foreground/70">
              No upfront cost · Free verification · Setup in under 10 minutes
            </p>
          </div>

          <div className="relative hidden h-full min-h-[22rem] lg:block">
            <img
              src={farmerPortrait}
              alt="American farmer standing in a field at sunrise"
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
        </div>
      </div>

      <div className="mx-auto mt-6 grid max-w-7xl gap-6 sm:grid-cols-3">
        {[
          { t: "Free verification", d: "Document-based farm checks, usually within a week." },
          { t: "Fast payouts", d: "Escrow releases once delivery is confirmed." },
          { t: "Real buyers", d: "Restaurants, grocers and households near you." },
        ].map((c) => (
          <div key={c.t} className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <p className="text-sm font-semibold">{c.t}</p>
            <p className="mt-1.5 text-sm text-muted-foreground">{c.d}</p>
          </div>
        ))}
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
