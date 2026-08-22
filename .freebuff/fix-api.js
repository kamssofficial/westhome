const fs = require('fs');

// Fix categories API
const catRoute = `import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { CATEGORIES } from "@/lib/data";

export async function GET() {
  try {
    const categories = await db.category.findMany({
      where: { isActive: true },
      include: {
        subcategories: { where: { isActive: true }, orderBy: { position: "asc" }, include: { _count: { select: { products: { where: { isActive: true, status: "ACTIVE" } } } } } },
        _count: { select: { products: { where: { isActive: true, status: "ACTIVE" } } } },
      },
      orderBy: { position: "asc" },
    });
    const transformed = categories.map((cat) => ({
      id: cat.id, name: cat.name, slug: cat.slug, description: cat.description, image: cat.image, position: cat.position, productCount: cat._count.products,
      subcategories: cat.subcategories.map((sub) => ({ id: sub.id, name: sub.name, slug: sub.slug, description: sub.description, image: sub.image, position: sub.position, productCount: sub._count.products })),
    }));
    return NextResponse.json({ categories: transformed });
  } catch (error) {
    return NextResponse.json({ categories: CATEGORIES });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const slug = body.name.toLowerCase().replace(/[^\\w\\s-]/g, "").replace(/[\\s_-]+/g, "-");
    const category = await db.category.create({ data: { name: body.name, slug, description: body.description, image: body.image, position: body.position || 0 } });
    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}
`;
fs.writeFileSync('src/app/api/categories/route.ts', catRoute);
console.log('Categories API updated');

// Fix homepage API
const homeRoute = `import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { HOMEPAGE_SECTIONS } from "@/lib/data";

export async function GET() {
  try {
    const sections = await db.homepageSection.findMany({ orderBy: { position: "asc" } });
    return NextResponse.json({ sections: sections.map((s) => ({ ...s, content: s.content as Record<string, any> || {} })) });
  } catch (error) {
    return NextResponse.json({ sections: HOMEPAGE_SECTIONS });
  }
}
`;
fs.writeFileSync('src/app/api/homepage/route.ts', homeRoute);
console.log('Homepage API updated');

// Fix products API
const prodRoute = `import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

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

    const where: any = { isActive: true, status: "ACTIVE" };
    if (query) { where.OR = [{ name: { contains: query, mode: "insensitive" } }, { description: { contains: query, mode: "insensitive" } }, { shortDescription: { contains: query, mode: "insensitive" } }]; }
    if (category) { where.category = { slug: category }; }
    if (subcategory) { where.subcategory = { slug: subcategory }; }
    if (featured) where.isFeatured = true;
    if (newArrivals) where.isNewArrival = true;
    if (bestsellers) where.isBestseller = true;

    let orderBy: any = { createdAt: "desc" };
    switch (sort) {
      case "price_asc": orderBy = { regularPrice: "asc" }; break;
      case "price_desc": orderBy = { regularPrice: "desc" }; break;
      case "bestselling": orderBy = { orderItems: { _count: "desc" } }; break;
      default: orderBy = [{ isFeatured: "desc" }, { createdAt: "desc" }]; break;
    }

    const [products, total] = await Promise.all([
      db.product.findMany({
        where, include: { category: { select: { id: true, name: true, slug: true } }, images: { orderBy: [{ isPrimary: "desc" }, { position: "asc" }] }, variants: { where: { isActive: true }, orderBy: { position: "asc" }, include: { images: { orderBy: { position: "asc" } }, attributes: { include: { variantAttribute: true } } } }, reviews: { where: { status: "APPROVED" }, select: { rating: true } }, tags: true },
        orderBy, skip: (page - 1) * limit, take: limit,
      }),
      db.product.count({ where }),
    ]);
    const transformed = products.map((product) => ({
      ...product, regularPrice: Number(product.regularPrice), salePrice: product.salePrice ? Number(product.salePrice) : null,
      rating: product.reviews.length > 0 ? product.reviews.reduce((s, r) => s + r.rating, 0) / product.reviews.length : null,
      reviewCount: product.reviews.length, tags: product.tags?.map((t: any) => t.tag) || [],
      variants: product.variants.map((v) => ({ ...v, price: Number(v.price), salePrice: v.salePrice ? Number(v.salePrice) : null, attributes: v.attributes.map((a) => ({ attributeId: a.variantAttributeId, attributeName: a.variantAttribute.name, value: a.value, colorCode: a.colorCode })) })),
    }));
    return NextResponse.json({ products: transformed, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    return NextResponse.json({ products: [], total: 0, page: 1, totalPages: 0 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const slug = body.name.toLowerCase().replace(/[^\\w\\s-]/g, "").replace(/[\\s_-]+/g, "-").replace(/^-+|-+$/g, "");
    const product = await db.product.create({ data: { name: body.name, slug, sku: body.sku, description: body.description, shortDescription: body.shortDescription, regularPrice: body.regularPrice, salePrice: body.salePrice, stockQuantity: body.stockQuantity || 0, lowStockThreshold: body.lowStockThreshold || 5, trackInventory: body.trackInventory ?? true, allowBackorder: body.allowBackorder ?? false, allowCustomSize: body.allowCustomSize ?? false, purchaseMethod: body.purchaseMethod || "BOTH", categoryId: body.categoryId, subcategoryId: body.subcategoryId, isFeatured: body.isFeatured ?? false, isBestseller: body.isBestseller ?? false, isNewArrival: body.isNewArrival ?? false, status: body.status || "DRAFT" } });
    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}
`;
fs.writeFileSync('src/app/api/products/route.ts', prodRoute);
console.log('Products API updated');

// Fix product detail API
const prodDetailRoute = `import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const product = await db.product.findUnique({
      where: { slug },
      include: { category: { select: { id: true, name: true, slug: true } }, subcategory: { select: { id: true, name: true, slug: true } }, images: { orderBy: [{ isPrimary: "desc" }, { position: "asc" }] }, variants: { where: { isActive: true }, orderBy: { position: "asc" }, include: { images: { orderBy: { position: "asc" } }, attributes: { include: { variantAttribute: true } } } }, reviews: { where: { status: "APPROVED" }, select: { rating: true } }, tags: true },
    });
    if (!product || !product.isActive) { return NextResponse.json({ error: "Product not found" }, { status: 404 }); }
    const reviews = product.reviews;
    const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null;
    const transformed = { ...product, regularPrice: Number(product.regularPrice), salePrice: product.salePrice ? Number(product.salePrice) : null, rating: avgRating, reviewCount: reviews.length, tags: product.tags?.map((t: any) => t.tag) || [], variants: product.variants.map((v) => ({ ...v, price: Number(v.price), salePrice: v.salePrice ? Number(v.salePrice) : null, attributes: v.attributes.map((a) => ({ attributeId: a.variantAttributeId, attributeName: a.variantAttribute.name, value: a.value, colorCode: a.colorCode })) })) };
    return NextResponse.json({ product: transformed });
  } catch (error) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }
}
`;
fs.writeFileSync('src/app/api/products/[slug]/route.ts', prodDetailRoute);
console.log('Product detail API updated');

// Fix orders API
const ordersRoute = `import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status");
    const where: any = {};
    if (session?.user) { where.userId = (session.user as any).id; }
    else { return NextResponse.json({ orders: [], total: 0 }); }
    if (status) where.status = status;
    const [orders, total] = await Promise.all([
      db.order.findMany({ where, include: { items: true, payment: true, statusHistory: { orderBy: { createdAt: "desc" } } }, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
      db.order.count({ where }),
    ]);
    return NextResponse.json({ orders: orders.map((o) => ({ ...o, subtotal: Number(o.subtotal), discount: Number(o.discount), deliveryCharge: Number(o.deliveryCharge), tax: Number(o.tax), total: Number(o.total), items: o.items.map((i) => ({ ...i, unitPrice: Number(i.unitPrice), salePrice: i.salePrice ? Number(i.salePrice) : null, totalPrice: Number(i.totalPrice) })) })), total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    return NextResponse.json({ orders: [], total: 0 });
  }
}
`;
fs.writeFileSync('src/app/api/orders/route.ts', ordersRoute);
console.log('Orders API updated');
