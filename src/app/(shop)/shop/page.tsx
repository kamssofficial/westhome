import type { Metadata } from "next";
import ShopClient from "./ShopClient";

export const metadata: Metadata = {
  title: "Shop All Collections",
  description:
    "Explore WEST HOME's curated range of premium home essentials — wall art, laundry baskets, frames, soap dispensers, and more.",
  alternates: { canonical: "/shop" },
  openGraph: {
    title: "Shop All Collections | WEST HOME",
    description:
      "Explore curated premium home essentials — each piece chosen to make your space feel more like you.",
    url: "/shop",
    images: [{ url: "/images/logo/westhome-logo-transparent.png", alt: "WEST HOME by BM Distributors" }],
  },
};

export default function Page() {
  return <ShopClient />;
}
