import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import db from "@/lib/db";
import { requireAuthRole } from "@/lib/apiAuth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuthRole(["ADMIN", "MANAGER", "CONTENT_MANAGER"]);
  if (authResult.error) return authResult.error;

  try {
    const { id } = await params;
    const body = await request.json();

    // Verify category exists
    const category = await db.category.findUnique({ where: { id } });
    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    // Count existing images for position
    const imageCount = await db.categoryImage.count({ where: { categoryId: id } });

    // If this is the first image or isPrimary is true, unset other primaries
    if (body.isPrimary || imageCount === 0) {
      await db.categoryImage.updateMany({
        where: { categoryId: id },
        data: { isPrimary: false },
      });
    }

    const image = await db.categoryImage.create({
      data: {
        categoryId: id,
        url: body.url,
        alt: body.alt || null,
        position: body.position ?? imageCount,
        isPrimary: body.isPrimary ?? imageCount === 0,
      },
    });

    // Also update the category's legacy image field if this is primary
    if (image.isPrimary) {
      await db.category.update({
        where: { id },
        data: { image: image.url },
      });
    }

    revalidatePath("/");
    revalidatePath("/shop");

    return NextResponse.json({ image }, { status: 201 });
  } catch (error) {
    console.error("Add category image error:", error);
    return NextResponse.json({ error: "Failed to add image" }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const images = await db.categoryImage.findMany({
      where: { categoryId: id },
      orderBy: { position: "asc" },
    });
    return NextResponse.json({ images });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch images" }, { status: 500 });
  }
}
