import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { ArrowRight, Mail } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { GoogleAuthButton } from "@/components/GoogleAuthButton";
import { FluidHero } from "@/components/FluidHero";

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

function DewField() {
  // Deterministic-ish particles so SSR + hydration match well enough.
  const particles = useMemo(
    () =>
      Array.from({ length: 28 }).map((_, i) => {
        const seed = (i * 9301 + 49297) % 233280;
        const r = (n: number) => ((seed * (n + 1)) % 1000) / 1000;
        const size = 2 + r(1) * 4;
        return {
          left: `${r(2) * 100}%`,
          bottom: `-${r(3) * 30 + 5}%`,
          size,
          duration: 18 + r(4) * 28,
          delay: -r(5) * 30,
          dx: `${(r(6) - 0.5) * 80}px`,
          opacity: 0.35 + r(7) * 0.5,
        };
      }),
    [],
  );
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {particles.map((p, i) => (
        <span
          key={i}
          className="dew-particle"
          style={{
            left: p.left,
            bottom: p.bottom,
            width: p.size,
            height: p.size,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            // CSS custom props consumed by the keyframes
            ["--dew-dx" as string]: p.dx,
            ["--dew-opacity" as string]: p.opacity,
          }}
        />
      ))}
    </div>
  );
}

function Splash() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-start overflow-hidden px-6 pt-14 pb-12">
      {/* Layered background: deep gradient → soil texture → fluid → dew → vignette */}
      <div
        className="pointer-events-none absolute inset-0 -z-30"
        style={{
          background:
            "radial-gradient(ellipse at 50% 30%, #122014 0%, #0c1410 45%, #070a08 100%)",
        }}
      />
      <div className="pointer-events-none absolute inset-0 -z-20 opacity-60 soil-texture" />
      <FluidHero className="-z-20 opacity-50" />
      <DewField />
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[42%] h-[680px] w-[680px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl animate-pulse-glow" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.7)_100%)]" />
      </div>

      {/* Logo — blends into dark canvas via screen blend mode */}
      <div className="splash-rise opacity-0 [animation-delay:120ms] relative flex flex-col items-center text-center">
        {/* soft halo sitting behind the logo for "merged" depth */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[340px] w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/25 blur-[80px]" />
        <div className="animate-pulse-glow">
          <Logo size="2xl" blend linked={false} />
        </div>
      </div>

      {/* Tagline */}
      <div className="splash-rise opacity-0 [animation-delay:260ms] mt-2 text-center">
        <p className="text-sm font-semibold tracking-[0.2em] text-blue-400">
          BUILT ON TRUST
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
          <Link to="/signup">
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
        <GoogleAuthButton className="mt-1 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-border bg-card/40 text-sm font-semibold text-foreground transition hover:bg-card hover:border-primary/30" />
      </div>

      <div className="splash-rise opacity-0 [animation-delay:520ms] mt-10 flex items-center gap-4 text-xs text-muted-foreground">
        <Link to="/market" className="hover:text-primary transition-colors">Browse marketplace</Link>
        <span aria-hidden>·</span>
        <a href="mailto:hello@digifamar.com" className="inline-flex items-center gap-1 hover:text-primary transition-colors">
          <Mail className="h-3.5 w-3.5" /> Contact
        </a>
      </div>
    </div>
  );
}
