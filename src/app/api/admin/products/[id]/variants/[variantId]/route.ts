import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAuthRole } from "@/lib/apiAuth";
import { logAdminAction } from "@/lib/audit";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; variantId: string }> }
) {
  const authResult = await requireAuthRole(["ADMIN", "MANAGER", "PRODUCT_MANAGER"]);
  if (authResult.error) return authResult.error;

  const { id, variantId } = await params;
  const body = await request.json();

  const existing = await db.productVariant.findFirst({
    where: { id: variantId, productId: id },
  });
  if (!existing) return NextResponse.json({ error: "Variant not found" }, { status: 404 });

  const updated = await db.productVariant.update({
    where: { id: variantId },
    data: {
      ...(body.name != null && { name: body.name }),
      ...(body.price != null && { price: body.price }),
      ...(body.salePrice !== undefined && { salePrice: body.salePrice }),
      ...(body.stockQuantity != null && { stockQuantity: body.stockQuantity }),
      ...(body.position != null && { position: body.position }),
      ...(body.isActive != null && { isActive: body.isActive }),
    },
  });

  await logAdminAction({
    action: "UPDATE",
    entity: "PRODUCT_VARIANT",
    entityId: variantId,
    details: { productId: id, name: updated.name, price: updated.price },
    request,
  });

  return NextResponse.json({ variant: updated });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; variantId: string }> }
) {
  const authResult = await requireAuthRole(["ADMIN", "MANAGER", "PRODUCT_MANAGER"]);
  if (authResult.error) return authResult.error;

  const { id, variantId } = await params;

  const existing = await db.productVariant.findFirst({
    where: { id: variantId, productId: id },
  });
  if (!existing) return NextResponse.json({ error: "Variant not found" }, { status: 404 });

  await db.variantAttributeValue.deleteMany({ where: { variantId } });
  await db.variantImage.deleteMany({ where: { variantId } });
  await db.productVariant.delete({ where: { id: variantId } });

  await logAdminAction({
    action: "DELETE",
    entity: "PRODUCT_VARIANT",
    entityId: variantId,
    details: { productId: id, name: existing.name },
    request,
  });

  return NextResponse.json({ success: true });
}
