import type { MetadataRoute } from "next";
import db from "@/lib/db";
import { blogArticles } from "@/lib/blog";
import { memo, SEO_XML_TTL_MS, NS } from "@/lib/memoCache";

// Must match layout.tsx SITE_URL: the indexed www host, not the redirecting bare domain.
const SITE_URL = "https://www.westhome.in";

// Regenerated at most once an hour (ISR). Recomputing per request was costing
// two full catalog queries on every crawler hit — multi-second responses on a
// small origin and zero shared caching. One-hour freshness is ample for a
// catalog that changes a few times a week.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 30-minute in-memory cache on top of ISR: crawlers hitting the XML between
  // isolates share one pair of catalog queries per window per isolate. Once an
  // entry exists, expiry serves stale while a background rebuild runs, so a
  // crawler never blocks on the multi-second rebuild after the first hit.
  return memo(`${NS.sitemap}:v1`, SEO_XML_TTL_MS, buildSitemap);
}

async function buildSitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/shop`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    // /shop/all is a server redirect to /search — list the canonical target.
    { url: `${SITE_URL}/search`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    // Policies live under /policies/<page> — the bare /policies route does not exist.
    { url: `${SITE_URL}/policies/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/policies/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/policies/returns`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/policies/shipping`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];

  // Blog articles are static content — expose them so Google can find them.
  const blogEntries: MetadataRoute.Sitemap = blogArticles.map((a) => ({
    url: `${SITE_URL}/blog/${a.slug}`,
    lastModified: new Date(`${a.date}T00:00:00Z`),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

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

  return [...staticEntries, ...blogEntries, ...categories, ...products];
}
