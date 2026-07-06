import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Package, ChevronRight } from "lucide-react";
import { listMyOrders } from "@/lib/orders/orders.queries";
import { AppShell } from "@/components/AppShell";

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

function OrdersIndex() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["my-orders"],
    queryFn: () => listMyOrders(),
    retry: false,
  });

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        <h1 className="mb-4 text-2xl font-bold tracking-tight">My Orders</h1>

        {isLoading && <p className="text-sm text-muted-foreground">Loading your orders…</p>}

        {error && (
          <div className="rounded-lg border border-border bg-muted/30 p-6 text-center">
            <p className="text-sm text-muted-foreground">Sign in to see your orders.</p>
            <Link
              to="/signin"
              className="mt-3 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Sign in
            </Link>
          </div>
        )}

        {!isLoading && !error && (!data || data.length === 0) && (
          <div className="rounded-lg border border-dashed border-border bg-muted/20 p-10 text-center">
            <Package className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-base font-medium">No orders yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Browse the marketplace and place your first order.
            </p>
            <Link
              to="/market"
              className="mt-4 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Browse farms
            </Link>
          </div>
        )}

        {!isLoading && data && data.length > 0 && (
          <ul className="space-y-2">
            {data.map((o) => (
              <li key={o.id}>
                <Link
                  to="/orders/$id"
                  params={{ id: o.id }}
                  className="flex items-center justify-between rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent"
                >
                  <div>
                    <p className="text-sm font-medium">Order #{o.id.slice(-8)}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {o.status} · ${(o.total_cents / 100).toFixed(2)}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
