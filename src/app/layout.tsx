import type { Metadata, Viewport } from "next";
import { STORE_LOCATIONS } from "@/lib/storeLocations";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import Providers from "@/components/layout/Providers";
import ServiceWorkerRegistration from "@/components/ui/ServiceWorkerRegistration";
import StoreHydrator from "@/components/ui/StoreHydrator";

// The production domain is the only correct base for canonical/OG URLs.
// NEXTAUTH_URL must NOT drive metadataBase: hosting platforms can set it to
// the deployment host, which would corrupt every canonical/og:url with a
// non-production host.
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
  // Google Search Console URL-prefix verification via HTML meta tag. The token
  // is issued per-property in GSC (Add property → HTML tag); it is a public
  // value by design. Set NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION in the deploy
  // environment (the "google-site-verification=<token>" string) and it goes
  // live on every page after the next deploy — no DNS access required. This
  // matters because the domain already carries an older Google TXT record in
  // GoDaddy that belongs to a previous property; a meta-tag verification lets
  // the current business account claim the site without touching DNS.
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
    : undefined,
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
  //
  // suppressHydrationWarning is deliberate and load-bearing. Our host injects an
  // extra attribute into the served <html> before React sees it
  // (data-dpl-id="dpl_...", deployment-skew protection — the same id shows up as
  // ?dpl= on every asset URL). That attribute exists in the server HTML but not in
  // our client render, so React reports a root-element hydration mismatch and
  // throws away the server-rendered tree, re-rendering the whole page in the
  // browser (React error #418 in prod builds) — wasted main-thread work on every
  // first visit. The flag only silences attribute/text diffs on this one element;
  // it does not disable hydration anywhere else.
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
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
        <StoreHydrator />
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
