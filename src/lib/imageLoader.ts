/**
 * Custom Next.js image loader that bypasses the optimizer for SVG files.
 * SVGs cannot be optimized (WebP/AVIF conversion) and the built-in
 * optimizer returns 400 for them, so they are served directly.
 */
import type { ImageLoaderProps } from "next/image";

export default function westhomeImageLoader({
  src,
  width,
  quality,
}: ImageLoaderProps): string {
  // SVGs: serve directly — no optimization possible or needed
  if (src.endsWith(".svg")) {
    return src;
  }

  // Everything else: go through the default Next.js optimizer
  const params = new URLSearchParams();
  params.set("url", src);
  params.set("w", String(width));
  if (quality) params.set("q", String(quality));
  return `/_next/image?${params.toString()}`;
}
