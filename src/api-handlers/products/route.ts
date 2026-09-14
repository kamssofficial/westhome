import { notifyProductUpdated } from "@/lib/notifications";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import db from "@/lib/db";
import { requireAuthRole } from "@/lib/apiAuth";
import { auth } from "@/lib/auth";
import { logAdminAction } from "@/lib/audit";

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
    const lite = searchParams.get("lite") === "true";
    const idsParam = searchParams.get("ids");

    // Admin/staff can see all statuses; storefront only ACTIVE
    const statusFilter = searchParams.get("status");
    const requestedAll = searchParams.get("all");
    let isAdminView = !!(statusFilter || requestedAll);
    if (isAdminView) {
      // Verify the user is actually staff/admin
      const session = await auth();
      const role = (session?.user as any)?.role;
      if (!role || role === "CUSTOMER") {
        isAdminView = false; // Fall back to storefront filter
      }
    }
    const where: any = isAdminView ? {} : { isActive: true, status: "ACTIVE" };
    if (statusFilter) where.status = statusFilter;
    if (query) { where.OR = [{ name: { contains: query, mode: "insensitive" } }, { description: { contains: query, mode: "insensitive" } }, { shortDescription: { contains: query, mode: "insensitive" } }, { material: { contains: query, mode: "insensitive" } }]; }
    if (category) { where.category = { slug: category }; }
    if (subcategory) { where.subcategory = { slug: subcategory }; }
    if (featured) where.isFeatured = true;
    if (newArrivals) where.isNewArrival = true;
    if (bestsellers) where.isBestseller = true;
    if (idsParam) { where.id = { in: idsParam.split(",") }; }
    // Physical attribute filters
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const material = searchParams.get("material");
    const color = searchParams.get("color");
    const inStock = searchParams.get("inStock");
    const onSale = searchParams.get("onSale");
    // Price filter: use effective price (salePrice when > 0, else regularPrice)
    // 83 products have regularPrice=0 with salePrice>0 — filtering on regularPrice alone excludes them
    if (minPrice || maxPrice) {
      const priceAND: any[] = [];
      if (minPrice) {
        const minVal = parseFloat(minPrice);
        priceAND.push({
          OR: [
            { salePrice: { not: null, gt: 0, gte: minVal } },
            { AND: [{ OR: [{ salePrice: null }, { salePrice: 0 }] }, { regularPrice: { gte: minVal } }] },
          ],
        });
      }
      if (maxPrice) {
        const maxVal = parseFloat(maxPrice);
        priceAND.push({
          OR: [
            { salePrice: { not: null, gt: 0, lte: maxVal } },
            { AND: [{ OR: [{ salePrice: null }, { salePrice: 0 }] }, { regularPrice: { lte: maxVal } }] },
          ],
        });
      }
      where.AND = [...(where.AND || []), ...priceAND];
    }
    if (material) where.material = { contains: material, mode: "insensitive" };
    if (color) where.color = { contains: color, mode: "insensitive" };
    // Palette filter: match products tagged with color:<Name> (see scripts/add-palette-tags.mjs)
    const colorTag = searchParams.get("colorTag");
    if (colorTag) {
      where.tags = { some: { tag: { equals: `color:${colorTag}`, mode: "insensitive" } } };
    }
    // Stock filter: also show products that don't track inventory (always in stock)
    if (inStock === "true") {
      where.AND = [...(where.AND || []), { OR: [{ stockQuantity: { gt: 0 } }, { trackInventory: false }] }];
    }
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
      case "price_asc": orderBy = [{ salePrice: "asc" }, { regularPrice: "asc" }]; break;
      case "name_asc": orderBy = { name: "asc" }; break;
      case "name_desc": orderBy = { name: "desc" }; break;
      case "price_desc": orderBy = [{ salePrice: "desc" }, { regularPrice: "desc" }]; break;
      case "bestselling": orderBy = { orderItems: { _count: "desc" } }; break;
      default: orderBy = [{ isFeatured: "desc" }, { createdAt: "desc" }]; break;
    }

    // Rating filter - applied after fetch since it's computed
    const minRatingNum = minRating ? parseFloat(minRating) : 0;
    
    const [products, total] = await Promise.all([
      db.product.findMany({
        where,
        include: lite
          ? {
              category: { select: { id: true, name: true, slug: true } },
              subcategory: { select: { id: true, name: true, slug: true } },
              images: { orderBy: [{ isPrimary: "desc" }, { position: "asc" }], take: 1 },
              variants: { where: { isActive: true }, orderBy: { position: "asc" }, take: 1, include: { images: { orderBy: { position: "asc" }, take: 1 } } },
              reviews: { where: { status: "APPROVED" }, select: { rating: true } },
              tags: { where: { tag: { startsWith: "color:" } } },
            }
          : {
              category: { select: { id: true, name: true, slug: true } },
              subcategory: { select: { id: true, name: true, slug: true } },
              images: { orderBy: [{ isPrimary: "desc" }, { position: "asc" }] },
              variants: { where: { isActive: true }, orderBy: { position: "asc" }, include: { images: { orderBy: { position: "asc" } }, attributes: { include: { variantAttribute: true } } } },
              reviews: { where: { status: "APPROVED" }, select: { rating: true } },
              tags: true,
            },
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
      tags: (product as any).tags?.map((t: any) => t.tag) || [],
      palette: (product as any).tags?.filter((t: any) => t.tag?.startsWith("color:")).map((t: any) => t.tag.slice(6)) || [],
      variants: product.variants.map((v) => ({ ...v, price: Number(v.price), salePrice: v.salePrice ? Number(v.salePrice) : null, attributes: (v as any).attributes?.map((a: any) => ({ attributeId: a.variantAttributeId, attributeName: a.variantAttribute?.name, value: a.value, colorCode: a.colorCode })) || [] })),
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
    
    // Apply minRating filter post-fetch (rating is computed from reviews)
    const filteredProducts = minRatingNum > 0
      ? transformed.filter((p) => p.rating !== null && p.rating >= minRatingNum)
      : transformed;

    // Sort by effective price post-fetch (Prisma can't compute COALESCE(salePrice, regularPrice))
    if (sort === "price_asc" || sort === "price_desc") {
      const dir = sort === "price_asc" ? 1 : -1;
      filteredProducts.sort((a, b) => {
        const priceA = (a.salePrice && a.salePrice > 0) ? a.salePrice : a.regularPrice;
        const priceB = (b.salePrice && b.salePrice > 0) ? b.salePrice : b.regularPrice;
        return (priceA - priceB) * dir;
      });
    }
    return NextResponse.json(
      { products: filteredProducts, total: minRatingNum > 0 ? filteredProducts.length : total, page, totalPages: Math.ceil((minRatingNum > 0 ? filteredProducts.length : total) / limit) },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (error) {
    console.error("GET /api/products error:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuthRole(["ADMIN", "MANAGER", "PRODUCT_MANAGER"]);
  if (authResult.error) return authResult.error;

  try {
    const body = await request.json();

    // Validate category/subcategory before writing — a stale form (category deleted
    // while the page was open, or a subcategory from a different category) would
    // otherwise fail with a cryptic FK constraint 500.
    const category = body.categoryId
      ? await db.category.findUnique({ where: { id: body.categoryId }, include: { subcategories: { select: { id: true } } } })
      : null;
    if (!category) {
      return NextResponse.json({ error: "Selected category no longer exists. Refresh the page and pick a category again." }, { status: 400 });
    }
    if (body.subcategoryId && !category.subcategories.some((s) => s.id === body.subcategoryId)) {
      return NextResponse.json({ error: "Selected subcategory does not belong to the chosen category." }, { status: 400 });
    }

    const slug = body.name.toLowerCase().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "") || `product-${Date.now()}`;
    const product = await db.product.create({
      data: {
        name: body.name,
        slug,
        sku: body.sku ? String(body.sku).trim() : null,
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
        isComingSoon: body.isComingSoon ?? false,
        status: body.status || "DRAFT",
        // Archived/inactive products must not surface on the storefront
        isActive: body.status ? body.status !== "ARCHIVED" && body.status !== "INACTIVE" : true,
        seoTitle: body.seoTitle,
        seoDescription: body.seoDescription,
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

    // Handle images
    if (body.images && Array.isArray(body.images)) {
      for (const img of body.images) {
        if (!img?.url) continue; // Skip malformed/pending uploads instead of failing the whole save
        await db.productImage.create({
          data: {
            productId: product.id,
            url: img.url,
            alt: img.alt || "",
            isPrimary: img.isPrimary ?? false,
            position: img.position ?? 0,
            imageType: img.imageType || "PRODUCT",
          },
        });
      }
    }

    // Handle variants
    if (body.variants && Array.isArray(body.variants)) {
      for (let i = 0; i < body.variants.length; i++) {
        const v = body.variants[i];
        if (!v.name || !String(v.name).trim()) continue;
        const variant = await db.productVariant.create({
          data: {
            productId: product.id,
            name: v.name,
            sku: v.sku || null,
            price: v.price,
            salePrice: v.salePrice || null,
            stockQuantity: v.stockQuantity || 0,
            isActive: v.isActive ?? true,
            position: i,
          },
        });
        // Handle variant images
        if (v.images && Array.isArray(v.images)) {
          for (const img of v.images) {
            await db.variantImage.create({
              data: {
                variantId: variant.id,
                url: img.url,
                alt: img.alt || "",
                isPrimary: img.isPrimary ?? false,
                position: img.position ?? 0,
              },
            });
          }
        }
      }
    }

    // Log the action
    await logAdminAction({
      action: "CREATE",
      entity: "PRODUCT",
      entityId: product.id,
      details: { name: product.name, slug: product.slug },
      request,
    });
    notifyProductUpdated(product.name, "added").catch(() => {});
    // New ACTIVE products must appear on server-rendered collection/home pages immediately
    revalidatePath("/", "page");
    revalidatePath("/collections/[slug]", "page");
    revalidatePath("/collections/[slug]/[subcategory]", "page");

    return NextResponse.json({ product }, { status: 201 });
  } catch (error: any) {
    console.error("Create product error:", error);
    if (error?.code === "P2002") {
      const target = error?.meta?.target;
      if (target?.includes?.("slug")) {
        return NextResponse.json({ error: "A product with this name already exists. Rename it to continue." }, { status: 409 });
      }
      if (target?.includes?.("sku")) {
        return NextResponse.json({ error: "This SKU is already used by another product" }, { status: 409 });
      }
    }
    if (error?.code === "P2003") {
      return NextResponse.json({ error: "Selected category or subcategory no longer exists. Refresh the page and try again." }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}
