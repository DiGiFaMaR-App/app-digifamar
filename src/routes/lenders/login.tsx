import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Building2, Loader2, Lock, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LenderCard, LenderShell } from "./-ui";
import { NAVY } from "./-data";

export const Route = createFileRoute("/lenders/login")({
  head: () => ({
    meta: [
      { title: "Lender Login — DiGiFaMaR Lending" },
      { name: "description", content: "Secure sign-in for approved DiGiFaMaR lending partners." },
    ],
  }),
  component: LenderLogin,
});

function LenderLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw new Error(authError.message);
      navigate({ to: "/lenders/dashboard" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in. Check your credentials.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <LenderShell showNav={false}>
      <div className="mx-auto max-w-md pt-6">
        <div className="text-center">
          <span
            className="mx-auto grid h-12 w-12 place-items-center rounded-2xl text-white"
            style={{ backgroundColor: NAVY.accent }}
          >
            <Building2 className="h-6 w-6" />
          </span>
          <h1 className="mt-4 text-2xl font-extrabold">Lender sign in</h1>
          <p className="mt-1 text-sm text-slate-400">
            Approved partners only. This is separate from farmer &amp; buyer accounts.
          </p>
        </div>

        <LenderCard className="mt-6 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Work email
              </span>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@institution.com"
                  className={`${inputCls} pl-10`}
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-1.5 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Password</span>
                <button type="button" className="text-[11px] font-semibold" style={{ color: "#93B4FF" }}>
                  Forgot?
                </button>
              </span>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`${inputCls} pl-10`}
                />
              </div>
            </label>

            {error && (
              <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-bold text-white transition disabled:opacity-60"
              style={{ backgroundColor: NAVY.accent }}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Signing in…
                </>
              ) : (
                <>
                  Sign in <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </LenderCard>

        <p className="mt-5 text-center text-xs text-slate-500">
          New institution?{" "}
          <Link to="/lenders/apply" className="font-semibold" style={{ color: "#93B4FF" }}>
            Apply to become a lending partner
          </Link>
        </p>
      </div>
    </LenderShell>
  );
}

const inputCls =
  "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/30";
