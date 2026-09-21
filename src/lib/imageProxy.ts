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

// ── Requested-size negotiation ──────────────────────────────────────────────

/**
 * Bounds for the `?w=` request parameter. Cards ask for ~640px and full-width
 * banners for ~1600px; the clamp stops a hand-written URL from asking the
 * origin to encode something absurd or to shrink an image to a thumbnail.
 */
export const IMAGE_WIDTH_MIN = 64;
export const IMAGE_WIDTH_MAX = 2000;

/**
 * Parse the `?w=` width request. Returns null when the parameter is absent or
 * unusable, so callers fall through to serving the original untransformed.
 */
export function parseImageWidth(raw: string | null | undefined): number | null {
  if (raw == null || raw === "") return null;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.min(Math.max(parsed, IMAGE_WIDTH_MIN), IMAGE_WIDTH_MAX);
}

// ── WebP transcoding ────────────────────────────────────────────────────────

export const WEBP_QUALITY = 80;
export const WEBP_MIN_BYTES = 32 * 1024;

export async function toWebp(
  data: Buffer,
  mimeType: string,
  maxWidth?: number | null,
): Promise<{ data: Buffer; mimeType: string }> {
  // Only raster formats can be transcoded.
  if (!/^image\/(png|jpe?g)$/i.test(mimeType)) return { data, mimeType };
  // A requested width is worth honouring even for small files: a 40KB original
  // still costs the origin the decode, and the caller asked for a thumbnail.
  if (!maxWidth && data.byteLength < WEBP_MIN_BYTES) return { data, mimeType };

  try {
    // `rotate()` applies EXIF orientation so the visitor sees the same framing
    // as the original file, and resizing after it keeps a portrait photo from
    // being clamped by its pre-rotation width.
    let pipeline = sharp(data).rotate();
    if (maxWidth) {
      // withoutEnlargement keeps an already-small original at its own size
      // rather than upscaling it into a bigger file than we started with.
      pipeline = pipeline.resize({
        width: maxWidth,
        withoutEnlargement: true,
        fit: "inside",
      });
    }
    const converted = await pipeline.webp({ quality: WEBP_QUALITY, effort: 4 }).toBuffer();
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
