import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAuthRole } from "@/lib/apiAuth";
import { logAdminAction } from "@/lib/audit";

// GET - List all products for admin
export async function GET(request: NextRequest) {
  const authResult = await requireAuthRole(["ADMIN", "MANAGER", "PRODUCT_MANAGER"]);
  if (authResult.error) return authResult.error;

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";
  const status = searchParams.get("status") || "";
  const sort = searchParams.get("sort") || "newest";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");

  const where: any = {};
  if (query) {
    where.OR = [
      { name: { contains: query, mode: "insensitive" } },
      { sku: { contains: query, mode: "insensitive" } },
      { category: { name: { contains: query, mode: "insensitive" } } },
      { subcategory: { name: { contains: query, mode: "insensitive" } } },
    ];
  }
  if (status) {
    where.status = status;
  }
  const orderBy = sort === "updated"
    ? { updatedAt: "desc" as const }
    : sort === "name_asc"
      ? { name: "asc" as const }
      : sort === "name_desc"
        ? { name: "desc" as const }
        : sort === "price_asc"
          ? { regularPrice: "asc" as const }
          : sort === "price_desc"
            ? { regularPrice: "desc" as const }
            : { createdAt: "desc" as const };

  const [products, total] = await Promise.all([
    db.product.findMany({
      where,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        subcategory: { select: { id: true, name: true, slug: true } },
        images: { where: { isPrimary: true }, take: 1 },
        _count: { select: { orderItems: true } },
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.product.count({ where }),
  ]);

  return NextResponse.json({ products, total, page, limit });
}

// POST - Import products and Drive-backed images from an idempotent manifest.
// Existing products are matched by slug; their image gallery is replaced by the
// manifest gallery, while existing product details and order history are kept.
export async function POST(request: NextRequest) {
  const authResult = await requireAuthRole(["ADMIN", "MANAGER", "PRODUCT_MANAGER"]);
  if (authResult.error) return authResult.error;

  try {
    const body = await request.json();
    const items = Array.isArray(body?.items) ? body.items : [];
    if (!items.length) return NextResponse.json({ error: "items array is required" }, { status: 400 });
    if (items.length > 500) return NextResponse.json({ error: "Import is limited to 500 products per request" }, { status: 413 });

    const categories = await db.category.findMany({ include: { subcategories: true } });
    const categoryBySlug = new Map(categories.map((category) => [category.slug, category]));
    const results: { slug: string; action: string; images: number; variants: number; error?: string }[] = [];

    for (const item of items) {
      if (!item?.slug || !item?.name || !item?.category) {
        results.push({ slug: item?.slug || "unknown", action: "skipped", images: 0, variants: 0, error: "Missing slug, name, or category" });
        continue;
      }
      const category = categoryBySlug.get(item.category);
      if (!category) {
        results.push({ slug: item.slug, action: "skipped", images: 0, variants: 0, error: `Category not found: ${item.category}` });
        continue;
      }
      const subcategory = item.subcategory
        ? category.subcategories.find((sub) => sub.slug === item.subcategory)
        : null;
      const existing = await db.product.findUnique({ where: { slug: item.slug }, include: { images: true } });
      const product = existing
        ? await db.product.update({ where: { id: existing.id }, data: { categoryId: category.id, subcategoryId: subcategory?.id || null } })
        : await db.product.create({
            data: {
              name: item.name,
              slug: item.slug,
              regularPrice: Number(item.price) || 0,
              salePrice: null,
              stockQuantity: 0,
              trackInventory: false,
              status: "ACTIVE",
              isActive: true,
              categoryId: category.id,
              subcategoryId: subcategory?.id || null,
              purchaseMethod: "BOTH",
            },
          });

      if (Array.isArray(item.images)) {
        await db.productImage.deleteMany({ where: { productId: product.id } });
        for (const image of item.images) {
          if (!image?.url) continue;
          await db.productImage.create({ data: {
            productId: product.id,
            url: image.url,
            alt: image.alt || item.name,
            position: Number(image.position) || 0,
            isPrimary: Boolean(image.isPrimary),
            imageType: "PRODUCT",
          } });
        }
      }

      let variantCount = 0;
      if (Array.isArray(item.variants)) {
        for (const variant of item.variants) {
          if (!variant?.name) continue;
          const existingVariant = await db.productVariant.findFirst({ where: { productId: product.id, name: variant.name } });
          const savedVariant = existingVariant
            ? await db.productVariant.update({ where: { id: existingVariant.id }, data: { price: Number(variant.price) || 0, sku: variant.sku || null } })
            : await db.productVariant.create({ data: { productId: product.id, name: variant.name, sku: variant.sku || null, price: Number(variant.price) || 0, stockQuantity: Number(variant.stockQuantity) || 0, isActive: true, position: variantCount } });
          if (Array.isArray(variant.images)) {
            await db.variantImage.deleteMany({ where: { variantId: savedVariant.id } });
            for (const image of variant.images) {
              if (!image?.url) continue;
              await db.variantImage.create({ data: { variantId: savedVariant.id, url: image.url, alt: image.alt || `${item.name} ${variant.name}`, position: Number(image.position) || 0, isPrimary: Boolean(image.isPrimary) } });
            }
          }
          variantCount++;
        }
      }
      results.push({ slug: item.slug, action: existing ? "updated" : "created", images: item.images?.length || 0, variants: variantCount });
    }

    await logAdminAction({ action: "IMPORT", entity: "PRODUCT", entityId: null, details: { count: results.length }, request });
    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("Admin product import error:", error);
    return NextResponse.json({ error: "Failed to import products" }, { status: 500 });
  }
}
