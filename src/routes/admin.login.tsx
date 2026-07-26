import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shield, Mail, Lock, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { verifyAdminSessionFn } from "@/lib/admin/admin.functions";

export const Route = createFileRoute("/admin/login")({
  head: () => ({
    meta: [
      { title: "Admin Login — DiGiFaMaR" },
      { name: "description", content: "Restricted admin access for DiGiFaMaR staff." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const verifyAdminSession = verifyAdminSessionFn;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      setHasSession(!!data.user);
      setCheckingSession(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function continueWithCurrentSession() {
    setLoading(true);
    try {
      await verifyAdminSession();
      toast.success("Welcome, admin");
      navigate({ to: "/admin" });
    } catch {
      toast.error("Admin access required", {
        description: "The signed-in account is not an admin. Sign in with the admin account.",
      });
      await supabase.auth.signOut();
      setHasSession(false);
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        toast.error("Password sign in failed", {
          description: "Check the admin email and password, or use the reset link below.",
        });
        return;
      }

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error("No session");

      try {
        await verifyAdminSession();
      } catch {
        await supabase.auth.signOut();
        toast.error("Not an admin account", {
          description: "This account does not have admin privileges.",
        });
        return;
      }

      toast.success("Welcome, admin");
      navigate({ to: "/admin" });
    } catch (err) {
      toast.error("Sign in failed", {
        description: err instanceof Error ? err.message : "Check your credentials.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-5 py-10">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
      </div>

      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/30">
            <Shield className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Admin sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Restricted area. Staff accounts only.
          </p>
        </div>

        {hasSession && (
          <div className="mb-4 rounded-2xl border bg-card p-4 shadow-sm">
            <Button
              type="button"
              className="w-full"
              disabled={loading || checkingSession}
              onClick={continueWithCurrentSession}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Continue to admin dashboard"
              )}
            </Button>
          </div>
        )}

        <form onSubmit={onSubmit} className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9"
                placeholder="admin@digifamar.com"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9"
                placeholder="••••••••"
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Sign in as admin
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>

          <div className="text-center">
            <Link to="/forgot-password" className="text-xs text-primary hover:underline">
              Forgot password? Create or reset it
            </Link>
          </div>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Not an admin?{" "}
          <Link to="/auth" className="text-primary hover:underline">
            Go to user sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
