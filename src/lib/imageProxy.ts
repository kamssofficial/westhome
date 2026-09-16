/**
 * Pure, testable helpers used by the image proxy route.
 *
 * Kept separate from the route handler so the core logic — Accept negotiation,
 * WebP transcoding, and response building — can be unit-tested without mocking
 * Next.js request/response objects or the Drive API.
 */
import sharp from "sharp";

// ── Accept negotiation ──────────────────────────────────────────────────────

/** True when the client's Accept header includes image/webp. */
export function acceptsWebp(accept: string | null | undefined): boolean {
  return (accept || "").toLowerCase().includes("image/webp");
}

// ── WebP transcoding ────────────────────────────────────────────────────────

export const WEBP_QUALITY = 80;
export const WEBP_MIN_BYTES = 32 * 1024;

export async function toWebp(
  data: Buffer,
  mimeType: string,
): Promise<{ data: Buffer; mimeType: string }> {
  // Only raster formats can be transcoded, and tiny files aren't worth it.
  if (!/^image\/(png|jpe?g)$/i.test(mimeType)) return { data, mimeType };
  if (data.byteLength < WEBP_MIN_BYTES) return { data, mimeType };

  try {
    // `rotate()` applies EXIF orientation so the visitor sees the same framing
    // as the original file.
    const converted = await sharp(data)
      .rotate()
      .webp({ quality: WEBP_QUALITY, effort: 4 })
      .toBuffer();
    // Never send something bigger than what we started with.
    if (converted.byteLength >= data.byteLength) return { data, mimeType };
    return { data: converted, mimeType: "image/webp" };
  } catch {
    // A transcode failure must never break an image — fall back to the original.
    return { data, mimeType };
  }
}

// ── Response building ───────────────────────────────────────────────────────

/** Standard cache headers for immutable uploaded media. */
export const IMMUTABLE_MEDIA_CACHE =
  "public, max-age=604800, s-maxage=31536000, stale-while-revalidate=604800";

/** Standard cache headers for legacy committed files. */
export const LEGACY_MEDIA_CACHE =
  "public, max-age=86400, s-maxage=2592000, stale-while-revalidate=86400";
