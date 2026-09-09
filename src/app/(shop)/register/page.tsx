import type { Metadata } from "next";
import RegisterClient from "./RegisterClient";

export const metadata: Metadata = {
  title: "Create Account",
  description:
    "Join the WESTHOME community — create an account to track orders, save addresses, and checkout faster.",
  alternates: { canonical: "/register" },
};

export default function Page() {
  return <RegisterClient />;
}
