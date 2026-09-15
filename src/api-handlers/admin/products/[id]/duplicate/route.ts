import { notifyProductUpdated } from "@/lib/notifications";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import db from "@/lib/db";
import { requireAuthRole } from "@/lib/apiAuth";
import { logAdminAction } from "@/lib/audit";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAuthRole(["ADMIN", "MANAGER", "PRODUCT_MANAGER"]);
  if (authResult.error) return authResult.error;

  const { id } = await params;
  const original = await db.product.findUnique({ where: { id }, include: { images: true, tags: true } });
  if (!original) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const duplicate = await db.product.create({
    data: {
      name: original.name + " (Copy)",
      slug: original.slug + "-copy-" + Date.now(),
      sku: original.sku ? original.sku + "-copy" : null,
      description: original.description,
      shortDescription: original.shortDescription,
      regularPrice: original.regularPrice,
      salePrice: original.salePrice,
      stockQuantity: original.stockQuantity,
      lowStockThreshold: original.lowStockThreshold,
      trackInventory: true, // inventory is always tracked
      categoryId: original.categoryId,
      subcategoryId: original.subcategoryId,
      status: "DRAFT",
      isActive: false,
      isFeatured: false,
      isNewArrival: false,
      isBestseller: false,
      weight: original.weight,
      material: original.material,
      color: original.color,
    },
  });

  for (const img of original.images) {
    const { id: _imgId, productId, ...imgData } = img;
    await db.productImage.create({ data: { ...imgData, productId: duplicate.id } });
  }
  for (const tag of original.tags) {
    const { id: _tagId, productId, ...tagData } = tag;
    await db.productTag.create({ data: { ...tagData, productId: duplicate.id } });
  }

  await logAdminAction({
    action: "CREATE", entity: "PRODUCT", entityId: duplicate.id, details: { name: duplicate.name, duplicatedFrom: original.id }, request,
  });

  notifyProductUpdated(duplicate.name, "added (duplicated)").catch(() => {});
  // Duplicate starts as DRAFT (hidden), so no storefront revalidation is needed

  return NextResponse.json({ product: duplicate });
}
