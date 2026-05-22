import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Lock,
  MapPin,
  ShieldCheck,
  Sparkles,
  Star,
  Truck,
  Zap,
} from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { FarmCard, ProductCard } from "@/components/Cards";
import {
  buyerTestimonials,
  categories,
  farmerTestimonials,
  farms,
  images,
  products,
} from "@/lib/mock-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DiGiFaMaR — Buy Fresh Produce Direct From American Farmers" },
      {
        name: "description",
        content:
          "Skip the middleman. Order farm-fresh food from verified US farmers, delivered in 24-48 hours. Escrow protection, 50 states covered.",
      },
      { property: "og:title", content: "DiGiFaMaR — Direct From American Farms" },
      {
        property: "og:description",
        content:
          "Farm-fresh food, escrow-protected checkout, farmers keep 80-92% of every sale.",
      },
      { property: "og:url", content: "/" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <SiteLayout>
      <Hero />
      <TrustBar />
      <HowItWorks />
      <Stats />
      <Categories />
      <FeaturedFarms />
      <FeaturedProducts />
      <WhyDigifamar />
      <Testimonials />
      <MapSection />
      <AppBanner />
    </SiteLayout>
  );
}

function Hero() {
  return (
    <section className="relative isolate overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <img
          src={images.heroFarm}
          alt="American farm landscape at golden hour"
          width={1920}
          height={1080}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/60 to-background" />
      </div>
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:py-36">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-card/80 px-3 py-1 text-xs font-semibold text-primary backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" /> 2,500+ verified American farms
          </span>
          <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
            Buy Fresh Produce <br />
            <span className="text-primary">Direct From American Farmers</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Skip the middleman. Get farm-fresh food delivered in 24-48 hours.
            Support local farmers who earn{" "}
            <strong className="text-foreground">80-92%</strong> of every sale.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" asChild className="h-12 px-6 text-base">
              <Link to="/browse">
                <MapPin className="mr-1 h-5 w-5" />
                Find Farms Near Me
              </Link>
            </Button>
            <Button
              size="lg"
              variant="secondary"
              asChild
              className="h-12 bg-secondary px-6 text-base text-secondary-foreground hover:bg-secondary-hover"
            >
              <Link to="/signup/farmer">
                I'm a Farmer — Start Selling
                <ArrowRight className="ml-1 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustBar() {
  const items = [
    { icon: BadgeCheck, label: "Verified Farmers" },
    { icon: Lock, label: "Secure Escrow" },
    { icon: Zap, label: "24-Hour Local Delivery" },
    { icon: MapPin, label: "All 50 States" },
  ];
  return (
    <div className="border-y border-border bg-card">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-5 sm:grid-cols-4 sm:px-6">
        {items.map((it) => (
          <div
            key={it.label}
            className="flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground"
          >
            <it.icon className="h-4 w-4 text-primary" /> {it.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: 1,
      title: "Find Local Farms",
      body: "Enter your location or auto-detect. Browse verified farms within your delivery zone and filter by product, distance, organic, and price.",
      icon: MapPin,
    },
    {
      n: 2,
      title: "Order with Confidence",
      body: "Add fresh products to your cart. Pay securely — funds are held in escrow until you confirm your delivery.",
      icon: ShieldCheck,
    },
    {
      n: 3,
      title: "Receive Farm Fresh",
      body: "24-hour local delivery or 48-hour standard. Confirm receipt with a 6-digit code and your farmer gets paid instantly.",
      icon: Truck,
    },
  ];
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-extrabold sm:text-4xl">How DiGiFaMaR works</h2>
        <p className="mt-3 text-muted-foreground">
          Three simple steps from farm to your table.
        </p>
      </div>
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {steps.map((s) => (
          <div
            key={s.n}
            className="card-lift relative rounded-2xl border border-border bg-card p-6"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <s.icon className="h-5 w-5" />
              </span>
              <span className="text-sm font-bold text-muted-foreground">
                Step {s.n}
              </span>
            </div>
            <h3 className="mt-4 text-xl font-bold">{s.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Stats() {
  const stats = [
    { v: "2,500+", l: "Verified Farmers" },
    { v: "98%", l: "On-Time Delivery" },
    { v: "$0", l: "Hidden Fees" },
    { v: "50", l: "States Covered" },
  ];
  return (
    <section className="bg-primary text-primary-foreground">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-12 sm:grid-cols-4 sm:px-6">
        {stats.map((s) => (
          <div key={s.l} className="text-center">
            <p className="text-3xl font-extrabold sm:text-4xl">{s.v}</p>
            <p className="mt-1 text-sm opacity-80">{s.l}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Categories() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-extrabold sm:text-4xl">Shop by category</h2>
          <p className="mt-2 text-muted-foreground">
            Ten categories straight from the farm.
          </p>
        </div>
        <Link
          to="/browse"
          className="hidden text-sm font-semibold text-primary hover:underline md:inline"
        >
          Browse all →
        </Link>
      </div>
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
        {categories.map((c) => (
          <Link
            key={c.slug}
            to="/browse"
            className="card-lift flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 text-center"
          >
            <span className="text-3xl">{c.emoji}</span>
            <span className="text-sm font-semibold">{c.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function FeaturedFarms() {
  return (
    <section className="bg-leaf-soft/40">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-extrabold sm:text-4xl">Featured farms</h2>
            <p className="mt-2 text-muted-foreground">
              Top-rated American family farms shipping nationwide.
            </p>
          </div>
          <Link
            to="/browse"
            className="hidden text-sm font-semibold text-primary hover:underline md:inline"
          >
            View all farms →
          </Link>
        </div>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {farms.map((f) => (
            <FarmCard key={f.id} farm={f} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturedProducts() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <div className="flex items-end justify-between">
        <h2 className="text-3xl font-extrabold sm:text-4xl">Fresh today</h2>
        <Link
          to="/browse"
          className="text-sm font-semibold text-primary hover:underline"
        >
          See all →
        </Link>
      </div>
      <div className="mt-6 flex gap-4 overflow-x-auto scrollbar-hide pb-2 sm:grid sm:grid-cols-2 sm:gap-6 sm:overflow-visible md:grid-cols-3 lg:grid-cols-4">
        {products.map((p) => (
          <div key={p.id} className="w-64 shrink-0 sm:w-auto">
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </section>
  );
}

function WhyDigifamar() {
  const buyer = [
    "Fresher than grocery stores (harvested to order)",
    "Know exactly where your food comes from",
    "Support American farming families",
    "Secure escrow payment protection",
    "72-hour refund guarantee",
  ];
  const farmer = [
    "Keep 80-92% of every sale",
    "No middlemen cutting your profits",
    "List products in under 5 minutes",
    "Get paid same day after delivery",
    "Build credit history for farm loans",
  ];
  return (
    <section className="bg-card">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-extrabold sm:text-4xl">
            Why DiGiFaMaR
          </h2>
          <p className="mt-3 text-muted-foreground">
            Built for both sides of the table.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-background p-6">
            <h3 className="text-xl font-bold">For Buyers</h3>
            <ul className="mt-4 space-y-3">
              {buyer.map((b) => (
                <li key={b} className="flex gap-2 text-sm">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <Button asChild className="mt-6 w-full">
              <Link to="/browse">Start shopping</Link>
            </Button>
          </div>
          <div className="rounded-2xl border border-border bg-background p-6">
            <h3 className="text-xl font-bold">For Farmers</h3>
            <ul className="mt-4 space-y-3">
              {farmer.map((b) => (
                <li key={b} className="flex gap-2 text-sm">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-secondary" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <Button
              asChild
              className="mt-6 w-full bg-secondary text-secondary-foreground hover:bg-secondary-hover"
            >
              <Link to="/signup/farmer">Start selling</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-extrabold sm:text-4xl">Loved coast to coast</h2>
      </div>
      <div className="mt-12 grid gap-6 md:grid-cols-2">
        <Column title="From buyers" items={buyerTestimonials.map((t) => ({ ...t, sub: t.location }))} />
        <Column title="From farmers" items={farmerTestimonials.map((t) => ({ ...t, sub: t.farm }))} />
      </div>
    </section>
  );
}

function Column({
  title,
  items,
}: {
  title: string;
  items: { name: string; sub: string; quote: string; rating: number }[];
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      {items.map((t) => (
        <figure
          key={t.name}
          className="rounded-2xl border border-border bg-card p-5"
        >
          <div className="flex items-center gap-0.5 text-badge-gold">
            {Array.from({ length: t.rating }).map((_, i) => (
              <Star key={i} className="h-4 w-4 fill-current" />
            ))}
          </div>
          <blockquote className="mt-3 text-sm">"{t.quote}"</blockquote>
          <figcaption className="mt-3 text-xs text-muted-foreground">
            <strong className="text-foreground">{t.name}</strong> · {t.sub}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

function MapSection() {
  const stateGroups = [
    { region: "Northeast", count: 412 },
    { region: "South", count: 698 },
    { region: "Midwest", count: 821 },
    { region: "Mountain", count: 264 },
    { region: "West Coast", count: 387 },
  ];
  return (
    <section className="bg-leaf-soft/40">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-extrabold sm:text-4xl">
              Farms across America
            </h2>
            <p className="mt-3 text-muted-foreground">
              From the Blue Ridge to the Pacific Northwest, DiGiFaMaR connects
              you with verified farms in every state.
            </p>
            <div className="mt-6 space-y-2">
              {stateGroups.map((s) => (
                <div
                  key={s.region}
                  className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
                >
                  <span className="text-sm font-semibold">{s.region}</span>
                  <span className="text-sm text-primary">
                    {s.count} farms
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-card">
            <img
              src={images.heroFarm}
              alt="USA farm coverage map"
              loading="lazy"
              className="h-full w-full object-cover opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/30 to-transparent" />
            <div className="absolute inset-0 grid place-items-center">
              <div className="rounded-xl bg-card/95 px-6 py-4 text-center shadow-lg backdrop-blur">
                <p className="text-3xl font-extrabold text-primary">2,582</p>
                <p className="text-xs text-muted-foreground">
                  Active farms · all 50 states
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function AppBanner() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <div className="overflow-hidden rounded-3xl bg-primary px-6 py-12 text-primary-foreground md:px-12">
        <div className="grid items-center gap-8 md:grid-cols-2">
          <div>
            <h2 className="text-3xl font-extrabold sm:text-4xl">
              Take DiGiFaMaR everywhere
            </h2>
            <p className="mt-3 max-w-md opacity-90">
              Track orders, message farmers, and unlock seasonal deals from the
              palm of your hand.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <span className="rounded-xl bg-background px-4 py-3 text-sm font-semibold text-foreground">
                ⬇️ App Store
              </span>
              <span className="rounded-xl bg-background px-4 py-3 text-sm font-semibold text-foreground">
                ⬇️ Google Play
              </span>
            </div>
          </div>
          <div className="relative mx-auto h-64 w-40 rounded-[2rem] border-8 border-background/30 bg-background/15 backdrop-blur md:h-80 md:w-48">
            <div className="absolute inset-2 overflow-hidden rounded-[1.5rem] bg-card">
              <img
                src={images.produceCrate}
                alt="DiGiFaMaR app preview"
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
