import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import Providers from "@/components/layout/Providers";
import IntroAnimation from "@/components/ui/IntroAnimation";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "WESTHOME by BM Distributors | Premium Home & Lifestyle",
    template: "%s | WESTHOME by BM Distributors",
  },
  description:
    "Discover premium home décor — laundry baskets, frames, and soap dispensers at WESTHOME by BM Distributors.",
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
  },
  twitter: {
    card: "summary_large_image",
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
  themeColor: "#F7F3EA",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${cormorant.variable} ${dmSans.variable}`}>
      <body className="min-h-screen bg-background text-foreground font-sans antialiased">
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              background: "#1C1917",
              color: "#FAF9F6",
              fontSize: "14px",
              borderRadius: "8px",
            },
            success: {
              iconTheme: {
                primary: "#2D7A4F",
                secondary: "#FAF9F6",
              },
            },
            error: {
              iconTheme: {
                primary: "#C53030",
                secondary: "#FAF9F6",
              },
            },
          }}
        />
        <Providers>
          <IntroAnimation>{children}</IntroAnimation>
        </Providers>
      </body>
    </html>
  );
}
