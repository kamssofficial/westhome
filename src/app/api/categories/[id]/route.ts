import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAuthRole } from "@/lib/apiAuth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuthRole(["ADMIN", "MANAGER", "CONTENT_MANAGER"]);
  if (authResult.error) return authResult.error;

  try {
    const { id } = await params;
    const body = await request.json();

    const category = await db.category.update({
      where: { id },
      data: {
        name: body.name,
        description: body.description,
        image: body.image,
        isActive: body.isActive,
        position: body.position,
      },
    });

    return NextResponse.json({ category });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuthRole(["ADMIN", "MANAGER"]);
  if (authResult.error) return authResult.error;

  try {
    const { id } = await params;

    // Check for attached products and subcategories before deleting
    const productCount = await db.product.count({
      where: { categoryId: id, isActive: true },
    });

    const subcategoryCount = await db.subcategory.count({
      where: { categoryId: id },
    });

    if (productCount > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete category with active products",
          productCount,
          subcategoryCount,
          hasProducts: true,
        },
        { status: 409 }
      );
    }

    await db.category.delete({ where: { id } });
    return NextResponse.json({ message: "Category deleted" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
  }
}
