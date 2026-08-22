"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard, Package, FolderTree, ShoppingCart, Users,
  Home, Tag, Percent, Settings, FileText, Menu, X, Bell,
  ChevronRight, LogOut, Store,
} from "lucide-react";
import { cn } from "@/lib/utils";
import WestHomeLogo from "@/components/ui/WestHomeLogo";

type NavItem = { label: string; href: string; icon: React.ComponentType<{ size?: number; className?: string }>; adminOnly?: boolean };
type NavDivider = { divider: true };

const NAV_ITEMS: (NavItem | NavDivider)[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Products", href: "/admin/products", icon: Package },
  { label: "Categories", href: "/admin/categories", icon: FolderTree },
  { label: "Orders", href: "/admin/orders", icon: ShoppingCart },
  { label: "Customers", href: "/admin/customers", icon: Users },
  { divider: true },
  { label: "Staff", href: "/admin/staff", icon: Users, adminOnly: true },
  { label: "Homepage", href: "/admin/homepage", icon: Home },
  { label: "Coupons", href: "/admin/coupons", icon: Percent },
  { label: "Promotions", href: "/admin/promotions", icon: Tag },
  { label: "Content", href: "/admin/content", icon: FileText },
  { divider: true },
  { label: "Settings", href: "/admin/settings", icon: Settings, adminOnly: true },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const user = session?.user as any;
  const userName = user?.name || "Admin";
  const userRole = user?.role || "ADMIN";

  // Redirect unauthenticated users to universal login
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && userRole === "MANAGER") {
      router.push("/staff/dashboard");
    }
  }, [status, router, userRole]);
  const initials = userName.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  return (
    <div className="min-h-screen bg-stone-50">
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
          "fixed top-0 left-0 z-50 h-full w-64 bg-background border-r border-border transition-transform duration-300 lg:translate-x-0 flex flex-col",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand header */}
        <div className="p-5 border-b border-border">
          <Link href="/admin/dashboard" className="flex flex-col gap-0.5">
            <WestHomeLogo size="sm" />
            <div className="mt-1.5 inline-flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[9px] text-text-muted tracking-wider uppercase font-medium">Admin Panel</span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {NAV_ITEMS.map((item, i) => {
            if ("divider" in item) {
              return <div key={`div-${i}`} className="my-2 border-t border-border mx-2" />;
            }
            const navItem = item as NavItem;
            if (navItem.adminOnly && userRole !== "ADMIN") return null;
            const isActive = pathname.startsWith(navItem.href);
            const Icon = navItem.icon;
            return (
              <Link
                key={navItem.href}
                href={navItem.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 group",
                  isActive
                    ? "bg-gradient-to-r from-stone-900 to-stone-800 text-white shadow-sm"
                    : "text-text-secondary hover:text-foreground hover:bg-surface-muted"
                )}
              >
                <Icon size={17} className={cn(isActive ? "text-white/80" : "text-text-muted group-hover:text-text-secondary")} />
                {navItem.label}
                {isActive && (
                  <ChevronRight size={14} className="ml-auto text-white/40" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-border space-y-1">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-text-secondary hover:text-foreground hover:bg-surface-muted transition-all w-full"
          >
            <LogOut size={17} className="text-text-muted" />
            Sign Out
          </button>
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-text-secondary hover:text-foreground hover:bg-surface-muted transition-all"
          >
            <Store size={17} className="text-text-muted" />
            View Store
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border h-14 flex items-center px-4 md:px-6 gap-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 hover:bg-surface-muted rounded-xl transition-colors"
          >
            <Menu size={18} />
          </button>

          {/* Breadcrumb */}
          <div className="flex-1 flex items-center gap-1.5 text-sm">
            <span className="text-text-muted">Admin</span>
            <ChevronRight size={12} className="text-text-muted" />
            <span className="font-medium">
              {(NAV_ITEMS.filter((item) => "href" in item) as NavItem[]).find(
                (item) => pathname.startsWith(item.href)
              )?.label || "Dashboard"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button className="relative p-2 hover:bg-surface-muted rounded-xl transition-colors">
              <Bell size={17} className="text-text-secondary" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full ring-2 ring-white" />
            </button>
            <div className="w-px h-6 bg-stone-200 mx-1" />
            <div className="flex items-center gap-2.5 pl-1">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-stone-700 to-stone-900 flex items-center justify-center">
                <span className="text-white text-xs font-medium">{initials}</span>
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium leading-none">{userName}</p>
                <p className="text-[10px] text-text-muted mt-0.5">{userRole === "ADMIN" ? "Owner" : userRole.replace(/_/g, " ")}</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="p-2 hover:bg-surface-muted rounded-xl transition-colors"
              title="Sign out"
            >
              <LogOut size={17} className="text-text-secondary" />
            </button>
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
