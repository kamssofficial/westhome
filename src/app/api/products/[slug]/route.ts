import { notifyProductUpdated } from "@/lib/notifications";
import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAuthRole } from "@/lib/apiAuth";
import { auth } from "@/lib/auth";
import { logAdminAction } from "@/lib/audit";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    // Try slug first, then ID
    let product = await db.product.findUnique({
      where: { slug },
      include: { category: { select: { id: true, name: true, slug: true } }, subcategory: { select: { id: true, name: true, slug: true } }, images: { orderBy: [{ isPrimary: "desc" }, { position: "asc" }] }, variants: { where: { isActive: true }, orderBy: { position: "asc" }, include: { images: { orderBy: { position: "asc" } }, attributes: { include: { variantAttribute: true } } } }, reviews: { where: { status: "APPROVED" }, select: { rating: true } }, tags: true },
    });
    if (!product) {
      product = await db.product.findUnique({
        where: { id: slug },
        include: { category: { select: { id: true, name: true, slug: true } }, subcategory: { select: { id: true, name: true, slug: true } }, images: { orderBy: [{ isPrimary: "desc" }, { position: "asc" }] }, variants: { where: { isActive: true }, orderBy: { position: "asc" }, include: { images: { orderBy: { position: "asc" } }, attributes: { include: { variantAttribute: true } } } }, reviews: { where: { status: "APPROVED" }, select: { rating: true } }, tags: true },
      });
    }
    if (!product) { return NextResponse.json({ error: "Product not found" }, { status: 404 }); }
    // Non-active products are hidden from storefront but accessible to admin/staff
    if (!product.isActive) {
      const session = await auth().catch(() => null);
      const role = (session?.user as any)?.role;
      if (!role || role === "CUSTOMER") {
        return NextResponse.json({ error: "Product not found" }, { status: 404 });
      }
    }
    const reviews = product.reviews;
    const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null;
    const transformed = {
      ...product,
      regularPrice: Number(product.regularPrice),
      salePrice: product.salePrice ? Number(product.salePrice) : null,
      rating: avgRating,
      reviewCount: reviews.length,
      tags: product.tags?.map((t: any) => t.tag) || [],
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
    };
    return NextResponse.json({ product: transformed });
  } catch (error) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const authResult = await requireAuthRole(["ADMIN", "MANAGER", "PRODUCT_MANAGER"]);
  if (authResult.error) return authResult.error;

  try {
    const { slug } = await params;
    const body = await request.json();

    // Find product by slug or ID
    let product = await db.product.findUnique({ where: { slug } });
    if (!product) product = await db.product.findUnique({ where: { id: slug } });
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    const updated = await db.product.update({
      where: { id: product.id },
      data: {
        name: body.name,
        sku: body.sku,
        description: body.description,
        shortDescription: body.shortDescription,
        regularPrice: body.regularPrice,
        salePrice: body.salePrice,
        stockQuantity: body.stockQuantity,
        lowStockThreshold: body.lowStockThreshold,
        trackInventory: body.trackInventory,
        allowBackorder: body.allowBackorder,
        categoryId: body.categoryId,
        subcategoryId: body.subcategoryId || null,
        isFeatured: body.isFeatured,
        isBestseller: body.isBestseller,
        isNewArrival: body.isNewArrival,
        isComingSoon: body.isComingSoon,
        status: body.status,
        purchaseMethod: body.purchaseMethod,
        allowCustomSize: body.allowCustomSize,
        customSizeUnit: body.customSizeUnit,
        customSizeMinWidth: body.customSizeMinWidth,
        customSizeMinLength: body.customSizeMinLength,
        customSizeMinHeight: body.customSizeMinHeight,
        customSizeMaxWidth: body.customSizeMaxWidth,
        customSizeMaxLength: body.customSizeMaxLength,
        customSizeMaxHeight: body.customSizeMaxHeight,
        customSizePricingMethod: body.customSizePricingMethod,
        customSizeRequiresApproval: body.customSizeRequiresApproval,
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
        seoTitle: body.seoTitle,
        seoDescription: body.seoDescription,
      },
    });

    // Handle images update if provided (atomic transaction)
    if (body.images && Array.isArray(body.images)) {
      await db.$transaction(async (tx) => {
        await tx.productImage.deleteMany({ where: { productId: product.id } });
        for (const img of body.images) {
          await tx.productImage.create({
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
      });
    }

    // Log the action
    await logAdminAction({
      action: "UPDATE",
      entity: "PRODUCT",
      entityId: product.id,
      details: { name: updated.name, slug: updated.slug },
      request,
    });
    notifyProductUpdated(updated.name, "updated").catch(() => {});

    return NextResponse.json({ product: updated });
  } catch (error) {
    console.error("Product update error:", error);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const authResult = await requireAuthRole(["ADMIN", "MANAGER", "PRODUCT_MANAGER"]);
  if (authResult.error) return authResult.error;

  try {
    const { slug } = await params;
    let product = await db.product.findUnique({ where: { slug } });
    if (!product) product = await db.product.findUnique({ where: { id: slug } });
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    // Log the action
    await logAdminAction({
      action: "DELETE",
      entity: "PRODUCT",
      entityId: product.id,
      details: { name: product.name, slug: product.slug },
      request,
    });

    await db.product.delete({ where: { id: product.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
