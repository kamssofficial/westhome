import { notifyProductUpdated } from "@/lib/notifications";
import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAuthRole } from "@/lib/apiAuth";

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
    if (!product || !product.isActive) { return NextResponse.json({ error: "Product not found" }, { status: 404 }); }
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
  const authResult = await requireAuthRole(["ADMIN", "MANAGER", "PRODUCT_MANAGER", "CONTENT_MANAGER"]);
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

    // Handle images update if provided
    if (body.images && Array.isArray(body.images)) {
      // Delete existing images
      await db.productImage.deleteMany({ where: { productId: product.id } });
      // Create new images
      for (const img of body.images) {
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

    // Handle variant attributes
    if (body.variantAttributes && Array.isArray(body.variantAttributes)) {
      // Delete existing variant attributes and their values
      const existingAttrs = await db.variantAttribute.findMany({ where: { productId: product.id } });
      for (const attr of existingAttrs) {
        await db.variantAttributeValue.deleteMany({ where: { variantAttributeId: attr.id } });
      }
      await db.variantAttribute.deleteMany({ where: { productId: product.id } });
      
      // Create new attributes
      const attrMap: Record<string, string> = {};
      for (let i = 0; i < body.variantAttributes.length; i++) {
        const a = body.variantAttributes[i];
        const created = await db.variantAttribute.create({
          data: { productId: product.id, name: a.name, type: a.name.toLowerCase() === "color" ? "COLOR" : "TEXT", position: i },
        });
        attrMap[a.name] = created.id;
        // Create values
        if (a.values && Array.isArray(a.values)) {
          for (let j = 0; j < a.values.length; j++) {
            await db.variantAttributeValue.create({
              data: { variantAttributeId: created.id, variantId: "", value: a.values[j].value, colorCode: a.values[j].colorCode || null, position: j },
            });
          }
        }
      }
    }

    // Handle variants
    if (body.variants && Array.isArray(body.variants)) {
      // Delete existing variants
      const existingVariants = await db.productVariant.findMany({ where: { productId: product.id } });
      for (const v of existingVariants) {
        await db.variantAttributeValue.deleteMany({ where: { variantId: v.id } });
      }
      await db.productVariant.deleteMany({ where: { productId: product.id } });
      
      // Create new variants
      for (let i = 0; i < body.variants.length; i++) {
        const v = body.variants[i];
        const variant = await db.productVariant.create({
          data: {
            productId: product.id,
            name: v.name,
            price: v.price,
            salePrice: v.salePrice || null,
            stockQuantity: v.stockQuantity || 0,
            sku: v.sku || null,
            position: i,
          },
        });
        // Create variant attribute values
        if (v.attributes && Array.isArray(v.attributes)) {
          for (const a of v.attributes) {
            // Find the attribute by name
            const attr = await db.variantAttribute.findFirst({ where: { productId: product.id, name: a.attributeName } });
            if (attr) {
              // Find or create the value
              let attrValue = await db.variantAttributeValue.findFirst({ where: { variantAttributeId: attr.id, value: a.value } });
              if (!attrValue) {
                attrValue = await db.variantAttributeValue.create({
                  data: { variantAttributeId: attr.id, variantId: variant.id, value: a.value, colorCode: a.colorCode || null, position: 0 },
                });
              } else {
                await db.variantAttributeValue.update({ where: { id: attrValue.id }, data: { variantId: variant.id } });
              }
            }
          }
        }
      }
    }

    // Log the action
    await db.auditLog.create({
      data: {
        action: "UPDATE",
        entity: "PRODUCT",
        entityId: product.id,
        details: { name: updated.name, slug: updated.slug },
      },
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
    await db.auditLog.create({
      data: {
        action: "DELETE",
        entity: "PRODUCT",
        entityId: product.id,
        details: { name: product.name, slug: product.slug },
      },
    });

    await db.product.delete({ where: { id: product.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
