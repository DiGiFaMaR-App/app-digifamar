/**
 * Server function powering the internal OG/Twitter metadata inspector.
 * Fetches the rendered HTML for each requested route on this same origin and
 * reports the social tags plus image reachability/dimensions.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import {
  collectProblems,
  imageSize,
  parseHeadTags,
  tagValue,
  type OgAuditResult,
} from "@/lib/seo/og-audit";

const Input = z.object({
  paths: z.array(z.string().trim().min(1).max(300)).min(1).max(25),
});

export const auditOgTagsFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }): Promise<OgAuditResult[]> => {
    const req = getRequest();
    const proto = req.headers.get("x-forwarded-proto") ?? "https";
    const host = req.headers.get("host")!;
    const origin = `${proto}://${host}`;

    return Promise.all(
      data.paths.map(async (path) => {
        const url = `${origin}${path.startsWith("/") ? path : `/${path}`}`;
        try {
          const res = await fetch(url, { headers: { "user-agent": "DiGiFaMaR-OG-Audit" } });
          const html = await res.text();
          const { title, tags } = parseHeadTags(html);
          const ogImage = tagValue(tags, "og:image");

          let image: OgAuditResult["image"] = null;
          if (ogImage) {
            image = {
              url: ogImage,
              reachable: false,
              contentType: null,
              width: null,
              height: null,
            };
            try {
              const imgUrl = ogImage.startsWith("http") ? ogImage : `${origin}${ogImage}`;
              const imgRes = await fetch(imgUrl);
              image.reachable = imgRes.ok;
              image.contentType = imgRes.headers.get("content-type");
              if (imgRes.ok) {
                const size = imageSize(new Uint8Array(await imgRes.arrayBuffer()));
                image.width = size?.width ?? null;
                image.height = size?.height ?? null;
              }
            } catch {
              image.reachable = false;
            }
          }

          const base = { path, url, status: res.status, ok: res.ok, title, tags, image };
          return { ...base, problems: collectProblems(base) };
        } catch (err) {
          return {
            path,
            url,
            status: 0,
            ok: false,
            title: null,
            tags: [],
            image: null,
            problems: [`fetch failed: ${err instanceof Error ? err.message : String(err)}`],
          };
        }
      }),
    );
  });
