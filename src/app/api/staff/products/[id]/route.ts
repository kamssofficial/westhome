import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAuthRole } from "@/lib/apiAuth";

const ROLES = ["ADMIN", "MANAGER", "PRODUCT_MANAGER", "STAFF"] as const;

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthRole([...ROLES]);
  if (auth.error) return auth.error;
  try {
    const { id } = await params;
    const product = await db.product.findUnique({
      where: { id },
      include: {
        category: { include: { subcategories: { orderBy: { position: "asc" } } } },
        subcategory: true,
        images: { orderBy: [{ isPrimary: "desc" }, { position: "asc" }] },
        variants: { orderBy: { position: "asc" }, include: { attributes: true } },
        variantAttributes: { orderBy: { position: "asc" }, include: { values: { orderBy: { position: "asc" } } } },
      },
    });
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    return NextResponse.json({ product: { ...product, regularPrice: Number(product.regularPrice), salePrice: product.salePrice === null ? null : Number(product.salePrice) } });
  } catch (error) {
    console.error("Staff product GET error", error);
    return NextResponse.json({ error: "Failed to load product" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthRole([...ROLES]);
  if (auth.error) return auth.error;
  try {
    const { id } = await params;
    const body = await request.json();
    const existing = await db.product.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    const name = String(body.name ?? existing.name).trim();
    const regularPrice = Number(body.regularPrice ?? existing.regularPrice);
    const salePrice = body.salePrice === null || body.salePrice === "" ? null : Number(body.salePrice);
    if (!name) return NextResponse.json({ error: "Product name is required" }, { status: 400 });
    if (!Number.isFinite(regularPrice) || regularPrice <= 0) return NextResponse.json({ error: "Regular price must be greater than zero" }, { status: 400 });
    if (salePrice !== null && (!Number.isFinite(salePrice) || salePrice >= regularPrice)) return NextResponse.json({ error: "Sale price must be less than regular price" }, { status: 400 });

    if (body.categoryId) {
      const category = await db.category.findUnique({ where: { id: body.categoryId }, select: { id: true } });
      if (!category) return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }
    if (body.subcategoryId) {
      const subcategory = await db.subcategory.findUnique({ where: { id: body.subcategoryId }, select: { id: true, categoryId: true } });
      if (!subcategory) return NextResponse.json({ error: "Invalid subcategory" }, { status: 400 });
      if ((body.categoryId ?? existing.categoryId) !== subcategory.categoryId) return NextResponse.json({ error: "Subcategory does not belong to the selected category" }, { status: 400 });
    }

    const data: any = {
      name,
      sku: body.sku === "" ? null : (body.sku ?? existing.sku),
      description: body.description ?? existing.description,
      shortDescription: body.shortDescription ?? existing.shortDescription,
      regularPrice,
      salePrice,
      stockQuantity: Number.isFinite(Number(body.stockQuantity)) && Number(body.stockQuantity) >= 0 ? Number(body.stockQuantity) : existing.stockQuantity,
      lowStockThreshold: Number.isFinite(Number(body.lowStockThreshold)) && Number(body.lowStockThreshold) >= 0 ? Number(body.lowStockThreshold) : existing.lowStockThreshold,
      trackInventory: body.trackInventory ?? existing.trackInventory,
      allowBackorder: body.allowBackorder ?? existing.allowBackorder,
      categoryId: body.categoryId || existing.categoryId,
      subcategoryId: body.subcategoryId || null,
      status: body.status || existing.status,
      isActive: body.status ? !["ARCHIVED", "INACTIVE"].includes(body.status) : existing.isActive,
      purchaseMethod: body.purchaseMethod || existing.purchaseMethod,
      isFeatured: body.isFeatured ?? existing.isFeatured,
      isBestseller: body.isBestseller ?? existing.isBestseller,
      isNewArrival: body.isNewArrival ?? existing.isNewArrival,
      isComingSoon: body.isComingSoon ?? existing.isComingSoon,
      material: body.material ?? existing.material,
      color: body.color ?? existing.color,
      finish: body.finish ?? existing.finish,
      shape: body.shape ?? existing.shape,
      pattern: body.pattern ?? existing.pattern,
      style: body.style ?? existing.style,
      mountingType: body.mountingType ?? existing.mountingType,
      usageLocation: body.usageLocation ?? existing.usageLocation,
      careInstructions: body.careInstructions ?? existing.careInstructions,
      warranty: body.warranty ?? existing.warranty,
      packagingType: body.packagingType ?? existing.packagingType,
      packagingDimensions: body.packagingDimensions ?? existing.packagingDimensions,
      includedItems: body.includedItems ?? existing.includedItems,
      dimensionUnit: body.dimensionUnit ?? existing.dimensionUnit,
      weightUnit: body.weightUnit ?? existing.weightUnit,
      capacityUnit: body.capacityUnit ?? existing.capacityUnit,
      height: body.height ?? existing.height,
      width: body.width ?? existing.width,
      length: body.length ?? existing.length,
      depth: body.depth ?? existing.depth,
      diameter: body.diameter ?? existing.diameter,
      weight: body.weight ?? existing.weight,
      capacity: body.capacity ?? existing.capacity,
      allowCustomSize: body.allowCustomSize ?? existing.allowCustomSize,
      customSizeUnit: body.customSizeUnit ?? existing.customSizeUnit,
      customSizeMinWidth: body.customSizeMinWidth ?? existing.customSizeMinWidth,
      customSizeMinLength: body.customSizeMinLength ?? existing.customSizeMinLength,
      customSizeMinHeight: body.customSizeMinHeight ?? existing.customSizeMinHeight,
      customSizeMaxWidth: body.customSizeMaxWidth ?? existing.customSizeMaxWidth,
      customSizeMaxLength: body.customSizeMaxLength ?? existing.customSizeMaxLength,
      customSizeMaxHeight: body.customSizeMaxHeight ?? existing.customSizeMaxHeight,
      customSizePricingMethod: body.customSizePricingMethod ?? existing.customSizePricingMethod,
      customSizeRequiresApproval: body.customSizeRequiresApproval ?? existing.customSizeRequiresApproval,
      seoTitle: body.seoTitle ?? existing.seoTitle,
      seoDescription: body.seoDescription ?? existing.seoDescription,
    };

    const product = await db.product.update({ where: { id }, data });
    await db.auditLog.create({ data: { action: "UPDATE", entity: "PRODUCT", entityId: id, details: { name: product.name, source: "STAFF" } } });
    return NextResponse.json({ product: { ...product, regularPrice: Number(product.regularPrice), salePrice: product.salePrice === null ? null : Number(product.salePrice) } });
  } catch (error: any) {
    console.error("Staff product PUT error", error);
    if (error?.code === "P2002") return NextResponse.json({ error: "That SKU is already used by another product" }, { status: 409 });
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}
