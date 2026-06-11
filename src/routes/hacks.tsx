import { createFileRoute } from "@tanstack/react-router";
import { Sprout, Sun, Droplets, Bug, Tractor, Leaf } from "lucide-react";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/hacks")({
  head: () => ({
    meta: [
      { title: "Farm Hacks — Daily tips for American farmers | DiGiFaMaR" },
      {
        name: "description",
        content:
          "Daily farm hacks from working American farmers — soil, irrigation, pest control, equipment, and direct-to-market selling tips.",
      },
      { property: "og:title", content: "Farm Hacks — DiGiFaMaR" },
      {
        property: "og:description",
        content: "Practical, field-tested tips from real American farmers, updated daily.",
      },
    ],
  }),
  component: HacksPage,
});

const HACKS = [
  {
    icon: Droplets,
    category: "Irrigation",
    title: "Water at dawn, not dusk",
    body: "Pre-dawn watering cuts evaporation loss by up to 40% and gives roots a full day to absorb before night-time fungal risk.",
  },
  {
    icon: Sun,
    category: "Soil",
    title: "Cardboard kills weeds without chemicals",
    body: "Lay flattened cardboard between rows and cover with 2\" of compost. Weeds suffocate; cardboard composts into the bed in one season.",
  },
  {
    icon: Bug,
    category: "Pest Control",
    title: "Marigolds repel nematodes",
    body: "Plant French marigolds among tomatoes and squash. Their roots release alpha-terthienyl, which suppresses root-knot nematodes naturally.",
  },
  {
    icon: Leaf,
    category: "Harvest",
    title: "Pick greens when cold",
    body: "Harvest lettuce, kale, and spinach at sunrise. Cell turgor is at peak, leaves snap crisp, and shelf life jumps 2–3 days.",
  },
  {
    icon: Tractor,
    category: "Equipment",
    title: "Coat tools in linseed oil",
    body: "A thin wipe of boiled linseed oil on shovels and hoes after each use prevents rust and pulls 30% less dirt during digging.",
  },
  {
    icon: Sprout,
    category: "Direct-to-Market",
    title: "Photograph in shade, not sun",
    body: "Buyers click product photos taken in open shade 3× more than full-sun shots. Color is truer, no blown-out highlights.",
  },
];

function HacksPage() {
  return (
    <AppShell title="Farm Hacks">
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <header className="mb-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Sprout className="h-3.5 w-3.5" />
            Daily Farm Hacks
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">
            Field-tested tips from American farmers
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            New hack every day. Save what works, share what doesn't.
          </p>
        </header>

        <ul className="space-y-3">
          {HACKS.map((h) => (
            <li
              key={h.title}
              className="rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <h.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {h.category}
                  </p>
                  <h2 className="mt-0.5 text-base font-semibold leading-snug">
                    {h.title}
                  </h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {h.body}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Got a hack that works on your farm? Email tips@digifamar.com — we credit every contributor.
        </p>
      </div>
    </AppShell>
  );
}
