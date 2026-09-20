"use client";

import {
  LayoutDashboard, Package, FolderTree, ShoppingCart, Users,
  Home, Tag, Percent, Settings, FileText, ScrollText,
} from "lucide-react";
import AdminShell, { type NavGroup } from "@/components/admin/AdminShell";

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Commerce",
    items: [
      { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard, roles: ["MANAGER", "ORDER_MANAGER", "PRODUCT_MANAGER", "CONTENT_MANAGER", "STAFF"] },
      { label: "Products", href: "/admin/products", icon: Package, roles: ["MANAGER", "PRODUCT_MANAGER"] },
      { label: "Categories", href: "/admin/categories", icon: FolderTree, roles: ["MANAGER", "PRODUCT_MANAGER", "CONTENT_MANAGER"] },
      { label: "Orders", href: "/admin/orders", icon: ShoppingCart, roles: ["MANAGER", "ORDER_MANAGER"] },
      { label: "Customers", href: "/admin/customers", icon: Users, roles: ["MANAGER"] },
    ],
  },
  {
    title: "Management",
    items: [
      { label: "Staff", href: "/admin/staff", icon: Users, adminOnly: true },
      { label: "Audit Log", href: "/admin/audit", icon: ScrollText, adminOnly: true },
    ],
  },
  {
    title: "Storefront",
    items: [
      { label: "Homepage", href: "/admin/homepage", icon: Home, roles: ["MANAGER", "CONTENT_MANAGER"] },
      { label: "Content", href: "/admin/content", icon: FileText, roles: ["MANAGER", "CONTENT_MANAGER"] },
    ],
  },
  {
    title: "Marketing",
    items: [
      { label: "Coupons", href: "/admin/coupons", icon: Percent, adminOnly: true },
      { label: "Promotions", href: "/admin/promotions", icon: Tag, roles: ["MANAGER"] },
    ],
  },
  {
    title: "Configuration",
    items: [
      { label: "Settings", href: "/admin/settings", icon: Settings, adminOnly: true },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    // `admin-theme` re-points the accent token at deep teal for everything under
    // /admin. Scoped here, not inside AdminShell, so the /staff panel keeps the
    // brand terracotta.
    <div className="admin-theme">
      <AdminShell
        nav={NAV_GROUPS}
        panelLabel="Admin"
        homePath="/admin/dashboard"
        breadcrumbRoot="Admin"
        accentRing="ring-[#f7f5f2]"
        sidebarWidthClass="w-[260px]"
        contentMarginClass="lg:ml-[260px]"
        headerBgClass="bg-[#f7f5f2]/80"
        brandDotClass="bg-emerald-500"
      >
        {children}
      </AdminShell>
    </div>
  );
}
