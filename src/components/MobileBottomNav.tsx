import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Search, Store, Package, User, Sprout } from "lucide-react";

const items = [
  { to: "/", label: "Home", icon: Home, exact: true },
  { to: "/browse", label: "Browse", icon: Search },
  { to: "/signup/farmer", label: "Sell", icon: Store },
  { to: "/orders", label: "Orders", icon: Package },
  { to: "/hacks", label: "Hacks", icon: Sprout },
  { to: "/auth", label: "Profile", icon: User, search: { tab: "signin" as const } },
] as const;

// Full-screen flows where the bottom tab bar should not appear.
const HIDDEN_PREFIXES = ["/auth", "/signin", "/signup"];

export function MobileBottomNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
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
          return (
            <li key={it.label}>
              <Link
                to={it.to}
                {...("search" in it ? { search: it.search } : {})}
                className={`flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <it.icon className="h-5 w-5" />
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
