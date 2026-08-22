import { redirect } from "next/navigation";

// Staff login is now unified at /login
// This page redirects to the universal login page
export default function StaffLoginPage() {
  redirect("/login");
}
