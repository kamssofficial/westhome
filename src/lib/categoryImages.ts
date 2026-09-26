import { proxiedMediaUrl } from "./driveUrl.ts";

/**
 * Normalize legacy image URLs to the image proxy.
 *
 * Older catalog rows store raw Google Drive URLs (`lh3.googleusercontent.com/d/<id>`
 * or `drive.google.com/uc?id=<id>`). Those are multi-MB PNGs served from a
 * third-party host that rate-limits anonymous hotlinks (the browser discards
 * the throttled non-image response, so the image never renders). Every
 * Drive-hosted file is also reachable through our own proxy at
 * `/api/images/<id>` (see src/api-handlers/images/route.ts), which downloads
 * server-side and serves content-negotiated WebP (~95% smaller) with immutable
 * cache headers.
 *
 * This is a pure display-URL rewrite: uploads continue to store `/api/images/*`
 * and nothing in the database changes. The suffix-free proxy path is emitted
 * deliberately — the route content-negotiates on Accept, so a cache must key
 * on the Vary header (already set) rather than a baked-in extension.
 */
export function normalizeImageUrl(url?: string | null): string | null {
  return proxiedMediaUrl(url);
}

const CATEGORY_IMAGES: Record<string, string> = {
  // These point at the canonical committed assets under /collections/<category>/
  // (byte-identical duplicates used to live under drive-replacements/ and were
  // shipped twice — every category tile downloaded both copies on some pages).
  carpets: "/collections/carpets/gray-distressed-rug.png",
  clocks: "/collections/clocks/dark-roman-numeral-clock.png",
  comforters: "/collections/comforters/comforter-set.png",
  lamps: "/collections/lamps/modern-lamp.png",
  "wall-decor": "/collections/frames/frame-abstract-art-green-sofa.png",
};

// One legacy product still references three deleted local-upload files. Keep
// the database values intact so they can be restored later, but never let that
// dead path render as a broken product image.
const PRODUCT_IMAGES_FALLBACK: Record<string, string> = {
  "ethereal-monolith-80160cm": "/collections/frames/frame-abstract-art-green-sofa.png",
};

export function categoryFallbackImage(slug?: string | null): string | null {
  return slug ? CATEGORY_IMAGES[slug] || null : null;
}

export function isPlaceholderImage(url?: string | null): boolean {
  return Boolean(url && (url.includes("placeholder") || url.includes("/images/categories/")));
}

export function resolveCategoryImage(slug?: string | null, image?: string | null): string | null {
  const normalized = proxiedMediaUrl(image);
  // Admin-uploaded category images must take precedence over committed
  // category fallbacks. Only use the fallback when the database has no usable
  // image (or still contains one of the old placeholder paths).
  if (normalized && !isPlaceholderImage(normalized)) return normalized;
  return categoryFallbackImage(slug) || normalized || null;
}

export function resolveProductImage(
  categorySlug?: string | null,
  image?: string | null,
  productSlug?: string | null,
): string | null {
  const localFallback = productLocalFallback(productSlug);
  const productFallback = productSlug ? PRODUCT_IMAGES_FALLBACK[productSlug] || null : null;

  // Normalize the Drive-backed shapes first, so a row rewritten to the CDN URL
  // still matches the legacy rules below instead of slipping past them.
  const normalized = proxiedMediaUrl(image);

  // This exact product points at local-upload files that no longer exist in
  // production. Fall back to a committed asset rather than rendering a 404.
  if (productFallback && normalized?.startsWith("/api/images/uploads/products/")) {
    return productFallback;
  }

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
