import { notFound } from "next/navigation";
import type { Metadata } from "next";
import db from "@/lib/db";
import ProductDetailClient from "./ProductDetailClient";

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getProduct(slug: string) {
  try {
    let product = await db.product.findUnique({
      where: { slug },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        subcategory: { select: { id: true, name: true, slug: true } },
        images: { orderBy: [{ isPrimary: "desc" as const }, { position: "asc" as const }] },
        variants: {
          where: { isActive: true },
          orderBy: { position: "asc" },
          include: {
            images: { orderBy: { position: "asc" as const } },
            attributes: { include: { variantAttribute: true } },
          },
        },
        reviews: { where: { status: "APPROVED" as const }, select: { rating: true } },
        tags: true,
      },
    });

    if (!product) {
      product = await db.product.findUnique({
        where: { id: slug },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          subcategory: { select: { id: true, name: true, slug: true } },
          images: { orderBy: [{ isPrimary: "desc" as const }, { position: "asc" as const }] },
          variants: {
            where: { isActive: true },
            orderBy: { position: "asc" },
            include: {
              images: { orderBy: { position: "asc" as const } },
              attributes: { include: { variantAttribute: true } },
            },
          },
          reviews: { where: { status: "APPROVED" as const }, select: { rating: true } },
          tags: true,
        },
      });
    }

    if (!product) return null;
    if (!product.isActive) return null;

    const reviews = product.reviews;
    const avgRating =
      reviews.length > 0
        ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
        : null;

    return {
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
      weight: product.weight ? Number(product.weight) : null,
      capacity: product.capacity ? Number(product.capacity) : null,
      packagingWeight: product.packagingWeight ? Number(product.packagingWeight) : null,
      customSizeMinWidth: product.customSizeMinWidth ? Number(product.customSizeMinWidth) : null,
      customSizeMinLength: product.customSizeMinLength ? Number(product.customSizeMinLength) : null,
      customSizeMinHeight: product.customSizeMinHeight ? Number(product.customSizeMinHeight) : null,
      customSizeMaxWidth: product.customSizeMaxWidth ? Number(product.customSizeMaxWidth) : null,
      customSizeMaxLength: product.customSizeMaxLength ? Number(product.customSizeMaxLength) : null,
      customSizeMaxHeight: product.customSizeMaxHeight ? Number(product.customSizeMaxHeight) : null,
      variants: product.variants.map((v: any) => ({
        ...v,
        price: Number(v.price),
        salePrice: v.salePrice ? Number(v.salePrice) : null,
        attributes: v.attributes.map((a: any) => ({
          attributeId: a.variantAttributeId,
          attributeName: a.variantAttribute.name,
          value: a.value,
          colorCode: a.colorCode,
        })),
      })),
    };
  } catch (error) {
    console.error("getProduct error:", error);
    return null;
  }
}

async function getRelatedProducts(categorySlug: string, excludeId: string) {
  try {
    const products = await db.product.findMany({
      where: {
        isActive: true,
        category: { slug: categorySlug },
        id: { not: excludeId },
      },
      include: {
        images: { where: { isPrimary: true }, take: 1 },
        category: { select: { name: true, slug: true } },
      },
      take: 4,
    });
    return products.map((p: any) => ({
      ...p,
      regularPrice: Number(p.regularPrice),
      salePrice: p.salePrice ? Number(p.salePrice) : null,
    }));
  } catch {
    return [];
  }
}

async function getReviews(productId: string) {
  try {
    const reviews = await db.review.findMany({
      where: { productId, status: "APPROVED" },
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true } } },
    });
    const agg = await db.review.aggregate({
      where: { productId, status: "APPROVED" },
      _avg: { rating: true },
      _count: true,
    });
    return {
      reviews,
      avgRating: agg._avg.rating,
      reviewCount: agg._count,
    };
  } catch {
    return { reviews: [], avgRating: null, reviewCount: 0 };
  }
}


export async function generateStaticParams() {
  try {
    const products = await db.product.findMany({
      where: { isActive: true },
      select: { slug: true },
    });
    return products.map((p) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: "Product Not Found" };

  const images = product.images?.length
    ? product.images.map((img: any) => ({ url: img.url, alt: img.alt || product.name }))
    : [];

  const canonical = `/products/${product.slug}`;

  return {
    title: product.seoTitle || product.name,
    description: product.seoDescription || product.shortDescription || product.description?.substring(0, 160) || product.name,
    alternates: { canonical },
    openGraph: {
      title: product.seoTitle || product.name,
      description: product.seoDescription || product.shortDescription || product.description?.substring(0, 160) || product.name,
      url: canonical,
      images: images.length > 0 ? [images[0]] : undefined,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: product.seoTitle || product.name,
      description: product.seoDescription || product.shortDescription || product.description?.substring(0, 160) || product.name,
      images: images.length > 0 ? [images[0].url] : undefined,
    },
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const [relatedProducts, reviewData] = await Promise.all([
    product.category?.slug ? getRelatedProducts(product.category.slug, product.id) : Promise.resolve([]),
    getReviews(product.id),
  ]);

  const baseStock =
    product.variants.length > 0
      ? product.variants.reduce((s: number, v: any) => s + (v.stockQuantity ?? 0), 0)
      : product.stockQuantity ?? 0;
  // Mirror ProductDetailClient's buyability exactly: inventory is ignored when
  // trackInventory is off (e.g. WhatsApp/backorder products), otherwise the
  // product is buyable when any active variant (or the product itself) has stock.
  const isInStock = product.trackInventory === false || baseStock > 0;
  // Mirror the client's price display: salePrice only applies when > 0.
  const listedPrice =
    product.salePrice != null && product.salePrice > 0
      ? product.salePrice
      : product.regularPrice;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `https://www.westhome.in/products/${product.slug}#product`,
    name: product.seoTitle || product.name,
    description:
      product.seoDescription ||
      product.shortDescription ||
      product.description?.substring(0, 160) ||
      product.name,
    image: product.images?.length ? product.images.map((img: any) => img.url) : undefined,
    sku: product.sku || undefined,
    brand: {
      "@type": "Brand",
      name: "WESTHOME by BM Distributors",
    },
    offers: {
      "@type": "Offer",
      url: `https://www.westhome.in/products/${product.slug}`,
      priceCurrency: "INR",
      price: listedPrice,
      availability: isInStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: {
        "@type": "Organization",
        name: "WESTHOME by BM Distributors",
      },
    },
    aggregateRating:
      product.rating != null && product.reviewCount > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: Number(product.rating.toFixed(1)),
            reviewCount: product.reviewCount,
          }
        : undefined,
  };
  // JSON-LD inside a <script> must not contain the literal "</script>"; escape
  // "<" so DB-controlled text (names/descriptions) can never break out of it.
  const jsonLdHtml = JSON.stringify(jsonLd).replace(/</g, "\\u003c");

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdHtml }}
      />
      <ProductDetailClient
        product={product}
        reviews={reviewData.reviews}
        reviewAvg={reviewData.avgRating}
        reviewCount={reviewData.reviewCount}
        relatedProducts={relatedProducts}
      />
    </>
  );
}
