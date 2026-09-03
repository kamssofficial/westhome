import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { CATEGORIES } from "@/lib/data";
import { requireAuthRole } from "@/lib/apiAuth";

export async function GET() {
  try {
    const categories = await db.category.findMany({
      where: { isActive: true },
      include: {
        subcategories: {
          where: { isActive: true },
          orderBy: { position: "asc" },
          include: { _count: { select: { products: { where: { isActive: true, status: "ACTIVE" } } } } },
        },
        images: { orderBy: { position: "asc" } },
        _count: { select: { products: { where: { isActive: true, status: "ACTIVE" } } } },
      },
      orderBy: { position: "asc" },
    });

    const transformed = categories.map((cat: any) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      image: cat.image,
      position: cat.position,
      productCount: cat._count.products,
      images: cat.images || [],
      subcategories: cat.subcategories.map((sub: any) => ({
        id: sub.id,
        name: sub.name,
        slug: sub.slug,
        description: sub.description,
        image: sub.image,
        position: sub.position,
        productCount: sub._count.products,
      })),
    }));

    return NextResponse.json({ categories: transformed }, { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" } });
  } catch (error) {
    console.error("Categories API error:", error);
    return NextResponse.json({ categories: CATEGORIES });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuthRole(["ADMIN", "MANAGER", "CONTENT_MANAGER"]);
  if (authResult.error) return authResult.error;

  try {
    const body = await request.json();
    const slug = body.name.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-|-$/g, "");
    const category = await db.category.create({
      data: { name: body.name, slug, description: body.description, image: body.image, position: body.position || 0 },
    });
    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}
