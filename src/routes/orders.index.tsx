import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Package, ChevronRight, ShieldCheck, RefreshCw } from "lucide-react";
import { listMyOrders } from "@/lib/orders/orders.queries";
import { AppShell } from "@/components/AppShell";
import { OrderStatusBadge } from "@/components/order/OrderStatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { formatCents } from "@/lib/cart/fees";


export const Route = createFileRoute("/orders/")({
  head: () => ({
    meta: [
      { title: "My Orders — DiGiFaMaR" },
      {
        name: "description",
        content: "Track your DiGiFaMaR farm orders, escrow status, and deliveries.",
      },
      { property: "og:title", content: "My Orders — DiGiFaMaR" },
      {
        property: "og:description",
        content: "Track your DiGiFaMaR farm orders, escrow status, and deliveries.",
      },
    ],
  }),
  component: OrdersIndex,
});

const ACTIVE_STATUSES = new Set([
  "pending",
  "paid",
  "in_escrow",
  "escrow_funded",
  "awaiting_delivery",
  "shipped",
  "delivered",
  "inspection",
  "negotiating",
  "disputed",
]);

function OrdersIndex() {
  const { data, isLoading, error, isFetching, refetch } = useQuery({
    queryKey: ["my-orders"],
    queryFn: () => listMyOrders(),
    retry: false,
  });

  const orders = data ?? [];
  const activeCount = orders.filter((o) => ACTIVE_STATUSES.has(o.status)).length;

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        <div className="mb-1 flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight">My orders</h1>
          {orders.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void refetch()}
              disabled={isFetching}
              className="h-8 gap-1.5 text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          )}
        </div>
        <p className="mb-5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          Every order is escrow-protected until you confirm delivery with your 6-digit code.
        </p>

        {isLoading && (
          <ul className="space-y-2" aria-label="Loading orders">
            {Array.from({ length: 3 }).map((_, i) => (
              <li key={i} className="rounded-xl border border-border bg-card p-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="mt-2 h-3 w-48" />
              </li>
            ))}
          </ul>
        )}

        {error && (
          <div className="rounded-xl border border-border bg-muted/30 p-6 text-center">
            <p className="text-sm text-muted-foreground">Sign in to see your orders.</p>
            <Link
              to="/signin"
              className="mt-3 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Sign in
            </Link>
          </div>
        )}

        {!isLoading && !error && orders.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 p-10 text-center">
            <Package className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-base font-medium">No orders yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Browse the marketplace and place your first order.
            </p>
            <Link
              to="/market"
              className="mt-4 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Browse fresh listings
            </Link>
          </div>
        )}

        {!isLoading && orders.length > 0 && (
          <>
            <p className="mb-2 text-xs text-muted-foreground">
              {orders.length} order{orders.length === 1 ? "" : "s"}
              {activeCount > 0 && ` · ${activeCount} in progress`}
            </p>
            <ul className="space-y-2">
              {orders.map((o) => (
                <li key={o.id}>
                  <Link
                    to="/orders/$id"
                    params={{ id: o.id }}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-card/80"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-mono text-sm font-semibold">#{o.id.slice(-8)}</p>
                        <OrderStatusBadge status={o.status} />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(o.created_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}{" "}
                        · <span className="font-semibold text-foreground">
                          {formatCents(o.total_cents)}
                        </span>
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

    </AppShell>
  );
}
