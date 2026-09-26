import type { Metadata } from "next";
import HomeClient from "./HomeClient";

export const revalidate = 300;
export const dynamic = "force-static";
export const fetchCache = "force-cache";

export const metadata: Metadata = {
  title: "Premium Home & Lifestyle",
  description:
    "Premium home décor — laundry baskets, frames, soap dispensers, cushions, and wall clocks at WEST HOME by BM Distributors. Curated in India.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "WEST HOME by BM Distributors | Premium Home & Lifestyle",
    description:
      "Premium home décor and lifestyle products curated for your comfort.",
    url: "/",
    images: [{ url: "/images/logo/westhome-logo-transparent.png", alt: "WEST HOME by BM Distributors" }],
  },
};

export default function Page() {
  return <HomeClient />;
}
