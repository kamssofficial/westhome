import type { Metadata } from "next";
import TermsClient from "./TermsClient";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms of Service for WESTHOME by BM Distributors — rules and guidelines for using our website and services.",
  alternates: { canonical: "/policies/terms" },
  openGraph: {
    title: "Terms of Service | WESTHOME",
    description: "Rules and guidelines for using our website and services.",
    url: "/policies/terms",
  },
};

export default function Page() {
  return <TermsClient />;
}
