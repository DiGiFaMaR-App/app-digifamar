import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Building2, CheckCircle2, Loader2, User } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { WaitlistBanner } from "@/components/lenders/WaitlistBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { formatUSInput, normalizeToE164 } from "@/lib/phone";

export const Route = createFileRoute("/lenders/apply")({
  head: () => ({
    meta: [
      { title: "Apply to Become a Lender | DiGiFaMaR" },
      {
        name: "description",
        content:
          "Join the DiGiFaMaR lender waitlist. Tell us who you are and the kind of farm lending you're interested in — no KYC, no capital commitment.",
      },
      { property: "og:title", content: "Apply to Become a DiGiFaMaR Lender" },
      {
        property: "og:description",
        content:
          "Register your interest in funding working-capital loans for verified farms. Waitlist only — the program is not live yet.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LenderApplyPage,
});

type EntityType = "individual" | "institutional";

type FormState = {
  name: string;
  email: string;
  phone: string;
  entityType: EntityType;
  interestNotes: string;
};

const EMPTY: FormState = {
  name: "",
  email: "",
  phone: "",
  entityType: "individual",
  interestNotes: "",
};

const ENTITY_OPTIONS: { value: EntityType; label: string; hint: string; icon: typeof User }[] = [
  {
    value: "individual",
    label: "Individual",
    hint: "Investing personal capital",
    icon: User,
  },
  {
    value: "institutional",
    label: "Institutional",
    hint: "Bank, credit union, fund or CDFI",
    icon: Building2,
  },
];

function LenderApplyPage() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const name = form.name.trim();
    const email = form.email.trim();
    if (name.length < 2 || name.length > 100) {
      setError("Enter your full name.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) {
      setError("Enter a valid email address.");
      return;
    }
    let phone: string | null = null;
    if (form.phone.trim()) {
      phone = normalizeToE164(form.phone);
      if (!phone) {
        setError("Enter a valid US phone number, e.g. (555) 123-4567.");
        return;
      }
    }
    if (form.interestNotes.length > 1000) {
      setError("Please keep your notes under 1000 characters.");
      return;
    }

    setSubmitting(true);
    try {
      const { error: insertError } = await supabase.from("lender_leads").insert({
        name,
        email,
        phone,
        entity_type: form.entityType,
        interest_notes: form.interestNotes.trim() || null,
        status: "new",
      });
      if (insertError) throw new Error(insertError.message);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-leaf-soft">
            <CheckCircle2 className="h-7 w-7 text-primary" />
          </div>
          <h1 className="mt-5 text-3xl font-extrabold">You're on the lender waitlist</h1>
          <p className="mt-3 text-muted-foreground">
            Thanks, {form.name.split(" ")[0] || "there"}. We've recorded your interest and will be
            in touch as the lending program takes shape. Nothing further is needed from you — no
            documents, no capital.
          </p>
          <WaitlistBanner className="mt-6 text-left" />
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild variant="outline">
              <Link to="/lenders">Back to lending overview</Link>
            </Button>
            <Button asChild>
              <Link to="/lenders/demo">See the dashboard preview</Link>
            </Button>
          </div>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
        <Link
          to="/lenders"
          className="text-sm text-muted-foreground hover:text-foreground hover:underline"
        >
          ← Lending overview
        </Link>
        <h1 className="mt-4 text-3xl font-extrabold sm:text-4xl">Apply to become a lender</h1>
        <p className="mt-3 text-muted-foreground">
          Register your interest in funding working-capital loans for verified DiGiFaMaR farms. This
          takes about a minute — we only ask for contact details and the kind of lending you have in
          mind.
        </p>

        <WaitlistBanner className="mt-6" />

        <p className="mt-4 rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
          Representing a bank, credit union, CDFI or fund?{" "}
          <Link
            to="/lenders/apply-institution"
            className="font-semibold text-foreground hover:underline"
          >
            Use the institutional application
          </Link>{" "}
          instead — it captures charter, lending states and loan sizes for manual review.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Jordan Ellis"
              maxLength={100}
              required
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="you@example.com"
                maxLength={255}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input
                id="phone"
                inputMode="tel"
                value={form.phone}
                onChange={(e) => set("phone", formatUSInput(e.target.value))}
                placeholder="(555) 123-4567"
              />
            </div>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Entity type</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {ENTITY_OPTIONS.map((opt) => {
                const active = form.entityType === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => set("entityType", opt.value)}
                    aria-pressed={active}
                    className={`flex items-start gap-3 rounded-xl border p-4 text-left transition ${
                      active
                        ? "border-primary bg-leaf-soft"
                        : "border-border bg-card hover:border-primary/40"
                    }`}
                  >
                    <opt.icon
                      className={`mt-0.5 h-5 w-5 ${active ? "text-primary" : "text-muted-foreground"}`}
                    />
                    <span>
                      <span className="block text-sm font-semibold">{opt.label}</span>
                      <span className="block text-xs text-muted-foreground">{opt.hint}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="space-y-2">
            <Label htmlFor="interest">Investment interest / ballpark range</Label>
            <Textarea
              id="interest"
              value={form.interestNotes}
              onChange={(e) => set("interestNotes", e.target.value)}
              placeholder="e.g. Interested in $25k–$100k per farm across the Southeast, focused on produce and dairy."
              rows={4}
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground">
              Free text — a rough range is plenty. This is not a commitment.
            </p>
          </div>

          {error && (
            <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" disabled={submitting} className="w-full">
            {submitting ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Submitting…
              </>
            ) : (
              <>
                Join the lender waitlist <ArrowRight className="ml-1 h-4 w-4" />
              </>
            )}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            No KYC, no documents, no account creation. We store only what you enter above.
          </p>
        </form>
      </div>
    </SiteLayout>
  );
}
