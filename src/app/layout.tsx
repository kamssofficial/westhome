import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import Providers from "@/components/layout/Providers";

export const metadata: Metadata = {
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
      </body>
    </html>
  );
}
