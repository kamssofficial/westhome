import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import Providers from "@/components/layout/Providers";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/manifest.json",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000"),
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
        <Analytics />
      </body>
    </html>
  );
}
