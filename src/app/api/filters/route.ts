import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categorySlug = searchParams.get("category") || "";
    const subcategorySlug = searchParams.get("subcategory") || "";

    // Build base where clause for product filtering
    const where: any = { isActive: true, status: "ACTIVE" };
    if (categorySlug) where.category = { slug: categorySlug };
    if (subcategorySlug) where.subcategory = { slug: subcategorySlug };

    // Fetch subcategory counts for the Type filter (only if category is provided)
    let subcategoryCounts: { name: string; slug: string; count: number }[] = [];
    if (categorySlug) {
      const cat = await db.category.findUnique({
        where: { slug: categorySlug },
        include: {
          subcategories: {
            where: { isActive: true },
            orderBy: { position: "asc" },
            include: {
              _count: {
                select: { products: { where: { isActive: true, status: "ACTIVE" } } },
              },
            },
          },
        },
      });
      if (cat) {
        subcategoryCounts = cat.subcategories
          .map((sub: any) => ({
            name: sub.name,
            slug: sub.slug,
            count: sub._count.products,
          }))
          .filter((s: any) => s.count > 0);
      }
    }

    // Use parallel efficient queries to get available filter values
    const [
      materials,
      colors,
      styles,
      patterns,
      shapes,
      finishes,
      lengthValues,
      frameSizeValues,
      priceAgg,
      stockCheck,
      statusCheck,
      totalProducts,
    ] = await Promise.all([
      db.product.findMany({
        where,
        select: { material: true },
        distinct: ["material"],
      }),
      db.product.findMany({
        where,
        select: { color: true },
        distinct: ["color"],
      }),
      db.product.findMany({
        where,
        select: { style: true },
        distinct: ["style"],
      }),
      db.product.findMany({
        where,
        select: { pattern: true },
        distinct: ["pattern"],
      }),
      db.product.findMany({
        where,
        select: { shape: true },
        distinct: ["shape"],
      }),
      db.product.findMany({
        where,
        select: { finish: true },
        distinct: ["finish"],
      }),
      db.product.findMany({
        where: { ...where, length: { not: null } },
        select: { length: true },
        distinct: ["length"],
        orderBy: { length: "asc" },
      }),
      db.product.findMany({
        where: { ...where, frameSizeWidth: { not: null }, frameSizeHeight: { not: null } },
        select: { frameSizeWidth: true, frameSizeHeight: true },
        distinct: ["frameSizeWidth", "frameSizeHeight"],
        orderBy: [{ frameSizeWidth: "asc" }, { frameSizeHeight: "asc" }],
      }),
      db.product.aggregate({
        where,
        _min: { regularPrice: true, salePrice: true },
        _max: { regularPrice: true, salePrice: true },
      }),
      db.product.findMany({
        where,
        select: { stockQuantity: true },
        take: 1,
      }),
      db.product.findMany({
        where,
        select: {
          isFeatured: true,
          isNewArrival: true,
          salePrice: true,
          isBestseller: true,
        },
        take: 1,
      }),
      db.product.count({ where }),
    ]);

    // Extract unique non-null values
    const extract = (arr: any[], key: string) =>
      [...new Set(arr.map((item: any) => item[key]).filter(Boolean))].sort() as string[];

    // Price range
    const minPrice = Number(
      priceAgg._min.salePrice ?? priceAgg._min.regularPrice ?? 0
    );
    const maxPrice = Number(
      priceAgg._max.salePrice ?? priceAgg._max.regularPrice ?? 10000
    );

    return NextResponse.json({
      subcategories: subcategoryCounts,
      materials: extract(materials, "material"),
      colors: extract(colors, "color"),
      styles: extract(styles, "style"),
      patterns: extract(patterns, "pattern"),
      shapes: extract(shapes, "shape"),
      finishes: extract(finishes, "finish"),
      dimensions: {
        lengths: lengthValues.map((l: any) => Number(l.length)),
      },
      frameSizes: frameSizeValues
        .map((f: any) => ({ width: Number(f.frameSizeWidth), height: Number(f.frameSizeHeight) }))
        .filter((f) => f.width > 0 && f.height > 0)
        .sort((a, b) => a.width - b.width || a.height - b.height)
        .map((f) => ({ w: f.width, h: f.height, label: f.width + " \u00d7 " + f.height + " cm" })),
      priceRange: { min: minPrice, max: maxPrice },
      availability: {
        inStock:
          stockCheck.length > 0 && stockCheck.some((p) => p.stockQuantity > 0),
        outOfStock:
          stockCheck.length > 0 &&
          stockCheck.some((p) => p.stockQuantity <= 0),
      },
      productStatus: {
        featured: statusCheck.some((p) => p.isFeatured),
        newArrival: statusCheck.some((p) => p.isNewArrival),
        onSale: statusCheck.some((p) => p.salePrice !== null),
        bestseller: statusCheck.some((p) => p.isBestseller),
      },
      totalProducts,
    });
  } catch (error) {
    console.error("Filters API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch filters" },
      { status: 500 }
    );
  }
}
