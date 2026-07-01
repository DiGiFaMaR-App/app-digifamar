import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/signin")({
  head: () => ({
    meta: [
      { title: "Sign in to DiGiFaMaR" },
      { name: "description", content: "Sign in to your DiGiFaMaR account." },
    ],
  }),
  component: SignIn,
});

function SignIn() {
  return (
    <SiteLayout>
      <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
        <div className="mb-6 flex justify-center">
          <Logo size="lg" />
        </div>
        <h1 className="text-2xl font-extrabold">Welcome back</h1>
        <p className="mt-1 text-sm text-muted-foreground">Sign in to your DiGiFaMaR account.</p>
        <form className="mt-6 space-y-4" onSubmit={(e) => e.preventDefault()}>
          <div className="space-y-1.5">
            <Label>Email or phone</Label>
            <Input required />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Password</Label>
              <a href="#" className="text-xs text-primary hover:underline">
                Forgot?
              </a>
            </div>
            <Input type="password" required />
          </div>
          <Button type="submit" className="w-full">
            Sign in
          </Button>
        </form>
        <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> OR <div className="h-px flex-1 bg-border" />
        </div>
        <div className="space-y-2">
          <Button variant="outline" className="w-full">
            Continue with Google
          </Button>
          <Button variant="outline" className="w-full">
            Continue with Apple
          </Button>
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link to="/signup" className="font-semibold text-primary">
            Sign up
          </Link>
        </p>
        <p className="mt-3 text-center text-[11px] text-muted-foreground leading-relaxed">
          By continuing, you agree to our{" "}
          <Link to="/terms" className="underline hover:text-primary">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link to="/privacy" className="underline hover:text-primary">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </SiteLayout>
  );
}
