import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import Providers from "@/components/layout/Providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "WESTHOME by BM Distributors | Premium Home & Lifestyle",
    template: "%s | WESTHOME by BM Distributors",
  },
  description:
    "Discover premium home décor, comforters, lamps, carpets, wall art, and lifestyle accessories at WESTHOME by BM Distributors.",
  keywords: [
    "home decor",
    "premium home",
    "wall art",
    "comforters",
    "lamps",
    "carpets",
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
  themeColor: "#FAFAF8",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="min-h-screen bg-background text-foreground font-sans antialiased">
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              background: "#2C2C2C",
              color: "#fff",
              fontSize: "14px",
              borderRadius: "8px",
            },
            success: {
              iconTheme: {
                primary: "#2D7A4F",
                secondary: "#fff",
              },
            },
            error: {
              iconTheme: {
                primary: "#C53030",
                secondary: "#fff",
              },
            },
          }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
