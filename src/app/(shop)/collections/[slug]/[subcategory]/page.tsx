import type { Metadata } from "next";
import { notFound } from "next/navigation";
import db from "@/lib/db";
import { normalizeImageUrl } from "@/lib/categoryImages";
import { serializeForClient } from "@/lib/serializeForClient";
import SubcategoryContentClient from "./SubcategoryContentClient";

export const revalidate = 300;

interface PageProps {
  params: Promise<{ slug: string; subcategory: string }>;
}

async function getCategoryAndSubcategory(categorySlug: string, subcategorySlug: string) {
  const category = await db.category.findUnique({
    where: { slug: categorySlug, isActive: true },
    include: {
      subcategories: {
        where: { isActive: true },
        orderBy: { position: "asc" },
        include: {
          _count: { select: { products: { where: { isActive: true, status: "ACTIVE" } } } },
        },
      },
    },
  });
  if (!category) return null;

  const subcategory = category.subcategories.find((s) => s.slug === subcategorySlug);
  if (!subcategory) return null;

  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    image: category.image || null,
    productCount: subcategory._count.products,
    subcategories: category.subcategories.map((sub: any) => ({
      id: sub.id,
      name: sub.name,
      slug: sub.slug,
      description: sub.description,
      image: sub.image || null,
      productCount: sub._count.products,
    })),
    subcategory: {
      id: subcategory.id,
      name: subcategory.name,
      slug: subcategory.slug,
      description: subcategory.description,
      image: subcategory.image || null,
      productCount: subcategory._count.products,
    },
  };
}

async function getInitialProducts(categorySlug: string, subcategorySlug: string) {
  const where: any = {
    isActive: true,
    status: "ACTIVE",
    category: { slug: categorySlug },
    subcategory: { slug: subcategorySlug },
  };

  const [products, total] = await Promise.all([
    db.product.findMany({
      where,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        subcategory: { select: { id: true, name: true, slug: true } },
        images: { orderBy: [{ isPrimary: "desc" as const }, { position: "asc" as const }], take: 1 },
        variants: {
          where: { isActive: true },
          orderBy: { position: "asc" },
          include: { images: { orderBy: { position: "asc" as const }, take: 1 } },
        },
        reviews: { where: { status: "APPROVED" as const }, select: { rating: true } },
        tags: { where: { tag: { startsWith: "color:" } } },
      },
      orderBy: [{ isFeatured: "desc" as const }, { createdAt: "desc" as const }],
      take: 24,
    }),
    db.product.count({ where }),
  ]);

  return serializeForClient({
    products: products.map((p: any) => ({
      ...p,
      images: (p.images ?? []).map((img: any) => ({ ...img, url: normalizeImageUrl(img.url) })),
      regularPrice: Number(p.regularPrice),
      salePrice: p.salePrice ? Number(p.salePrice) : null,
      rating: p.reviews.length > 0 ? p.reviews.reduce((s: number, r: any) => s + r.rating, 0) / p.reviews.length : null,
      reviewCount: p.reviews.length,
      tags: p.tags?.map((t: any) => t.tag) || [],
      palette: p.tags?.filter((t: any) => t.tag?.startsWith("color:")).map((t: any) => t.tag.slice(6)) || [],
      variants: (p.variants ?? []).map((v: any) => ({
        ...v,
        images: (v.images ?? []).map((img: any) => ({ ...img, url: normalizeImageUrl(img.url) })),
        price: Number(v.price),
        salePrice: v.salePrice ? Number(v.salePrice) : null,
        attributes: (v.attributes ?? []).map((a: any) => ({
          attributeId: a.variantAttributeId,
          attributeName: a.variantAttribute?.name,
          value: a.value,
          colorCode: a.colorCode,
        })),
      })),
    })),
    total,
  });
}

export async function generateStaticParams() {
  try {
    const categories = await db.category.findMany({
      where: { isActive: true },
      include: { subcategories: { where: { isActive: true }, select: { slug: true } } },
    });
    return categories.flatMap((category) =>
      category.subcategories.map((sub) => ({ slug: category.slug, subcategory: sub.slug })),
    );
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, subcategory } = await params;
  const data = await getCategoryAndSubcategory(slug, subcategory);
  if (!data) return { title: "Collection Not Found" };

  return {
    title: data.subcategory.name,
    description: data.subcategory.description || `Shop ${data.subcategory.name} at WEST HOME.`,
    alternates: { canonical: `/collections/${data.slug}/${data.subcategory.slug}` },
  };
}

export default async function SubcategoryPage({ params }: PageProps) {
  const { slug, subcategory } = await params;
  const [data, initial] = await Promise.all([
    getCategoryAndSubcategory(slug, subcategory),
    getInitialProducts(slug, subcategory),
  ]);
  if (!data) notFound();

  return (
    <SubcategoryContentClient
      slug={slug}
      subcategorySlug={subcategory}
      initialCategory={data}
      initialSubcategory={data.subcategory}
      initialProducts={initial.products}
      initialTotal={initial.total}
    />
  );
}
