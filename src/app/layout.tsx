import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import Providers from "@/components/layout/Providers";

// The production domain is the only correct base for canonical/OG URLs.
// NEXTAUTH_URL must NOT drive metadataBase: on Vercel it is set to the
// deployment host (e.g. westhome.vercel.app), which would corrupt every
// canonical/og:url with a non-production host.
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
    default: "WESTHOME by BM Distributors | Premium Home & Lifestyle",
    template: "%s | WESTHOME by BM Distributors",
  },
  description:
    "Premium home décor — laundry baskets, frames, and soap dispensers at WESTHOME by BM Distributors.",
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
    siteName: "WESTHOME by BM Distributors",
    title: "WESTHOME by BM Distributors",
    description:
      "Premium home décor and lifestyle products curated for your comfort.",
    images: [{ url: "/images/logo/westhome-logo-transparent.png", alt: "WESTHOME by BM Distributors" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/images/logo/westhome-logo-transparent.png"],
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
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Store",
              "@id": "https://www.westhome.in/#store",
              name: "WESTHOME by BM Distributors",
              alternateName: "WestHome",
              url: "https://www.westhome.in/",
              description:
                "Premium home décor and lifestyle products curated for your comfort — laundry baskets, frames, soap dispensers, cushions, clocks and more.",
              image: "https://www.westhome.in/images/logo/westhome-logo-transparent.png",
              priceRange: "₹₹",
              telephone: "+919895071144",
              email: "info@westhomebybmd.com",
              address: {
                "@type": "PostalAddress",
                streetAddress: "City Gate Building, near Press Club Junction, Karandakkad",
                addressLocality: "Kasaragod",
                addressRegion: "Kerala",
                postalCode: "671121",
                addressCountry: "IN",
              },
              geo: {
                "@type": "GeoCoordinates",
                latitude: 12.4924,
                longitude: 74.9899,
              },
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
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
