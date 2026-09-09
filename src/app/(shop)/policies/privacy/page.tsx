import type { Metadata } from "next";
import PrivacyClient from "./PrivacyClient";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Privacy Policy for WESTHOME by BM Distributors — how we collect, use, and protect your personal information.",
  alternates: { canonical: "/policies/privacy" },
  openGraph: {
    title: "Privacy Policy | WESTHOME",
    description: "How we collect, use, and protect your personal information.",
    url: "/policies/privacy",
  },
};

export default function Page() {
  return <PrivacyClient />;
}
