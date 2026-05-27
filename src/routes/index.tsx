import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Mail } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DiGiFaMaR — Direct from Farm to You" },
      {
        name: "description",
        content:
          "Buy fresh produce direct from verified American farmers. Escrow-protected checkout, 24-48 hour delivery, 50 states.",
      },
      { property: "og:title", content: "DiGiFaMaR — Direct from Farm to You" },
      {
        property: "og:description",
        content: "The premium direct-to-farmer agricultural marketplace.",
      },
    ],
  }),
  component: Splash,
});

function Splash() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-6 py-12">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-1/3 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute right-1/4 top-1/4 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
      </div>

      <div className="flex flex-col items-center text-center animate-pulse-glow">
        <Logo size="xl" glow linked={false} />
      </div>

      <div className="mt-8 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          DiGi<span className="text-primary text-glow">FaMaR</span>
        </h1>
        <p className="mt-3 max-w-sm text-base text-muted-foreground">
          Direct from Farm to You
        </p>
      </div>

      <div className="mt-10 flex w-full max-w-sm flex-col gap-3">
        <Button asChild size="lg" className="h-12 bg-primary text-primary-foreground hover:bg-primary-hover shadow-[0_0_30px_-5px_color-mix(in_oklab,var(--primary)_50%,transparent)]">
          <Link to="/auth" search={{ tab: "signup" }}>
            Sign Up
            <ArrowRight className="ml-1 h-5 w-5" />
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="h-12 border-border bg-card/60 backdrop-blur hover:bg-card">
          <Link to="/auth" search={{ tab: "signin" }}>Sign In</Link>
        </Button>
        <button
          type="button"
          className="mt-2 inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-border bg-card/40 text-sm font-semibold text-foreground transition hover:bg-card"
        >
          <GoogleIcon className="h-5 w-5" />
          Continue with Google
        </button>
      </div>

      <div className="mt-10 flex items-center gap-4 text-xs text-muted-foreground">
        <Link to="/marketplace" className="hover:text-primary">Browse marketplace</Link>
        <span aria-hidden>·</span>
        <a href="mailto:hello@digifamar.com" className="inline-flex items-center gap-1 hover:text-primary">
          <Mail className="h-3.5 w-3.5" /> Contact
        </a>
      </div>
    </div>
  );
}

function GoogleIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.5 14.6 2.5 12 2.5 6.8 2.5 2.6 6.7 2.6 12s4.2 9.5 9.4 9.5c5.4 0 9-3.8 9-9.2 0-.6-.1-1.1-.2-1.6H12z"/>
    </svg>
  );
}
