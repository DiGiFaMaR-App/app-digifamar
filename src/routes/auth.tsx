import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Tractor, ShoppingBasket, Mail, Phone, Lock, ArrowRight } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleAuthButton } from "@/components/GoogleAuthButton";

const search = z.object({
  tab: z.enum(["signup", "signin"]).default("signup").catch("signup"),
});

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in or join DiGiFaMaR" },
      { name: "description", content: "Sign up as a farmer or buyer, or log in to your DiGiFaMaR account." },
    ],
  }),
  validateSearch: search,
  component: Auth,
});

function Auth() {
  const { tab } = Route.useSearch();
  const navigate = useNavigate();
  const [role, setRole] = useState<"farmer" | "buyer">("buyer");

  const setTab = (t: "signup" | "signin") =>
    navigate({ to: "/auth", search: { tab: t } });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tab === "signup" && role === "farmer") navigate({ to: "/dashboard/farmer" });
    else if (tab === "signup") navigate({ to: "/market" });
    else navigate({ to: "/market" });
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-5 py-10">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
      </div>

      <div className="mb-6">
        <Logo size="md" glow />
      </div>

      <div className="w-full max-w-md rounded-2xl border border-border bg-card/80 p-6 shadow-[var(--shadow-card)] backdrop-blur">
        {/* Tabs */}
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
          {(["signup", "signin"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                tab === t
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "signup" ? "Sign Up" : "Sign In"}
            </button>
          ))}
        </div>

        {tab === "signup" && (
          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              I am a
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <RolePill active={role === "buyer"} onClick={() => setRole("buyer")} icon={ShoppingBasket} label="Buyer" />
              <RolePill active={role === "farmer"} onClick={() => setRole("farmer")} icon={Tractor} label="Farmer" />
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <Field label="Email" icon={Mail}>
            <Input type="email" required placeholder="you@farm.com" className="pl-10" />
          </Field>
          {tab === "signup" && (
            <Field label="Phone" icon={Phone}>
              <Input type="tel" required placeholder="(555) 123-4567" className="pl-10" />
            </Field>
          )}
          <Field label="Password" icon={Lock}>
            <Input type="password" required placeholder="••••••••" className="pl-10" />
          </Field>

          <Button type="submit" size="lg" className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary-hover">
            {tab === "signup" ? "Create account" : "Sign in"}
            <ArrowRight className="ml-1 h-5 w-5" />
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-wider text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
        </div>

        <GoogleAuthButton
          defaultRole={tab === "signup" ? role : undefined}
          label={tab === "signup" ? `Continue with Google as ${role}` : "Continue with Google"}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background/40 px-4 py-3 text-sm font-semibold hover:bg-card"
        />


        <p className="mt-5 text-center text-xs text-muted-foreground">
          {tab === "signup" ? (
            <>Have an account? <button onClick={() => setTab("signin")} className="font-semibold text-primary hover:underline">Sign in</button></>
          ) : (
            <>New here? <button onClick={() => setTab("signup")} className="font-semibold text-primary hover:underline">Create an account</button></>
          )}
        </p>
      </div>

      <Link to="/" className="mt-6 text-xs text-muted-foreground hover:text-primary">← Back to splash</Link>
    </div>
  );
}

function RolePill({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-semibold transition ${
        active
          ? "border-primary bg-primary/10 text-primary glow-ring"
          : "border-border bg-card/40 text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon className="h-4 w-4" /> {label}
    </button>
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
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        {children}
      </div>
    </div>
  );
}
