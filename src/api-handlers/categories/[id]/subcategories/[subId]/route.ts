import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import db from "@/lib/db";
import { requireAuthRole } from "@/lib/apiAuth";
import { deleteMedia } from "@/lib/media";
import { logAdminAction } from "@/lib/audit";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; subId: string }> }
) {
  const authResult = await requireAuthRole(["ADMIN", "MANAGER", "CONTENT_MANAGER"]);
  if (authResult.error) return authResult.error;

  try {
    const { id, subId } = await params;
    const body = await request.json();

    const existing = await db.subcategory.findFirst({
      where: { id: subId, categoryId: id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Subcategory not found" }, { status: 404 });
    }

    const data: { name?: string; slug?: string; description?: string | null; image?: string | null; position?: number; isActive?: boolean } = {};

    if (body.name !== undefined && body.name !== existing.name) {
      data.name = body.name;
      data.slug = body.name
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-");
    }
    if (body.description !== undefined) data.description = body.description ?? null;
    if (body.image !== undefined) data.image = body.image ?? null;
    if (body.position !== undefined) data.position = body.position;
    if (body.isActive !== undefined) data.isActive = body.isActive;

    const updated = await db.subcategory.update({ where: { id: subId }, data });

    await logAdminAction({
      action: "UPDATE",
      entity: "SUBCATEGORY",
      entityId: subId,
      details: { categoryId: id, name: updated.name },
      request,
    });

    // Invalidate cached pages
    revalidatePath("/shop");
    revalidatePath("/search");

    return NextResponse.json({ subcategory: updated });
  } catch (error) {
    console.error("PATCH subcategory error:", error);
    return NextResponse.json({ error: "Failed to update subcategory" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; subId: string }> }
) {
  const authResult = await requireAuthRole(["ADMIN", "MANAGER", "CONTENT_MANAGER"]);
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
    if (subcategory.image) {
      await deleteMedia({ url: subcategory.image });
    }

    await logAdminAction({
      action: "DELETE",
      entity: "SUBCATEGORY",
      entityId: subId,
      details: { categoryId: id, name: subcategory.name },
      request,
    });

    // Invalidate cached pages
    revalidatePath("/shop");
    revalidatePath("/search");

    return NextResponse.json({ message: "Subcategory deleted" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete subcategory" }, { status: 500 });
  }
}
