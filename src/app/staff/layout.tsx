"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard, Package, ShoppingCart, Users,
  Menu, Store, Tag, Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import WestHomeLogo from "@/components/ui/WestHomeLogo";
import NotificationBell from "@/components/admin/NotificationBell";
import ProfileMenu from "@/components/admin/ProfileMenu";

type NavItem = { label: string; href: string; icon: React.ComponentType<{ size?: number; className?: string }> };

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/staff/dashboard", icon: LayoutDashboard },
  { label: "Orders", href: "/staff/orders", icon: ShoppingCart },
  { label: "Products", href: "/staff/products", icon: Package },
  { label: "Customers", href: "/staff/customers", icon: Users },
  { label: "Categories", href: "/staff/categories", icon: Tag },
  { label: "Settings", href: "/staff/settings", icon: Settings },
];

const PAGE_TITLES: Record<string, string> = {
  "/staff/dashboard": "Dashboard",
  "/staff/orders": "Orders",
  "/staff/products": "Products",
  "/staff/customers": "Customers",
  "/staff/categories": "Categories",
  "/staff/settings": "Settings",
};

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const user = session?.user as any;
  const userRole = user?.role || "MANAGER";

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    else if (status === "authenticated" && userRole === "ADMIN") router.push("/admin/dashboard");
    else if (status === "authenticated" && !(["MANAGER", "ORDER_MANAGER", "PRODUCT_MANAGER", "CONTENT_MANAGER"].includes(userRole))) router.push("/");
  }, [status, router, userRole]);

  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  const userName = user?.name || "Staff";
  const initials = userName.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
  const pageTitle = PAGE_TITLES[pathname] || "Dashboard";



  return (
    <div className="min-h-screen bg-[#f7f5f2]">
      {/* Mobile overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 lg:hidden transition-all duration-300",
          sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-64 bg-[#faf8f5] border-r border-black/[.06] transition-transform duration-300 lg:translate-x-0 flex flex-col",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand */}
        <div className="p-5 border-b border-black/[.06]">
          <Link href="/staff/dashboard" className="flex flex-col gap-0.5">
            <WestHomeLogo size="sm" plain />
            <div className="mt-2 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#d4a574]" />
              <span className="text-[9px] text-[#b0aba6] tracking-[.12em] uppercase font-medium">Staff Panel</span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 group",
                  isActive
                    ? "bg-stone-900 text-white shadow-sm"
                    : "text-[#6b6560] hover:text-[#1a1917] hover:bg-black/[.04]"
                )}
              >
                <Icon size={17} className={cn(isActive ? "text-white/70" : "text-[#b0aba6] group-hover:text-[#6b6560]")} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-black/[.06] space-y-0.5">
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-[#6b6560] hover:text-[#1a1917] hover:bg-black/[.04] transition-all"
          >
            <Store size={17} className="text-[#b0aba6]" />
            View Store
          </Link>
          <button
            onClick={async () => { const { signOut } = await import("next-auth/react"); await signOut({ callbackUrl: "/login" }); }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-[#6b6560] hover:text-[#1a1917] hover:bg-black/[.04] transition-all w-full"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#b0aba6]"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-[#faf8f5]/80 backdrop-blur-lg border-b border-black/[.06] h-14 flex items-center px-4 md:px-6 gap-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 hover:bg-black/[.04] rounded-xl transition-colors"
          >
            <Menu size={18} className="text-[#1a1917]" />
          </button>

          <div className="flex-1 flex items-center gap-1.5 text-sm">
            <span className="text-[#b0aba6]">Staff</span>
            <span className="text-[#b0aba6] text-xs">/</span>
            <span className="font-medium text-[#1a1917]">{pageTitle}</span>
          </div>

          <div className="flex items-center gap-2">
            <NotificationBell accentRing="ring-[#faf8f5]" basePath="/staff" />
            <div className="w-px h-6 bg-black/[.08] mx-1" />
            <ProfileMenu userName={userName} userRole={userRole} userInitials={initials} basePath="/staff" accentRing="ring-[#faf8f5]" />
          </div>
        </header>

        <main className="p-4 md:p-6 lg:p-8 max-w-[1400px]">
          {children}
        </main>
      </div>
    </div>
  );
}
