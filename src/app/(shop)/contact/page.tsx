import type { Metadata } from "next";
import ContactClient from "./ContactClient";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Get in touch with WestHome by BM Distributors — visit our store in Kasaragod, Kerala, or reach us via phone, email, or WhatsApp.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact WESTHOME by BM Distributors",
    description:
      "Visit our store in Kasaragod, Kerala, or reach us via phone, email, or WhatsApp.",
    url: "/contact",
    images: [{ url: "/images/logo/westhome-logo-transparent.png", alt: "WESTHOME by BM Distributors" }],
  },
};

export default function Page() {
  return <ContactClient />;
}
