import { notifyProductUpdated } from "@/lib/notifications";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import db from "@/lib/db";
import { requireAuthRole } from "@/lib/apiAuth";
import { logAdminAction } from "@/lib/audit";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAuthRole(["ADMIN", "MANAGER", "PRODUCT_MANAGER"]);
  if (authResult.error) return authResult.error;

  const { id } = await params;
  const body = await request.json();
  const product = await db.product.findUnique({ where: { id } });
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const updated = await db.product.update({
    where: { id },
    data: {
      status: body.status,
      isActive: body.status !== "ARCHIVED" && body.status !== "INACTIVE",
    },
  });

  await logAdminAction({
    action: "UPDATE", entity: "PRODUCT", entityId: id, details: { name: updated.name, status: updated.status }, request,
  });
  notifyProductUpdated(updated.name, "status changed to " + updated.status.toLowerCase()).catch(() => {});
  // Status changes (hide/show) must reflect on server-rendered collection/home pages immediately
  revalidatePath("/", "page");
  revalidatePath("/collections/[slug]", "page");
  revalidatePath("/collections/[slug]/[subcategory]", "page");

  return NextResponse.json({ product: updated });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAuthRole(["ADMIN"]);
  if (authResult.error) return authResult.error;

  const { id } = await params;
  const product = await db.product.findUnique({
    where: { id },
    include: { _count: { select: { orderItems: true } } },
  });
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  if (product._count.orderItems > 0) {
    return NextResponse.json({
      error: "Cannot delete",
      message: "This product has " + product._count.orderItems + " order(s). Deleting would destroy historical order data. Please archive instead.",
      orderCount: product._count.orderItems,
      canDelete: false,
    }, { status: 409 });
  }

  await db.productImage.deleteMany({ where: { productId: id } });
  await db.productTag.deleteMany({ where: { productId: id } });
  await db.wishlist.deleteMany({ where: { productId: id } });
  await db.review.deleteMany({ where: { productId: id } });
  await db.productVariant.deleteMany({ where: { productId: id } });
  await db.product.delete({ where: { id } });

  await logAdminAction({
    action: "DELETE", entity: "PRODUCT", entityId: id, details: { name: product.name }, request,
  });

  return NextResponse.json({ success: true });
}
