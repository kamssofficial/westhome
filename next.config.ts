import type { NextConfig } from "next";

// A self-hosted GoDaddy (or other VPS/cPanel Passenger) deploy ships a
// self-contained bundle at .next/standalone that runs with `node server.js`
// and no node_modules tree. Vercel builds keep the default output format,
// so leaving NEXT_OUTPUT_MODE unset changes nothing there.
const isStandalone = process.env.NEXT_OUTPUT_MODE === "standalone";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["sharp"],
  devIndicators: false,
  // The dev server only serves dev assets (chunks, HMR, RSC payloads) to the
  // origin it was started on. Loading it through another loopback address —
  // 127.0.0.1 when it was started as localhost — returned the HTML but refused
  // the rest, which stalls hydration silently: the page looked fine while no
  // client code ever ran. Dev-only setting; production ignores it.
  allowedDevOrigins: ["127.0.0.1"],
  images: {
    // Vercel's hosted image optimizer currently returns 402
    // OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED on this deployment. Serve the
    // existing local and remote image URLs directly so storefront images do
    // not disappear when the optimizer quota/billing is unavailable.
    unoptimized: true,
    formats: ["image/avif", "image/webp"],
    // Category tiles render local SVG placeholders through <Image>; the
    // optimizer rejects them without this. Only our own static SVGs are served.
    dangerouslyAllowSVG: true,
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
        // Vercel injected this automatically; self-hosted hosts do not, so keep it
        // explicit or the header silently disappears on a platform move.
        { key: "Strict-Transport-Security", value: "max-age=63072000" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(self)" },
        { key: "X-XSS-Protection", value: "1; mode=block" },                // Strict CSP on production only (Next emits inline bootstrap scripts, and dev
                // needs eval-based source maps). Razorpay checkout is allowed across its
                // subdomains: the modal's payment frame is served from api.razorpay.com (not
                // just checkout.razorpay.com), and the SDK also talks to lumberjack/cdn
                // subdomains — pinning individual hosts blocked the checkout modal entirely.
                ...(process.env.NODE_ENV === "production"
                  ? [
                      {
                        key: "Content-Security-Policy",
                        value: [
                          "default-src 'self'",
                          "script-src 'self' 'unsafe-inline' https://*.razorpay.com",
                          "style-src 'self' 'unsafe-inline'",
                          "img-src 'self' data: blob: https:",
                          "font-src 'self' data:",
                          "media-src 'self' data: blob: https:",
                          // R2 public base URL is added at build time when configured.
                          `connect-src 'self' https://*.razorpay.com${
                            process.env.R2_PUBLIC_BASE_URL ? " " + process.env.R2_PUBLIC_BASE_URL.replace(/\/+$/, "") : ""
                          }`,
                          "frame-src 'self' https://*.razorpay.com",
                          "object-src 'none'",
                          "base-uri 'self'",
                          "form-action 'self' https://*.razorpay.com",
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
    // Next.js self-hosted serves prerendered HTML with `s-maxage=31536000`, which
    // only governs shared/CDN caches and leaves browsers on heuristic freshness.
    // Vercel normalized HTML to no-cache; keep that behavior on every host so
    // shoppers always get a fresh shell (product data loads client-side anyway).
    // API routes and hashed static assets are excluded - they manage their own.
    {
      source: "/((?!api/|_next/|images/).*)",
      headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }],
    },
    {
      source: "/images/(.*)",
      headers: [
        { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
      ],
    },
  ],
};

export default nextConfig;
