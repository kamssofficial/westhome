/**
 * Normalize legacy image URLs to the WebP image proxy.
 *
 * Older catalog rows store raw Google Drive URLs (`lh3.googleusercontent.com/d/<id>`
 * or `drive.google.com/uc?id=<id>`). Those are multi-MB PNGs served from a
 * third-party host with no caching control and no WebP negotiation. Every
 * Drive-hosted file is also reachable through our own proxy at
 * `/api/images/<id>` (see src/api-handlers/images/route.ts), which serves
 * content-negotiated WebP (~95% smaller) with immutable cache headers.
 *
 * This is a pure display-URL rewrite: uploads continue to store `/api/images/*`
 * and nothing in the database changes.
 */
export function normalizeImageUrl(url?: string | null): string | null {
  if (!url) return url ?? null;

  // Already proxied (new uploads) or another app-local asset — leave as is.
  if (url.startsWith("/")) return url;

  // Raw Drive delivery host: https://lh3.googleusercontent.com/d/<fileId>[=wNNN]
  const driveDirect = url.match(/^https:\/\/lh3\.googleusercontent\.com\/d\/([A-Za-z0-9_-]{10,})(?:[=?].*)?$/);
  if (driveDirect) return `/api/images/${driveDirect[1]}`;

  // Legacy share shape: https://drive.google.com/uc?id=<fileId>&export=view|download
  const driveUc = url.match(/^https:\/\/drive\.google\.com\/uc\?id=([A-Za-z0-9_-]{10,})(?:&.*)?$/);
  if (driveUc) return `/api/images/${driveUc[1]}`;

  // Any other absolute URL (e.g. Cloudflare-hosted media) stays untouched.
  return url;
}

const CATEGORY_IMAGES: Record<string, string> = {
  carpets: "/images/categories/drive-replacements/carpets.png",
  clocks: "/images/categories/drive-replacements/clocks.png",
  comforters: "/images/categories/drive-replacements/comforters.png",
  lamps: "/images/categories/drive-replacements/lamps.png",
  "wall-decor": "/images/categories/drive-replacements/wall-decor.png",
};

export function categoryFallbackImage(slug?: string | null): string | null {
  return slug ? CATEGORY_IMAGES[slug] || null : null;
}

export function isPlaceholderImage(url?: string | null): boolean {
  return Boolean(url && (url.includes("placeholder") || url.includes("/images/categories/")));
}

export function resolveCategoryImage(slug?: string | null, image?: string | null): string | null {
  // Admin-uploaded category images must take precedence over committed
  // category fallbacks. Only use the fallback when the database has no usable
  // image (or still contains one of the old placeholder paths).
  if (image && !isPlaceholderImage(image)) return image;
  return categoryFallbackImage(slug) || image || null;
}

export function resolveProductImage(
  categorySlug?: string | null,
  image?: string | null,
  productSlug?: string | null,
): string | null {
  const localFallback = productLocalFallback(productSlug);

  // Route legacy raw-Drive URLs through the WebP proxy so JSON-LD, OG tags
  // and the Merchant feed advertise fast, cacheable image URLs.
  const normalized = normalizeImageUrl(image);

  // The catalog import historically stored Google Drive proxy URLs. Those
  // IDs are no longer resolvable in production, while the corresponding
  // catalog images are committed under /public/collections. Prefer the local
  // asset for that legacy shape so cards never render a broken image.
  if (normalized?.startsWith("/api/images/") && localFallback) return localFallback;
  if (isPlaceholderImage(normalized)) return localFallback || categoryFallbackImage(categorySlug) || normalized || null;
  if (normalized) return normalized;
  return localFallback || categoryFallbackImage(categorySlug) || null;
}

function productLocalFallback(
  productSlug?: string | null,
): string | null {
  if (!productSlug) return null;

  // Cushion-cover catalog assets use the stable product code in their slug.
  // This covers both the older "cushion-cover-*" records and the imported
  // "cushion-cover-design-*" records.
  if (productSlug.startsWith("cushion-cover")) {
    const code = productSlug
      .replace(/^cushion-cover-design-/, "")
      .replace(/^cushion-cover-/, "");
    if (code) return `/collections/cushion-covers/cushion-cover-${code}-1.png`;
  }

  return null;
}
