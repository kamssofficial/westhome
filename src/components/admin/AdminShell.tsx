"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Menu, Store, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import WestHomeLogo from "@/components/ui/WestHomeLogo";
import NotificationBell from "@/components/admin/NotificationBell";
import ProfileMenu from "@/components/admin/ProfileMenu";

export type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  /** Visible to ADMIN only (and users whose role list does not include it). */
  adminOnly?: boolean;
  /** When present, only these roles see the item. ADMIN always sees everything. */
  roles?: string[];
};
export type NavGroup = { title?: string; items: NavItem[] };

export default function AdminShell({
  children,
  nav,
  panelLabel,
  homePath,
  breadcrumbRoot,
  accentRing,
  sidebarWidthClass,
  contentMarginClass,
  headerBgClass,
  brandDotClass,
  userRoleFallback = "",
  redirectForRole,
}: {
  children: React.ReactNode;
  nav: NavGroup[];
  panelLabel: string;
  homePath: string;
  breadcrumbRoot: string;
  accentRing: string;
  sidebarWidthClass: string;
  contentMarginClass: string;
  headerBgClass: string;
  brandDotClass: string;
  userRoleFallback?: string;
  /** Client-side role redirect (server middleware enforces the real rules). */
  redirectForRole?: (role: string) => string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const user = session?.user as any;
  const userRole = user?.role || userRoleFallback;
  const userName = user?.name || panelLabel;
  const initials = userName.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && redirectForRole) {
      const dest = redirectForRole(userRole);
      if (dest) router.push(dest);
    }
  }, [status, router, userRole, redirectForRole]);

  const visibleGroups = nav
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (userRole === "ADMIN") return true;
        if (item.adminOnly) return false;
        return !item.roles || item.roles.includes(userRole);
      }),
    }))
    .filter((group) => group.items.length > 0);

  const currentPageLabel =
    nav.flatMap((g) => g.items).find((item) => pathname.startsWith(item.href))?.label || "Dashboard";

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
          "fixed top-0 left-0 z-50 h-full bg-[#faf8f5] border-r border-black/[.06] transition-transform duration-300 lg:translate-x-0 flex flex-col",
          sidebarWidthClass,
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand header */}
        <div className="px-5 py-5 border-b border-black/[.06]">
          <Link href={homePath} className="flex flex-col gap-0.5">
            <WestHomeLogo size="sm" plain />
            <div className="mt-1.5 inline-flex items-center gap-1.5">
              <div className={cn("w-1.5 h-1.5 rounded-full", brandDotClass)} />
              <span className="text-[9px] text-[#8a857f] tracking-wider uppercase font-medium">{panelLabel} Panel</span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {visibleGroups.map((group) => (
            <div key={group.title || "nav"}>
              {group.title && (
                <p className="text-[9px] font-semibold text-[#b0aba6] uppercase tracking-[.12em] px-3 mb-1.5">{group.title}</p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
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
      <div className={contentMarginClass}>
        {/* Top bar */}
        <header className={cn("sticky top-0 z-30 backdrop-blur-lg border-b border-black/[.06] h-14 flex items-center px-4 md:px-6 gap-4", headerBgClass)}>
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 hover:bg-black/[.04] rounded-xl transition-colors"
          >
            <Menu size={18} />
          </button>

          {/* Breadcrumb */}
          <div className="flex-1 flex items-center gap-1.5 text-sm">
            <span className="text-[#b0aba6]">{breadcrumbRoot}</span>
            <ChevronRight size={12} className="text-[#d1ccc6]" />
            <span className="font-medium text-[#1a1917]">{currentPageLabel}</span>
          </div>

          <div className="flex items-center gap-2">
            <NotificationBell accentRing={accentRing} />
            <div className="w-px h-6 bg-black/[.08] mx-1" />
            <ProfileMenu userName={userName} userRole={userRole} userInitials={initials} basePath={breadcrumbRoot.toLowerCase()} accentRing={accentRing} />
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