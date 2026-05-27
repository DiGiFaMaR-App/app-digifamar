import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Mail, Sparkles } from "lucide-react";
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
      {/* Ambient animated glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[38%] h-[640px] w-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-3xl animate-pulse-glow" />
        <div className="absolute bottom-0 left-1/4 h-80 w-80 rounded-full bg-primary/10 blur-3xl animate-float" />
        <div className="absolute right-1/5 top-1/4 h-72 w-72 rounded-full bg-primary/10 blur-3xl animate-float [animation-delay:1.5s]" />
        {/* subtle vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.55)_100%)]" />
      </div>

      {/* Verified pill */}
      <div className="splash-rise opacity-0 [animation-delay:60ms] mb-8 inline-flex items-center gap-1.5 rounded-full border border-border bg-card/50 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        Verified American farms · 50 states
      </div>

      {/* Logo */}
      <div className="splash-rise opacity-0 [animation-delay:140ms] flex flex-col items-center text-center">
        <div className="animate-pulse-glow">
          <Logo size="xl" glow linked={false} />
        </div>
      </div>

      {/* Wordmark + tagline */}
      <div className="splash-rise opacity-0 [animation-delay:260ms] mt-8 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          DiGi<span className="text-primary text-glow">FaMaR</span>
        </h1>
        <p className="mt-3 max-w-sm text-base text-muted-foreground">
          Direct from Farm to You
        </p>
        <div className="mx-auto mt-4 h-px w-32 bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
      </div>

      {/* CTAs */}
      <div className="splash-rise opacity-0 [animation-delay:380ms] mt-10 flex w-full max-w-sm flex-col gap-3">
        <Button
          asChild
          size="lg"
          className="group h-12 bg-primary text-primary-foreground hover:bg-primary-hover shadow-[0_0_40px_-8px_color-mix(in_oklab,var(--primary)_70%,transparent)] transition-transform hover:scale-[1.02] active:scale-[0.99]"
        >
          <Link to="/auth" search={{ tab: "signup" }}>
            Sign Up
            <ArrowRight className="ml-1 h-5 w-5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </Button>
        <Button
          asChild
          size="lg"
          variant="outline"
          className="h-12 border-border bg-card/60 backdrop-blur hover:bg-card hover:border-primary/40 transition-colors"
        >
          <Link to="/auth" search={{ tab: "signin" }}>Sign In</Link>
        </Button>
        <button
          type="button"
          className="mt-1 inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-border bg-card/40 text-sm font-semibold text-foreground transition hover:bg-card hover:border-primary/30"
        >
          <GoogleIcon className="h-5 w-5" />
          Continue with Google
        </button>
      </div>

      {/* Footer links */}
      <div className="splash-rise opacity-0 [animation-delay:520ms] mt-10 flex items-center gap-4 text-xs text-muted-foreground">
        <Link to="/marketplace" className="hover:text-primary transition-colors">Browse marketplace</Link>
        <span aria-hidden>·</span>
        <a href="mailto:hello@digifamar.com" className="inline-flex items-center gap-1 hover:text-primary transition-colors">
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
