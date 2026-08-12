import { describe, expect, it } from "vitest";
import { collectProblems, imageSize, parseHeadTags, tagValue } from "./og-audit";

const html = `<html><head><title>Farm — DiGiFaMaR</title>
<meta name="description" content="Fresh"/>
<meta property="og:title" content="Farm"/>
<meta property="og:description" content="Fresh"/>
<meta property="og:url" content="https://app.digifamar.com/farm/x"/>
<meta property="og:image" content="https://cdn.test/card.jpg"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:image" content="https://cdn.test/card.jpg"/>
</head></html>`;

const base = (over: Partial<ReturnType<typeof parseHeadTags>> = {}) => {
  const parsed = { ...parseHeadTags(html), ...over };
  return {
    path: "/farm/x",
    url: "https://app.digifamar.com/farm/x",
    status: 200,
    ok: true,
    title: parsed.title,
    tags: parsed.tags,
    image: {
      url: "https://cdn.test/card.jpg",
      reachable: true,
      contentType: "image/jpeg",
      width: 1200,
      height: 630,
    },
  };
};

describe("og-audit", () => {
  it("parses social tags and title", () => {
    const { title, tags } = parseHeadTags(html);
    expect(title).toBe("Farm — DiGiFaMaR");
    expect(tagValue(tags, "og:image")).toBe("https://cdn.test/card.jpg");
  });

  it("passes a well-formed page", () => {
    expect(collectProblems(base())).toEqual([]);
  });

  it("flags wrong image dimensions", () => {
    const r = base();
    r.image = { ...r.image, width: 800, height: 400 };
    expect(collectProblems(r).join()).toContain("expected 1200x630");
  });

  it("flags a mismatched twitter image", () => {
    const r = base();
    r.tags = r.tags.map((t) =>
      t.key === "twitter:image" ? { ...t, value: "https://cdn.test/other.jpg" } : t,
    );
    expect(collectProblems(r)).toContain("twitter:image differs from og:image");
  });

  it("reads PNG dimensions", () => {
    const buf = new Uint8Array(32);
    buf.set([0x89, 0x50]);
    new DataView(buf.buffer).setUint32(16, 1200);
    new DataView(buf.buffer).setUint32(20, 630);
    expect(imageSize(buf)).toEqual({ width: 1200, height: 630 });
  });
});
