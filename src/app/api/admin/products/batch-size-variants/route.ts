import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAuthRole } from "@/lib/apiAuth";
import { logAdminAction } from "@/lib/audit";

const SIZE_VARIANTS = [
  { name: "Small", price: 499 },
  { name: "Medium", price: 699 },
  { name: "Large", price: 899 },
];

export async function POST(request: NextRequest) {
  const authResult = await requireAuthRole(["ADMIN"]);
  if (authResult.error) return authResult.error;

  const body = await request.json();
  const { productIds } = body as { productIds?: string[] };

  if (!productIds?.length) {
    return NextResponse.json({ error: "productIds array is required" }, { status: 400 });
  }

  const results: { productId: string; name: string; created: number; skipped: number; error?: string }[] = [];

  for (const productId of productIds) {
    try {
      const product = await db.product.findUnique({ where: { id: productId } });
      if (!product) {
        results.push({ productId, name: "Unknown", created: 0, skipped: 0, error: "Product not found" });
        continue;
      }

      const existingCount = await db.productVariant.count({ where: { productId } });
      if (existingCount > 0) {
        results.push({ productId, name: product.name, created: 0, skipped: SIZE_VARIANTS.length });
        continue;
      }

      const maxPosition = await db.productVariant.aggregate({
        where: { productId },
        _max: { position: true },
      });
      let pos = (maxPosition._max.position ?? -1) + 1;

      let sizeAttr = await db.variantAttribute.findUnique({
        where: { productId_name: { productId, name: "Size" } },
      });
      if (!sizeAttr) {
        sizeAttr = await db.variantAttribute.create({
          data: { productId, name: "Size", position: 0 },
        });
      }

      let createdCount = 0;
      for (const sv of SIZE_VARIANTS) {
        const variant = await db.productVariant.create({
          data: {
            productId,
            name: sv.name,
            price: sv.price,
            position: pos++,
          },
        });

        await db.variantAttributeValue.create({
          data: {
            variantAttributeId: sizeAttr.id,
            variantId: variant.id,
            value: sv.name,
            position: SIZE_VARIANTS.indexOf(sv),
          },
        });
        createdCount++;
      }

      results.push({ productId, name: product.name, created: createdCount, skipped: 0 });
    } catch (e: unknown) {
      results.push({ productId, name: "Error", created: 0, skipped: 0, error: e instanceof Error ? e.message : "Unknown error" });
    }
  }

  await logAdminAction({
    action: "CREATE",
    entity: "PRODUCT_VARIANT",
    entityId: "batch",
    details: { productIds, results },
    request,
  });

  return NextResponse.json({ results });
}
