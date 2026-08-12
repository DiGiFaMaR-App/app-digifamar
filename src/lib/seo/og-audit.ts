/**
 * Shared types + parsing helpers for the OG/Twitter metadata audit.
 * Pure (no server-only imports) so both the server function and the CI
 * script can rely on the same shapes.
 */
export interface OgAuditTag {
  key: string;
  value: string;
}

export interface OgAuditResult {
  path: string;
  url: string;
  status: number;
  ok: boolean;
  title: string | null;
  tags: OgAuditTag[];
  image: {
    url: string | null;
    reachable: boolean;
    contentType: string | null;
    width: number | null;
    height: number | null;
  } | null;
  problems: string[];
}

/** Routes audited by default in both the admin page and the CI check. */
export const DEFAULT_AUDIT_PATHS = [
  "/",
  "/market",
  "/lenders",
  "/farm/blue-ridge",
  "/product/heirloom-tomatoes",
];

export const REQUIRED_OG_WIDTH = 1200;
export const REQUIRED_OG_HEIGHT = 630;

const META_RE = /<meta\b[^>]*>/gi;
const ATTR = (tag: string, name: string) => {
  const m = tag.match(new RegExp(`${name}\\s*=\\s*"([^"]*)"`, "i"));
  return m ? m[1] : null;
};

export function parseHeadTags(html: string): { title: string | null; tags: OgAuditTag[] } {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const tags: OgAuditTag[] = [];
  for (const tag of html.match(META_RE) ?? []) {
    const key = ATTR(tag, "property") ?? ATTR(tag, "name");
    const value = ATTR(tag, "content");
    if (
      key &&
      value &&
      (key.startsWith("og:") || key.startsWith("twitter:") || key === "description")
    ) {
      tags.push({ key, value });
    }
  }
  return { title: titleMatch ? titleMatch[1].trim() : null, tags };
}

export const tagValue = (tags: OgAuditTag[], key: string) =>
  tags.find((t) => t.key === key)?.value ?? null;

/** Reads intrinsic dimensions from a JPEG or PNG byte buffer. */
export function imageSize(buf: Uint8Array): { width: number; height: number } | null {
  // PNG
  if (buf.length > 24 && buf[0] === 0x89 && buf[1] === 0x50) {
    const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    return { width: dv.getUint32(16), height: dv.getUint32(20) };
  }
  // JPEG — walk the segment markers looking for a SOFn frame header.
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
        return {
          height: (buf[i + 5] << 8) | buf[i + 6],
          width: (buf[i + 7] << 8) | buf[i + 8],
        };
      }
      i += 2 + len;
    }
  }
  return null;
}

/** Validation rules shared by the admin page and the CI gate. */
export function collectProblems(
  result: Omit<OgAuditResult, "problems">,
  { requireImage = true } = {},
): string[] {
  const problems: string[] = [];
  const { tags, image } = result;

  if (!result.ok) problems.push(`HTTP ${result.status}`);
  if (!result.title) problems.push("missing <title>");
  if (!tagValue(tags, "description")) problems.push("missing meta description");
  for (const key of ["og:title", "og:description", "og:url"]) {
    if (!tagValue(tags, key)) problems.push(`missing ${key}`);
  }
  const card = tagValue(tags, "twitter:card");
  if (!card) problems.push("missing twitter:card");
  else if (card !== "summary_large_image") problems.push(`twitter:card is "${card}"`);

  const ogImage = tagValue(tags, "og:image");
  const twImage = tagValue(tags, "twitter:image");
  if (!ogImage) {
    if (requireImage) problems.push("missing og:image");
  } else {
    if (!/^https:\/\//.test(ogImage)) problems.push("og:image is not an absolute https URL");
    if (!twImage) problems.push("missing twitter:image");
    else if (twImage !== ogImage) problems.push("twitter:image differs from og:image");
    if (image && !image.reachable) problems.push("og:image is not reachable");
    if (image?.width && image.height) {
      if (image.width !== REQUIRED_OG_WIDTH || image.height !== REQUIRED_OG_HEIGHT) {
        problems.push(`og:image is ${image.width}x${image.height}, expected 1200x630`);
      }
    }
    const w = tagValue(tags, "og:image:width");
    const h = tagValue(tags, "og:image:height");
    if (w && Number(w) !== image?.width) problems.push("og:image:width does not match the file");
    if (h && Number(h) !== image?.height) problems.push("og:image:height does not match the file");
  }
  return problems;
}
