"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard, Package, FolderTree, ShoppingCart, Users,
  Home, Tag, Percent, Settings, FileText, Menu, BarChart3, ImageIcon, 
  ChevronRight,  Store,
} from "lucide-react";
import { cn } from "@/lib/utils";
import WestHomeLogo from "@/components/ui/WestHomeLogo";
import NotificationBell from "@/components/admin/NotificationBell";
import ProfileMenu from "@/components/admin/ProfileMenu";

type NavItem = { label: string; href: string; icon: React.ComponentType<{ size?: number; className?: string }>; adminOnly?: boolean };
type NavGroup = { title: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Commerce",
    items: [
      { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
      { label: "Products", href: "/admin/products", icon: Package },
      { label: "Categories", href: "/admin/categories", icon: FolderTree },
      { label: "Orders", href: "/admin/orders", icon: ShoppingCart },
      { label: "Customers", href: "/admin/customers", icon: Users },
    ],
  },
  {
    title: "Management",
    items: [
      { label: "Staff", href: "/admin/staff", icon: Users, adminOnly: true },
    ],
  },
  {
    title: "Storefront",
    items: [
      { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
      { label: "Homepage", href: "/admin/homepage", icon: Home },
      { label: "Hero Image", href: "/admin/settings#hero-image", icon: ImageIcon },
      { label: "Content", href: "/admin/content", icon: FileText },
    ],
  },
  {
    title: "Marketing",
    items: [
      { label: "Coupons", href: "/admin/coupons", icon: Percent },
      { label: "Promotions", href: "/admin/promotions", icon: Tag },
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
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const user = session?.user as any;
  const userName = user?.name || "Admin";
  const userRole = user?.role || "ADMIN";

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
    // Note: MANAGER and PRODUCT_MANAGER now have access to the admin panel
    // for full product management. Only STAFF role redirects to /staff.
  }, [status, router, userRole]);
  const initials = userName.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);



  const currentPageLabel = NAV_GROUPS.flatMap((g) => g.items).find((item) => pathname.startsWith(item.href))?.label || "Dashboard";

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
          "fixed top-0 left-0 z-50 h-full w-[260px] bg-[#faf8f5] border-r border-black/[.06] transition-transform duration-300 lg:translate-x-0 flex flex-col",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand header */}
        <div className="px-5 py-5 border-b border-black/[.06]">
          <Link href="/admin/dashboard" className="flex flex-col gap-0.5">
            <WestHomeLogo size="sm" plain />
            <div className="mt-1.5 inline-flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[9px] text-[#8a857f] tracking-wider uppercase font-medium">Admin Panel</span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {NAV_GROUPS.map((group) => (
            <div key={group.title}>
              <p className="text-[9px] font-semibold text-[#b0aba6] uppercase tracking-[.12em] px-3 mb-1.5">{group.title}</p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  if (item.adminOnly && userRole !== "ADMIN") return null;
                  const isActive = pathname.startsWith(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-150 group",
                        isActive
                          ? "bg-stone-900 text-white shadow-sm"
                          : "text-[#6b6560] hover:text-[#1a1917] hover:bg-black/[.03]"
                      )}
                    >
                      <Icon size={16} className={cn(isActive ? "text-white/70" : "text-[#b0aba6] group-hover:text-[#8a857f]")} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-black/[.06] space-y-0.5">
          <Link
            href="/"
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium text-[#6b6560] hover:text-[#1a1917] hover:bg-black/[.03] transition-all"
          >
            <Store size={16} className="text-[#b0aba6]" />
            View Store
          </Link>
          <button
            onClick={async () => { const { signOut } = await import("next-auth/react"); await signOut({ callbackUrl: "/login" }); }}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium text-[#6b6560] hover:text-[#1a1917] hover:bg-black/[.03] transition-all w-full"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#b0aba6]"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:ml-[260px]">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-[#f7f5f2]/80 backdrop-blur-lg border-b border-black/[.06] h-14 flex items-center px-4 md:px-6 gap-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 hover:bg-black/[.04] rounded-xl transition-colors"
          >
            <Menu size={18} />
          </button>

          {/* Breadcrumb */}
          <div className="flex-1 flex items-center gap-1.5 text-sm">
            <span className="text-[#b0aba6]">Admin</span>
            <ChevronRight size={12} className="text-[#d1ccc6]" />
            <span className="font-medium text-[#1a1917]">{currentPageLabel}</span>
          </div>

          <div className="flex items-center gap-2">
            <NotificationBell accentRing="ring-[#f7f5f2]" />
            <div className="w-px h-6 bg-black/[.08] mx-1" />
            <ProfileMenu userName={userName} userRole={userRole} userInitials={initials} basePath="/admin" accentRing="ring-[#f7f5f2]" />
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 md:p-6 lg:p-8 max-w-[1400px]">
          {children}
        </main>
      </div>
    </div>
  );
}
