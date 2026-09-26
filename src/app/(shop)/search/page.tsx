import type { Metadata } from "next";
import SearchClient from "./SearchClient";

export const metadata: Metadata = {
  title: "Search Products",
  description:
    "Search WEST HOME's collection of premium home décor — find wall art, laundry baskets, frames, soap dispensers, and more.",
  alternates: { canonical: "/search" },
  openGraph: {
    title: "Search Products | WEST HOME",
    description:
      "Search our collection of premium home décor products.",
    url: "/search",
    images: [{ url: "/images/logo/westhome-logo-transparent.png", alt: "WEST HOME by BM Distributors" }],
  },
};

export default function Page() {
  return <SearchClient />;
}
