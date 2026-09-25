import type { Metadata } from "next";
import ReturnsClient from "./ReturnsClient";

export const metadata: Metadata = {
  title: "Returns & Refunds Policy",
  description:
    "WESTHOME returns and refunds policy — how to report a damaged or defective item, the 48-hour claim window, and how to reach our support team.",
  alternates: { canonical: "/policies/returns" },
  openGraph: {
    title: "Returns & Refunds Policy | WESTHOME",
    description: "Returns and refunds for damaged or defective items, and support contact details.",
    url: "/policies/returns",
  },
};

export default function Page() {
  return <ReturnsClient />;
}
