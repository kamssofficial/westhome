import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAuthRole } from "@/lib/apiAuth";

export async function POST(request: NextRequest) {
  const authResult = await requireAuthRole(["ADMIN", "MANAGER", "PRODUCT_MANAGER", "STAFF"]);
  if (authResult.error) return authResult.error;

  const body = await request.json();
  const { action, ids } = body as { action: string; ids: string[] };
  if (!action || !ids?.length) return NextResponse.json({ error: "Missing action or ids" }, { status: 400 });

  let successCount = 0;
  let failCount = 0;

  if (action === "delete") {
    for (const id of ids) {
      const p = await db.product.findUnique({ where: { id }, include: { _count: { select: { orderItems: true } } } });
      if (!p || p._count.orderItems > 0) { failCount++; continue; }
      await db.productImage.deleteMany({ where: { productId: id } });
      await db.productTag.deleteMany({ where: { productId: id } });
      await db.wishlist.deleteMany({ where: { productId: id } });
      await db.review.deleteMany({ where: { productId: id } });
      await db.productVariant.deleteMany({ where: { productId: id } });
      await db.product.delete({ where: { id } });
      successCount++;
    }
  } else {
    const statusMap: Record<string, { status: string; isActive: boolean }> = {
      ACTIVE: { status: "ACTIVE", isActive: true },
      DRAFT: { status: "DRAFT", isActive: false },
      INACTIVE: { status: "INACTIVE", isActive: false },
      ARCHIVED: { status: "ARCHIVED", isActive: false },
    };
    const update = statusMap[action];
    if (!update) return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    const result = await db.product.updateMany({ where: { id: { in: ids } }, data: { status: update.status as any, isActive: update.isActive } });
    successCount = result.count;
  }

  return NextResponse.json({ successCount, failCount });
}
