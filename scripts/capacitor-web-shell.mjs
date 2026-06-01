/**
 * Writes a minimal dist/client/index.html so `npx cap sync` has an entry point.
 *
 * This is a TanStack Start SSR app: `npm run build` emits client assets into
 * dist/client but NO static index.html (the HTML is rendered on the server).
 * Capacitor requires an index.html in webDir or `cap sync` hard-fails, so we
 * generate a tiny shell here.
 *
 * At runtime the WebView loads `server.url` from capacitor.config.ts (the live
 * hosted site), so this file is only a fallback that should rarely be shown.
 */
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const outDir = resolve(process.cwd(), "dist", "client");
const outFile = resolve(outDir, "index.html");

if (!existsSync(outDir)) {
  mkdirSync(outDir, { recursive: true });
}

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>DiGiFaMaR</title>
    <style>
      html, body { margin: 0; height: 100%; background: #0b0f0a; color: #e7f0e3;
        font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
      .wrap { display: grid; place-items: center; height: 100%; gap: 12px; text-align: center; }
      .dot { width: 10px; height: 10px; border-radius: 50%; background: #7bc47f;
        animation: pulse 1s ease-in-out infinite; }
      @keyframes pulse { 0%, 100% { opacity: .3 } 50% { opacity: 1 } }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="dot"></div>
      <p>Loading DiGiFaMaR…</p>
    </div>
  </body>
</html>
`;

writeFileSync(outFile, html, "utf8");
console.log(`[capacitor-web-shell] wrote ${outFile}`);
