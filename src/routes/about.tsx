import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About DiGiFaMaR — Our mission" },
      {
        name: "description",
        content:
          "DiGiFaMaR connects verified American farmers directly with buyers in all 50 states.",
      },
      { property: "og:url", content: "/about" },
    ],
    links: [{ rel: "canonical", href: "/about" }],
  }),
  component: About,
});

function About() {
  return (
    <SiteLayout>
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="text-4xl font-extrabold sm:text-5xl">Our mission</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          American farmers feed the country. They should keep more of every sale, reach buyers
          directly, and have the tools to grow their business. DiGiFaMaR exists to make that real.
        </p>
        <h2 className="mt-10 text-2xl font-bold">What we believe</h2>
        <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
          <li>• Farmers deserve 80-92% of every sale, not 50%.</li>
          <li>• Buyers deserve to know exactly where their food comes from.</li>
          <li>• Trust is built with verification, escrow, and same-day payouts.</li>
          <li>• Technology should remove friction, not add it.</li>
        </ul>
        <h2 className="mt-10 text-2xl font-bold">By the numbers</h2>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            ["2,500+", "Verified farms"],
            ["50", "States covered"],
            ["98%", "On-time delivery"],
            ["$0", "Hidden fees"],
          ].map(([v, l]) => (
            <div key={l} className="rounded-xl border border-border bg-card p-4 text-center">
              <p className="text-2xl font-extrabold text-primary">{v}</p>
              <p className="text-xs text-muted-foreground">{l}</p>
            </div>
          ))}
        </div>
      </div>
    </SiteLayout>
  );
}
