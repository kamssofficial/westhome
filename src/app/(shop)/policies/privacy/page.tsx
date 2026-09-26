import type { Metadata } from "next";
import PrivacyClient from "./PrivacyClient";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Privacy Policy for WEST HOME by BM Distributors — how we collect, use, and protect your personal information.",
  alternates: { canonical: "/policies/privacy" },
  openGraph: {
    title: "Privacy Policy | WEST HOME",
    description: "How we collect, use, and protect your personal information.",
    url: "/policies/privacy",
  },
};

export default function Page() {
  return <PrivacyClient />;
}
