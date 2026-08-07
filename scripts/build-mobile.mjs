/**
 * Builds the self-contained mobile SPA and prepares dist/client for Capacitor.
 *
 * Steps:
 *   1. `vite build --config vite.config.mobile.ts` — client-only SPA build that
 *      emits a prerendered shell at dist/client/_shell.html plus hashed assets.
 *   2. Copy _shell.html -> index.html, since Capacitor's WebView loads
 *      index.html as the entry point for the bundled app.
 *
 * Run `npx cap sync android` afterwards (see `bun run mobile:sync`).
 */
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const viteBin = resolve(root, "node_modules", "vite", "bin", "vite.js");

// Extra CLI args are forwarded to vite (e.g. `--sourcemap` in CI, where the
// maps are uploaded to PostHog and then deleted before `cap sync`).
const extraArgs = process.argv.slice(2);

execFileSync("node", [viteBin, "build", "--config", "vite.config.mobile.ts", ...extraArgs], {
  stdio: "inherit",
  cwd: root,
});


const shell = resolve(root, "dist", "client", "_shell.html");
const index = resolve(root, "dist", "client", "index.html");

if (!existsSync(shell)) {
  throw new Error(
    `[build-mobile] Expected SPA shell at ${shell} but it was not produced. ` +
      `Did the SPA build succeed?`,
  );
}

copyFileSync(shell, index);
console.log(`[build-mobile] Wrote ${index} (Capacitor entry point).`);
