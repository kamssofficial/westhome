import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET() {
  try {
    const categories = await db.category.findMany({
      where: { isActive: true },
      include: {
        subcategories: {
          where: { isActive: true },
          orderBy: { position: "asc" },
          include: {
            _count: { select: { products: { where: { isActive: true, status: "ACTIVE" } } } },
          },
        },
        _count: { select: { products: { where: { isActive: true, status: "ACTIVE" } } } },
      },
      orderBy: { position: "asc" },
    });

    const transformed = categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      image: cat.image,
      position: cat.position,
      productCount: cat._count.products,
      subcategories: cat.subcategories.map((sub) => ({
        id: sub.id,
        name: sub.name,
        slug: sub.slug,
        description: sub.description,
        image: sub.image,
        position: sub.position,
        productCount: sub._count.products,
      })),
    }));

    return NextResponse.json({ categories: transformed });
  } catch (error) {
    console.error("Categories API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const slug = body.name
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-");

    const category = await db.category.create({
      data: {
        name: body.name,
        slug,
        description: body.description,
        image: body.image,
        position: body.position || 0,
      },
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    console.error("Create category error:", error);
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 }
    );
  }
}
