import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categorySlug = searchParams.get("category") || "";
    const subcategorySlug = searchParams.get("subcategory") || "";

    // Build base where clause
    const where: any = { isActive: true, status: "ACTIVE" };
    if (categorySlug) where.category = { slug: categorySlug };
    if (subcategorySlug) where.subcategory = { slug: subcategorySlug };

    // Get all products matching current category
    const products = await db.product.findMany({
      where,
      select: {
        material: true,
        color: true,
        style: true,
        pattern: true,
        shape: true,
        finish: true,
        width: true,
        height: true,
        length: true,
        diameter: true,
        regularPrice: true,
        salePrice: true,
        stockQuantity: true,
        isFeatured: true,
        isNewArrival: true,
        reviews: { where: { status: "APPROVED" }, select: { rating: true } },
      },
    });

    // Extract unique values
    const materials = [...new Set(products.map(p => p.material).filter(Boolean))] as string[];
    const colors = [...new Set(products.map(p => p.color).filter(Boolean))] as string[];
    const styles = [...new Set(products.map(p => p.style).filter(Boolean))] as string[];
    const patterns = [...new Set(products.map(p => p.pattern).filter(Boolean))] as string[];
    const shapes = [...new Set(products.map(p => p.shape).filter(Boolean))] as string[];
    const finishes = [...new Set(products.map(p => p.finish).filter(Boolean))] as string[];

    // Dimensions
    const widths = [...new Set(products.map(p => p.width ? Number(p.width) : null).filter(Boolean))] as number[];
    const heights = [...new Set(products.map(p => p.height ? Number(p.height) : null).filter(Boolean))] as number[];
    const lengths = [...new Set(products.map(p => p.length ? Number(p.length) : null).filter(Boolean))] as number[];
    const diameters = [...new Set(products.map(p => p.diameter ? Number(p.diameter) : null).filter(Boolean))] as number[];

    // Price range
    const prices = products.map(p => Number(p.salePrice || p.regularPrice));
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 10000;

    // Stock status
    const hasInStock = products.some(p => p.stockQuantity > 0);
    const hasOutOfStock = products.some(p => p.stockQuantity <= 0);

    // Product status
    const hasFeatured = products.some(p => p.isFeatured);
    const hasNewArrival = products.some(p => p.isNewArrival);
    const hasOnSale = products.some(p => p.salePrice !== null);

    // Rating
    const ratings = products.flatMap(p => p.reviews.map(r => r.rating));
    const hasRatings = ratings.length > 0;

    // Sort dimensions for display
    widths.sort((a, b) => a - b);
    heights.sort((a, b) => a - b);
    lengths.sort((a, b) => a - b);
    diameters.sort((a, b) => a - b);
    materials.sort();
    colors.sort();
    styles.sort();
    patterns.sort();

    return NextResponse.json({
      materials,
      colors,
      styles,
      patterns,
      shapes,
      finishes,
      dimensions: { widths, heights, lengths, diameters },
      priceRange: { min: minPrice, max: maxPrice },
      availability: { inStock: hasInStock, outOfStock: hasOutOfStock },
      productStatus: { featured: hasFeatured, newArrival: hasNewArrival, onSale: hasOnSale },
      hasRatings,
      totalProducts: products.length,
    });
  } catch (error) {
    console.error("Filters API error:", error);
    return NextResponse.json({ error: "Failed to fetch filters" }, { status: 500 });
  }
}
