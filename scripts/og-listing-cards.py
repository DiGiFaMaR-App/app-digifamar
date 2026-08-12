#!/usr/bin/env python3
"""
Generate per-listing Open Graph / Twitter cards (1200x630) for every farm and
product in the catalog.

Each card embeds the latest DiGiFaMaR logo, the listing photo, and the
listing's own details, rendered at 2x and downsampled for crisp edges.

Usage:  python3 scripts/og-listing-cards.py <logo.png> <out-dir>
Then upload each JPG with `lovable-assets create`.
"""
import json
import os
import re
import sys

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MOCK = os.path.join(ROOT, "src/lib/mock-data.ts")
FONT_DIR = "/nix/store/xbs17gmksi0pljxcs4l6gshklzpmv8gr-dejavu-fonts-2.37/share/fonts/truetype"
FB = os.path.join(FONT_DIR, "DejaVuSans-Bold.ttf")
FR = os.path.join(FONT_DIR, "DejaVuSans.ttf")

S = 2
W, H = 1200 * S, 630 * S
MARGIN = 64 * S

IMAGE_FILES = {
    "heroFarm": "hero-farm.jpg",
    "produceCrate": "produce-crate.jpg",
    "farmerPortrait": "farmer-portrait.jpg",
    "fruitStand": "fruit-stand.jpg",
    "dairyEggs": "dairy-eggs.jpg",
    "honeyJars": "honey-jars.jpg",
}


def parse_blocks(src: str, marker: str):
    """Crude but sufficient parser for the literal arrays in mock-data.ts."""
    start = src.index(marker)
    depth = 0
    out, buf = [], ""
    for ch in src[start:]:
        if ch == "{":
            depth += 1
        if depth:
            buf += ch
        if ch == "}":
            depth -= 1
            if depth == 0:
                out.append(buf)
                buf = ""
        if ch == "]" and depth == 0 and out:
            break
    return out


def field(block: str, key: str):
    m = re.search(rf'\b{key}:\s*"((?:[^"\\]|\\.)*)"', block, re.S)
    if m:
        return m.group(1).replace('\\"', '"')
    m = re.search(rf"\b{key}:\s*([\w.]+),", block)
    return m.group(1) if m else None


def gradient():
    im = Image.new("RGB", (W, H), (6, 15, 6))
    d = ImageDraw.Draw(im)
    for y in range(H):
        t = y / H
        d.line(
            [(0, y), (W, y)],
            fill=(int(6 + 9 * t), int(20 + 24 * t), int(12 + 14 * t)),
        )
    return im


def wrap(d, text, font, maxw):
    lines, cur = [], ""
    for word in text.split():
        cand = (cur + " " + word).strip()
        if d.textlength(cand, font=font) <= maxw:
            cur = cand
        else:
            if cur:
                lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    return lines


def cover(path, box_w, box_h, radius):
    ph = Image.open(path).convert("RGB")
    ratio = max(box_w / ph.width, box_h / ph.height)
    ph = ph.resize((max(1, int(ph.width * ratio)), max(1, int(ph.height * ratio))), Image.LANCZOS)
    left = (ph.width - box_w) // 2
    top = (ph.height - box_h) // 2
    ph = ph.crop((left, top, left + box_w, top + box_h))
    mask = Image.new("L", (box_w, box_h), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, box_w - 1, box_h - 1], radius=radius, fill=255)
    return ph, mask


def card(out_path, logo, photo_path, eyebrow, title, sub, chips):
    im = gradient()
    d = ImageDraw.Draw(im)

    # Listing photo occupies the right column.
    col_w = int(W * 0.40)
    photo, mask = cover(photo_path, col_w - MARGIN, H - 2 * MARGIN, 28 * S)
    im.paste(photo, (W - MARGIN - photo.width, MARGIN), mask)

    # Logo, top-left.
    lg = logo.copy()
    lg.thumbnail((132 * S, 132 * S), Image.LANCZOS)
    im.paste(lg, (MARGIN, MARGIN - 8 * S), lg)

    text_w = W - MARGIN - photo.width - 44 * S - MARGIN
    x = MARGIN
    f_eyebrow = ImageFont.truetype(FB, 24 * S)
    f_title = ImageFont.truetype(FB, 54 * S)
    f_sub = ImageFont.truetype(FR, 26 * S)
    f_chip = ImageFont.truetype(FB, 22 * S)

    title_lines = wrap(d, title, f_title, text_w)[:3]
    sub_lines = wrap(d, sub, f_sub, text_w)[:3]

    block_h = 44 * S + len(title_lines) * 66 * S + 18 * S + len(sub_lines) * 38 * S
    if chips:
        block_h += 26 * S + 46 * S
    y = max(MARGIN + 150 * S, (H - block_h) // 2)

    d.text((x, y), eyebrow.upper(), font=f_eyebrow, fill=(154, 183, 158))
    y += 44 * S
    for ln in title_lines:
        d.text((x, y), ln, font=f_title, fill=(255, 255, 255))
        y += 66 * S
    y += 18 * S
    for ln in sub_lines:
        d.text((x, y), ln, font=f_sub, fill=(198, 210, 198))
        y += 38 * S

    if chips:
        y += 26 * S
        cx = x
        for chip in chips:
            tw = d.textlength(chip, font=f_chip)
            w = int(tw + 34 * S)
            if cx + w > x + text_w:
                break
            d.rounded_rectangle([cx, y, cx + w, y + 44 * S], radius=22 * S, fill=(22, 63, 37))
            d.text((cx + 17 * S, y + 9 * S), chip, font=f_chip, fill=(215, 232, 217))
            cx += w + 12 * S

    im.resize((1200, 630), Image.LANCZOS).save(out_path, quality=92, subsampling=0)


def main():
    logo_path, out_dir = sys.argv[1], sys.argv[2]
    os.makedirs(out_dir, exist_ok=True)
    logo = Image.open(logo_path).convert("RGBA")
    src = open(MOCK).read()

    farms = parse_blocks(src, "export const farms: Farm[] = [")
    products = parse_blocks(src, "export const products: Product[] = [")
    manifest = []

    for b in farms:
        fid = field(b, "id")
        img = IMAGE_FILES[field(b, "image")]
        certs = re.search(r"certifications:\s*\[(.*?)\]", b, re.S)
        chips = re.findall(r'"([^"]+)"', certs.group(1)) if certs else []
        out = os.path.join(out_dir, f"og-farm-{fid}.jpg")
        card(
            out,
            logo,
            os.path.join(ROOT, "src/assets", img),
            "Verified farm",
            field(b, "name"),
            field(b, "location") + " - " + (field(b, "description") or ""),
            chips[:3],
        )
        manifest.append({"kind": "farm", "id": fid, "file": out})

    for b in products:
        pid = field(b, "id")
        img = IMAGE_FILES[field(b, "image")]
        price = field(b, "price") or re.search(r"price:\s*([\d.]+)", b).group(1)
        unit = field(b, "unit")
        out = os.path.join(out_dir, f"og-product-{pid}.jpg")
        card(
            out,
            logo,
            os.path.join(ROOT, "src/assets", img),
            "Farm-direct listing",
            field(b, "name"),
            field(b, "description") or "",
            [f"${price} / {unit}", "Escrow protected"],
        )
        manifest.append({"kind": "product", "id": pid, "file": out})

    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
