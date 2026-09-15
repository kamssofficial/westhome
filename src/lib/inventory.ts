import db from "./db";

/**
 * Restore inventory for a cancelled/refunded order's items.
 *
 * Inventory is decremented by /api/payment/verify for EVERY paid order item
 * (stock 0 is un-buyable regardless of trackInventory), so this helper
 * restores unconditionally to mirror exactly that. Unpaid orders no-op.
 */
export async function restoreOrderStock(orderId: string) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: { paymentStatus: true, items: true },
  });
  if (!order || order.paymentStatus !== "COMPLETED") return;

  await db.$transaction(async (tx) => {
    for (const item of order.items) {
      if (item.variantId) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stockQuantity: { increment: item.quantity } },
        });
      } else {
        await tx.product.update({
          where: { id: item.productId },
          data: { stockQuantity: { increment: item.quantity } },
        });
      }
    }
  });
}