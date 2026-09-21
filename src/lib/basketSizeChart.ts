/**
 * Size charts for the woven basket families, transcribed from the supplier's
 * WhatsApp catalogue (codes ch7001/ch7006/ch7007/ch7008/ch7005, cs401/cs403/
 * cs406/cs408, ch002s). Variant prices in the DB already match these rows —
 * this table exists to show buyers the per-size dimensions the variant
 * selector cannot carry (ProductVariant has no height/width columns).
 *
 * Keyed by product slug. `dims` is H × W (× D where the basket is oval),
 * in centimetres, exactly as supplied. Standalone products (single size)
 * get a one-row chart so the page still shows concrete dimensions.
 */

export interface BasketSizeRow {
  /** Display label matching the variant names ("Small"/"Medium"/"Large"). */
  size: string;
  /** Supplier order code for this size, e.g. "ch7001L". */
  sku: string;
  /** Price in INR — must mirror the live variant price. */
  price: number;
  /** H × W (× D) in cm, as supplied by the supplier. */
  dims: string;
}

export interface BasketSizeChart {
  rows: BasketSizeRow[];
}

export const BASKET_SIZE_CHARTS: Record<string, BasketSizeChart> = {
  "dark-brown-woven-basket-set-with-lids": {
    rows: [
      { size: "Small", sku: "ch7001s", price: 2499, dims: "40 × 34" },
      { size: "Medium", sku: "ch7001m", price: 2999, dims: "46 × 38" },
      { size: "Large", sku: "ch7001L", price: 3499, dims: "53 × 43" },
    ],
  },
  "dark-brown-white-woven-basket-set-with-handles": {
    rows: [
      { size: "Medium", sku: "ch7006m", price: 3299, dims: "40 × 40" },
      { size: "Large", sku: "ch7006L", price: 3499, dims: "45 × 45" },
    ],
  },
  "dark-open-weave-decorative-basket": {
    rows: [{ size: "Medium", sku: "Ch7007m", price: 1899, dims: "36 × 30" }],
  },
  "grey-metal-open-weave-decorative-basket": {
    rows: [
      { size: "Medium", sku: "ch7008m", price: 1899, dims: "36 × 30" },
      { size: "Large", sku: "ch7008L", price: 2399, dims: "40 × 34" },
    ],
  },
  "grey-woven-basket-set-with-labels": {
    rows: [
      { size: "Small", sku: "ch7005s", price: 2799, dims: "34 × 34 × 25" },
      { size: "Medium", sku: "ch7005m", price: 3499, dims: "43 × 40 × 30" },
      { size: "Large", sku: "ch7005L", price: 3999, dims: "52 × 49 × 35" },
    ],
  },
  "natural-tan-woven-basket-set-with-tassels": {
    rows: [
      { size: "Small", sku: "cs408s", price: 2999, dims: "34 × 34 × 25" },
      { size: "Medium", sku: "cs408m", price: 3499, dims: "43 × 40 × 30" },
      { size: "Large", sku: "Cs408L", price: 3999, dims: "53 × 49 × 35" },
    ],
  },
  "brown-cream-woven-basket-set-3-sizes": {
    rows: [
      { size: "Small", sku: "cs406s", price: 2499, dims: "40 × 34" },
      { size: "Medium", sku: "cs406m", price: 3399, dims: "45 × 38" },
      { size: "Large", sku: "cs406L", price: 3899, dims: "52 × 44" },
    ],
  },
  "natural-cylindrical-woven-basket-set": {
    rows: [
      { size: "Small", sku: "cs403s", price: 2799, dims: "40 × 34" },
      { size: "Medium", sku: "cs403m", price: 3399, dims: "46 × 38" },
      { size: "Large", sku: "cs403L", price: 3699, dims: "52 × 44" },
    ],
  },
  "cream-woven-basket-set-3-sizes": {
    rows: [{ size: "Large", sku: "cs401L", price: 3799, dims: "52 × 44" }],
  },
  "grey-woven-basket-set-compact": {
    rows: [{ size: "Small", sku: "Ch002s", price: 2499, dims: "43 × 35" }],
  },
};

export function basketSizeChartFor(slug?: string | null): BasketSizeChart | null {
  if (!slug) return null;
  return BASKET_SIZE_CHARTS[slug] ?? null;
}
