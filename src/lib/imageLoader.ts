/**
 * Custom Next.js image loader.
 *
 * When a custom loader is configured, the built-in /_next/image optimizer
 * is disabled, so we must serve all images directly from their public path.
 * SVGs were already broken with the optimizer (400 error); raster images
 * also break because /_next/image returns 404 under a custom loader.
 *
 * TODO: Re-enable optimization by switching to an external service
 * (Cloudinary, Imgix, etc.) or by using `unoptimized` per-component
 * and removing this custom loader.
 */
import type { ImageLoaderProps } from "next/image";

export default function westhomeImageLoader({
  src,
}: ImageLoaderProps): string {
  return src;
}
