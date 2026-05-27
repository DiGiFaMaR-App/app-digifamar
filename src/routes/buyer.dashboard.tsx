import { createFileRoute, Link } from "@tanstack/react-router";
import { Package, Truck, History, ShoppingBag } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { products, getFarm } from "@/lib/mock-data";

export const Route = createFileRoute("/buyer/dashboard")({
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

function BuyerDashboard() {
  return (
    <AppShell role="buyer">
      <div className="mx-auto max-w-5xl px-4 pt-6 sm:px-6">
        <h1 className="text-2xl font-extrabold sm:text-3xl">My orders</h1>
        <p className="mt-1 text-sm text-muted-foreground">Track active deliveries and revisit past purchases.</p>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Stat icon={Truck} label="Active deliveries" value={orders.length} />
          <Stat icon={Package} label="In transit" value={orders.filter(o => o.status !== "delivered").length} />
          <Stat icon={History} label="Past purchases" value={history.length} />
        </div>

        <Section title="Active deliveries">
          {orders.map((o) => (
            <OrderRow key={o.id} order={o} active />
          ))}
        </Section>

        <Section title="Past purchases">
          {history.map((o) => (
            <OrderRow key={o.id} order={o} />
          ))}
        </Section>

        <div className="mt-8 flex justify-center">
          <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary-hover">
            <Link to="/marketplace"><ShoppingBag className="mr-1 h-5 w-5" /> Shop the marketplace</Link>
          </Button>
        </div>
      </div>
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{title}</h2>
      <div className="mt-3 space-y-2">{children}</div>
    </section>
  );
}

function Stat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-4 w-4 text-primary" /> {label}
      </div>
      <p className="mt-1 text-2xl font-extrabold">{value}</p>
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
