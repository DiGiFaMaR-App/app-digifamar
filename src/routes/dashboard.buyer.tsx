import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Package,
  Truck,
  History,
  ShoppingBag,
  Heart,
  DollarSign,
  RotateCcw,
  Radio,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";
import { OrderTimeline } from "@/components/order/OrderTimeline";
import { SaveFarmButton } from "@/components/SaveFarmButton";
import { savedFarmsQueryOptions } from "@/lib/saved-farms";
import { supabase } from "@/integrations/supabase/client";
import { useReveal } from "@/hooks/use-reveal";
import { products, getFarm } from "@/lib/mock-data";

export const Route = createFileRoute("/dashboard/buyer")({
  head: () => ({ meta: [{ title: "My Orders — DiGiFaMaR" }] }),
  component: BuyerDashboard,
});

const orders = [
  {
    id: "DFM-3K9A2X",
    product: products[0],
    status: "out-for-delivery",
    placed: "2 hours ago",
    eta: "Tomorrow",
  },
  {
    id: "DFM-7P1Z44",
    product: products[2],
    status: "shipped",
    placed: "Yesterday",
    eta: "In 2 days",
  },
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

type BuyerOrderRow = { id: string; status: string; total_cents: number; created_at: string };

/** Real, escrow-backed orders for the signed-in buyer, with their delivery timeline. */
function LiveOrdersSection() {
  const { data, isLoading } = useQuery({
    queryKey: ["buyer-live-orders"],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("orders")
        .select("id, status, total_cents, created_at")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw new Error(error.message);
      return (rows ?? []) as BuyerOrderRow[];
    },
    retry: false,
  });

  if (isLoading || !data || data.length === 0) return null;

  return (
    <Section title="Order tracking">
      {data.map((o) => (
        <div key={o.id} className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold">Order #{o.id.slice(-8)}</p>
              <p className="text-[11px] text-muted-foreground">
                {new Date(o.created_at).toLocaleDateString()} · $
                {(o.total_cents / 100).toFixed(2)}
              </p>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link to="/orders/$id" params={{ id: o.id }}>
                Details
              </Link>
            </Button>
          </div>
          <div className="mt-3">
            <OrderTimeline orderId={o.id} compact placedAt={o.created_at} />
          </div>
        </div>
      ))}
    </Section>
  );
}

/** Farms the buyer hearted, read from `saved_farms`. */
function SavedFarmsGrid() {
  const { data, isLoading } = useQuery(savedFarmsQueryOptions());

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading saved farms…</p>;
  if (!data || data.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center">
        <Heart className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          No saved farms yet — tap the heart on any farm to keep it here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        {data.slice(0, 6).map((f) => (
          <div
            key={f.farm_id}
            className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
          >
            <Link
              to="/farm/$id"
              params={{ id: f.farm_id }}
              className="min-w-0 flex-1"
            >
              <p className="line-clamp-1 text-sm font-semibold">{f.farm_name}</p>
              <p className="text-[11px] text-muted-foreground">
                {[f.city, f.state].filter(Boolean).join(", ") || "Farm"}
              </p>
            </Link>
            <SaveFarmButton farmId={f.farm_id} farmName={f.farm_name} className="px-2" />
          </div>
        ))}
      </div>
      <Button asChild variant="outline" size="sm">
        <Link to="/saved">View all saved farms</Link>
      </Button>
    </div>
  );
}


function BuyerDashboard() {
  const totalSpend = spendSeries.reduce((s, x) => s + x.spend, 0);
  const ref = useReveal<HTMLDivElement>({ stagger: 0.05, y: 24, scale: 0.97 });
  const [name, setName] = useState("there");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("buyerProfile");
      if (raw) {
        const p = JSON.parse(raw);
        const first = (p.fullName || p.name || "").trim().split(" ")[0];
        if (first) setName(first);
      }
    } catch {
      // ignore malformed persisted profile
    }
  }, []);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <RequireAuth>
      <AppShell role="buyer">
        <div ref={ref} className="mx-auto max-w-5xl px-4 pt-6 sm:px-6">
          <div
            data-reveal
            className="overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 via-card to-card p-5 sm:p-6"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              {greeting}
            </p>
            <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">Welcome back, {name} 👋</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              You have {orders.length} active {orders.length === 1 ? "delivery" : "deliveries"} on
              the way — track them live below.
            </p>
          </div>

          <div data-reveal className="mt-5 grid gap-3 sm:grid-cols-4">
            <Stat icon={Truck} label="Active deliveries" value={orders.length} />
            <Stat
              icon={Package}
              label="In transit"
              value={orders.filter((o) => o.status !== "delivered").length}
            />
            <Stat icon={History} label="Past purchases" value={history.length} />
            <Stat icon={DollarSign} label="Spent (6 mo.)" value={`$${totalSpend}`} accent />
          </div>

          <div data-reveal className="mt-6 rounded-2xl border border-border bg-card p-4">
            <div className="flex items-end justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Purchase history
              </h3>
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
                  <XAxis
                    dataKey="month"
                    stroke="#7d8a7d"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis stroke="#7d8a7d" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "#121A12",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    cursor={{ fill: "rgba(34,197,94,0.08)" }}
                    formatter={(v) => [`$${v}`, "Spent"]}
                  />
                  <Bar dataKey="spend" fill="url(#spendGrad)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <Section title="Active deliveries">
            {orders.map((o) => (
              <OrderRow key={o.id} order={o} active />
            ))}
          </Section>

          <LiveOrdersSection />

          <Section title="Saved farms">
            <SavedFarmsGrid />
          </Section>


          <Section title="Past purchases">
            {history.map((o) => (
              <OrderRow key={o.id} order={o} reorder />
            ))}
          </Section>

          <div className="mt-8 flex justify-center">
            <Button
              asChild
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary-hover"
            >
              <Link to="/market">
                <ShoppingBag className="mr-1 h-5 w-5" /> Shop the marketplace
              </Link>
            </Button>
          </div>
        </div>
      </AppShell>
    </RequireAuth>
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

function Stat({
  icon: Icon,
  label,
  value,
  accent = false,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${accent ? "border-primary/40 bg-primary/10" : "border-border bg-card"}`}
    >
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-4 w-4 text-primary" /> {label}
      </div>
      <p className={`mt-1 text-2xl font-extrabold ${accent ? "text-primary" : ""}`}>{value}</p>
    </div>
  );
}

function OrderRow({
  order,
  active = false,
  reorder = false,
}: {
  order: (typeof orders)[number] | (typeof history)[number];
  active?: boolean;
  reorder?: boolean;
}) {
  const farm = getFarm(order.product.farmId);
  const navigate = useNavigate();

  return (
    <div className="card-lift flex items-center gap-3 rounded-xl border border-border bg-card p-3">
      <Link
        to="/orders/$id"
        params={{ id: order.id }}
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        <img src={order.product.image} alt="" className="h-14 w-14 rounded-lg object-cover" />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-1 text-sm font-semibold">{order.product.name}</p>
          <p className="text-[11px] text-muted-foreground">
            {farm?.name} · {order.placed}
          </p>
          <p className="font-mono text-[10px] text-muted-foreground">{order.id}</p>
          {active && "eta" in order && (
            <p className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-semibold text-primary">
              <Radio className="h-3 w-3 animate-pulse" /> Live · ETA {order.eta}
            </p>
          )}
        </div>
      </Link>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
            active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
          }`}
        >
          {order.status === "out-for-delivery"
            ? "Out for delivery"
            : order.status === "shipped"
              ? "Shipped"
              : "Delivered"}
        </span>
        {reorder && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1 px-2 text-[11px]"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              navigate({ to: "/payment-success", search: { id: order.product.id } });
            }}
          >
            <RotateCcw className="h-3 w-3" /> Re-order
          </Button>
        )}
      </div>
    </div>
  );
}
