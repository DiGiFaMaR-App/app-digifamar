import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Minus, Plus, ShieldCheck, ShoppingCart, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { dollarsToCents, formatCents } from "@/lib/cart/fees";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your cart — DiGiFaMaR" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { items, isEmpty, subtotalCents, count, setQuantity, remove } = useCart();
  const navigate = useNavigate();

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 pt-6 sm:px-6">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold sm:text-3xl">
          <ShoppingCart className="h-6 w-6 text-primary" /> Your cart
        </h1>

        {isEmpty ? (
          <div className="mt-10 flex flex-col items-center rounded-2xl border border-border bg-card/60 p-10 text-center">
            <ShoppingCart className="h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">Your cart is empty.</p>
            <Button asChild className="mt-5 bg-primary text-primary-foreground hover:bg-primary-hover">
              <Link to="/market">Browse the marketplace</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_300px]">
            {/* Line items */}
            <ul className="space-y-3">
              {items.map((item) => {
                const lineCents = dollarsToCents(item.unitPrice) * item.quantity;
                return (
                  <li
                    key={item.productId}
                    className="flex gap-3 rounded-2xl border border-border bg-card p-3"
                  >
                    <Link to="/product/$id" params={{ id: item.productId }} className="shrink-0">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-20 w-20 rounded-xl object-cover"
                      />
                    </Link>

                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          to="/product/$id"
                          params={{ id: item.productId }}
                          className="truncate text-sm font-semibold hover:text-primary"
                        >
                          {item.name}
                        </Link>
                        <button
                          onClick={() => remove(item.productId)}
                          aria-label={`Remove ${item.name}`}
                          className="text-muted-foreground transition hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        ${item.unitPrice.toFixed(2)} / {item.unit}
                      </p>

                      <div className="mt-auto flex items-center justify-between pt-2">
                        <div className="inline-flex items-center rounded-lg border border-border">
                          <button
                            onClick={() => setQuantity(item.productId, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                            aria-label="Decrease quantity"
                            className="grid h-8 w-8 place-items-center text-muted-foreground transition hover:text-foreground disabled:opacity-40"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-8 text-center text-sm font-semibold tabular-nums">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => setQuantity(item.productId, item.quantity + 1)}
                            aria-label="Increase quantity"
                            className="grid h-8 w-8 place-items-center text-muted-foreground transition hover:text-foreground"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <span className="text-sm font-bold">{formatCents(lineCents)}</span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Summary */}
            <aside className="h-fit rounded-2xl border border-border bg-card p-5 lg:sticky lg:top-20">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Summary
              </h2>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Subtotal · {count} item{count === 1 ? "" : "s"}
                </span>
                <span className="font-semibold">{formatCents(subtotalCents)}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Platform &amp; escrow fees are calculated at checkout.
              </p>

              <Button
                onClick={() => navigate({ to: "/checkout" })}
                className="mt-4 w-full bg-primary text-primary-foreground hover:bg-primary-hover"
              >
                Proceed to checkout <ArrowRight className="ml-1 h-4 w-4" />
              </Button>

              <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Escrow.com-protected payment
              </p>
            </aside>
          </div>
        )}
      </div>
    </AppShell>
  );
}
