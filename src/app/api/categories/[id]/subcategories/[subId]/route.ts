import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAuthRole } from "@/lib/apiAuth";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; subId: string }> }
) {
  const authResult = await requireAuthRole(["ADMIN", "MANAGER", "CONTENT_MANAGER", "STAFF"]);
  if (authResult.error) return authResult.error;

  try {
    const { id, subId } = await params;

    // Verify the subcategory belongs to this category
    const subcategory = await db.subcategory.findFirst({
      where: { id: subId, categoryId: id },
    });

    if (!subcategory) {
      return NextResponse.json({ error: "Subcategory not found" }, { status: 404 });
    }

    // Check for attached products
    const productCount = await db.product.count({
      where: { subcategoryId: subId, isActive: true },
    });

    if (productCount > 0) {
      return NextResponse.json(
        { error: "Cannot delete subcategory with active products", productCount },
        { status: 409 }
      );
    }

    await db.subcategory.delete({ where: { id: subId } });
    return NextResponse.json({ message: "Subcategory deleted" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete subcategory" }, { status: 500 });
  }
}
