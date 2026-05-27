import { createFileRoute, Link } from "@tanstack/react-router";
import { DollarSign, Package, Plus, Star, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { products, farms } from "@/lib/mock-data";

export const Route = createFileRoute("/farmer/dashboard")({
  head: () => ({ meta: [{ title: "Farmer Dashboard — DiGiFaMaR" }] }),
  component: FarmerDashboard,
});

function FarmerDashboard() {
  const farm = farms[0];
  const myListings = products.filter((p) => p.farmId === farm.id);
  const earnings30d = 4827.5;
  const orders30d = 41;

  return (
    <AppShell role="farmer">
      <div className="mx-auto max-w-5xl px-4 pt-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Signed in as</p>
            <h1 className="text-2xl font-extrabold sm:text-3xl">{farm.name}</h1>
          </div>
          <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary-hover">
            <Plus className="mr-1 h-5 w-5" /> List a new product
          </Button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          <Stat icon={DollarSign} label="Earnings (30d)" value={`$${earnings30d.toLocaleString()}`} accent />
          <Stat icon={Package} label="Orders (30d)" value={orders30d} />
          <Stat icon={Star} label="Avg rating" value={farm.rating.toFixed(1)} />
          <Stat icon={TrendingUp} label="Take-home" value="88%" />
        </div>

        <Section title="Your listings" right={<Link to="/marketplace" className="text-xs font-semibold text-primary hover:underline">View public store →</Link>}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {myListings.map((p) => (
              <div key={p.id} className="card-lift overflow-hidden rounded-2xl border border-border bg-card">
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
                </div>
                <div className="p-3">
                  <p className="line-clamp-1 text-sm font-semibold">{p.name}</p>
                  <div className="mt-1 flex items-center justify-between text-xs">
                    <span className="font-bold text-primary">${p.price.toFixed(2)}/{p.unit}</span>
                    <span className="text-muted-foreground">{p.stock} in stock</span>
                  </div>
                </div>
              </div>
            ))}
            <button className="card-lift flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-card/30 text-sm font-semibold text-muted-foreground hover:text-primary">
              <Plus className="h-6 w-6" /> Add listing
            </button>
          </div>
        </Section>

        <Section title="Recent ratings">
          <div className="space-y-2">
            {[
              { name: "Sarah K.", rating: 5, text: "Best tomatoes I've had in years. Shipping was packed perfectly." },
              { name: "Marcus T.", rating: 5, text: "Worth every penny. Will buy again next week." },
              { name: "Priya R.", rating: 4, text: "Great quality. Delivery a few hours late but communication was top." },
            ].map((r) => (
              <div key={r.name} className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-center gap-2">
                  <div className="flex text-badge-gold">
                    {Array.from({ length: r.rating }).map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-current" />
                    ))}
                  </div>
                  <span className="text-xs font-semibold">{r.name}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{r.text}</p>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </AppShell>
  );
}

function Section({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <div className="flex items-end justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{title}</h2>
        {right}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Stat({ icon: Icon, label, value, accent = false }: { icon: React.ElementType; label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${accent ? "border-primary/40 bg-primary/10" : "border-border bg-card"}`}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className={`h-4 w-4 ${accent ? "text-primary" : "text-primary"}`} /> {label}
      </div>
      <p className={`mt-1 text-2xl font-extrabold ${accent ? "text-primary" : ""}`}>{value}</p>
    </div>
  );
}
