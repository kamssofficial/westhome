import type { Metadata } from "next";
import { Suspense } from "react";
import RegisterClient from "./RegisterClient";

export const metadata: Metadata = {
  title: "Create Account",
  description:
    "Join the WESTHOME community — create an account to track orders, save addresses, and checkout faster.",
  alternates: { canonical: "/register" },
};

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-sm text-[#6b6560]">Loading...</p></div>}>
      <RegisterClient />
    </Suspense>
  );
}
