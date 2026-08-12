#!/usr/bin/env node
/**
 * CI gate: fetch key pages, verify their OG/Twitter metadata, and fail the
 * build when an image URL is missing/unreachable or the wrong dimensions.
 *
 * Usage:
 *   node scripts/check-og-tags.mjs [--base https://app.digifamar.com] [paths...]
 *
 * Env:
 *   OG_CHECK_BASE_URL  base origin to audit (default https://app.digifamar.com)
 *   OG_CHECK_PATHS     comma-separated routes to audit (overrides defaults)
 */
const DEFAULT_PATHS = [
  "/",
  "/market",
  "/lenders",
  "/farm/blue-ridge",
  "/product/heirloom-tomatoes",
];
const W = 1200;
const H = 630;

const args = process.argv.slice(2);
let base = process.env.OG_CHECK_BASE_URL || "https://app.digifamar.com";
const pathArgs = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--base") base = args[++i];
  else pathArgs.push(args[i]);
}
const paths = pathArgs.length
  ? pathArgs
  : (process.env.OG_CHECK_PATHS || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean).length
    ? process.env.OG_CHECK_PATHS.split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : DEFAULT_PATHS;

base = base.replace(/\/$/, "");

const attr = (tag, name) => {
  const m = tag.match(new RegExp(`${name}\\s*=\\s*"([^"]*)"`, "i"));
  return m ? m[1] : null;
};

function parseTags(html) {
  const tags = {};
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const key = attr(tag, "property") ?? attr(tag, "name");
    const value = attr(tag, "content");
    if (key && value && tags[key] === undefined) tags[key] = value;
  }
  const t = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return { title: t ? t[1].trim() : null, tags };
}

function imageSize(buf) {
  if (buf.length > 24 && buf[0] === 0x89 && buf[1] === 0x50) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) {
        i++;
        continue;
      }
      const marker = buf[i + 1];
      const len = (buf[i + 2] << 8) | buf[i + 3];
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { height: (buf[i + 5] << 8) | buf[i + 6], width: (buf[i + 7] << 8) | buf[i + 8] };
      }
      i += 2 + len;
    }
  }
  return null;
}

async function check(path) {
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const problems = [];
  const res = await fetch(url, { headers: { "user-agent": "DiGiFaMaR-OG-Check" } });
  if (!res.ok) problems.push(`HTTP ${res.status}`);
  const { title, tags } = parseTags(await res.text());

  if (!title) problems.push("missing <title>");
  for (const key of ["description", "og:title", "og:description", "og:url", "og:image"]) {
    if (!tags[key]) problems.push(`missing ${key}`);
  }
  if (tags["twitter:card"] !== "summary_large_image") {
    problems.push(`twitter:card is "${tags["twitter:card"] ?? "missing"}"`);
  }

  const image = tags["og:image"];
  if (image) {
    if (!/^https:\/\//.test(image)) problems.push(`og:image is not absolute https: ${image}`);
    if (!tags["twitter:image"]) problems.push("missing twitter:image");
    else if (tags["twitter:image"] !== image) problems.push("twitter:image differs from og:image");

    try {
      const imgRes = await fetch(image.startsWith("http") ? image : `${base}${image}`);
      if (!imgRes.ok) problems.push(`og:image unreachable (HTTP ${imgRes.status})`);
      else {
        const buf = Buffer.from(await imgRes.arrayBuffer());
        const size = imageSize(buf);
        if (!size) problems.push("og:image is not a readable JPEG/PNG");
        else if (size.width !== W || size.height !== H) {
          problems.push(`og:image is ${size.width}x${size.height}, expected ${W}x${H}`);
        } else {
          for (const [k, expected] of [
            ["og:image:width", W],
            ["og:image:height", H],
          ]) {
            if (tags[k] && Number(tags[k]) !== expected) {
              problems.push(`${k}=${tags[k]} does not match the file (${expected})`);
            }
          }
        }
      }
    } catch (e) {
      problems.push(`og:image fetch failed: ${e.message}`);
    }
  }
  return { path, url, problems };
}

const results = [];
for (const p of paths) {
  try {
    results.push(await check(p));
  } catch (e) {
    results.push({ path: p, url: `${base}${p}`, problems: [`fetch failed: ${e.message}`] });
  }
}

let failed = 0;
for (const r of results) {
  if (r.problems.length) {
    failed++;
    console.error(`✗ ${r.path}`);
    for (const p of r.problems) console.error(`    - ${p}`);
  } else {
    console.log(`✓ ${r.path}`);
  }
}

console.log(`\n${results.length - failed}/${results.length} routes passed the social-card check.`);
if (failed) {
  console.error(`Social card check failed for ${failed} route(s) on ${base}.`);
  process.exit(1);
}
