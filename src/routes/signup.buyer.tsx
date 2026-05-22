import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/signup/buyer")({
  head: () => ({
    meta: [
      { title: "Create your buyer account | DiGiFaMaR" },
      { name: "description", content: "Sign up to shop from American farms." },
    ],
  }),
  component: BuyerSignup,
});

function BuyerSignup() {
  return (
    <SiteLayout>
      <div className="mx-auto max-w-md px-4 py-12 sm:px-6">
        <h1 className="text-2xl font-extrabold">Create your buyer account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Start ordering farm-fresh food in minutes.
        </p>
        <form className="mt-6 space-y-4" onSubmit={(e) => e.preventDefault()}>
          <Field label="Full name"><Input placeholder="Jane Doe" required /></Field>
          <Field label="Email"><Input type="email" placeholder="you@example.com" required /></Field>
          <Field label="Phone"><Input type="tel" placeholder="(555) 123-4567" required /></Field>
          <Field label="Password"><Input type="password" required /></Field>
          <Field label="Confirm password"><Input type="password" required /></Field>
          <Field label="Delivery address"><Input placeholder="Address — autocomplete next phase" required /></Field>
          <label className="flex items-start gap-2 text-xs text-muted-foreground">
            <Checkbox required className="mt-0.5" /> I agree to the Terms and Privacy Policy.
          </label>
          <Button type="submit" className="w-full">Create buyer account</Button>
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
