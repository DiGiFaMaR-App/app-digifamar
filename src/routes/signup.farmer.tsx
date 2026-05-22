import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { categories, certifications } from "@/lib/mock-data";

export const Route = createFileRoute("/signup/farmer")({
  head: () => ({
    meta: [
      { title: "List your farm on DiGiFaMaR" },
      { name: "description", content: "Apply to sell direct to American buyers. Verification takes 24-48 hours." },
    ],
  }),
  component: FarmerSignup,
});

function FarmerSignup() {
  return (
    <SiteLayout>
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <h1 className="text-2xl font-extrabold">List your farm on DiGiFaMaR</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Keep more of every sale. Verification takes 24-48 hours.
        </p>
        <form className="mt-6 space-y-5" onSubmit={(e) => e.preventDefault()}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name"><Input required /></Field>
            <Field label="Email"><Input type="email" required /></Field>
            <Field label="Phone"><Input type="tel" required /></Field>
            <Field label="Farm name"><Input required /></Field>
          </div>
          <Field label="Farm description"><Textarea rows={3} placeholder="Tell buyers about your farm..." /></Field>
          <Field label="Farm address"><Input placeholder="Address — autocomplete next phase" required /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Farm size (acres)"><Input type="number" /></Field>
            <Field label="Years farming"><Input type="number" /></Field>
          </div>
          <div>
            <Label>Primary products</Label>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {categories.map((c) => (
                <label key={c.slug} className="flex items-center gap-2 text-sm">
                  <Checkbox /> {c.emoji} {c.name}
                </label>
              ))}
            </div>
          </div>
          <div>
            <Label>Certifications</Label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {certifications.map((c) => (
                <label key={c} className="flex items-center gap-2 text-sm">
                  <Checkbox /> {c}
                </label>
              ))}
            </div>
          </div>
          <Field label="Farm photos (up to 5)">
            <div className="rounded-lg border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
              Drag & drop or click to upload
            </div>
          </Field>
          <Field label="Government ID (for verification)">
            <div className="rounded-lg border border-dashed border-border bg-card p-4 text-center text-sm text-muted-foreground">
              Upload ID document
            </div>
          </Field>
          <label className="flex items-start gap-2 text-xs text-muted-foreground">
            <Checkbox required className="mt-0.5" /> I agree to the Terms, Privacy Policy, and USDA compliance requirements.
          </label>
          <Button type="submit" className="w-full bg-secondary text-secondary-foreground hover:bg-secondary-hover">
            Submit farm application
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Verification takes 24-48 hours.
          </p>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/signin" className="font-semibold text-primary">Sign in</Link>
        </p>
      </div>
    </SiteLayout>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
