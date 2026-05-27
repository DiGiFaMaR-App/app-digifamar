import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Search, Package, User, Tractor, MessageCircle } from "lucide-react";
import { type ReactNode } from "react";
import { Logo } from "./Logo";

type NavItem = { to: string; label: string; icon: React.ElementType };

const buyerNav: NavItem[] = [
  { to: "/market", label: "Shop", icon: Search },
  { to: "/dashboard/buyer", label: "Orders", icon: Package },
];

const farmerNav: NavItem[] = [
  { to: "/market", label: "Browse", icon: Search },
  { to: "/dashboard/farmer", label: "Dashboard", icon: Tractor },
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
          <Link
            to="/auth"
            search={{ tab: "signin" }}
            className="rounded-lg border border-border bg-card/60 px-3 py-1.5 text-xs font-semibold hover:bg-card"
          >
            Account
          </Link>
        </div>
      </header>

      <main className="flex-1 pb-24 md:pb-10">{children}</main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-4">
          <BottomItem to="/" icon={Home} label="Home" path={path} exact />
          {nav.map((n) => (
            <BottomItem key={n.to} to={n.to} icon={n.icon} label={n.label} path={path} />
          ))}
          <BottomItem to="/auth" icon={User} label="Me" path={path} />
        </div>
      </nav>

      <a
        href="https://wa.me/19294919491"
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-20 right-4 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_0_24px_-4px_color-mix(in_oklab,var(--primary)_60%,transparent)] hover:bg-primary-hover md:bottom-6 md:right-6"
        aria-label="WhatsApp support"
      >
        <MessageCircle className="h-6 w-6" />
      </a>
    </div>
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
