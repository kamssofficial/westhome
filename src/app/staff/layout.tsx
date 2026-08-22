"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard, Package, ShoppingCart, Users,
  Menu, X, Bell, LogOut, Store,
} from "lucide-react";
import { cn } from "@/lib/utils";
import WestHomeLogo from "@/components/ui/WestHomeLogo";

type NavItem = { label: string; href: string; icon: React.ComponentType<{ size?: number; className?: string }> };

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/staff/dashboard", icon: LayoutDashboard },
  { label: "Orders", href: "/staff/orders", icon: ShoppingCart },
  { label: "Products", href: "/staff/products", icon: Package },
  { label: "Customers", href: "/staff/customers", icon: Users },
];

const PAGE_TITLES: Record<string, string> = {
  "/staff/dashboard": "Dashboard",
  "/staff/orders": "Orders",
  "/staff/products": "Products",
  "/staff/customers": "Customers",
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

  const handleSignOut = async () => { await signOut({ callbackUrl: "/login" }); };

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
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-[#6b6560] hover:text-[#1a1917] hover:bg-black/[.04] transition-all w-full"
          >
            <LogOut size={17} className="text-[#b0aba6]" />
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
            <button className="relative p-2 hover:bg-black/[.04] rounded-xl transition-colors">
              <Bell size={17} className="text-[#6b6560]" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#d4a574] rounded-full ring-2 ring-[#faf8f5]" />
            </button>
            <div className="w-px h-6 bg-black/[.08] mx-1" />
            <div className="flex items-center gap-2.5 pl-1">
              <div className="w-8 h-8 rounded-full bg-stone-800 flex items-center justify-center">
                <span className="text-white text-xs font-medium">{initials}</span>
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium text-[#1a1917] leading-none">{userName}</p>
                <p className="text-[10px] text-[#b0aba6] mt-0.5">Staff</p>
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 md:p-6 lg:p-8 max-w-[1400px]">
          {children}
        </main>
      </div>
    </div>
  );
}
