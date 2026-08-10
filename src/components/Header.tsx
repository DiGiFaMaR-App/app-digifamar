import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, Search, ShoppingCart, User, X } from "lucide-react";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";

const navItems = [
  { to: "/browse", label: "Browse" },
  { to: "/near-me", label: "Near Me" },
  { to: "/saved", label: "Saved" },
  { to: "/how-it-works", label: "How It Works" },
  { to: "/pricing", label: "Pricing" },
  { to: "/lending", label: "Lending" },
  { to: "/about", label: "About" },
];

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/65">
      <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        <Logo wordmark />

        <nav className="hidden items-center gap-0.5 rounded-full border border-border/70 bg-secondary/60 p-1 lg:flex">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-full px-3.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-background hover:text-foreground hover:shadow-soft"
              activeProps={{ className: "bg-background text-foreground shadow-soft" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/browse" search={{ farm: undefined }} aria-label="Search">
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

        <button
          className="rounded-lg p-2 text-foreground transition-colors hover:bg-secondary md:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
        >
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
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
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
