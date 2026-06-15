import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import {
  Tractor,
  ShoppingBasket,
  Mail,
  Lock,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleAuthButton } from "@/components/GoogleAuthButton";
import { supabase } from "@/integrations/supabase/client";

const searchSchema = z.object({
  tab:  z.enum(["signup", "signin"]).default("signin").catch("signin"),
  next: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in or join DiGiFaMaR" },
      {
        name: "description",
        content:
          "Sign up as a farmer or buyer, or log in to your DiGiFaMaR account.",
      },
    ],
  }),
  validateSearch: searchSchema,
  component: Auth,
});

// ─────────────────────────────────────────────────────────────────
// ROOT COMPONENT
// ─────────────────────────────────────────────────────────────────
function Auth() {
  const { tab, next } = Route.useSearch();
  const navigate = useNavigate();

  const setTab = (t: "signup" | "signin") =>
    navigate({ to: "/auth", search: { tab: t, next } });

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-5 py-10">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
      </div>

      <div className="mb-6">
        <Logo size="md" glow />
      </div>

      <div className="w-full max-w-md rounded-2xl border border-border bg-card/80 p-6 shadow-[var(--shadow-card)] backdrop-blur">
        {/* Tab switcher */}
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1 mb-6">
          {(["signup", "signin"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition-all ${
                tab === t
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "signup" ? "Sign Up" : "Sign In"}
            </button>
          ))}
        </div>

        {tab === "signup" ? (
          <SignUpPanel />
        ) : (
          <SignInPanel next={next} />
        )}
      </div>

      <Link
        to="/"
        className="mt-6 text-xs text-muted-foreground hover:text-primary transition-colors"
      >
        ← Back to home
      </Link>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// SIGN UP — two large role cards, no inline form
// ─────────────────────────────────────────────────────────────────
function SignUpPanel() {
  return (
    <div className="space-y-3">
      <p className="text-center text-sm text-muted-foreground mb-5">
        Choose your account type to get started
      </p>

      {/* Farmer card */}
      <Link to="/signup/farmer" className="block group">
        <div className="flex items-center gap-4 rounded-2xl border-2 border-border p-5 transition-all hover:border-primary hover:bg-primary/5 cursor-pointer">
          <div className="h-14 w-14 shrink-0 rounded-full flex items-center justify-center text-2xl bg-primary/10">
            <Tractor className="h-7 w-7 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white text-base">I'm a Farmer</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Sell direct to buyers · keep 92% of every sale
            </p>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
        </div>
      </Link>

      {/* Buyer card */}
      <Link to="/signup/buyer" className="block group">
        <div className="flex items-center gap-4 rounded-2xl border-2 border-border p-5 transition-all hover:border-primary hover:bg-primary/5 cursor-pointer">
          <div className="h-14 w-14 shrink-0 rounded-full flex items-center justify-center text-2xl bg-primary/10">
            <ShoppingBasket className="h-7 w-7 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white text-base">I'm a Buyer</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Buy fresh produce direct · escrow-protected
            </p>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
        </div>
      </Link>

      <Divider label="or sign up with" />

      <GoogleAuthButton
        label="Continue with Google"
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background/40 px-4 py-3 text-sm font-semibold hover:bg-card transition-colors"
      />

      <p className="mt-5 text-center text-xs text-muted-foreground">
        Already have an account?{" "}
        <Link
          to="/auth"
          search={{ tab: "signin" }}
          className="font-semibold text-primary hover:underline"
        >
          Sign in
        </Link>
      </p>

      <p className="mt-3 text-center text-[11px] text-muted-foreground leading-relaxed">
        By creating an account, you agree to our{" "}
        <Link to="/terms" className="underline hover:text-primary">Terms of Service</Link>{" "}
        and{" "}
        <Link to="/privacy" className="underline hover:text-primary">Privacy Policy</Link>.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// SIGN IN — Supabase auth with role-based redirect
// ─────────────────────────────────────────────────────────────────
function SignInPanel({ next }: { next?: string }) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    const form = e.currentTarget;
    const email    = (form.elements.namedItem("email")    as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      // Resolve role from user_roles table, default to buyer.
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .limit(1)
        .maybeSingle();

      const role = roleRow?.role ?? "buyer";

      if (next) {
        // `next` is a dynamic path — use the history API so TanStack Router
        // picks it up without needing a compile-time route literal.
        window.history.replaceState(null, "", next);
        window.dispatchEvent(new PopStateEvent("popstate"));
      } else if (role === "farmer") {
        navigate({ to: "/dashboard/farmer" });
      } else {
        navigate({ to: "/dashboard/buyer" });
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Sign in failed. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSignIn} className="space-y-4">
      <Field label="Email" icon={Mail}>
        <Input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          className="pl-10"
        />
      </Field>

      <Field label="Password" icon={Lock}>
        <Input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          className="pl-10"
        />
      </Field>

      <Button
        type="submit"
        size="lg"
        disabled={isLoading}
        className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary-hover"
      >
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <>
            Sign in <ArrowRight className="ml-1 h-5 w-5" />
          </>
        )}
      </Button>

      <Divider label="or" />

      <GoogleAuthButton
        label="Continue with Google"
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background/40 px-4 py-3 text-sm font-semibold hover:bg-card transition-colors"
      />

      <p className="mt-5 text-center text-xs text-muted-foreground">
        New here?{" "}
        <Link
          to="/auth"
          search={{ tab: "signup" }}
          className="font-semibold text-primary hover:underline"
        >
          Create an account
        </Link>
      </p>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────
// SHARED PRIMITIVES
// ─────────────────────────────────────────────────────────────────
function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 text-[11px] uppercase tracking-wider text-muted-foreground">
      <div className="h-px flex-1 bg-border" />
      {label}
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

function Field({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        {children}
      </div>
    </div>
  );
}
