import type { Metadata } from "next";
import AboutClient from "./AboutClient";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Learn about WestHome by BM Distributors — premium home décor and lifestyle products curated for Indian homes. Based in Kasaragod, Kerala.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About WESTHOME by BM Distributors",
    description:
      "Premium home décor and lifestyle products curated for Indian homes.",
    url: "/about",
    images: [{ url: "/images/logo/westhome-logo-transparent.png", alt: "WESTHOME by BM Distributors" }],
  },
};

export default function Page() {
  return <AboutClient />;
}
