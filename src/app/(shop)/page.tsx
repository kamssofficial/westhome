import type { Metadata } from "next";
import HomeClient from "./HomeClient";

export const metadata: Metadata = {
  title: "Premium Home & Lifestyle",
  description:
    "Premium home décor — laundry baskets, frames, soap dispensers, cushions, and wall clocks at WESTHOME by BM Distributors. Curated in India.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "WESTHOME by BM Distributors | Premium Home & Lifestyle",
    description:
      "Premium home décor and lifestyle products curated for your comfort.",
    url: "/",
    images: [{ url: "/images/logo/westhome-logo-transparent.png", alt: "WESTHOME by BM Distributors" }],
  },
};

export default function Page() {
  return <HomeClient />;
}
