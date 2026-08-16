import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Search, Store, Package, User, ShoppingCart } from "lucide-react";
import { useCart } from "@/hooks/use-cart";

const items = [
  { to: "/", label: "Home", icon: Home, exact: true },
  { to: "/market", label: "Shop", icon: Search },
  { to: "/signup/farmer", label: "Sell", icon: Store },
  { to: "/cart", label: "Cart", icon: ShoppingCart },
  { to: "/orders", label: "Orders", icon: Package },
  { to: "/auth", label: "Profile", icon: User, search: { tab: "signin" as const } },
] as const;

// Full-screen flows where the bottom tab bar should not appear.
const HIDDEN_PREFIXES = ["/auth", "/signin", "/signup"];

export function MobileBottomNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { count } = useCart();

  if (HIDDEN_PREFIXES.some((p) => path === p || path.startsWith(p + "/"))) {
    return null;
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Primary"
    >
      <ul className="mx-auto grid max-w-md grid-cols-6">
        {items.map((it) => {
          const active =
            "exact" in it && it.exact
              ? path === it.to
              : path === it.to || path.startsWith(it.to + "/");
          const showBadge = it.to === "/cart" && count > 0;
          return (
            <li key={it.label}>
              <Link
                to={it.to}
                {...("search" in it ? { search: it.search } : {})}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-[52px] flex-col items-center justify-center gap-0.5 px-1 py-2 text-[10px] font-medium leading-tight transition-colors ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="relative">
                  <it.icon className="h-5 w-5" />
                  {showBadge && (
                    <span className="absolute -right-2 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                      {count > 9 ? "9+" : count}
                    </span>
                  )}
                </span>
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
