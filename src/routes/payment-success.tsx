import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { CheckCircle2, Download, Package, ShoppingBag } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { getProduct } from "@/lib/mock-data";

export const Route = createFileRoute("/payment-success")({
  head: () => ({
    meta: [{ title: "Payment successful — DiGiFaMaR" }, { name: "robots", content: "noindex" }],
  }),
  validateSearch: z.object({
    id: z.string().optional(),
    orderId: z.string().optional(),
    amount: z.number().optional(),
  }),
  component: Success,
});

function Success() {
  const { id, orderId: passedOrderId, amount } = Route.useSearch();
  const product = id ? getProduct(id) : undefined;
  const orderId = passedOrderId ?? "DFM-" + Math.random().toString(36).slice(2, 8).toUpperCase();
  const eta = new Date(Date.now() + (product?.delivery === "48h" ? 48 : 24) * 3600 * 1000);

  return (
    <AppShell>
      <div className="mx-auto flex max-w-md flex-col items-center px-5 pt-10 text-center">
        <div className="relative">
          <div className="absolute inset-0 -z-10 rounded-full bg-primary/30 blur-3xl" />
          <div className="animate-success-pop inline-flex h-28 w-28 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_0_60px_-10px_color-mix(in_oklab,var(--primary)_70%,transparent)]">
            <CheckCircle2 className="h-16 w-16" strokeWidth={2.5} />
          </div>
        </div>

        <h1 className="mt-6 text-2xl font-extrabold sm:text-3xl">Payment successful</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your order is locked in. Funds are held in escrow until you confirm delivery.
        </p>

        <div className="mt-6 w-full rounded-2xl border border-border bg-card/80 p-5 text-left">
          <Row k="Order ID" v={orderId} mono />
          {product && (
            <Row k="Item" v={`${product.name} · $${(amount ?? product.price).toFixed(2)}`} />
          )}
          {amount !== undefined && <Row k="Amount paid" v={`$${amount.toFixed(2)}`} />}
          <Row
            k="Delivery window"
            v={
              eta.toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
              }) + " by 6pm"
            }
          />
          <Row k="Status" v={<span className="text-primary">Awaiting farmer ship-out</span>} />
        </div>

        <div className="mt-5 flex w-full flex-col gap-2">
          <Button
            asChild
            size="lg"
            className="h-12 bg-primary text-primary-foreground hover:bg-primary-hover"
          >
            <Link to="/orders/$id" params={{ id: orderId }}>
              <Package className="mr-1 h-5 w-5" /> Track My Order
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-12">
            <Link to="/market">
              <ShoppingBag className="mr-1 h-5 w-5" /> Continue shopping
            </Link>
          </Button>
          <button
            onClick={() => window.print()}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-semibold text-muted-foreground hover:text-primary"
          >
            <Download className="h-4 w-4" /> Download receipt
          </button>
        </div>
      </div>
    </AppShell>
  );
}

function Row({ k, v, mono = false }: { k: string; v: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 py-2 last:border-0 text-sm">
      <span className="text-muted-foreground">{k}</span>
      <span className={`font-semibold ${mono ? "font-mono text-xs" : ""}`}>{v}</span>
    </div>
  );
}
