import type { MetadataRoute } from "next";
import db from "@/lib/db";

const SITE_URL = "https://www.westhome.in";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/shop`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/shop/all`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/collections`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/account`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE_URL}/cart`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE_URL}/wishlist`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE_URL}/login`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE_URL}/register`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE_URL}/policies`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];

  let categories: MetadataRoute.Sitemap = [];
  let products: MetadataRoute.Sitemap = [];

  try {
    const cats = await db.category.findMany({
      where: { isActive: true },
      select: { slug: true, updatedAt: true },
    });
    categories = cats.map((c) => ({
      url: `${SITE_URL}/collections/${c.slug}`,
      lastModified: c.updatedAt ?? now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
  } catch (e) {
    console.error("sitemap: failed to load categories", e);
  }

  try {
    const prods = await db.product.findMany({
      where: { isActive: true },
      select: { slug: true, updatedAt: true },
    });
    products = prods.map((p) => ({
      url: `${SITE_URL}/products/${p.slug}`,
      lastModified: p.updatedAt ?? now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));
  } catch (e) {
    console.error("sitemap: failed to load products", e);
  }

  return [...staticEntries, ...categories, ...products];
}