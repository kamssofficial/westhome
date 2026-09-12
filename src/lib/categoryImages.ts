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
  return categoryFallbackImage(slug) || image || null;
}

export function resolveProductImage(
  categorySlug?: string | null,
  image?: string | null,
): string | null {
  if (isPlaceholderImage(image)) return categoryFallbackImage(categorySlug) || image || null;
  return image || categoryFallbackImage(categorySlug) || null;
}
