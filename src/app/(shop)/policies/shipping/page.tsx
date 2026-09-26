import type { Metadata } from "next";
import ShippingClient from "./ShippingClient";

export const metadata: Metadata = {
  title: "Shipping Policy",
  description:
    "Shipping policy for WEST HOME by BM Distributors — delivery timelines, charges, tracking, and store pickup across India.",
  alternates: { canonical: "/policies/shipping" },
  openGraph: {
    title: "Shipping Policy | WEST HOME",
    description: "Delivery timelines, charges, tracking, and store pickup.",
    url: "/policies/shipping",
  },
};

export default function Page() {
  return <ShippingClient />;
}
