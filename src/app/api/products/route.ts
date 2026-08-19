import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const query = searchParams.get("q") || searchParams.get("query") || "";
    const category = searchParams.get("category") || "";
    const subcategory = searchParams.get("subcategory") || "";
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const inStock = searchParams.get("inStock");
    const onSale = searchParams.get("onSale");
    const sort = searchParams.get("sort") || "recommended";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "24");
    const featured = searchParams.get("featured") === "true";
    const newArrivals = searchParams.get("newArrivals") === "true";
    const bestsellers = searchParams.get("bestsellers") === "true";

    // Build where clause
    const where: any = {
      isActive: true,
      status: "ACTIVE",
    };

    if (query) {
      where.OR = [
        { name: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
        { shortDescription: { contains: query, mode: "insensitive" } },
        { sku: { contains: query, mode: "insensitive" } },
        { tags: { some: { tag: { contains: query, mode: "insensitive" } } } },
        { category: { name: { contains: query, mode: "insensitive" } } },
        { subcategory: { name: { contains: query, mode: "insensitive" } } },
      ];
    }

    if (category) {
      where.category = { slug: category };
    }

    if (subcategory) {
      where.subcategory = { slug: subcategory };
    }

    if (minPrice || maxPrice) {
      where.regularPrice = {};
      if (minPrice) where.regularPrice.gte = parseFloat(minPrice);
      if (maxPrice) where.regularPrice.lte = parseFloat(maxPrice);
    }

    if (inStock === "true") {
      where.stockQuantity = { gt: 0 };
    }

    if (onSale === "true") {
      where.salePrice = { not: null };
    }

    if (featured) where.isFeatured = true;
    if (newArrivals) where.isNewArrival = true;
    if (bestsellers) where.isBestseller = true;

    // Build orderBy
    let orderBy: any = { createdAt: "desc" };
    switch (sort) {
      case "newest":
        orderBy = { createdAt: "desc" };
        break;
      case "price_asc":
        orderBy = { regularPrice: "asc" };
        break;
      case "price_desc":
        orderBy = { regularPrice: "desc" };
        break;
      case "bestselling":
        orderBy = { orderItems: { _count: "desc" } };
        break;
      case "rating":
        orderBy = { reviews: { _count: "desc" } };
        break;
      case "recommended":
      default:
        orderBy = [
          { isFeatured: "desc" },
          { isBestseller: "desc" },
          { createdAt: "desc" },
        ];
        break;
    }

    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      db.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          subcategory: { select: { id: true, name: true, slug: true } },
          images: { orderBy: [{ isPrimary: "desc" }, { position: "asc" }] },
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
          reviews: { where: { status: "APPROVED" }, select: { rating: true } },
          tags: true,
        },
        orderBy,
        skip,
        take: limit,
      }),
      db.product.count({ where }),
    ]);

    // Transform products to include computed fields
    const transformedProducts = products.map((product) => ({
      ...product,
      regularPrice: Number(product.regularPrice),
      salePrice: product.salePrice ? Number(product.salePrice) : null,
      promotionalPrice: product.promotionalPrice ? Number(product.promotionalPrice) : null,
      rating:
        product.reviews.length > 0
          ? product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length
          : null,
      reviewCount: product.reviews.length,
      tags: product.tags?.map((t: any) => t.tag) || [],
      variants: product.variants.map((v) => ({
        ...v,
        price: Number(v.price),
        salePrice: v.salePrice ? Number(v.salePrice) : null,
        attributes: v.attributes.map((a) => ({
          attributeId: a.variantAttributeId,
          attributeName: a.variantAttribute.name,
          value: a.value,
          colorCode: a.colorCode,
        })),
      })),
    }));

    return NextResponse.json({
      products: transformedProducts,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Products API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Only admin can create products - check auth in production
    const body = await request.json();

    const slug = body.name
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const product = await db.product.create({
      data: {
        name: body.name,
        slug,
        sku: body.sku,
        description: body.description,
        shortDescription: body.shortDescription,
        regularPrice: body.regularPrice,
        salePrice: body.salePrice,
        costPrice: body.costPrice,
        stockQuantity: body.stockQuantity || 0,
        lowStockThreshold: body.lowStockThreshold || 5,
        trackInventory: body.trackInventory ?? true,
        allowBackorder: body.allowBackorder ?? false,
        allowCustomSize: body.allowCustomSize ?? false,
        customSizeUnit: body.customSizeUnit,
        customSizeMinWidth: body.customSizeMinWidth,
        customSizeMinLength: body.customSizeMinLength,
        customSizeMaxWidth: body.customSizeMaxWidth,
        customSizeMaxLength: body.customSizeMaxLength,
        customSizePricingMethod: body.customSizePricingMethod,
        customSizeRequiresApproval: body.customSizeRequiresApproval ?? false,
        purchaseMethod: body.purchaseMethod || "BOTH",
        categoryId: body.categoryId,
        subcategoryId: body.subcategoryId,
        isFeatured: body.isFeatured ?? false,
        isBestseller: body.isBestseller ?? false,
        isNewArrival: body.isNewArrival ?? false,
        status: body.status || "DRAFT",
        seoTitle: body.seoTitle,
        seoDescription: body.seoDescription,
        metaKeywords: body.metaKeywords,
      },
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    console.error("Create product error:", error);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}
