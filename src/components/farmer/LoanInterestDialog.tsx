import { useEffect, useState } from "react";
import { CheckCircle2, HandCoins, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WaitlistBanner } from "@/components/lenders/WaitlistBanner";
import { supabase } from "@/integrations/supabase/client";

const AMOUNT_RANGES = [
  "Under $10,000",
  "$10,000 – $25,000",
  "$25,000 – $50,000",
  "$50,000 – $100,000",
  "Over $100,000",
] as const;

type AmountRange = (typeof AMOUNT_RANGES)[number];

/**
 * "Express Interest in a Loan" — waitlist only.
 * Writes a single row to public.farmer_loan_interest. No scoring, no documents,
 * no status timeline, no money movement.
 */
export function LoanInterestDialog({ farmerId }: { farmerId: string | null }) {
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<AmountRange | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  useEffect(() => {
    if (!farmerId) return;
    let cancelled = false;
    supabase
      .from("farmer_loan_interest")
      .select("id")
      .eq("farmer_id", farmerId)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data) setAlreadySubmitted(true);
      });
    return () => {
      cancelled = true;
    };
  }, [farmerId]);

  const submit = async () => {
    if (!farmerId) {
      toast.error("Please sign in again to express interest.");
      return;
    }
    if (!range) {
      toast.error("Pick a ballpark amount range.");
      return;
    }
    if (notes.length > 1000) {
      toast.error("Please keep your notes under 1000 characters.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("farmer_loan_interest").insert({
      farmer_id: farmerId,
      requested_amount_range: range,
      purpose_notes: notes.trim() || null,
      status: "new",
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setAlreadySubmitted(true);
    setOpen(false);
    toast.success("Interest recorded — we'll be in touch.");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="border-[#4ADE80]/40 bg-transparent text-[#4ADE80] hover:bg-[#4ADE80]/10"
        >
          {alreadySubmitted ? (
            <>
              <CheckCircle2 className="mr-1.5 h-4 w-4" /> Loan interest submitted
            </>
          ) : (
            <>
              <HandCoins className="mr-1.5 h-4 w-4" /> Express interest in a loan
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Express interest in a loan</DialogTitle>
          <DialogDescription>
            Tell us roughly how much working capital you'd want and what it's for. That's the whole
            form — no documents, no credit check.
          </DialogDescription>
        </DialogHeader>

        <WaitlistBanner>
          Lending isn't live yet. This records your interest so we can contact you when it opens.
        </WaitlistBanner>

        {alreadySubmitted && (
          <p className="text-sm text-muted-foreground">
            You've already expressed interest — you can submit again if your needs changed.
          </p>
        )}

        <div className="space-y-2">
          <Label>Ballpark amount</Label>
          <div className="flex flex-wrap gap-2">
            {AMOUNT_RANGES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                aria-pressed={range === r}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  range === r
                    ? "border-primary bg-leaf-soft text-primary"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="loan-purpose">What would you use it for? (optional)</Label>
          <Textarea
            id="loan-purpose"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="e.g. Cold storage and a second delivery van before summer harvest."
          />
        </div>

        <Button onClick={submit} disabled={submitting} className="w-full">
          {submitting ? (
            <>
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Submitting…
            </>
          ) : (
            "Submit interest"
          )}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          We'll be in touch — there's no application status to track.
        </p>
      </DialogContent>
    </Dialog>
  );
}
