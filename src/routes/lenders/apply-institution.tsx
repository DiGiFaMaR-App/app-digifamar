import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Building2, CheckCircle2, Info, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { formatUSInput, normalizeToE164 } from "@/lib/phone";
import { INSTITUTION_TYPES, US_STATES } from "./-data";

export const Route = createFileRoute("/lenders/apply-institution")({
  head: () => ({
    meta: [
      { title: "Institutional Lender Application | DiGiFaMaR" },
      {
        name: "description",
        content:
          "Banks, credit unions, CDFIs and funds can apply for review-only access to DiGiFaMaR farm trade insights. Every application is reviewed by a person.",
      },
      { property: "og:title", content: "Institutional Lender Application | DiGiFaMaR" },
      {
        property: "og:description",
        content:
          "Apply for DiGiFaMaR lender portal access. Submissions are reviewed manually — no automated approval.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InstitutionApplyPage,
});

type FormState = {
  institutionName: string;
  institutionType: string;
  charterNumber: string;
  lendingStates: string[];
  minLoanAmount: string;
  maxLoanAmount: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
};

const EMPTY: FormState = {
  institutionName: "",
  institutionType: "bank",
  charterNumber: "",
  lendingStates: [],
  minLoanAmount: "",
  maxLoanAmount: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
};

function InstitutionApplyPage() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((p) => ({ ...p, [key]: value }));

  const toggleState = (s: string) =>
    setForm((p) => ({
      ...p,
      lendingStates: p.lendingStates.includes(s)
        ? p.lendingStates.filter((x) => x !== s)
        : [...p.lendingStates, s],
    }));

  const validate = (): boolean => {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (form.institutionName.trim().length < 2) e.institutionName = "Institution name is required.";
    if (form.institutionName.trim().length > 200) e.institutionName = "Keep this under 200 characters.";
    if (!INSTITUTION_TYPES.some((t) => t.value === form.institutionType))
      e.institutionType = "Choose an institution type.";
    if (form.charterNumber.length > 60) e.charterNumber = "Keep this under 60 characters.";
    if (form.lendingStates.length === 0) e.lendingStates = "Select at least one state.";
    const min = Number(form.minLoanAmount || 0);
    const max = Number(form.maxLoanAmount || 0);
    if (!Number.isFinite(min) || min < 0) e.minLoanAmount = "Enter a valid amount.";
    if (!Number.isFinite(max) || max <= 0) e.maxLoanAmount = "Enter a valid amount.";
    else if (max < min) e.maxLoanAmount = "Maximum must be at least the minimum.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.contactEmail.trim()))
      e.contactEmail = "Enter a valid work email.";
    if (form.contactName.length > 120) e.contactName = "Keep this under 120 characters.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("lender_applications").insert({
        institution_name: form.institutionName.trim(),
        institution_type: form.institutionType,
        charter_number: form.charterNumber.trim() || null,
        lending_states: form.lendingStates,
        min_loan_amount: Number(form.minLoanAmount || 0),
        max_loan_amount: Number(form.maxLoanAmount || 0),
        contact_name: form.contactName.trim() || null,
        contact_email: form.contactEmail.trim().toLowerCase(),
        contact_phone: form.contactPhone ? normalizeToE164(form.contactPhone) : null,
        // status intentionally omitted — the database default is 'pending'.
      });
      if (error) throw new Error(error.message);
      setDone(true);
    } catch (err) {
      toast.error("Could not submit application", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <SiteLayout>
        <section className="mx-auto max-w-2xl px-4 py-20 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10">
            <CheckCircle2 className="h-7 w-7 text-primary" />
          </span>
          <h1 className="mt-4 text-3xl font-extrabold">Application received</h1>
          <p className="mt-3 text-muted-foreground">
            Your application for <strong>{form.institutionName}</strong> is marked{" "}
            <strong>pending</strong> and will be reviewed by a member of the DiGiFaMaR team. Nothing
            is approved automatically. We&apos;ll email {form.contactEmail} with the decision.
          </p>
          <Button asChild className="mt-6">
            <Link to="/lenders">Back to the lender overview</Link>
          </Button>
        </section>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <section className="mx-auto max-w-3xl px-4 py-12">
        <Link
          to="/lenders"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Lender overview
        </Link>

        <div className="mt-4 flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10">
            <Building2 className="h-5 w-5 text-primary" />
          </span>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              Institutional lender application
            </h1>
            <p className="mt-1 text-muted-foreground">
              For banks, credit unions, CDFIs and funds seeking review-only access to DiGiFaMaR farm
              trade insights.
            </p>
          </div>
        </div>

        <div className="mt-5 flex items-start gap-2 rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p>
            Every application is reviewed by a person. Approval grants read-only access to
            informational farm insights — it does not create a lending relationship, an offer, or
            any movement of funds.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="institutionName">Institution name *</Label>
              <Input
                id="institutionName"
                value={form.institutionName}
                maxLength={200}
                onChange={(e) => set("institutionName", e.target.value)}
                placeholder="Midwest Agricultural Bank"
              />
              {errors.institutionName ? (
                <p className="mt-1 text-xs text-destructive">{errors.institutionName}</p>
              ) : null}
            </div>

            <div>
              <Label htmlFor="institutionType">Institution type *</Label>
              <select
                id="institutionType"
                value={form.institutionType}
                onChange={(e) => set("institutionType", e.target.value)}
                className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                {INSTITUTION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              {errors.institutionType ? (
                <p className="mt-1 text-xs text-destructive">{errors.institutionType}</p>
              ) : null}
            </div>

            <div>
              <Label htmlFor="charterNumber">Charter / license number (optional)</Label>
              <Input
                id="charterNumber"
                value={form.charterNumber}
                maxLength={60}
                onChange={(e) => set("charterNumber", e.target.value)}
                placeholder="e.g. 24-108845"
              />
              {errors.charterNumber ? (
                <p className="mt-1 text-xs text-destructive">{errors.charterNumber}</p>
              ) : null}
            </div>

            <div>
              <Label htmlFor="minLoanAmount">Minimum loan size (USD) *</Label>
              <Input
                id="minLoanAmount"
                inputMode="numeric"
                value={form.minLoanAmount}
                onChange={(e) => set("minLoanAmount", e.target.value.replace(/[^\d]/g, ""))}
                placeholder="10000"
              />
              {errors.minLoanAmount ? (
                <p className="mt-1 text-xs text-destructive">{errors.minLoanAmount}</p>
              ) : null}
            </div>

            <div>
              <Label htmlFor="maxLoanAmount">Maximum loan size (USD) *</Label>
              <Input
                id="maxLoanAmount"
                inputMode="numeric"
                value={form.maxLoanAmount}
                onChange={(e) => set("maxLoanAmount", e.target.value.replace(/[^\d]/g, ""))}
                placeholder="500000"
              />
              {errors.maxLoanAmount ? (
                <p className="mt-1 text-xs text-destructive">{errors.maxLoanAmount}</p>
              ) : null}
            </div>
          </div>

          <fieldset>
            <legend className="text-sm font-medium">States you lend in *</legend>
            <p className="mb-2 text-xs text-muted-foreground">
              {form.lendingStates.length} selected
            </p>
            <div className="flex flex-wrap gap-1.5">
              {US_STATES.map((s) => {
                const active = form.lendingStates.includes(s);
                return (
                  <button
                    type="button"
                    key={s}
                    onClick={() => toggleState(s)}
                    aria-pressed={active}
                    className={`rounded-md border px-2 py-1 text-xs font-medium transition ${
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "bg-background hover:bg-muted"
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
            {errors.lendingStates ? (
              <p className="mt-1 text-xs text-destructive">{errors.lendingStates}</p>
            ) : null}
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="contactName">Contact name</Label>
              <Input
                id="contactName"
                value={form.contactName}
                maxLength={120}
                onChange={(e) => set("contactName", e.target.value)}
                placeholder="Dana Whitfield"
              />
              {errors.contactName ? (
                <p className="mt-1 text-xs text-destructive">{errors.contactName}</p>
              ) : null}
            </div>
            <div>
              <Label htmlFor="contactEmail">Work email *</Label>
              <Input
                id="contactEmail"
                type="email"
                value={form.contactEmail}
                maxLength={255}
                onChange={(e) => set("contactEmail", e.target.value)}
                placeholder="lending@bank.com"
              />
              {errors.contactEmail ? (
                <p className="mt-1 text-xs text-destructive">{errors.contactEmail}</p>
              ) : null}
            </div>
            <div>
              <Label htmlFor="contactPhone">Phone (optional)</Label>
              <Input
                id="contactPhone"
                value={form.contactPhone}
                onChange={(e) => set("contactPhone", formatUSInput(e.target.value))}
                placeholder="(555) 123-4567"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={submitting} size="lg">
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Submit application for review
            </Button>
            <p className="text-xs text-muted-foreground">
              Submissions start as <strong>pending</strong>. No auto-approval.
            </p>
          </div>
        </form>
      </section>
    </SiteLayout>
  );
}
