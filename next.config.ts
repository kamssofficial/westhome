import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  images: {
    // Built-in optimizer: serves responsive sizes and converts to WebP/AVIF.
    // (The previous custom loader disabled optimization entirely, so product
    // photos shipped as original multi-MB PNGs at 3840px.)
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(self)" },
        { key: "X-XSS-Protection", value: "1; mode=block" },
        // Strict CSP on production only (Next emits inline bootstrap scripts, and dev
        // needs eval-based source maps). Razorpay's checkout iframe + API are allowed.
        ...(process.env.NODE_ENV === "production"
          ? [
              {
                key: "Content-Security-Policy",
                value: [
                  "default-src 'self'",
                  "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com",
                  "style-src 'self' 'unsafe-inline'",
                  "img-src 'self' data: blob: https:",
                  "font-src 'self' data:",
                  "media-src 'self' data: blob: https:",
                  // R2 public base URL is added at build time when configured.
                  `connect-src 'self' https://api.razorpay.com https://checkout.razorpay.com${
                    process.env.R2_PUBLIC_BASE_URL ? " " + process.env.R2_PUBLIC_BASE_URL.replace(/\/+$/, "") : ""
                  }`,
                  "frame-src 'self' https://checkout.razorpay.com",
                  "object-src 'none'",
                  "base-uri 'self'",
                  "form-action 'self' https://api.razorpay.com",
                  "frame-ancestors 'none'",
                ].join("; "),
              },
            ]
          : []),
      ],
    },
    {
      source: "/api/(.*)",
      headers: [
        { key: "Access-Control-Allow-Origin", value: "https://westhome.in" },
        { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, PATCH, DELETE, OPTIONS" },
        { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
        { key: "Access-Control-Max-Age", value: "86400" },
      ],
    },
    {
      source: "/images/(.*)",
      headers: [
        { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
      ],
    },
    {
      source: "/_next/static/(.*)",
      headers: [
        { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
      ],
    },
  ],
};

export default nextConfig;
