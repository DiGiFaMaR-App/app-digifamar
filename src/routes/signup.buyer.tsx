import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { ShoppingBag, Loader2 } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/signup/buyer")({
  head: () => ({
    meta: [
      { title: "Create your buyer account | DiGiFaMaR" },
      { name: "description", content: "Sign up to shop from American farms." },
    ],
  }),
  component: BuyerSignup,
});

const buyerSchema = z
  .object({
    name: z.string().trim().min(2, "Enter your full name").max(100),
    email: z.string().trim().email("Enter a valid email").max(255),
    phone: z
      .string()
      .trim()
      .min(7, "Enter a valid phone number")
      .max(20)
      .regex(/^[0-9+()\-\s]+$/, "Digits, spaces, () + - only"),
    password: z.string().min(8, "At least 8 characters").max(128),
    confirm: z.string(),
    address: z.string().trim().min(5, "Enter your delivery address").max(200),
    zip: z
      .string()
      .trim()
      .regex(/^\d{5}(-\d{4})?$/, "Enter a valid US ZIP"),
    window: z.enum(["morning", "afternoon", "evening", "anytime"]),
    frequency: z.enum(["one-time", "weekly", "biweekly", "monthly"]),
    contactless: z.boolean(),
    sms: z.boolean(),
    notes: z.string().max(500).optional(),
    terms: z.literal(true, { errorMap: () => ({ message: "Required" }) }),
  })
  .refine((d) => d.password === d.confirm, {
    path: ["confirm"],
    message: "Passwords don't match",
  });

type BuyerForm = z.infer<typeof buyerSchema>;
type FieldErrors = Partial<Record<keyof BuyerForm, string>>;

function BuyerSignup() {
  const navigate = useNavigate();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirm: "",
    address: "",
    zip: "",
    window: "anytime" as BuyerForm["window"],
    frequency: "one-time" as BuyerForm["frequency"],
    contactless: false,
    sms: true,
    notes: "",
    terms: false,
  });

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = buyerSchema.safeParse(form);
    if (!parsed.success) {
      const fe: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const k = issue.path[0] as keyof BuyerForm;
        if (!fe[k]) fe[k] = issue.message;
      }
      setErrors(fe);
      toast.error("Please fix the highlighted fields");
      return;
    }
    setSubmitting(true);
    localStorage.setItem("userRole", "buyer");
    localStorage.setItem("isAuthenticated", "true");
    localStorage.setItem(
      "buyerProfile",
      JSON.stringify({
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone,
        address: parsed.data.address,
        zip: parsed.data.zip,
        deliveryWindow: parsed.data.window,
        deliveryFrequency: parsed.data.frequency,
        contactless: parsed.data.contactless,
        smsUpdates: parsed.data.sms,
        notes: parsed.data.notes ?? "",
      }),
    );
    setTimeout(() => {
      toast.success("Welcome to DiGiFaMaR!", {
        description: "Your buyer account is ready.",
      });
      navigate({ to: "/market" });
    }, 600);
  };

  return (
    <SiteLayout>
      <div className="mx-auto max-w-lg px-4 py-12 sm:px-6">
        <div className="mb-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <ShoppingBag className="h-3.5 w-3.5" /> Buyer onboarding
          </span>
          <h1 className="mt-3 text-2xl font-extrabold sm:text-3xl">
            Create your buyer account
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tell us where to deliver and how you like to shop.
          </p>
        </div>

        <form className="space-y-6" onSubmit={onSubmit} noValidate>
          <Fieldset legend="About you">
            <Field label="Full name" error={errors.name}>
              <Input
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="Jane Doe"
                autoComplete="name"
                maxLength={100}
              />
            </Field>
            <Field label="Email" error={errors.email}>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                maxLength={255}
              />
            </Field>
            <Field label="Phone" error={errors.phone}>
              <Input
                type="tel"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="(555) 123-4567"
                autoComplete="tel"
                maxLength={20}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Password" error={errors.password}>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                  autoComplete="new-password"
                />
              </Field>
              <Field label="Confirm" error={errors.confirm}>
                <Input
                  type="password"
                  value={form.confirm}
                  onChange={(e) => update("confirm", e.target.value)}
                  autoComplete="new-password"
                />
              </Field>
            </div>
          </Fieldset>

          <Fieldset legend="Delivery preferences">
            <Field label="Delivery address" error={errors.address}>
              <Input
                value={form.address}
                onChange={(e) => update("address", e.target.value)}
                placeholder="123 Main St, Apt 4"
                autoComplete="street-address"
                maxLength={200}
              />
            </Field>
            <Field label="ZIP code" error={errors.zip}>
              <Input
                value={form.zip}
                onChange={(e) => update("zip", e.target.value)}
                placeholder="94110"
                autoComplete="postal-code"
                inputMode="numeric"
                maxLength={10}
              />
            </Field>

            <Field label="Preferred delivery window">
              <Select
                value={form.window}
                onValueChange={(v) => update("window", v as BuyerForm["window"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">Morning (8am – 12pm)</SelectItem>
                  <SelectItem value="afternoon">Afternoon (12pm – 5pm)</SelectItem>
                  <SelectItem value="evening">Evening (5pm – 9pm)</SelectItem>
                  <SelectItem value="anytime">Anytime</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field label="Order frequency">
              <RadioGroup
                value={form.frequency}
                onValueChange={(v) =>
                  update("frequency", v as BuyerForm["frequency"])
                }
                className="grid grid-cols-2 gap-2"
              >
                {[
                  { v: "one-time", l: "One-time" },
                  { v: "weekly", l: "Weekly" },
                  { v: "biweekly", l: "Every 2 weeks" },
                  { v: "monthly", l: "Monthly" },
                ].map((o) => (
                  <label
                    key={o.v}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/10"
                  >
                    <RadioGroupItem value={o.v} /> {o.l}
                  </label>
                ))}
              </RadioGroup>
            </Field>

            <label className="flex items-start gap-2 text-sm">
              <Checkbox
                checked={form.contactless}
                onCheckedChange={(c) => update("contactless", c === true)}
                className="mt-0.5"
              />
              <span>Leave at door — contactless delivery</span>
            </label>
            <label className="flex items-start gap-2 text-sm">
              <Checkbox
                checked={form.sms}
                onCheckedChange={(c) => update("sms", c === true)}
                className="mt-0.5"
              />
              <span>Send SMS updates when my order is on the way</span>
            </label>

            <Field label="Delivery notes (optional)" error={errors.notes}>
              <Textarea
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
                placeholder="Gate code, allergies, preferred farms…"
                maxLength={500}
                rows={3}
              />
            </Field>
          </Fieldset>

          <label className="flex items-start gap-2 text-xs text-muted-foreground">
            <Checkbox
              checked={form.terms}
              onCheckedChange={(c) => update("terms", c === true)}
              className="mt-0.5"
            />
            <span>
              I agree to the{" "}
              <Link to="/buyer-protection" className="text-primary underline">
                Terms and Buyer Protection
              </Link>
              .
            </span>
          </label>
          {errors.terms ? (
            <p className="-mt-3 text-xs font-medium text-destructive">
              {errors.terms}
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating account…
              </>
            ) : (
              "Create buyer account"
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/signin" className="font-semibold text-primary">
            Sign in
          </Link>
        </p>
      </div>
    </SiteLayout>
  );
}

function Fieldset({
  legend,
  children,
}: {
  legend: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="space-y-4 rounded-2xl border border-border bg-card/40 p-5">
      <legend className="px-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {legend}
      </legend>
      {children}
    </fieldset>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error ? (
        <p className="text-xs font-medium text-destructive">{error}</p>
      ) : null}
    </div>
  );
}
