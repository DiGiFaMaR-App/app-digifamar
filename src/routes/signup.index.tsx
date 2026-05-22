import { createFileRoute, Link } from "@tanstack/react-router";
import { ShoppingBasket, Tractor } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/signup/")({
  head: () => ({
    meta: [
      { title: "Join DiGiFaMaR — Buyer or Farmer signup" },
      { name: "description", content: "Choose how you want to use DiGiFaMaR." },
      { property: "og:url", content: "/signup" },
    ],
  }),
  component: Signup,
});

function Signup() {
  return (
    <SiteLayout>
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold sm:text-4xl">Join DiGiFaMaR</h1>
          <p className="mt-2 text-muted-foreground">How do you want to use the platform?</p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <RoleCard
            to="/signup/buyer"
            icon={ShoppingBasket}
            title="I want to BUY fresh produce"
            color="primary"
            benefits={[
              "Shop verified American farms",
              "Escrow-protected checkout",
              "24-48 hour delivery",
              "72-hour refund guarantee",
            ]}
          />
          <RoleCard
            to="/signup/farmer"
            icon={Tractor}
            title="I want to SELL my farm products"
            color="secondary"
            benefits={[
              "Keep 80-92% of every sale",
              "Same-day payouts",
              "List in under 5 minutes",
              "Build credit for farm loans",
            ]}
          />
        </div>
        <p className="mt-8 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/signin" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </SiteLayout>
  );
}

function RoleCard({
  to,
  icon: Icon,
  title,
  benefits,
  color,
}: {
  to: string;
  icon: React.ElementType;
  title: string;
  benefits: string[];
  color: "primary" | "secondary";
}) {
  return (
    <Link
      to={to}
      className="card-lift flex flex-col rounded-2xl border-2 border-border bg-card p-6 hover:border-primary"
    >
      <span
        className={`flex h-12 w-12 items-center justify-center rounded-xl ${
          color === "primary"
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-secondary-foreground"
        }`}
      >
        <Icon className="h-6 w-6" />
      </span>
      <h3 className="mt-4 text-xl font-bold">{title}</h3>
      <ul className="mt-4 flex-1 space-y-2 text-sm text-muted-foreground">
        {benefits.map((b) => (
          <li key={b}>✓ {b}</li>
        ))}
      </ul>
      <Button
        className={`mt-6 w-full ${
          color === "secondary"
            ? "bg-secondary text-secondary-foreground hover:bg-secondary-hover"
            : ""
        }`}
      >
        Continue
      </Button>
    </Link>
  );
}
