import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { products, farms } from "@/lib/mock-data";

const BASE_URL = "https://app.digifamar.com";

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/market", changefreq: "daily", priority: "0.9" },
          { path: "/browse", changefreq: "daily", priority: "0.9" },
          { path: "/about", changefreq: "monthly", priority: "0.6" },
          { path: "/how-it-works", changefreq: "monthly", priority: "0.6" },
          { path: "/pricing", changefreq: "monthly", priority: "0.7" },
          { path: "/buyer-protection", changefreq: "monthly", priority: "0.5" },
          { path: "/lending", changefreq: "monthly", priority: "0.5" },
          { path: "/contact", changefreq: "monthly", priority: "0.5" },
        ];

        for (const p of products) {
          entries.push({ path: `/product/${p.id}`, changefreq: "weekly", priority: "0.7" });
        }
        for (const f of farms) {
          entries.push({ path: `/farm/${f.id}`, changefreq: "weekly", priority: "0.6" });
        }

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
