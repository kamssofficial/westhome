import type { Metadata } from "next";
import LoginClient from "./LoginClient";

export const metadata: Metadata = {
  title: "Sign In",
  description:
    "Sign in to your WEST HOME account to track orders, manage addresses, and checkout faster.",
  alternates: { canonical: "/login" },
};

export default function Page() {
  return <LoginClient />;
}
