import { Link } from "@tanstack/react-router";
import { Home, Search, ShoppingCart, MessageSquare, User } from "lucide-react";

const items = [
  { to: "/", label: "Home", icon: Home },
  { to: "/browse", label: "Browse", icon: Search },
  { to: "/signin", label: "Cart", icon: ShoppingCart },
  { to: "/contact", label: "Chat", icon: MessageSquare },
  { to: "/signin", label: "Profile", icon: User },
];

export function MobileBottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur md:hidden">
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {items.map((it) => (
          <li key={it.label}>
            <Link
              to={it.to}
              className="flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-muted-foreground transition-colors [&.active]:text-primary"
              activeProps={{ className: "text-primary" }}
            >
              <it.icon className="h-5 w-5" />
              {it.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
