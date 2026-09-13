import type { MetadataRoute } from "next";

const SITE_URL = "https://westhome.in";

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