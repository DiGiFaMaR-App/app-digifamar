import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Building2, CheckCircle2, Landmark, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatUSInput, normalizeToE164 } from "@/lib/phone";
import { LenderCard, LenderShell } from "./-ui";
import { INSTITUTION_TYPES, NAVY, US_STATES } from "./-data";

export const Route = createFileRoute("/lenders/apply")({
  head: () => ({
    meta: [
      { title: "Become a DiGiFaMaR Lending Partner" },
      {
        name: "description",
        content:
          "Apply to lend to vetted, high-performing farms on DiGiFaMaR. Tell us your institution, the states you serve, and your loan range.",
      },
    ],
  }),
  component: ApplyPage,
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

const empty: FormState = {
  institutionName: "",
  institutionType: INSTITUTION_TYPES[0].value,
  charterNumber: "",
  lendingStates: [],
  minLoanAmount: "",
  maxLoanAmount: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
};

function ApplyPage() {
  const [form, setForm] = useState<FormState>(empty);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const toggleState = (s: string) =>
    setForm((p) => ({
      ...p,
      lendingStates: p.lendingStates.includes(s)
        ? p.lendingStates.filter((x) => x !== s)
        : [...p.lendingStates, s],
    }));

  const minNum = parseFloat(form.minLoanAmount) || 0;
  const maxNum = parseFloat(form.maxLoanAmount) || 0;
  const amountInvalid = maxNum > 0 && maxNum < minNum;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (form.lendingStates.length === 0) {
      setError("Select at least one state you lend in.");
      return;
    }
    if (amountInvalid) {
      setError("Maximum loan amount must be greater than or equal to the minimum.");
      return;
    }
    const normalizedPhone = form.contactPhone.trim()
      ? normalizeToE164(form.contactPhone)
      : null;
    if (form.contactPhone.trim() && !normalizedPhone) {
      setError("Enter a valid US phone number, e.g. (555) 123-4567.");
      return;
    }
    setSubmitting(true);
    try {
      // lender_applications is created by the lender-portal migrations; the generated
      // Supabase types predate it, so the client is cast for this insert.
      const { error: insertError } = await (supabase as unknown as {
        from: (t: string) => { insert: (v: unknown) => Promise<{ error: { message: string } | null }> };
      })
        .from("lender_applications")
        .insert({
          institution_name: form.institutionName,
          institution_type: form.institutionType,
          charter_number: form.charterNumber || null,
          lending_states: form.lendingStates,
          min_loan_amount: minNum,
          max_loan_amount: maxNum,
          contact_name: form.contactName || null,
          contact_email: form.contactEmail,
          contact_phone: normalizedPhone,
          status: "pending",
        });
      if (insertError) throw new Error(insertError.message);
      setDone(true);
    } catch (err) {
      // Submission still "succeeds" for the demo even if the backend isn't provisioned,
      // but surface real errors so a connected environment is debuggable.
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <LenderShell showNav={false}>
        <div className="mx-auto max-w-lg pt-10 text-center">
          <div
            className="mx-auto grid h-16 w-16 place-items-center rounded-2xl"
            style={{ backgroundColor: "rgba(52,211,153,0.12)" }}
          >
            <CheckCircle2 className="h-8 w-8 text-emerald-400" />
          </div>
          <h1 className="mt-5 text-2xl font-extrabold">Application received</h1>
          <p className="mt-2 text-sm text-slate-400">
            Thanks, {form.contactName || form.institutionName}. Our partnerships team reviews new
            lenders within two business days. We'll email{" "}
            <span className="text-slate-200">{form.contactEmail}</span> once your institution is approved.
          </p>
          <Link
            to="/lenders/login"
            className="mt-6 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white"
            style={{ backgroundColor: NAVY.accent }}
          >
            Go to lender login <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </LenderShell>
    );
  }

  return (
    <LenderShell showNav={false}>
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center gap-3">
          <span
            className="grid h-11 w-11 place-items-center rounded-xl text-white"
            style={{ backgroundColor: NAVY.accent }}
          >
            <Landmark className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold sm:text-3xl">Become a lending partner</h1>
            <p className="text-sm text-slate-400">
              Reach vetted, high-performing farms with verified sales history.
            </p>
          </div>
        </div>

        <LenderCard className="mt-6 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Field label="Institution name" required>
              <input
                value={form.institutionName}
                onChange={(e) => set("institutionName", e.target.value)}
                required
                placeholder="e.g. Heartland Farm Credit"
                className={inputCls}
              />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Institution type" required>
                <select
                  value={form.institutionType}
                  onChange={(e) => set("institutionType", e.target.value)}
                  className={inputCls}
                >
                  {INSTITUTION_TYPES.map((t) => (
                    <option key={t.value} value={t.value} className="bg-[#111827]">
                      {t.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Charter / license number" hint="Optional">
                <input
                  value={form.charterNumber}
                  onChange={(e) => set("charterNumber", e.target.value)}
                  placeholder="e.g. FC-44821"
                  className={inputCls}
                />
              </Field>
            </div>

            <Field
              label="States you lend in"
              required
              hint={form.lendingStates.length ? `${form.lendingStates.length} selected` : undefined}
            >
              <div className="flex flex-wrap gap-1.5">
                {US_STATES.map((s) => {
                  const active = form.lendingStates.includes(s);
                  return (
                    <button
                      type="button"
                      key={s}
                      onClick={() => toggleState(s)}
                      aria-pressed={active}
                      className={`rounded-md px-2 py-1 text-xs font-semibold transition ${
                        active ? "text-white" : "text-slate-400 hover:text-slate-200"
                      }`}
                      style={
                        active
                          ? { backgroundColor: NAVY.accent }
                          : { backgroundColor: "rgba(255,255,255,0.05)" }
                      }
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Minimum loan amount" required>
                <MoneyInput value={form.minLoanAmount} onChange={(v) => set("minLoanAmount", v)} placeholder="10,000" />
              </Field>
              <Field label="Maximum loan amount" required>
                <MoneyInput value={form.maxLoanAmount} onChange={(v) => set("maxLoanAmount", v)} placeholder="500,000" />
              </Field>
            </div>
            {amountInvalid && (
              <p className="-mt-3 text-xs text-rose-400">Max must be ≥ min.</p>
            )}

            <div className="h-px bg-white/10" />

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Contact name">
                <input
                  value={form.contactName}
                  onChange={(e) => set("contactName", e.target.value)}
                  placeholder="Dana Whitfield"
                  className={inputCls}
                />
              </Field>
              <Field label="Contact phone" hint="Optional">
                <input
                  value={form.contactPhone}
                  onChange={(e) => set("contactPhone", formatUSInput(e.target.value))}
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="(555) 123-4567"
                  className={inputCls}
                />
              </Field>
            </div>
            <Field label="Work email" required>
              <input
                type="email"
                value={form.contactEmail}
                onChange={(e) => set("contactEmail", e.target.value)}
                required
                placeholder="you@institution.com"
                className={inputCls}
              />
            </Field>

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
                  <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
                </>
              ) : (
                <>
                  Submit application <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </LenderCard>

        <p className="mt-4 text-center text-xs text-slate-500">
          <Building2 className="mr-1 inline h-3.5 w-3.5" />
          Already approved?{" "}
          <Link to="/lenders/login" className="font-semibold" style={{ color: "#93B4FF" }}>
            Sign in to the lender portal
          </Link>
        </p>
      </div>
    </LenderShell>
  );
}

const inputCls =
  "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/30";

function MoneyInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">$</span>
      <input
        type="number"
        min="0"
        step="1000"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        placeholder={placeholder}
        className={`${inputCls} pl-7`}
      />
    </div>
  );
}

function Field({
  label,
  children,
  required,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {label} {required && <span className="text-rose-400">*</span>}
        </span>
        {hint && <span className="text-[11px] text-slate-500">{hint}</span>}
      </span>
      {children}
    </label>
  );
}
