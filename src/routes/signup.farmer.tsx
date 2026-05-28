import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Tractor, Loader2, Upload } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { categories, certifications } from "@/lib/mock-data";

export const Route = createFileRoute("/signup/farmer")({
  head: () => ({
    meta: [
      { title: "List your farm on DiGiFaMaR" },
      {
        name: "description",
        content:
          "Apply to sell direct to American buyers. Verification takes 24-48 hours.",
      },
    ],
  }),
  component: FarmerSignup,
});

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY",
];

const farmerSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your full name").max(100),
    email: z.string().trim().email("Enter a valid email").max(255),
    phone: z
      .string()
      .trim()
      .min(7, "Enter a valid phone number")
      .max(20)
      .regex(/^[0-9+()\-\s]+$/, "Digits, spaces, () + - only"),
    password: z.string().min(8, "At least 8 characters").max(128),
    confirm: z.string(),
    farmName: z.string().trim().min(2, "Enter your farm name").max(120),
    description: z
      .string()
      .trim()
      .min(20, "Tell buyers a bit more (20+ chars)")
      .max(600),
    address: z.string().trim().min(5, "Enter your farm address").max(200),
    city: z.string().trim().min(2, "Required").max(80),
    state: z.string().length(2, "Pick a state"),
    zip: z
      .string()
      .trim()
      .regex(/^\d{5}(-\d{4})?$/, "Enter a valid US ZIP"),
    acres: z.coerce.number().min(0).max(1_000_000).optional(),
    years: z.coerce.number().min(0).max(150).optional(),
    products: z.array(z.string()).min(1, "Pick at least one product category"),
    certifications: z.array(z.string()),
    terms: z.literal(true, { errorMap: () => ({ message: "Required" }) }),
  })
  .refine((d) => d.password === d.confirm, {
    path: ["confirm"],
    message: "Passwords don't match",
  });

type FarmerForm = z.infer<typeof farmerSchema>;
type FieldErrors = Partial<Record<keyof FarmerForm, string>>;

function FarmerSignup() {
  const navigate = useNavigate();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirm: "",
    farmName: "",
    description: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    acres: "",
    years: "",
    products: [] as string[],
    certifications: [] as string[],
    terms: false,
  });

  const update = <K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const toggle = (key: "products" | "certifications", value: string) => {
    setForm((f) => {
      const has = f[key].includes(value);
      return {
        ...f,
        [key]: has ? f[key].filter((v) => v !== value) : [...f[key], value],
      };
    });
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = farmerSchema.safeParse({
      ...form,
      acres: form.acres === "" ? undefined : form.acres,
      years: form.years === "" ? undefined : form.years,
    });
    if (!parsed.success) {
      const fe: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const k = issue.path[0] as keyof FarmerForm;
        if (!fe[k]) fe[k] = issue.message;
      }
      setErrors(fe);
      toast.error("Please fix the highlighted fields");
      return;
    }
    setSubmitting(true);
    localStorage.setItem("userRole", "farmer");
    localStorage.setItem("isAuthenticated", "true");
    localStorage.setItem(
      "farmerProfile",
      JSON.stringify({
        fullName: parsed.data.fullName,
        email: parsed.data.email,
        phone: parsed.data.phone,
        farmName: parsed.data.farmName,
        description: parsed.data.description,
        location: {
          address: parsed.data.address,
          city: parsed.data.city,
          state: parsed.data.state,
          zip: parsed.data.zip,
        },
        acres: parsed.data.acres ?? null,
        yearsFarming: parsed.data.years ?? null,
        products: parsed.data.products,
        certifications: parsed.data.certifications,
        verificationStatus: "pending",
      }),
    );
    setTimeout(() => {
      toast.success("Application submitted!", {
        description: "We'll verify your farm in 24-48 hours.",
      });
      navigate({ to: "/dashboard/farmer" });
    }, 700);
  };

  return (
    <SiteLayout>
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <div className="mb-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Tractor className="h-3.5 w-3.5" /> Farmer onboarding
          </span>
          <h1 className="mt-3 text-2xl font-extrabold sm:text-3xl">
            List your farm on DiGiFaMaR
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Keep 80–92% of every sale. Verification takes 24–48 hours.
          </p>
        </div>

        <form className="space-y-6" onSubmit={onSubmit} noValidate>
          <Fieldset legend="About you">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" error={errors.fullName}>
                <Input
                  value={form.fullName}
                  onChange={(e) => update("fullName", e.target.value)}
                  autoComplete="name"
                  maxLength={100}
                />
              </Field>
              <Field label="Email" error={errors.email}>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  autoComplete="email"
                  maxLength={255}
                />
              </Field>
              <Field label="Phone" error={errors.phone}>
                <Input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  autoComplete="tel"
                  maxLength={20}
                />
              </Field>
              <Field label="Password" error={errors.password}>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                  autoComplete="new-password"
                />
              </Field>
              <Field label="Confirm password" error={errors.confirm}>
                <Input
                  type="password"
                  value={form.confirm}
                  onChange={(e) => update("confirm", e.target.value)}
                  autoComplete="new-password"
                />
              </Field>
            </div>
          </Fieldset>

          <Fieldset legend="Your farm">
            <Field label="Farm name" error={errors.farmName}>
              <Input
                value={form.farmName}
                onChange={(e) => update("farmName", e.target.value)}
                placeholder="Green Acres Family Farm"
                maxLength={120}
              />
            </Field>
            <Field label="Farm description" error={errors.description}>
              <Textarea
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                rows={3}
                maxLength={600}
                placeholder="Tell buyers about your farm, practices, and what makes you unique…"
              />
            </Field>
            <Field label="Farm address" error={errors.address}>
              <Input
                value={form.address}
                onChange={(e) => update("address", e.target.value)}
                placeholder="123 Country Rd"
                autoComplete="street-address"
                maxLength={200}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="City" error={errors.city}>
                <Input
                  value={form.city}
                  onChange={(e) => update("city", e.target.value)}
                  autoComplete="address-level2"
                  maxLength={80}
                />
              </Field>
              <Field label="State" error={errors.state}>
                <Select
                  value={form.state}
                  onValueChange={(v) => update("state", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="State" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {US_STATES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="ZIP" error={errors.zip}>
                <Input
                  value={form.zip}
                  onChange={(e) => update("zip", e.target.value)}
                  autoComplete="postal-code"
                  inputMode="numeric"
                  maxLength={10}
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Farm size (acres)" error={errors.acres}>
                <Input
                  type="number"
                  min={0}
                  value={form.acres}
                  onChange={(e) => update("acres", e.target.value)}
                />
              </Field>
              <Field label="Years farming" error={errors.years}>
                <Input
                  type="number"
                  min={0}
                  value={form.years}
                  onChange={(e) => update("years", e.target.value)}
                />
              </Field>
            </div>
          </Fieldset>

          <Fieldset legend="Products & certifications">
            <div>
              <Label>Products offered</Label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Pick every category your farm sells.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {categories.map((c) => {
                  const checked = form.products.includes(c.slug);
                  return (
                    <label
                      key={c.slug}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                        checked
                          ? "border-primary bg-primary/10"
                          : "border-border bg-card hover:border-primary/40"
                      }`}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggle("products", c.slug)}
                      />
                      <span>{c.emoji} {c.name}</span>
                    </label>
                  );
                })}
              </div>
              {errors.products ? (
                <p className="mt-2 text-xs font-medium text-destructive">
                  {errors.products}
                </p>
              ) : null}
            </div>

            <div>
              <Label>Certifications (optional)</Label>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {certifications.map((c) => {
                  const checked = form.certifications.includes(c);
                  return (
                    <label
                      key={c}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                        checked
                          ? "border-primary bg-primary/10"
                          : "border-border bg-card hover:border-primary/40"
                      }`}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggle("certifications", c)}
                      />
                      <span>{c}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </Fieldset>

          <Fieldset legend="Verification">
            <div className="rounded-lg border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
              <Upload className="mx-auto mb-2 h-5 w-5 text-primary" />
              Farm photos & government ID upload available after submission.
            </div>
          </Fieldset>

          <label className="flex items-start gap-2 text-xs text-muted-foreground">
            <Checkbox
              checked={form.terms}
              onCheckedChange={(c) => update("terms", c === true)}
              className="mt-0.5"
            />
            <span>
              I agree to the Terms, Privacy Policy, and USDA compliance
              requirements.
            </span>
          </label>
          {errors.terms ? (
            <p className="-mt-3 text-xs font-medium text-destructive">
              {errors.terms}
            </p>
          ) : null}

          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…
              </>
            ) : (
              "Submit farm application"
            )}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Verification takes 24–48 hours.
          </p>
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
