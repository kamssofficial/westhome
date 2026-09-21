import { notifyProductUpdated } from "@/lib/notifications";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import db from "@/lib/db";
import { requireAuthRole } from "@/lib/apiAuth";
import { auth } from "@/lib/auth";
import { logAdminAction } from "@/lib/audit";
import { deleteMedia } from "@/lib/media";
import { deriveParentPriceFromVariants, syncParentPriceFromVariants } from "@/lib/deriveProductPrice";
import { normalizeImageUrl } from "@/lib/categoryImages";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
    // Rewrite legacy raw-Drive image URLs to the WebP proxy (display-only).
    const normalizeImages = (images: { url: string }[] | undefined | null) =>
      (images ?? []).map((img: any) => ({ ...img, url: normalizeImageUrl(img.url) }));

    const transformed = {
      ...product,
      images: normalizeImages(product.images),
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
        images: normalizeImages(v.images),
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
    return NextResponse.json(
      { product: transformed },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
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

    if (typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json({ error: "Product name is required" }, { status: 400 });
    }
    if (typeof body.categoryId !== "string" || !body.categoryId) {
      return NextResponse.json({ error: "Category is required" }, { status: 400 });
    }

    // Validate category/subcategory before writing — a stale form (category deleted
    // while the page was open, or a subcategory from a different category) would
    // otherwise fail with a cryptic FK constraint 500.
    const category = await db.category.findUnique({
      where: { id: body.categoryId },
      include: { subcategories: { select: { id: true } } },
    });
    if (!category) {
      return NextResponse.json({ error: "Selected category no longer exists. Refresh the page and pick a category again." }, { status: 400 });
    }
    if (body.subcategoryId && !category.subcategories.some((s) => s.id === body.subcategoryId)) {
      return NextResponse.json({ error: "Selected subcategory does not belong to the chosen category." }, { status: 400 });
    }

    // Find product by slug or ID
    let product = await db.product.findUnique({ where: { slug } });
    if (!product) product = await db.product.findUnique({ where: { id: slug } });
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    // Recompute slug when the name changes (same normalization as create)
    const nextSlug = body.name.trim().toLowerCase().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");

    // When the product has variants, the storefront charges variant prices —
    // derive the parent price from them so collection cards, the detail page
    // fallback and the admin list can never show a stale second price.
    const variantCount = await db.productVariant.count({ where: { productId: product.id } });
    let derivedPricing: { regularPrice?: number; salePrice?: number | null } = {};
    if (variantCount > 0) {
      const derived = await deriveParentPriceFromVariants(product.id);
      if (derived) derivedPricing = derived;
    }

    const updated = await db.product.update({
      where: { id: product.id },
      data: {
        name: body.name.trim(),
        slug: nextSlug && nextSlug !== product.slug ? nextSlug : undefined,
        // Keep isActive in sync with status: archived/inactive products must not
        // be visible on the storefront, and reactivating one must re-show it.
        isActive: body.status ? body.status !== "ARCHIVED" && body.status !== "INACTIVE" : undefined,
        // Empty SKU inputs must be stored as null. An empty string is a real
        // value under a unique constraint and prevents multiple SKU-less
        // products from being edited successfully.
        sku: typeof body.sku === "string" && body.sku.trim() ? body.sku.trim() : null,
        description: body.description,
        shortDescription: body.shortDescription,
        regularPrice: derivedPricing.regularPrice ?? body.regularPrice,
        salePrice: variantCount > 0 && "salePrice" in derivedPricing ? derivedPricing.salePrice : body.salePrice,
        stockQuantity: body.stockQuantity,
        lowStockThreshold: body.lowStockThreshold,
        trackInventory: true, // inventory is always tracked; client value ignored
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
      const oldImages = await db.productImage.findMany({ where: { productId: product.id } });
      const newUrls = new Set(body.images.map((img: any) => img.url as string));
      await db.$transaction(async (tx) => {
        await tx.productImage.deleteMany({ where: { productId: product.id } });
        for (const img of body.images) {
          if (!img?.url) continue; // Skip malformed/pending uploads instead of failing the whole save
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
      // Clean up storage files for images that were removed
      const removed = oldImages.filter((img) => !newUrls.has(img.url));
      await Promise.allSettled(removed.map((img) => deleteMedia({ url: img.url })));
    }

    // Handle variants update if provided. On edit we replace the current set
    // so the admin sees the exact submitted variants (add/edit/remove).
    if (body.variants && Array.isArray(body.variants)) {
      await db.$transaction(async (tx) => {
        await tx.productVariant.deleteMany({ where: { productId: product.id } });
        for (let i = 0; i < body.variants.length; i++) {
          const v = body.variants[i];
          if (!v.name || !String(v.name).trim()) continue;
          const variant = await tx.productVariant.create({
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
          if (v.images && Array.isArray(v.images)) {
            for (const img of v.images) {
              await tx.variantImage.create({
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
      });
      // Variants were just replaced — re-derive the parent price from the new set
      await syncParentPriceFromVariants(product.id).catch(() => {});
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
    revalidatePath(`/products/${updated.slug}`);
    revalidatePath("/products/[slug]", "page");
    revalidatePath("/", "page");
    revalidatePath("/collections/[slug]", "page");

    return NextResponse.json({ product: updated });
} catch (error: any) {
    console.error("Product update error:", error);
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

    // Clean up stored media before deleting the row (DB rows cascade)
    const full = await db.product.findUnique({
      where: { id: product.id },
      include: { images: true, variants: { include: { images: true } } },
    });
    const files = [
      ...(full?.images?.map((i) => ({ url: i.url })) || []),
      ...(full?.variants?.flatMap((v) => v.images.map((i) => ({ url: i.url }))) || []),
    ];
    await Promise.allSettled(
      files.filter((f) => f.url).map((f) => deleteMedia(f))
    );

    await db.product.delete({ where: { id: product.id } });
    // Deleted products must disappear from server-rendered collection/home pages immediately
    revalidatePath("/", "page");
    revalidatePath("/collections/[slug]", "page");
    revalidatePath("/collections/[slug]/[subcategory]", "page");

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
