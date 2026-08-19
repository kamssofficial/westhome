import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const product = await db.product.findUnique({
      where: { slug },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        subcategory: { select: { id: true, name: true, slug: true } },
        images: { orderBy: [{ isPrimary: "desc" }, { position: "asc" }] },
        videos: { orderBy: { position: "asc" } },
        variants: {
          where: { isActive: true },
          orderBy: { position: "asc" },
          include: {
            images: { orderBy: { position: "asc" } },
            attributes: {
              include: { variantAttribute: true },
            },
          },
        },
        variantAttributes: {
          orderBy: { position: "asc" },
        },
        reviews: {
          where: { status: "APPROVED" },
          include: { user: { select: { name: true, image: true } } },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        tags: true,
      },
    });

    if (!product || !product.isActive) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // Compute average rating
    const reviews = product.reviews;
    const avgRating =
      reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : null;

    const transformedProduct = {
      ...product,
      regularPrice: Number(product.regularPrice),
      salePrice: product.salePrice ? Number(product.salePrice) : null,
      promotionalPrice: product.promotionalPrice ? Number(product.promotionalPrice) : null,
      costPrice: product.costPrice ? Number(product.costPrice) : null,
      rating: avgRating,
      reviewCount: reviews.length,
      tags: product.tags?.map((t) => t.tag) || [],
      variants: product.variants.map((v) => ({
        ...v,
        price: Number(v.price),
        salePrice: v.salePrice ? Number(v.salePrice) : null,
        costPrice: v.costPrice ? Number(v.costPrice) : null,
        attributes: v.attributes.map((a) => ({
          attributeId: a.variantAttributeId,
          attributeName: a.variantAttribute.name,
          value: a.value,
          colorCode: a.colorCode,
        })),
      })),
      reviews: reviews.map((r) => ({
        ...r,
        user: r.user,
      })),
    };

    return NextResponse.json({ product: transformedProduct });
  } catch (error) {
    console.error("Product API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await request.json();

    const product = await db.product.update({
      where: { slug },
      data: body,
    });

    return NextResponse.json({ product });
  } catch (error) {
    console.error("Update product error:", error);
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    await db.product.delete({ where: { slug } });

    return NextResponse.json({ message: "Product deleted" });
  } catch (error) {
    console.error("Delete product error:", error);
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 }
    );
  }
}
