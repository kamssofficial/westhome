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

    // Use parallel efficient queries instead of loading all products
    const [materials, colors, styles, patterns, shapes, finishes, priceAgg, inStockCount, outOfStockCount, featuredCount, newArrivalCount, onSaleCount, hasRatings, totalProducts] = await Promise.all([
      db.product.findMany({ where, select: { material: true }, distinct: ["material"] }),
      db.product.findMany({ where, select: { color: true }, distinct: ["color"] }),
      db.product.findMany({ where, select: { style: true }, distinct: ["style"] }),
      db.product.findMany({ where, select: { pattern: true }, distinct: ["pattern"] }),
      db.product.findMany({ where, select: { shape: true }, distinct: ["shape"] }),
      db.product.findMany({ where, select: { finish: true }, distinct: ["finish"] }),
      db.product.aggregate({ where, _min: { regularPrice: true, salePrice: true }, _max: { regularPrice: true, salePrice: true } }),
      db.product.count({ where: { ...where, stockQuantity: { gt: 0 } } }),
      db.product.count({ where: { ...where, stockQuantity: { lte: 0 } } }),
      db.product.count({ where: { ...where, isFeatured: true } }),
      db.product.count({ where: { ...where, isNewArrival: true } }),
      db.product.count({ where: { ...where, salePrice: { not: null } } }),
      db.review.count({ where: { product: where, status: "APPROVED" } }),
      db.product.count({ where }),
    ]);

    // Extract unique values
    const extract = (arr: any[], key: string) =>
      [...new Set(arr.map((item: any) => item[key]).filter(Boolean))].sort() as string[];

    // Price range
    const minPrice = Number(priceAgg._min.salePrice ?? priceAgg._min.regularPrice ?? 0);
    const maxPrice = Number(priceAgg._max.salePrice ?? priceAgg._max.regularPrice ?? 10000);

    return NextResponse.json({
      materials: extract(materials, "material"),
      colors: extract(colors, "color"),
      styles: extract(styles, "style"),
      patterns: extract(patterns, "pattern"),
      shapes: extract(shapes, "shape"),
      finishes: extract(finishes, "finish"),
      dimensions: { widths: [], heights: [], lengths: [], diameters: [] },
      priceRange: { min: minPrice, max: maxPrice },
      availability: { inStock: inStockCount > 0, outOfStock: outOfStockCount > 0 },
      productStatus: {
        featured: featuredCount > 0,
        newArrival: newArrivalCount > 0,
        onSale: onSaleCount > 0,
      },
      hasRatings: hasRatings > 0,
      totalProducts,
    });
  } catch (error) {
    console.error("Filters API error:", error);
    return NextResponse.json({ error: "Failed to fetch filters" }, { status: 500 });
  }
}
