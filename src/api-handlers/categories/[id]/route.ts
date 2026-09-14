import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import db from "@/lib/db";
import { requireAuthRole } from "@/lib/apiAuth";
import { logAdminAction } from "@/lib/audit";
import { deleteMedia } from "@/lib/media";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuthRole(["ADMIN", "MANAGER", "CONTENT_MANAGER"]);
  if (authResult.error) return authResult.error;

  try {
    const { id } = await params;
    const body = await request.json();
    const existingImages = body.image !== undefined
      ? await db.categoryImage.findMany({ where: { categoryId: id } })
      : [];

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

    // The category modal edits the legacy image field. Keep normalized
    // category-image records synchronized so stale gallery rows cannot
    // overwrite the newly saved image on the next category fetch.
    if (body.image !== undefined) {
      await db.categoryImage.deleteMany({ where: { categoryId: id } });
      if (body.image) {
        await db.categoryImage.create({
          data: {
            categoryId: id,
            url: body.image,
            alt: body.name || category.name,
            position: 0,
            isPrimary: true,
          },
        });
      }
      await Promise.allSettled(
        existingImages
          .filter((image) => image.url !== body.image)
          .map((image) => deleteMedia({ url: image.url }))
      );
    }

    await logAdminAction({ action: "UPDATE", entity: "CATEGORY", entityId: id, details: { name: body.name }, request });

    // Invalidate cached pages so storefront picks up the change immediately
    revalidatePath("/shop");
    revalidatePath("/search");
    revalidatePath(`/collections/${category.slug}`);

    return NextResponse.json({ category });
  } catch (error) {
    console.error("PUT category error:", error);
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 });
  }
}

export async function PATCH(
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
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.image !== undefined && { image: body.image }),
        ...(body.position !== undefined && { position: body.position }),
      },
    });

    await logAdminAction({ action: "UPDATE", entity: "CATEGORY", entityId: id, details: { name: body.name ?? category.name, isActive: body.isActive }, request });

    // Invalidate cached pages so storefront picks up the change immediately
    revalidatePath("/shop");
    revalidatePath("/search");
    revalidatePath(`/collections/${category.slug}`);

    return NextResponse.json({ category });
  } catch (error) {
    console.error("PATCH category error:", error);
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

    const deletedCategory = await db.category.findUnique({ where: { id }, select: { name: true } });
    await db.category.delete({ where: { id } });
    await logAdminAction({ action: "DELETE", entity: "CATEGORY", entityId: id, details: { name: deletedCategory?.name ?? null }, request });

    // Invalidate cached pages
    revalidatePath("/shop");
    revalidatePath("/search");
    if (deletedCategory?.name) revalidatePath(`/collections/${deletedCategory.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`);

    return NextResponse.json({ message: "Category deleted" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
  }
}
