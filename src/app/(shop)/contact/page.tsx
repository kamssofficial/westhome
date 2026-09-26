import type { Metadata } from "next";
import ContactClient from "./ContactClient";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Get in touch with West Home by BM Distributors — visit our showrooms in Kasaragod, Kerala and Mangalore, Karnataka, or reach us via phone, email, or WhatsApp.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact WEST HOME by BM Distributors",
    description:
      "Visit our showrooms in Kasaragod, Kerala and Mangalore, Karnataka, or reach us via phone, email, or WhatsApp.",
    url: "/contact",
    images: [{ url: "/images/logo/westhome-logo-transparent.png", alt: "WEST HOME by BM Distributors" }],
  },
};

export default function Page() {
  return <ContactClient />;
}
