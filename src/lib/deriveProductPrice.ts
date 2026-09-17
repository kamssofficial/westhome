import db from "@/lib/db";

/**
 * Variants are the price source of truth for products that have them: the
 * storefront charges variant prices, so the parent price is DERIVED from the
 * variants (min regular; min sale only when every priced variant is on sale)
 * and kept in sync wherever variant prices change. This prevents the
 * "two different prices" problem between the general price and variant prices.
 */
export async function deriveParentPriceFromVariants(productId: string) {
  const variants = await db.productVariant.findMany({
    where: { productId },
    select: { price: true, salePrice: true },
  });
  const priced = variants.filter((v) => Number(v.price) > 0);
  if (priced.length === 0) return null;

  const regularPrice = Math.min(...priced.map((v) => Number(v.price)));
  const salePrices = priced
    .map((v) => Number(v.salePrice))
    .filter((s) => Number(s) > 0);
  let salePrice: number | null =
    salePrices.length === priced.length ? Math.min(...salePrices) : null;
  if (salePrice != null && salePrice >= regularPrice) salePrice = null;

  return { regularPrice, salePrice };
}

/** Derive the parent price from variants and write it to the product row. */
export async function syncParentPriceFromVariants(productId: string) {
  const derived = await deriveParentPriceFromVariants(productId);
  if (!derived) return null;
  await db.product.update({ where: { id: productId }, data: derived });
  return derived;
}
