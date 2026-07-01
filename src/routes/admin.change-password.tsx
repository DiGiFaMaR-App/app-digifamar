import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Lock, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth } from "@/components/RequireAuth";
import { AdminGate } from "@/components/AdminGate";
import { PasswordStrengthMeter } from "@/components/PasswordStrengthMeter";
import { estimatePasswordStrength } from "@/lib/password-strength";

export const Route = createFileRoute("/admin/change-password")({
  head: () => ({
    meta: [{ title: "Change Password — Admin" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: () => (
    <RequireAuth>
      <AdminGate>
        <ChangePassword />
      </AdminGate>
    </RequireAuth>
  ),
});

function ChangePassword() {
  const navigate = useNavigate();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (next.length < 8) return toast.error("Password must be at least 8 characters");
    if (next !== confirm) return toast.error("Passwords do not match");
    if (estimatePasswordStrength(next).score < 2) return toast.error("Choose a stronger password");

    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const email = userData.user?.email;
      if (!email) throw new Error("No session");

      // Re-verify current password
      const { error: signErr } = await supabase.auth.signInWithPassword({
        email,
        password: current,
      });
      if (signErr) throw new Error("Current password is incorrect");

      const { error } = await supabase.auth.updateUser({ password: next });
      if (error) throw error;

      toast.success("Password updated");
      navigate({ to: "/admin" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-5 py-10 text-[#F0FFF0]">
      <Link
        to="/admin"
        className="inline-flex items-center text-sm text-[#39FF14] hover:underline mb-4"
      >
        <ArrowLeft className="mr-1 h-4 w-4" /> Back to admin
      </Link>
      <h1 className="mb-1 text-2xl font-semibold">Change password</h1>
      <p className="mb-6 text-sm text-[#F0FFF0]/70">
        Verify your current password, then set a new one.
      </p>

      <form
        onSubmit={onSubmit}
        className="rounded-2xl border border-white/15 bg-black/40 p-6 space-y-4"
      >
        <Field id="current" label="Current password" value={current} onChange={setCurrent} />
        <div className="space-y-1.5">
          <Field id="next" label="New password" value={next} onChange={setNext} />
          <PasswordStrengthMeter password={next} />
        </div>
        <Field id="confirm" label="Confirm new password" value={confirm} onChange={setConfirm} />

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update password"}
        </Button>
      </form>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#F0FFF0]/50" />
        <Input
          id={id}
          type="password"
          autoComplete={id === "current" ? "current-password" : "new-password"}
          required
          minLength={id === "current" ? 1 : 8}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-9 bg-black/40 border-white/15"
        />
      </div>
    </div>
  );
}
