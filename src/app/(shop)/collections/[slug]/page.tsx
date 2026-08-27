import { notFound } from "next/navigation";
import type { Metadata } from "next";
import db from "@/lib/db";
import { CollectionContentClient } from "./CollectionContentClient";

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getCategory(slug: string) {
  try {
    // Try top-level category first
    let category = await db.category.findUnique({
      where: { slug, isActive: true },
      include: {
        subcategories: {
          where: { isActive: true },
          orderBy: { position: "asc" },
          include: {
            _count: { select: { products: { where: { isActive: true, status: "ACTIVE" } } } },
          },
        },
        _count: { select: { products: { where: { isActive: true, status: "ACTIVE" } } } },
      },
    });

    if (!category) {
      // Try subcategory - find parent category that contains this subcategory
      const subcategory = await db.subcategory.findUnique({
        where: { slug, isActive: true },
        include: {
          category: {
            include: {
              subcategories: {
                where: { isActive: true },
                orderBy: { position: "asc" },
                include: {
                  _count: { select: { products: { where: { isActive: true, status: "ACTIVE" } } } },
                },
              },
              _count: { select: { products: { where: { isActive: true, status: "ACTIVE" } } } },
            },
          },
          _count: { select: { products: { where: { isActive: true, status: "ACTIVE" } } } },
        },
      });

      if (subcategory) {
        // Return the parent category with all subcategories
        const parent = subcategory.category;
        return {
          id: parent.id,
          name: parent.name,
          slug: parent.slug,
          description: parent.description,
          image: parent.image,
          productCount: parent._count.products,
          subcategories: parent.subcategories.map((sub: any) => ({
            id: sub.id, name: sub.name, slug: sub.slug, description: sub.description, image: sub.image,
            productCount: sub._count.products,
          })),
        };
      }
      return null;
    }

    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      image: category.image,
      productCount: category._count.products,
      subcategories: category.subcategories.map((sub: any) => ({
        id: sub.id, name: sub.name, slug: sub.slug, description: sub.description, image: sub.image,
        productCount: sub._count.products,
      })),
    };
  } catch { return null; }
}

async function getInitialProducts(categorySlug: string) {
  try {
    const where: any = { isActive: true, status: "ACTIVE", category: { slug: categorySlug } };
    const [products, total] = await Promise.all([
      db.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          subcategory: { select: { id: true, name: true, slug: true } },
          images: { orderBy: [{ isPrimary: "desc" as const }, { position: "asc" as const }] },
          reviews: { where: { status: "APPROVED" as const }, select: { rating: true } },
          tags: true,
        },
        orderBy: [{ isFeatured: "desc" as const }, { createdAt: "desc" as const }],
        take: 24,
      }),
      db.product.count({ where }),
    ]);
    return {
      products: products.map((p: any) => ({
        ...p,
        regularPrice: Number(p.regularPrice),
        salePrice: p.salePrice ? Number(p.salePrice) : null,
        rating: p.reviews.length > 0 ? p.reviews.reduce((s: number, r: any) => s + r.rating, 0) / p.reviews.length : null,
        reviewCount: p.reviews.length,
        tags: p.tags?.map((t: any) => t.tag) || [],
      })),
      total,
    };
  } catch { return { products: [], total: 0 }; }
}

export async function generateStaticParams() {
  try {
    const categories = await db.category.findMany({ where: { isActive: true }, select: { slug: true } });
    return categories.map((c) => ({ slug: c.slug }));
  } catch { return []; }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) return { title: "Collection Not Found" };
  const description = category.description || ("Shop " + category.name + " at WESTHOME. Premium home decor, wall art, and accessories.");
  return {
    title: category.name,
    description,
    openGraph: { title: category.name, description, type: "website" },
    twitter: { card: "summary", title: category.name, description },
  };
}

export default async function CollectionPage({ params }: PageProps) {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) notFound();
  const { products, total } = await getInitialProducts(slug);
  return (
    <CollectionContentClient
      category={category}
      initialProducts={products}
      initialTotal={total}
    />
  );
}