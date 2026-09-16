import type { MetadataRoute } from "next";

// Must match layout.tsx SITE_URL: the indexed www host, not the redirecting bare domain.
const SITE_URL = "https://www.westhome.in";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
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