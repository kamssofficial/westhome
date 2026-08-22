"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard, Package, ShoppingCart, Users,
  Menu, X, Bell, ChevronRight, LogOut, Store,
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

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const user = session?.user as any;
  const userRole = user?.role || "MANAGER";

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && userRole === "ADMIN") {
      router.push("/admin/dashboard");
    }
  }, [status, router, userRole]);

  const userName = user?.name || "Staff";
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
          <Link href="/staff/dashboard" className="flex flex-col gap-0.5">
            <WestHomeLogo size="sm" />
            <div className="mt-1.5 inline-flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span className="text-[9px] text-text-muted tracking-wider uppercase font-medium">Staff Panel</span>
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
                    ? "bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow-sm"
                    : "text-text-secondary hover:text-foreground hover:bg-surface-muted"
                )}
              >
                <Icon size={17} className={cn(isActive ? "text-white/80" : "text-text-muted group-hover:text-text-secondary")} />
                {item.label}
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
            <span className="text-text-muted">Staff</span>
            <ChevronRight size={12} className="text-text-muted" />
            <span className="font-medium">
              {NAV_ITEMS.find((item) => pathname.startsWith(item.href))?.label || "Dashboard"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button className="relative p-2 hover:bg-surface-muted rounded-xl transition-colors">
              <Bell size={17} className="text-text-secondary" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full ring-2 ring-white" />
            </button>
            <div className="w-px h-6 bg-stone-200 mx-1" />
            <div className="flex items-center gap-2.5 pl-1">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                <span className="text-white text-xs font-medium">{initials}</span>
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium leading-none">{userName}</p>
                <p className="text-[10px] text-text-muted mt-0.5">Staff</p>
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
