import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset Password — DiGiFaMaR" },
      { name: "description", content: "Request a password reset link." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ForgotPassword,
});

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
      toast.success("Check your email", {
        description: "We sent you a link to set your password.",
      });
    } catch (err) {
      toast.error("Could not send reset email", {
        description: err instanceof Error ? err.message : "Try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-md">
        <h1 className="mb-2 text-2xl font-semibold tracking-tight">Set or reset your password</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Enter your email and we'll send you a link to create a new password.
        </p>

        {sent ? (
          <div className="rounded-2xl border bg-card p-6 space-y-3">
            <p className="text-sm">
              If an account exists for <strong>{email}</strong>, a password link is on its way.
              Check your inbox (and spam folder).
            </p>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={loading}
              onClick={() => onSubmit({ preventDefault() {} } as React.FormEvent)}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Resend email"}
            </Button>
            <Link to="/auth" className="inline-flex items-center text-sm text-primary hover:underline">
              <ArrowLeft className="mr-1 h-4 w-4" /> Back to sign in
            </Link>
          </div>
        ) : (
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
                  placeholder="you@example.com"
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send reset link"}
            </Button>
            <Link to="/auth" className="block text-center text-xs text-muted-foreground hover:underline">
              Back to sign in
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
