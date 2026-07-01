import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, Search, ShoppingCart, User, X } from "lucide-react";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";

const navItems = [
  { to: "/browse", label: "Browse" },
  { to: "/how-it-works", label: "How It Works" },
  { to: "/pricing", label: "Pricing" },
  { to: "/lending", label: "Lending" },
  { to: "/about", label: "About" },
];

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Logo />

        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground [&.active]:text-foreground"
              activeProps={{ className: "text-foreground" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/browse" aria-label="Search">
              <Search className="h-5 w-5" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" aria-label="Cart">
            <ShoppingCart className="h-5 w-5" />
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/signin">Sign in</Link>
          </Button>
          <Button size="sm" asChild>
            <Link to="/signup">Get started</Link>
          </Button>
        </div>

        <button className="md:hidden" onClick={() => setOpen((o) => !o)} aria-label="Toggle menu">
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border bg-background md:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-2 flex gap-2 border-t border-border pt-3">
              <Button variant="outline" size="sm" asChild className="flex-1">
                <Link to="/signin" onClick={() => setOpen(false)}>
                  <User className="mr-1 h-4 w-4" /> Sign in
                </Link>
              </Button>
              <Button size="sm" asChild className="flex-1">
                <Link to="/signup" onClick={() => setOpen(false)}>
                  Get started
                </Link>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
