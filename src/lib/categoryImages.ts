const CATEGORY_IMAGES: Record<string, string> = {
  carpets: "/images/categories/drive-replacements/carpets.webp",
  clocks: "/images/categories/drive-replacements/clocks.webp",
  comforters: "/images/categories/drive-replacements/comforters.webp",
  lamps: "/images/categories/drive-replacements/lamps.webp",
  "wall-decor": "/images/categories/drive-replacements/wall-decor.webp",
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

  // The catalog import historically stored Google Drive proxy URLs. Those
  // IDs are no longer resolvable in production, while the corresponding
  // catalog images are committed under /public/collections. Prefer the local
  // asset for that legacy shape so cards never render a broken image.
  if (image?.startsWith("/api/images/") && localFallback) return localFallback;
  if (isPlaceholderImage(image)) return localFallback || categoryFallbackImage(categorySlug) || image || null;
  if (image) return image;
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
