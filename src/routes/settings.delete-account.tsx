import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { RequireAuth } from "@/components/RequireAuth";
import { SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { deleteMyAccountFn } from "@/lib/users/delete-account.functions";

export const Route = createFileRoute("/settings/delete-account")({
  head: () => ({
    meta: [
      { title: "Delete account — DiGiFaMaR" },
      { name: "description", content: "Permanently delete your DiGiFaMaR account and personal data." },
    ],
  }),
  component: () => (
    <RequireAuth>
      <DeleteAccountPage />
    </RequireAuth>
  ),
});

function DeleteAccountPage() {
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const del = useServerFn(deleteMyAccountFn);

  const onDelete = async () => {
    if (confirm !== "DELETE") return;
    setBusy(true);
    try {
      await del({ data: { confirmation: "DELETE" } });
      await supabase.auth.signOut();
      toast.success("Your account and personal data have been deleted.");
      navigate({ to: "/" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete account");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SiteLayout>
      <div className="mx-auto max-w-xl px-5 py-12 text-[#F0FFF0]">
        <h1 className="text-3xl font-bold mb-4">Delete account</h1>
        <p className="text-[#F0FFF0]/80 mb-4">
          This will permanently remove your profile, listings, messages, and wallet from DiGiFaMaR. Order and escrow-ledger records tied to closed transactions are kept in anonymized form to satisfy financial regulations.
        </p>
        <p className="text-amber-400 mb-6">
          You must close or dispute every open escrow order before deleting.
        </p>
        <Label htmlFor="confirm" className="text-[#F0FFF0]">
          Type <code className="text-[#39FF14]">DELETE</code> to confirm
        </Label>
        <Input
          id="confirm"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="mt-2 mb-6 bg-black/40 border-white/15 text-[#F0FFF0]"
        />
        <Button
          variant="destructive"
          disabled={confirm !== "DELETE" || busy}
          onClick={onDelete}
          className="w-full"
        >
          {busy ? "Deleting…" : "Permanently delete my account"}
        </Button>
      </div>
    </SiteLayout>
  );
}
