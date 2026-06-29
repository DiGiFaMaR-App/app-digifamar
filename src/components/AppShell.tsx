import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Search, Package, User, Tractor, MessageCircle, ShoppingCart, MessageSquare } from "lucide-react";
import { type ReactNode } from "react";
import { useCart } from "@/hooks/use-cart";
import { Logo } from "./Logo";
import { openWhatsApp } from "./WhatsAppFab";

type NavItem = { to: string; label: string; icon: React.ElementType };

const buyerNav: NavItem[] = [
  { to: "/", label: "Home", icon: Home },
  { to: "/market", label: "Shop", icon: Search },
  { to: "/browse", label: "Browse", icon: Search },
  { to: "/dashboard/buyer", label: "Orders", icon: Package },
  { to: "/chat", label: "Messages", icon: MessageSquare },
  { to: "/lending", label: "Lending", icon: Package },
  { to: "/auth", label: "Account", icon: User },
];

const farmerNav: NavItem[] = [
  { to: "/", label: "Home", icon: Home },
  { to: "/market", label: "Browse", icon: Search },
  { to: "/dashboard/farmer", label: "Dashboard", icon: Tractor },
  { to: "/orders", label: "Orders", icon: Package },
  { to: "/chat", label: "Messages", icon: MessageSquare },
  { to: "/lending", label: "Lending", icon: Package },
  { to: "/auth", label: "Account", icon: User },
];

export function AppShell({
  children,
  role = "buyer",
}: {
  children: ReactNode;
  role?: "buyer" | "farmer";
}) {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const nav = role === "farmer" ? farmerNav : buyerNav;
  const { count } = useCart();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Logo size="sm" glow />
          <nav className="hidden items-center gap-1 md:flex">
            {nav.map((n) => {
              const active = path.startsWith(n.to);
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <n.icon className="h-4 w-4" /> {n.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2">
            <CartButton path={path} />
            <Link
              to="/auth"
              search={{ tab: "signin" }}
              className="rounded-lg border border-border bg-card/60 px-3 py-1.5 text-xs font-semibold hover:bg-card"
            >
              Account
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 pb-24 md:pb-10">{children}</main>

      {/* Global mobile bottom nav is mounted in __root.tsx */}

      <button
        type="button"
        onClick={openWhatsApp}
        className="fixed bottom-20 right-4 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_0_24px_-4px_color-mix(in_oklab,var(--primary)_60%,transparent)] hover:bg-primary-hover md:bottom-6 md:right-6"
        aria-label="WhatsApp support"
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    </div>
  );
}

function CartButton({ path }: { path: string }) {
  const { count } = useCart();
  const active = path.startsWith("/cart");
  return (
    <Link
      to="/cart"
      aria-label={`Cart${count ? `, ${count} item${count === 1 ? "" : "s"}` : ""}`}
      className={`relative grid h-9 w-9 place-items-center rounded-lg border border-border transition hover:bg-card ${
        active ? "bg-primary/15 text-primary" : "bg-card/60 text-foreground"
      }`}
    >
      <ShoppingCart className="h-4 w-4" />
      {count > 0 && (
        <span className="absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}

function BottomItem({
  to,
  icon: Icon,
  label,
  path,
  exact = false,
}: {
  to: string;
  icon: React.ElementType;
  label: string;
  path: string;
  exact?: boolean;
}) {
  const active = exact ? path === to : path.startsWith(to);
  return (
    <Link
      to={to}
      {...(to === "/auth" ? { search: { tab: "signin" as const } } : {})}
      className={`flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium ${
        active ? "text-primary" : "text-muted-foreground"
      }`}
    >
      <Icon className="h-5 w-5" />
      {label}
    </Link>
  );
}

function BottomItemCart({
  to,
  path,
  count,
}: {
  to: string;
  path: string;
  count: number;
}) {
  const active = path.startsWith(to);
  return (
    <Link
      to={to}
      className={`flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium ${
        active ? "text-primary" : "text-muted-foreground"
      }`}
    >
      <span className="relative">
        <ShoppingCart className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </span>
      Cart
    </Link>
  );
}
