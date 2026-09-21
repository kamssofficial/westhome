import type { MetadataRoute } from "next";

// Must match layout.tsx SITE_URL: the indexed www host, not the redirecting bare domain.
const SITE_URL = "https://www.westhome.in";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        // RFC 9309 (Google/Bing implement this): when rules conflict, the
        // LONGEST matching path wins. "Allow: /api/images/" therefore carves
        // the image proxy out of the broader "/api/" block. Without it, the
        // blanket block kept EVERY product photo (/api/images/<id>) out of
        // Googlebot-Image's reach — no Google Images/Lens presence and a
        // degraded quality signal on every product page that references one.
        allow: "/api/images/",
        disallow: [
          "/admin",
          "/staff",
          "/api/",
          "/account",
          "/cart",
          "/wishlist",
          "/checkout",
          "/login",
          "/register",
          "/forgot-password",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}