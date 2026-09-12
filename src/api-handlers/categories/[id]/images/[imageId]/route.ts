import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAuthRole } from "@/lib/apiAuth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  const authResult = await requireAuthRole(["ADMIN", "MANAGER", "CONTENT_MANAGER"]);
  if (authResult.error) return authResult.error;

  try {
    const { id, imageId } = await params;
    const body = await request.json();

    const image = await db.categoryImage.findFirst({
      where: { id: imageId, categoryId: id },
    });

    if (!image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    // If setting as primary, unset others
    if (body.isPrimary) {
      await db.categoryImage.updateMany({
        where: { categoryId: id },
        data: { isPrimary: false },
      });
    }
    // Update legacy image field when this is primary or URL changed
    const newUrl = body.url ?? image.url;
    if (body.isPrimary || (image.isPrimary && body.url !== undefined)) {
      await db.category.update({
        where: { id },
        data: { image: newUrl },
      });
    }

    const updated = await db.categoryImage.update({
      where: { id: imageId },
      data: {
        ...(body.url !== undefined && { url: body.url }),
        ...(body.alt !== undefined && { alt: body.alt }),
        ...(body.position !== undefined && { position: body.position }),
        ...(body.isPrimary !== undefined && { isPrimary: body.isPrimary }),
      },
    });

    return NextResponse.json({ image: updated });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update image" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  const authResult = await requireAuthRole(["ADMIN", "MANAGER", "CONTENT_MANAGER"]);
  if (authResult.error) return authResult.error;

  try {
    const { id, imageId } = await params;

    const image = await db.categoryImage.findFirst({
      where: { id: imageId, categoryId: id },
    });

    if (!image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    const wasPrimary = image.isPrimary;

    await db.categoryImage.delete({ where: { id: imageId } });

    // If deleted image was primary, promote next image
    if (wasPrimary) {
      const nextImage = await db.categoryImage.findFirst({
        where: { categoryId: id },
        orderBy: { position: "asc" },
      });

      if (nextImage) {
        await db.categoryImage.update({
          where: { id: nextImage.id },
          data: { isPrimary: true },
        });
        await db.category.update({
          where: { id },
          data: { image: nextImage.url },
        });
      } else {
        await db.category.update({
          where: { id },
          data: { image: null },
        });
      }
    }

    return NextResponse.json({ message: "Image deleted" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete image" }, { status: 500 });
  }
}
