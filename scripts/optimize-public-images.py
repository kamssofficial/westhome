#!/usr/bin/env python3
"""
One-off asset diet for the committed storefront images.

The catalogue art under public/collections and public/images/categories was
exported from the source PDF at 1024-1400px and ships as palette PNGs weighing
250-770 KB each. They render as ~145px category tiles and ~600px product cards,
so first-time visitors pay megabytes for pixels they never see.

IMPORTANT CONSTRAINT: product image URLs live in database rows and in
productLocalFallback() (src/lib/categoryImages.ts) as exact .png/.jpg paths,
so this script never renames or re-formats anything — it re-encodes each file
IN PLACE at the same path with the same format:

  palette PNG of photographic art -> RGB PNG recompressed via quantize(256,
  dither) + optimize: typically 3-5x smaller with no visible difference at
  card/tile display sizes (photographic content survives 256-color
  quantization + dithering well at these sizes).

  oversized JPEGs (>= 200 KB) -> re-encoded q82 progressive.

The banner hero PNG is quantized too; the logo is skipped (already optimal).
Nothing is deleted; git holds the originals, so rollback = git checkout.

Run: python3 scripts/optimize-public-images.py
"""

import io
import os

from PIL import Image

PUBLIC = "public"
JPEG_REENCODE_MIN_BYTES = 200 * 1024
JPEG_QUALITY = 82
# Card tiles render at ~145-600 px; cap the long edge at 1000px to keep 2x
# retina headroom without shipping catalogue-resolution pixels.
MAX_LONG_EDGE = 1000

changed = []
skipped = []
total_before = 0
total_after = 0


def iter_images():
    for root, _dirs, files in os.walk(PUBLIC):
        for name in sorted(files):
            if name.lower().endswith((".png", ".jpg", ".jpeg")):
                yield os.path.join(root, name)


def best_png(im: Image.Image) -> bytes:
    """Smallest of: optimized RGB PNG / quantized 256-color PNG."""
    rgb = im.convert("RGB")
    buf_a = io.BytesIO()
    rgb.save(buf_a, "PNG", optimize=True)
    rgba = im.convert("RGBA")
    buf_b = io.BytesIO()
    rgba.quantize(colors=256, method=Image.FASTOCTREE, dither=Image.FLOYDSTEINBERG).save(
        buf_b, "PNG", optimize=True
    )
    return min(buf_a.getvalue(), buf_b.getvalue(), key=len)


def reencode_jpeg(im: Image.Image) -> bytes:
    rgb = im.convert("RGB")
    buf = io.BytesIO()
    rgb.save(buf, "JPEG", quality=JPEG_QUALITY, optimize=True, progressive=True)
    return buf.getvalue()


def process(path: str) -> None:
    global total_before, total_after
    before = os.path.getsize(path)
    rel = os.path.relpath(path, PUBLIC)

    # Never touch icons/favicons or the (already 12 KB) logo.
    if rel.startswith(("icon-", "favicon", "apple-touch", "images/logo/")):
        skipped.append((rel, before, "protected"))
        return
    if before < 100 * 1024:
        skipped.append((rel, before, "small"))
        return

    im = Image.open(path)
    im.load()
    w, h = im.size

    # Downscale only when the long edge wildly exceeds any rendered size.
    long_edge = max(w, h)
    if long_edge > MAX_LONG_EDGE:
        scale = MAX_LONG_EDGE / long_edge
        im = im.resize((round(w * scale), round(h * scale)), Image.LANCZOS)

    is_jpeg = path.lower().endswith((".jpg", ".jpeg"))
    if is_jpeg:
        if before < JPEG_REENCODE_MIN_BYTES and long_edge <= MAX_LONG_EDGE:
            skipped.append((rel, before, "jpeg-ok"))
            return
        data = reencode_jpeg(im)
        how = f"jpeg-q{JPEG_QUALITY}"
    else:
        data = best_png(im)
        how = "png-quantize"

    if len(data) >= before:
        skipped.append((rel, before, "no-win"))
        return

    with open(path, "wb") as f:
        f.write(data)
    after = len(data)
    changed.append((rel, before, after, how))
    total_before += before
    total_after += after


def main():
    for path in sorted(iter_images()):
        try:
            process(path)
        except Exception as e:  # noqa: BLE001
            print(f"  !! {path}: {e}")

    print(f"\n{'file':64} {'before':>9} {'after':>9} {'saved':>7}  how")
    for rel, b, a, how in changed:
        print(f"{rel:64} {b // 1024:>7}KB {a // 1024:>7}KB {100 - a * 100 // b:>6}%  {how}")
    if skipped:
        print("\nskipped:")
        for rel, b, why in skipped:
            print(f"  {rel:64} {b // 1024:>7}KB  {why}")
    if total_before:
        print(
            f"\nTOTAL: {total_before // 1024}KB -> {total_after // 1024}KB "
            f"(saved {100 - total_after * 100 // total_before}%)"
        )


if __name__ == "__main__":
    main()
