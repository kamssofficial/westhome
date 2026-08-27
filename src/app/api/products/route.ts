import { notifyProductUpdated } from "@/lib/notifications";
import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAuthRole } from "@/lib/apiAuth";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || searchParams.get("query") || "";
    const category = searchParams.get("category") || "";
    const subcategory = searchParams.get("subcategory") || "";
    const sort = searchParams.get("sort") || "recommended";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "24");
    const featured = searchParams.get("featured") === "true";
    const newArrivals = searchParams.get("newArrivals") === "true";
    const bestsellers = searchParams.get("bestsellers") === "true";

    // Admin/staff can see all statuses; storefront only ACTIVE
    const statusFilter = searchParams.get("status");
    const isAdminView = !!(statusFilter || searchParams.get("all"));
    const where: any = isAdminView ? {} : { isActive: true, status: "ACTIVE" };
    if (statusFilter) where.status = statusFilter;
    if (query) { where.OR = [{ name: { contains: query, mode: "insensitive" } }, { description: { contains: query, mode: "insensitive" } }, { shortDescription: { contains: query, mode: "insensitive" } }, { material: { contains: query, mode: "insensitive" } }]; }
    if (category) { where.category = { slug: category }; }
    if (subcategory) { where.subcategory = { slug: subcategory }; }
    if (featured) where.isFeatured = true;
    if (newArrivals) where.isNewArrival = true;
    if (bestsellers) where.isBestseller = true;
    // Physical attribute filters
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const material = searchParams.get("material");
    const color = searchParams.get("color");
    const inStock = searchParams.get("inStock");
    const onSale = searchParams.get("onSale");
    if (minPrice) where.regularPrice = { ...where.regularPrice, gte: parseFloat(minPrice) };
    if (maxPrice) where.regularPrice = { ...where.regularPrice, lte: parseFloat(maxPrice) };
    if (material) where.material = { contains: material, mode: "insensitive" };
    if (color) where.color = { contains: color, mode: "insensitive" };
    if (inStock === "true") where.stockQuantity = { gt: 0 };
    if (onSale === "true") where.salePrice = { not: null };
    
    // Extended filters
    const style = searchParams.get("style");
    const pattern = searchParams.get("pattern");
    const shape = searchParams.get("shape");
    const finish = searchParams.get("finish");
    const isNewArrival = searchParams.get("isNewArrival") === "true";
    const isFeatured = searchParams.get("isFeatured") === "true";
    const minWidth = searchParams.get("minWidth");
    const maxWidth = searchParams.get("maxWidth");
    const minHeight = searchParams.get("minHeight");
    const maxHeight = searchParams.get("maxHeight");
    const minLength = searchParams.get("minLength");
    const maxLength = searchParams.get("maxLength");
    const minDiameter = searchParams.get("minDiameter");
    const maxDiameter = searchParams.get("maxDiameter");
    const minRating = searchParams.get("minRating");
    
    if (style) where.style = { contains: style, mode: "insensitive" };
    if (pattern) where.pattern = { contains: pattern, mode: "insensitive" };
    if (shape) where.shape = { contains: shape, mode: "insensitive" };
    if (finish) where.finish = { contains: finish, mode: "insensitive" };
    if (isNewArrival) where.isNewArrival = true;
    if (isFeatured) where.isFeatured = true;
    if (minWidth) where.width = { ...where.width, gte: parseFloat(minWidth) };
    if (maxWidth) where.width = { ...where.width, lte: parseFloat(maxWidth) };
    if (minHeight) where.height = { ...where.height, gte: parseFloat(minHeight) };
    if (maxHeight) where.height = { ...where.height, lte: parseFloat(maxHeight) };
    if (minLength) where.length = { ...where.length, gte: parseFloat(minLength) };
    if (maxLength) where.length = { ...where.length, lte: parseFloat(maxLength) };
    if (minDiameter) where.diameter = { ...where.diameter, gte: parseFloat(minDiameter) };
    if (maxDiameter) where.diameter = { ...where.diameter, lte: parseFloat(maxDiameter) };

    let orderBy: any = { createdAt: "desc" };
    switch (sort) {
      case "price_asc": orderBy = { regularPrice: "asc" }; break;
      case "name_asc": orderBy = { name: "asc" }; break;
      case "name_desc": orderBy = { name: "desc" }; break;
      case "price_desc": orderBy = { regularPrice: "desc" }; break;
      case "bestselling": orderBy = { orderItems: { _count: "desc" } }; break;
      default: orderBy = [{ isFeatured: "desc" }, { createdAt: "desc" }]; break;
    }

    // Rating filter - applied after fetch since it's computed
    const minRatingNum = minRating ? parseFloat(minRating) : 0;
    
    const [products, total] = await Promise.all([
      db.product.findMany({
        where, include: { category: { select: { id: true, name: true, slug: true } }, subcategory: { select: { id: true, name: true, slug: true } }, images: { orderBy: [{ isPrimary: "desc" }, { position: "asc" }] }, variants: { where: { isActive: true }, orderBy: { position: "asc" }, include: { images: { orderBy: { position: "asc" } }, attributes: { include: { variantAttribute: true } } } }, reviews: { where: { status: "APPROVED" }, select: { rating: true } }, tags: true },
        orderBy, skip: (page - 1) * limit, take: limit,
      }),
      db.product.count({ where }),
    ]);
    const transformed = products.map((product) => ({
      ...product,
      regularPrice: Number(product.regularPrice),
      salePrice: product.salePrice ? Number(product.salePrice) : null,
      rating: product.reviews.length > 0 ? product.reviews.reduce((s, r) => s + r.rating, 0) / product.reviews.length : null,
      reviewCount: product.reviews.length,
      tags: product.tags?.map((t: any) => t.tag) || [],
      variants: product.variants.map((v) => ({ ...v, price: Number(v.price), salePrice: v.salePrice ? Number(v.salePrice) : null, attributes: v.attributes.map((a) => ({ attributeId: a.variantAttributeId, attributeName: a.variantAttribute.name, value: a.value, colorCode: a.colorCode })) })),
      // Physical attributes
      height: product.height ? Number(product.height) : null,
      width: product.width ? Number(product.width) : null,
      length: product.length ? Number(product.length) : null,
      depth: product.depth ? Number(product.depth) : null,
      diameter: product.diameter ? Number(product.diameter) : null,
      dimensionUnit: product.dimensionUnit,
      weight: product.weight ? Number(product.weight) : null,
      weightUnit: product.weightUnit,
      capacity: product.capacity ? Number(product.capacity) : null,
      capacityUnit: product.capacityUnit,
      material: product.material,
      color: product.color,
      finish: product.finish,
      shape: product.shape,
      pattern: product.pattern,
      style: product.style,
      mountingType: product.mountingType,
      usageLocation: product.usageLocation,
      careInstructions: product.careInstructions,
      warranty: product.warranty,
      packagingType: product.packagingType,
      packagingDimensions: product.packagingDimensions,
      packagingWeight: product.packagingWeight ? Number(product.packagingWeight) : null,
      includedItems: product.includedItems,
      allowCustomSize: product.allowCustomSize,
      customSizeUnit: product.customSizeUnit,
      customSizeMinWidth: product.customSizeMinWidth ? Number(product.customSizeMinWidth) : null,
      customSizeMinLength: product.customSizeMinLength ? Number(product.customSizeMinLength) : null,
      customSizeMinHeight: product.customSizeMinHeight ? Number(product.customSizeMinHeight) : null,
      customSizeMaxWidth: product.customSizeMaxWidth ? Number(product.customSizeMaxWidth) : null,
      customSizeMaxLength: product.customSizeMaxLength ? Number(product.customSizeMaxLength) : null,
      customSizeMaxHeight: product.customSizeMaxHeight ? Number(product.customSizeMaxHeight) : null,
      customSizePricingMethod: product.customSizePricingMethod,
      customSizeRequiresApproval: product.customSizeRequiresApproval,
    }));
    return NextResponse.json({ products: transformed, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    return NextResponse.json({ products: [], total: 0, page: 1, totalPages: 0 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuthRole(["ADMIN", "MANAGER", "PRODUCT_MANAGER", "CONTENT_MANAGER"]);
  if (authResult.error) return authResult.error;

  try {
    const body = await request.json();
    
    // F-01: Validate pricing
    if (body.regularPrice !== undefined && Number(body.regularPrice) <= 0) {
      return NextResponse.json({ error: "Regular price must be greater than zero" }, { status: 400 });
    }
    if (body.salePrice !== undefined && body.salePrice !== null && Number(body.salePrice) >= Number(body.regularPrice)) {
      return NextResponse.json({ error: "Sale price must be less than regular price" }, { status: 400 });
    }
    
    const slug = body.name.toLowerCase().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
    const product = await db.product.create({
      data: {
        name: body.name,
        slug,
        sku: body.sku,
        description: body.description,
        shortDescription: body.shortDescription,
        regularPrice: body.regularPrice,
        salePrice: body.salePrice,
        stockQuantity: body.stockQuantity || 0,
        lowStockThreshold: body.lowStockThreshold || 5,
        trackInventory: body.trackInventory ?? true,
        allowBackorder: body.allowBackorder ?? false,
        allowCustomSize: body.allowCustomSize ?? false,
        customSizeUnit: body.customSizeUnit,
        customSizeMinWidth: body.customSizeMinWidth,
        customSizeMinLength: body.customSizeMinLength,
        customSizeMinHeight: body.customSizeMinHeight,
        customSizeMaxWidth: body.customSizeMaxWidth,
        customSizeMaxLength: body.customSizeMaxLength,
        customSizeMaxHeight: body.customSizeMaxHeight,
        customSizePricingMethod: body.customSizePricingMethod,
        customSizeRequiresApproval: body.customSizeRequiresApproval,
        purchaseMethod: body.purchaseMethod || "BOTH",
        categoryId: body.categoryId,
        subcategoryId: body.subcategoryId || null,
        isFeatured: body.isFeatured ?? false,
        isBestseller: body.isBestseller ?? false,
        isNewArrival: body.isNewArrival ?? false,
        status: body.status || "DRAFT",
        // Physical attributes
        height: body.height,
        width: body.width,
        length: body.length,
        depth: body.depth,
        diameter: body.diameter,
        dimensionUnit: body.dimensionUnit,
        weight: body.weight,
        weightUnit: body.weightUnit,
        capacity: body.capacity,
        capacityUnit: body.capacityUnit,
        material: body.material,
        color: body.color,
        finish: body.finish,
        shape: body.shape,
        pattern: body.pattern,
        style: body.style,
        mountingType: body.mountingType,
        usageLocation: body.usageLocation,
        careInstructions: body.careInstructions,
        warranty: body.warranty,
        packagingType: body.packagingType,
        packagingDimensions: body.packagingDimensions,
        packagingWeight: body.packagingWeight,
        includedItems: body.includedItems,
      },
    });
    // Log the action
    await db.auditLog.create({
      data: {
        action: "CREATE",
        entity: "PRODUCT",
        entityId: product.id,
        details: { name: product.name, slug: product.slug },
      },
    });
    notifyProductUpdated(product.name, "added").catch(() => {});

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}
