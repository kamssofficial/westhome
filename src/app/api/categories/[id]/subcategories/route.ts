import { NextRequest, NextResponse } from "next/server";
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

    const slug = body.name
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-");

    const subcategoryCount = await db.subcategory.count({ where: { categoryId: id } });

    const subcategory = await db.subcategory.create({
      data: {
        categoryId: id,
        name: body.name,
        slug,
        description: body.description,
        image: body.image ?? null,
        position: subcategoryCount,
      },
    });

    return NextResponse.json({ subcategory }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create subcategory" }, { status: 500 });
  }
}
