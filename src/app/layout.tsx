import type { Metadata, Viewport } from "next";
import { STORE_LOCATIONS } from "@/lib/storeLocations";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import Providers from "@/components/layout/Providers";
import ServiceWorkerRegistration from "@/components/ui/ServiceWorkerRegistration";

// The production domain is the only correct base for canonical/OG URLs.
// NEXTAUTH_URL must NOT drive metadataBase: on Vercel it is set to the
// deployment host (e.g. westhome.vercel.app), which would corrupt every
// canonical/og:url with a non-production host.
// NOTE: this MUST be the www host. Google indexes www.westhome.in; the bare
// domain only 308-redirects there. A bare-domain canonical makes every page
// "canonicalize to a redirect", which is a classic indexing suppressor.
const SITE_URL = "https://www.westhome.in";

function siteUrl(): URL {
  try {
    return new URL(SITE_URL);
  } catch {
    return new URL("https://www.westhome.in");
  }
}

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: {
    default: "WEST HOME by BM Distributors | Premium Home & Lifestyle",
    template: "%s | WEST HOME by BM Distributors",
  },
  description:
    "Premium home décor — laundry baskets, frames, and soap dispensers at WEST HOME by BM Distributors.",
  keywords: [
    "home decor",
    "premium home",
    "laundry baskets",
    "frames",
    "soap dispensers",
    "lifestyle",
    "BM Distributors",
  ],
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "WEST HOME by BM Distributors",
    title: "WEST HOME by BM Distributors",
    description:
      "Premium home décor and lifestyle products curated for your comfort.",
    url: "https://www.westhome.in/",
    images: [{ url: "https://www.westhome.in/images/logo/westhome-logo-transparent.png", alt: "WEST HOME by BM Distributors", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["https://www.westhome.in/images/logo/westhome-logo-transparent.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5F3EF" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // `data-scroll-behavior` pairs with the `scroll-behavior: smooth` in globals.css:
  // Next needs it declared so it can turn smooth scrolling off during route
  // transitions instead of animating every navigation.
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              // One Store node per showroom: search engines read them
              // independently, so each carries its own address and pin.
              "@graph": STORE_LOCATIONS.map((store, index) => ({
                "@type": "Store",
                "@id":
                  index === 0
                    ? "https://www.westhome.in/#store"
                    : `https://www.westhome.in/#store-${store.id}`,
                name: "WEST HOME by BM Distributors",
                alternateName: "West Home",
                url: "https://www.westhome.in/",
                description:
                  "Premium home décor and lifestyle products curated for your comfort — laundry baskets, frames, soap dispensers, cushions, clocks and more.",
                image: "https://www.westhome.in/images/logo/westhome-logo-transparent.png",
                priceRange: "₹₹",
                telephone: "+919895071144",
                email: "info@westhome.in",
                address: {
                  "@type": "PostalAddress",
                  ...store.address,
                },
                geo: {
                  "@type": "GeoCoordinates",
                  ...store.geo,
                },
                ...(index > 0
                  ? { parentOrganization: { "@id": "https://www.westhome.in/#store" } }
                  : {}),
                openingHoursSpecification: [
                  {
                    "@type": "OpeningHoursSpecification",
                    dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
                    opens: "10:00",
                    closes: "20:00",
                  },
                  {
                    "@type": "OpeningHoursSpecification",
                    dayOfWeek: "Sunday",
                    opens: "11:00",
                    closes: "18:00",
                  },
                ],
                sameAs: [
                  "https://www.facebook.com/westhomebybmdistributors/",
                  "https://www.instagram.com/westhomebybmd/",
                ],
              })),
            }),
          }}
        />
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              background: "#1F211F",
              color: "#F8F6F1",
              fontSize: "14px",
              borderRadius: "9999px",
            },
            success: {
              iconTheme: {
                primary: "#2D7A4F",
                secondary: "#F8F6F1",
              },
            },
            error: {
              iconTheme: {
                primary: "#BD4A42",
                secondary: "#F8F6F1",
              },
            },
          }}
        />
        <ServiceWorkerRegistration />
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
