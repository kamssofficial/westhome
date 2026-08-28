import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAuthRole } from "@/lib/apiAuth";
import { notifyProductUpdated } from "@/lib/notifications";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const include = { category: { select: { id: true, name: true, slug: true } }, subcategory: { select: { id: true, name: true, slug: true } }, images: { orderBy: [{ isPrimary: "desc" }, { position: "asc" }] }, variants: { where: { isActive: true }, orderBy: { position: "asc" }, include: { images: { orderBy: { position: "asc" } }, attributes: { include: { variantAttribute: true } } } }, reviews: { where: { status: "APPROVED" }, select: { rating: true } }, tags: true } as const satisfies Prisma.ProductInclude;
    let product = await db.product.findUnique({ where: { slug }, include });
    if (!product) product = await db.product.findUnique({ where: { id: slug }, include });
    if (!product || !product.isActive) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    const reviews = product.reviews;
    const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null;
    const transformed = { ...product, regularPrice: Number(product.regularPrice), salePrice: product.salePrice ? Number(product.salePrice) : null, rating: avgRating, reviewCount: reviews.length, tags: product.tags?.map((t: any) => t.tag) || [], ...Object.fromEntries(["height","width","length","depth","diameter","weight","capacity","packagingWeight","customSizeMinWidth","customSizeMinLength","customSizeMinHeight","customSizeMaxWidth","customSizeMaxLength","customSizeMaxHeight"].map(k => [k, (product as any)[k] != null ? Number((product as any)[k]) : null])), variants: product.variants.map((v) => ({ ...v, price: Number(v.price), salePrice: v.salePrice ? Number(v.salePrice) : null, attributes: v.attributes.map((a) => ({ attributeId: a.variantAttributeId, attributeName: a.variantAttribute.name, value: a.value, colorCode: a.colorCode })) })) };
    return NextResponse.json({ product: transformed });
  } catch (error) { return NextResponse.json({ error: "Product not found" }, { status: 404 }); }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const authResult = await requireAuthRole(["ADMIN", "MANAGER", "PRODUCT_MANAGER", "STAFF"]);
  if (authResult.error) return authResult.error;
  try {
    const { slug } = await params;
    const body = await request.json();
    // Allow updating with either price - only validate relationship when both provided
    if (body.regularPrice && body.salePrice && body.salePrice !== null && Number(body.regularPrice) > 0 && Number(body.salePrice) >= Number(body.regularPrice)) return NextResponse.json({ error: "Sale price must be less than regular price" }, { status: 400 });
    let product = await db.product.findUnique({ where: { slug } });
    if (!product) product = await db.product.findUnique({ where: { id: slug } });
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    // Regenerate slug if name changed
    let newSlug: string | undefined;
    if (body.name && body.name !== product.name) {
      newSlug = body.name.toLowerCase().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
      const existing = await db.product.findUnique({ where: { slug: newSlug } });
      if (existing && existing.id !== product.id) newSlug = newSlug + "-" + Date.now().toString(36);
    }

    const updated = await db.$transaction(async (tx) => {
      const updatedProduct = await tx.product.update({ where: { id: product!.id }, data: {
        ...(body.name !== undefined && { name: body.name }), ...(newSlug !== undefined && { slug: newSlug }), ...(body.sku !== undefined && { sku: body.sku || null }), ...(body.description !== undefined && { description: body.description }), ...(body.shortDescription !== undefined && { shortDescription: body.shortDescription }), ...(body.regularPrice !== undefined && { regularPrice: body.regularPrice }), ...(body.salePrice !== undefined && { salePrice: body.salePrice }), ...(body.stockQuantity !== undefined && { stockQuantity: body.stockQuantity }), ...(body.lowStockThreshold !== undefined && { lowStockThreshold: body.lowStockThreshold }), ...(body.trackInventory !== undefined && { trackInventory: body.trackInventory }), ...(body.allowBackorder !== undefined && { allowBackorder: body.allowBackorder }), ...(body.categoryId !== undefined && { categoryId: body.categoryId }), ...(body.subcategoryId !== undefined && { subcategoryId: body.subcategoryId || null }), ...(body.isFeatured !== undefined && { isFeatured: body.isFeatured }), ...(body.isBestseller !== undefined && { isBestseller: body.isBestseller }), ...(body.isNewArrival !== undefined && { isNewArrival: body.isNewArrival }), ...(body.isComingSoon !== undefined && { isComingSoon: body.isComingSoon }), ...(body.status !== undefined && { status: body.status }), ...(body.purchaseMethod !== undefined && { purchaseMethod: body.purchaseMethod }), ...(body.allowCustomSize !== undefined && { allowCustomSize: body.allowCustomSize }), ...(body.customSizeUnit !== undefined && { customSizeUnit: body.customSizeUnit }), ...(body.customSizeMinWidth !== undefined && { customSizeMinWidth: body.customSizeMinWidth }), ...(body.customSizeMinLength !== undefined && { customSizeMinLength: body.customSizeMinLength }), ...(body.customSizeMinHeight !== undefined && { customSizeMinHeight: body.customSizeMinHeight }), ...(body.customSizeMaxWidth !== undefined && { customSizeMaxWidth: body.customSizeMaxWidth }), ...(body.customSizeMaxLength !== undefined && { customSizeMaxLength: body.customSizeMaxLength }), ...(body.customSizeMaxHeight !== undefined && { customSizeMaxHeight: body.customSizeMaxHeight }), ...(body.customSizePricingMethod !== undefined && { customSizePricingMethod: body.customSizePricingMethod }), ...(body.customSizeRequiresApproval !== undefined && { customSizeRequiresApproval: body.customSizeRequiresApproval }), ...Object.fromEntries(["height","width","length","depth","diameter","dimensionUnit","weight","weightUnit","capacity","capacityUnit","material","color","finish","shape","pattern","style","mountingType","usageLocation","careInstructions","warranty","packagingType","packagingDimensions","packagingWeight","includedItems","seoTitle","seoDescription"].filter(k => body[k] !== undefined).map(k => [k, body[k]]))
      }});

      if (Array.isArray(body.images)) {
        await tx.productImage.deleteMany({ where: { productId: product!.id } });
        if (body.images.length) await tx.productImage.createMany({ data: body.images.map((img: any, i: number) => ({ productId: product!.id, url: img.url, alt: img.alt || "", isPrimary: img.isPrimary ?? i === 0, position: img.position ?? i, imageType: img.imageType || "PRODUCT" })) });
      }

      if (Array.isArray(body.variants) || Array.isArray(body.variantAttributes)) {
        const existingVariants = await tx.productVariant.findMany({ where: { productId: product!.id }, select: { id: true } });
        await tx.variantAttributeValue.deleteMany({ where: { variantId: { in: existingVariants.map(v => v.id) } } });
        await tx.variantAttributeValue.deleteMany({ where: { variantAttribute: { productId: product!.id } } });
        await tx.productVariant.deleteMany({ where: { productId: product!.id } });
        await tx.variantAttribute.deleteMany({ where: { productId: product!.id } });

        const attrsByName = new Map<string, string>();
        if (Array.isArray(body.variantAttributes)) {
          for (let i = 0; i < body.variantAttributes.length; i++) {
            const a = body.variantAttributes[i];
            const attr = await tx.variantAttribute.create({ data: { productId: product!.id, name: a.name, type: String(a.name || "").toLowerCase() === "color" ? "COLOR" : "TEXT", position: i } });
            attrsByName.set(a.name, attr.id);
          }
        }
        if (Array.isArray(body.variants)) {
          for (let i = 0; i < body.variants.length; i++) {
            const v = body.variants[i];
            const variant = await tx.productVariant.create({ data: { productId: product!.id, name: v.name, price: v.price, salePrice: v.salePrice ?? null, stockQuantity: v.stockQuantity ?? 0, sku: v.sku || null, position: i } });
            if (Array.isArray(v.attributes)) {
              for (const a of v.attributes) {
                const attributeId = attrsByName.get(a.attributeName);
                if (!attributeId) continue;
                await tx.variantAttributeValue.create({ data: { variantAttributeId: attributeId, variantId: variant.id, value: a.value, colorCode: a.colorCode || null, position: 0 } });
              }
            }
          }
        }
      }
      await tx.auditLog.create({ data: { action: "UPDATE", entity: "PRODUCT", entityId: product!.id, details: { name: updatedProduct.name, slug: updatedProduct.slug } } });
      return updatedProduct;
    });
    notifyProductUpdated(updated.name, "updated").catch(() => {});
    return NextResponse.json({ product: updated });
  } catch (error: any) {
    console.error("Product update error:", error);
    if (error?.code === "P2002") return NextResponse.json({ error: "A product or variant with this SKU already exists" }, { status: 409 });
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const authResult = await requireAuthRole(["ADMIN", "MANAGER", "PRODUCT_MANAGER", "STAFF"]);
  if (authResult.error) return authResult.error;
  try {
    const { slug } = await params;
    let product = await db.product.findUnique({ where: { slug } });
    if (!product) product = await db.product.findUnique({ where: { id: slug } });
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    await db.$transaction(async (tx) => {
      await tx.auditLog.create({ data: { action: "DELETE", entity: "PRODUCT", entityId: product!.id, details: { name: product!.name, slug: product!.slug } } });
      await tx.product.delete({ where: { id: product!.id } });
    });
    return NextResponse.json({ success: true });
  } catch (error) { return NextResponse.json({ error: "Failed to delete product" }, { status: 500 }); }
}
