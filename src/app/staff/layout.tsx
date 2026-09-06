"use client";

import { LayoutDashboard, Package, ShoppingCart, Users, FolderTree } from "lucide-react";
import AdminShell, { type NavGroup } from "@/components/admin/AdminShell";

const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { label: "Dashboard", href: "/staff/dashboard", icon: LayoutDashboard },
      { label: "Orders", href: "/staff/orders", icon: ShoppingCart },
      { label: "Products", href: "/staff/products", icon: Package },
      { label: "Categories", href: "/staff/categories", icon: FolderTree },
      { label: "Customers", href: "/staff/customers", icon: Users },
    ],
  },
];

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminShell
      nav={NAV_GROUPS}
      panelLabel="Staff"
      homePath="/staff/dashboard"
      breadcrumbRoot="Staff"
      accentRing="ring-[#faf8f5]"
      sidebarWidthClass="w-64"
      contentMarginClass="lg:ml-64"
      headerBgClass="bg-[#faf8f5]/80"
      brandDotClass="bg-[#d4a574]"
      userRoleFallback="MANAGER"
      redirectForRole={(role) => {
        if (role === "ADMIN") return "/admin/dashboard";
        if (!["MANAGER", "ORDER_MANAGER", "PRODUCT_MANAGER", "CONTENT_MANAGER"].includes(role)) return "/";
        return null;
      }}
    >
      {children}
    </AdminShell>
  );
}