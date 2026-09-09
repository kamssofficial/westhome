import type { Metadata } from "next";
import ReturnsClient from "./ReturnsClient";

export const metadata: Metadata = {
  title: "Contact & Support",
  description:
    "Get help with your WESTHOME order — damaged items, returns, and support contact information.",
  alternates: { canonical: "/policies/returns" },
  openGraph: {
    title: "Contact & Support | WESTHOME",
    description: "Help with orders, damaged items, and support.",
    url: "/policies/returns",
  },
};

export default function Page() {
  return <ReturnsClient />;
}
