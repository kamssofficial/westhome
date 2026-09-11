export const SUBCATEGORY_PLACEHOLDERS: Record<string, string> = {
  "soap-dispensers": "/images/categories/soap-dispensers-placeholder.svg",
  "cushion-covers": "/images/categories/cushion-covers-placeholder.svg",
  vases: "/images/categories/vases-placeholder.svg",
  "flower-pots": "/images/categories/flower-pots-placeholder.svg",
  "tissue-boxes": "/images/categories/tissue-boxes-placeholder.svg",
  dustbin: "/images/categories/dustbin-placeholder.svg",
};

export const GENERIC_SUBCATEGORY_PLACEHOLDER = "/images/categories/subcategory-placeholder.svg";

export function subcategoryImage(sub: {
  slug?: string;
  image?: string | null;
}): string | null {
  if (sub.image) return sub.image;
  return SUBCATEGORY_PLACEHOLDERS[sub.slug || ""] || GENERIC_SUBCATEGORY_PLACEHOLDER;
}