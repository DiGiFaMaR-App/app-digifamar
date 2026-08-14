#!/usr/bin/env node
// End-to-end check for the WhatsApp floating action button.
//
// Fetches the real, server-rendered HTML from the preview (local dev server)
// and the published site, then asserts the FAB anchor exists with the correct
// href, target/rel behaviour, and wa.me query parameters.
//
// Usage:
//   node scripts/e2e-whatsapp-fab.mjs
//   E2E_PREVIEW_URL=... E2E_PUBLISHED_URL=... node scripts/e2e-whatsapp-fab.mjs
//   node scripts/e2e-whatsapp-fab.mjs --only=published

const PREVIEW_URL = process.env.E2E_PREVIEW_URL || "http://localhost:8080/";
const PUBLISHED_URL = process.env.E2E_PUBLISHED_URL || "https://app-digifamar.lovable.app/";

const EXPECTED_PHONE = "19294919491";
const EXPECTED_TEXT = "Hi, I'd like help with DiGiFaMaR";
const EXPECTED_TARGET = "_top";
const FAB_LABEL = "Chat with DiGiFaMaR on WhatsApp";

const only = (process.argv.find((a) => a.startsWith("--only=")) || "").split("=")[1];

/** Minimal HTML entity decode for attribute values. */
function decodeEntities(value) {
  return value
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;|&#34;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

/** Extract every <a> tag (as an attribute map) from raw HTML. */
function parseAnchors(html) {
  const anchors = [];
  for (const match of html.matchAll(/<a\b([^>]*)>/gi)) {
    const attrs = {};
    for (const attr of match[1].matchAll(/([a-zA-Z-]+)\s*=\s*"([^"]*)"/g)) {
      attrs[attr[1].toLowerCase()] = decodeEntities(attr[2]);
    }
    anchors.push(attrs);
  }
  return anchors;
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    redirect: "follow",
    headers: { "user-agent": "digifamar-e2e/1.0" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  return { html: await res.text(), finalUrl: res.url || url };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function checkFab(anchors, label) {
  const fab = anchors.find((a) => a["aria-label"] === FAB_LABEL);
  assert(fab, `${label}: no anchor with aria-label "${FAB_LABEL}" found`);

  // href shape
  const url = new URL(fab.href);
  assert(url.protocol === "https:", `${label}: href is not https (${fab.href})`);
  assert(url.hostname === "wa.me", `${label}: href host is ${url.hostname}, expected wa.me`);
  assert(
    url.pathname === `/${EXPECTED_PHONE}`,
    `${label}: href phone is ${url.pathname}, expected /${EXPECTED_PHONE}`,
  );

  // wa.me query parameters
  const text = url.searchParams.get("text");
  assert(text !== null, `${label}: href is missing the ?text= parameter`);
  assert(
    text === EXPECTED_TEXT,
    `${label}: ?text= decoded to "${text}", expected "${EXPECTED_TEXT}"`,
  );
  assert(
    fab.href.includes(encodeURIComponent(EXPECTED_TEXT).replace(/'/g, "'")) ||
      fab.href.includes("text="),
    `${label}: ?text= is not URL-encoded in the raw href`,
  );

  // target / rel behaviour — must break out of the preview iframe safely
  assert(
    fab.target === EXPECTED_TARGET,
    `${label}: target is "${fab.target}", expected "${EXPECTED_TARGET}"`,
  );
  const rel = (fab.rel || "").split(/\s+/);
  assert(rel.includes("noopener"), `${label}: rel is "${fab.rel}", missing noopener`);
  assert(rel.includes("noreferrer"), `${label}: rel is "${fab.rel}", missing noreferrer`);

  return fab.href;
}

async function runTarget(name, url) {
  const { html, finalUrl } = await fetchHtml(url);
  const anchors = parseAnchors(html);
  const href = checkFab(anchors, name);
  console.log(`PASS ${name} (${finalUrl})`);
  console.log(`     href=${href} target=${EXPECTED_TARGET} rel=noopener noreferrer`);
}

const targets = [
  ["preview", PREVIEW_URL],
  ["published", PUBLISHED_URL],
].filter(([name]) => !only || only === name);

let failed = 0;
for (const [name, url] of targets) {
  try {
    await runTarget(name, url);
  } catch (err) {
    failed += 1;
    console.error(`FAIL ${name} (${url})\n     ${err.message}`);
  }
}

if (failed > 0) {
  console.error(`\n${failed} of ${targets.length} target(s) failed.`);
  process.exit(1);
}
console.log(`\nAll ${targets.length} target(s) passed.`);
