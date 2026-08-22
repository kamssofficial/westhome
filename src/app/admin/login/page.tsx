import { redirect } from "next/navigation";

// Admin login is now unified at /login
// This page redirects to the universal login page
export default function AdminLoginPage() {
  redirect("/login");
}
