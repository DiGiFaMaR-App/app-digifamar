import { createFileRoute, Link } from "@tanstack/react-router";
import { Package, Truck, History, ShoppingBag, Heart, DollarSign } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useReveal } from "@/hooks/use-reveal";
import { products, farms, getFarm } from "@/lib/mock-data";

export const Route = createFileRoute("/dashboard/buyer")({
  head: () => ({ meta: [{ title: "My Orders — DiGiFaMaR" }] }),
  component: BuyerDashboard,
});

const orders = [
  { id: "DFM-3K9A2X", product: products[0], status: "out-for-delivery", placed: "2 hours ago", eta: "Tomorrow" },
  { id: "DFM-7P1Z44", product: products[2], status: "shipped", placed: "Yesterday", eta: "In 2 days" },
];

const history = [
  { id: "DFM-Z01CDE", product: products[3], status: "delivered", placed: "3 days ago" },
  { id: "DFM-Q88FNB", product: products[6], status: "delivered", placed: "Last week" },
  { id: "DFM-A12MPQ", product: products[4], status: "delivered", placed: "2 weeks ago" },
];

const spendSeries = [
  { month: "Mar", spend: 84 },
  { month: "Apr", spend: 132 },
  { month: "May", spend: 178 },
  { month: "Jun", spend: 96 },
  { month: "Jul", spend: 214 },
  { month: "Aug", spend: 246 },
];

const favFarms = [farms[0], farms[2], farms[4]];

function BuyerDashboard() {
  const totalSpend = spendSeries.reduce((s, x) => s + x.spend, 0);
  const ref = useReveal<HTMLDivElement>({ stagger: 0.05, y: 24, scale: 0.97 });

  return (
    <AppShell role="buyer">
      <div ref={ref} className="mx-auto max-w-5xl px-4 pt-6 sm:px-6">
        <div data-reveal>
          <h1 className="text-2xl font-extrabold sm:text-3xl">My orders</h1>
          <p className="mt-1 text-sm text-muted-foreground">Track active deliveries and revisit past purchases.</p>
        </div>

        <div data-reveal className="mt-5 grid gap-3 sm:grid-cols-4">
          <Stat icon={Truck} label="Active deliveries" value={orders.length} />
          <Stat icon={Package} label="In transit" value={orders.filter(o => o.status !== "delivered").length} />
          <Stat icon={History} label="Past purchases" value={history.length} />
          <Stat icon={DollarSign} label="Spent (6 mo.)" value={`$${totalSpend}`} accent />
        </div>

        <div data-reveal className="mt-6 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-end justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Purchase history</h3>
            <span className="text-xs text-muted-foreground">Last 6 months</span>
          </div>
          <div className="mt-3 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={spendSeries} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22C55E" stopOpacity={1} />
                    <stop offset="100%" stopColor="#22C55E" stopOpacity={0.3} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="month" stroke="#7d8a7d" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#7d8a7d" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: "#121A12", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                  cursor={{ fill: "rgba(34,197,94,0.08)" }}
                  formatter={(v) => [`$${v}`, "Spent"]}
                />
                <Bar dataKey="spend" fill="url(#spendGrad)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <Section title="Active deliveries">
          {orders.map((o) => <OrderRow key={o.id} order={o} active />)}
        </Section>

        <Section title="Favorite farms">
          <div className="grid gap-3 sm:grid-cols-3">
            {favFarms.map((f) => (
              <Link
                key={f.id}
                to="/market"
                className="card-lift flex items-center gap-3 rounded-xl border border-border bg-card p-3"
              >
                <img src={f.image} alt="" className="h-12 w-12 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-semibold">{f.name}</p>
                  <p className="text-[11px] text-muted-foreground">★ {f.rating} · {f.location}</p>
                </div>
                <Heart className="h-4 w-4 fill-primary text-primary" />
              </Link>
            ))}
          </div>
        </Section>

        <Section title="Past purchases">
          {history.map((o) => <OrderRow key={o.id} order={o} />)}
        </Section>

        <div className="mt-8 flex justify-center">
          <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary-hover">
            <Link to="/market"><ShoppingBag className="mr-1 h-5 w-5" /> Shop the marketplace</Link>
          </Button>
        </div>
      </div>
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section data-reveal className="mt-8">
      <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{title}</h2>
      <div className="mt-3 space-y-2">{children}</div>
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

function OrderRow({ order, active = false }: { order: typeof orders[number] | typeof history[number]; active?: boolean }) {
  const farm = getFarm(order.product.farmId);
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
      <img src={order.product.image} alt="" className="h-14 w-14 rounded-lg object-cover" />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-1 text-sm font-semibold">{order.product.name}</p>
        <p className="text-[11px] text-muted-foreground">{farm?.name} · {order.placed}</p>
        <p className="font-mono text-[10px] text-muted-foreground">{order.id}</p>
      </div>
      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
        active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
      }`}>
        {order.status === "out-for-delivery" ? "Out for delivery" : order.status === "shipped" ? "Shipped" : "Delivered"}
      </span>
    </div>
  );
}
