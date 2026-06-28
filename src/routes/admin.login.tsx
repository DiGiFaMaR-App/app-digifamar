import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Shield, Mail, Lock, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const userId = data.user?.id;
      if (!userId) throw new Error("No session");

      // Verify admin role
      const { data: roleRow, error: roleErr } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();

      if (roleErr) throw roleErr;
      if (!roleRow) {
        await supabase.auth.signOut();
        toast.error("Not an admin account", {
          description: "This account does not have admin privileges.",
        });
        setLoading(false);
        return;
      }

      toast.success("Welcome, admin");
      navigate({ to: "/admin" });
    } catch (err) {
      toast.error("Sign in failed", {
        description: err instanceof Error ? err.message : "Check your credentials.",
      });
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

        <form
          onSubmit={onSubmit}
          className="rounded-2xl border bg-card p-6 shadow-sm space-y-4"
        >
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
