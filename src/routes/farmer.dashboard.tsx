import { createFileRoute, Link } from "@tanstack/react-router";
import { DollarSign, Leaf, Package, Pencil, Plus, Star, Trash2, TrendingUp, Trophy, X, Zap } from "lucide-react";
import { useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useReveal } from "@/hooks/use-reveal";
import { products, farms, categories, type Product } from "@/lib/mock-data";
import produceCrate from "@/assets/produce-crate.jpg";

type Draft = {
  id?: string;
  name: string;
  category: string;
  price: string;
  unit: string;
  stock: string;
  delivery: "24h" | "48h";
  organic: boolean;
  fresh: boolean;
  description: string;
};

const emptyDraft: Draft = {
  name: "",
  category: categories[0].slug,
  price: "",
  unit: "lb",
  stock: "10",
  delivery: "24h",
  organic: true,
  fresh: true,
  description: "",
};

export const Route = createFileRoute("/farmer/dashboard")({
  head: () => ({ meta: [{ title: "Farmer Dashboard — DiGiFaMaR" }] }),
  component: FarmerDashboard,
});

const earningsSeries = [
  { day: "Mon", earnings: 380 },
  { day: "Tue", earnings: 520 },
  { day: "Wed", earnings: 450 },
  { day: "Thu", earnings: 690 },
  { day: "Fri", earnings: 880 },
  { day: "Sat", earnings: 1120 },
  { day: "Sun", earnings: 787.5 },
];
const ratingsBreakdown = [
  { stars: "5★", count: 187 },
  { stars: "4★", count: 38 },
  { stars: "3★", count: 6 },
  { stars: "2★", count: 1 },
  { stars: "1★", count: 0 },
];

function FarmerDashboard() {
  const farm = farms[0];
  const earnings30d = 4827.5;
  const orders30d = 41;
  const lendingTarget = 30;
  const lendingProgress = Math.min(orders30d, lendingTarget);
  const ref = useReveal<HTMLDivElement>({ stagger: 0.06, y: 24, scale: 0.97 });
  const [listings, setListings] = useState<Product[]>(() => products.filter((p) => p.farmId === farm.id));
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Draft | null>(null);

  const openNew = () => {
    setEditing(emptyDraft);
    setOpen(true);
  };
  const openEdit = (p: Product) => {
    setEditing({
      id: p.id,
      name: p.name,
      category: p.category,
      price: String(p.price),
      unit: p.unit,
      stock: String(p.stock),
      delivery: p.delivery,
      organic: !!p.organic,
      fresh: p.freshnessGrade === "A",
      description: p.description,
    });
    setOpen(true);
  };
  const removeListing = (id: string) => setListings((prev) => prev.filter((p) => p.id !== id));
  const upsert = (d: Draft) => {
    const base: Product = {
      id: d.id ?? `${d.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,
      name: d.name,
      farmId: farm.id,
      category: d.category,
      price: parseFloat(d.price) || 0,
      unit: d.unit,
      image: d.id ? listings.find((p) => p.id === d.id)?.image ?? produceCrate : produceCrate,
      delivery: d.delivery,
      organic: d.organic,
      rating: d.id ? listings.find((p) => p.id === d.id)?.rating ?? 5 : 5,
      reviews: d.id ? listings.find((p) => p.id === d.id)?.reviews ?? 0 : 0,
      stock: parseInt(d.stock) || 0,
      freshnessGrade: d.fresh ? "A" : "B",
      freshnessScore: d.fresh ? 9.2 : 7.5,
      description: d.description,
    };
    setListings((prev) => {
      const idx = prev.findIndex((p) => p.id === base.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = base;
        return next;
      }
      return [base, ...prev];
    });
    setOpen(false);
  };


  return (
    <AppShell role="farmer">
      <div ref={ref} className="mx-auto max-w-5xl px-4 pt-6 sm:px-6">
        <div data-reveal className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Signed in as</p>
            <h1 className="text-2xl font-extrabold sm:text-3xl">{farm.name}</h1>
          </div>
          <Button
            size="lg"
            onClick={openNew}
            className="bg-primary text-primary-foreground hover:bg-primary-hover"
          >
            <Plus className="mr-1 h-5 w-5" /> List a new product
          </Button>
        </div>

        <div data-reveal className="mt-5 grid gap-3 sm:grid-cols-4">
          <Stat icon={DollarSign} label="Earnings (30d)" value={`$${earnings30d.toLocaleString()}`} accent />
          <Stat icon={Package} label="Orders (30d)" value={orders30d} />
          <Stat icon={Star} label="Avg rating" value={farm.rating.toFixed(1)} />
          <Stat icon={TrendingUp} label="Take-home" value="88%" />
        </div>

        <div data-reveal className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-4 lg:col-span-2">
            <div className="flex items-end justify-between">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Earnings this week
                </h3>
                <p className="mt-1 text-2xl font-extrabold text-primary">$4,827.50</p>
              </div>
              <span className="text-xs font-semibold text-primary">+18.4% vs last week</span>
            </div>
            <div className="mt-3 h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={earningsSeries} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="earnGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22C55E" stopOpacity={0.55} />
                      <stop offset="100%" stopColor="#22C55E" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="day" stroke="#7d8a7d" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#7d8a7d" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "#121A12",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "#a8b3a8" }}
                  />
                  <Area type="monotone" dataKey="earnings" stroke="#22C55E" strokeWidth={2} fill="url(#earnGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Ratings breakdown</h3>
            <p className="mt-1 text-2xl font-extrabold">{farm.rating.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">/ 5</span></p>
            <div className="mt-3 h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ratingsBreakdown} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="stars" stroke="#7d8a7d" fontSize={11} tickLine={false} axisLine={false} width={28} />
                  <Tooltip
                    contentStyle={{ background: "#121A12", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                    cursor={{ fill: "rgba(34,197,94,0.08)" }}
                  />
                  <Bar dataKey="count" fill="#22C55E" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Milestone */}
        <div data-reveal className="mt-6 rounded-2xl border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-bold">Lending eligibility</p>
                <p className="text-xs text-muted-foreground">
                  Complete 30 sales in 30 days to unlock equipment loans up to $40,000.
                </p>
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-primary/20 px-2 py-0.5 text-[11px] font-bold text-primary">
              {lendingProgress}/{lendingTarget}
            </span>
          </div>
          <Progress value={(lendingProgress / lendingTarget) * 100} className="mt-3 h-2" />
        </div>

        <Section title="Your listings" right={<Link to="/marketplace" className="text-xs font-semibold text-primary hover:underline">View public store →</Link>}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((p) => (
              <div key={p.id} className="card-lift group overflow-hidden rounded-2xl border border-border bg-card">
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
                  <div className="absolute left-2 top-2 flex gap-1">
                    {p.organic && (
                      <span className="rounded-full bg-primary/90 px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                        <Leaf className="mr-0.5 inline h-2.5 w-2.5" /> Organic
                      </span>
                    )}
                    {p.freshnessGrade === "A" && (
                      <span className="rounded-full bg-badge-gold/90 px-2 py-0.5 text-[10px] font-bold text-background">
                        <Zap className="mr-0.5 inline h-2.5 w-2.5" /> Fresh
                      </span>
                    )}
                  </div>
                  <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => openEdit(p)}
                      className="rounded-full bg-background/80 p-1.5 text-foreground backdrop-blur hover:bg-primary hover:text-primary-foreground"
                      aria-label="Edit listing"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => removeListing(p.id)}
                      className="rounded-full bg-background/80 p-1.5 text-destructive backdrop-blur hover:bg-destructive hover:text-destructive-foreground"
                      aria-label="Delete listing"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="p-3">
                  <p className="line-clamp-1 text-sm font-semibold">{p.name}</p>
                  <div className="mt-1 flex items-center justify-between text-xs">
                    <span className="font-bold text-primary">${p.price.toFixed(2)}/{p.unit}</span>
                    <span className="text-muted-foreground">{p.stock} in stock · {p.delivery}</span>
                  </div>
                </div>
              </div>
            ))}
            <button
              onClick={openNew}
              className="card-lift flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-card/30 text-sm font-semibold text-muted-foreground hover:text-primary"
            >
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

      <ListProductDialog
        open={open}
        onOpenChange={setOpen}
        initial={editing}
        onSubmit={upsert}
      />
    </AppShell>
  );
}

function ListProductDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: Draft | null;
  onSubmit: (d: Draft) => void;
}) {
  const key = initial?.id ?? "new";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-border bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            {initial?.id ? "Edit listing" : "List a new product"}
            <button onClick={() => onOpenChange(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
          </DialogTitle>
        </DialogHeader>
        <DraftForm
          key={key}
          initial={initial ?? emptyDraft}
          onCancel={() => onOpenChange(false)}
          onSubmit={onSubmit}
        />
      </DialogContent>
    </Dialog>
  );
}

function DraftForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial: Draft;
  onSubmit: (d: Draft) => void;
  onCancel: () => void;
}) {
  const [d, setD] = useState<Draft>(initial);
  const update = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((prev) => ({ ...prev, [k]: v }));

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(d);
      }}
    >
      <div>
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Product name</Label>
        <Input value={d.name} onChange={(e) => update("name", e.target.value)} placeholder="e.g. Heirloom tomatoes" required className="mt-1" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Price</Label>
          <Input type="number" min="0" step="0.01" value={d.price} onChange={(e) => update("price", e.target.value)} placeholder="5.50" required className="mt-1" />
        </div>
        <div>
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Unit</Label>
          <Input value={d.unit} onChange={(e) => update("unit", e.target.value)} placeholder="lb / jar" required className="mt-1" />
        </div>
        <div>
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Stock</Label>
          <Input type="number" min="0" value={d.stock} onChange={(e) => update("stock", e.target.value)} required className="mt-1" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category</Label>
          <select
            value={d.category}
            onChange={(e) => update("category", e.target.value)}
            className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {categories.map((c) => <option key={c.slug} value={c.slug}>{c.emoji} {c.name}</option>)}
          </select>
        </div>
        <div>
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Delivery</Label>
          <select
            value={d.delivery}
            onChange={(e) => update("delivery", e.target.value as "24h" | "48h")}
            className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="24h">⚡ 24h express</option>
            <option value="48h">📦 48h standard</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex items-center justify-between rounded-md border border-border bg-background/40 px-3 py-2">
          <span className="flex items-center gap-2 text-sm">
            <Leaf className="h-4 w-4 text-primary" /> Organic
          </span>
          <Switch checked={d.organic} onCheckedChange={(v) => update("organic", v)} />
        </label>
        <label className="flex items-center justify-between rounded-md border border-border bg-background/40 px-3 py-2">
          <span className="flex items-center gap-2 text-sm">
            <Zap className="h-4 w-4 text-badge-gold" /> Fresh grade A
          </span>
          <Switch checked={d.fresh} onCheckedChange={(v) => update("fresh", v)} />
        </label>
      </div>
      <div>
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</Label>
        <Textarea value={d.description} onChange={(e) => update("description", e.target.value)} placeholder="What makes this special?" rows={3} className="mt-1" />
      </div>
      <div className="flex gap-2 pt-1">
        <Button type="button" variant="outline" size="lg" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" size="lg" className="flex-[2] bg-primary text-primary-foreground hover:bg-primary-hover">
          {initial.id ? "Save changes" : "Publish listing"}
        </Button>
      </div>
    </form>
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
        <Icon className="h-4 w-4 text-primary" /> {label}
      </div>
      <p className={`mt-1 text-2xl font-extrabold ${accent ? "text-primary" : ""}`}>{value}</p>
    </div>
  );
}
