"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Menu, Store, ChevronRight, Search, Plus, ExternalLink } from "lucide-react";
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
  sidebarWidthClass,
  contentMarginClass,
  userRoleFallback = "",
  redirectForRole,
}: {
  children: React.ReactNode;
  nav: NavGroup[];
  panelLabel: string;
  homePath: string;
  breadcrumbRoot: string;
  sidebarWidthClass: string;
  contentMarginClass: string;
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
      // Send them back to the page they were on once they sign in.
      router.push(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
    } else if (status === "authenticated" && redirectForRole) {
      const dest = redirectForRole(userRole);
      if (dest) router.push(dest);
    }
  }, [status, router, userRole, redirectForRole, pathname]);

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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(181,108,69,0.035),transparent_28%),#f7f6f3]">
      {/* Mobile overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 transition-all duration-300 lg:hidden",
          sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        aria-hidden={!sidebarOpen}
      >
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-full flex-col border-r border-[#e1e3e5] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-transform duration-300 lg:translate-x-0",
          sidebarWidthClass,
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
        aria-label="Admin navigation"
      >
        {/* Brand header */}
        <div className="px-4 py-4 border-b border-[#e1e3e5]">
          <Link href={homePath} className="flex flex-col gap-0.5">
            <WestHomeLogo size="sm" plain />
            <div className="mt-2.5 inline-flex items-center gap-2 rounded-md bg-[#f6f6f7] px-2.5 py-1.5">
              <div className="relative h-1.5 w-1.5 rounded-full bg-[#b56c45]"><span className="absolute inset-0 animate-ping rounded-full bg-[#b56c45]/40" /></div>
              <span className="text-[9px] text-panel-label tracking-wider uppercase font-medium">{panelLabel} Panel</span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-2.5 py-3">
          {visibleGroups.map((group) => (
            <div key={group.title || "nav"}>
              {group.title && (
                <p className="text-[9px] font-semibold text-panel-icon uppercase tracking-[.12em] px-3 mb-1.5">{group.title}</p>
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
                        "relative flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium transition-all duration-150 group",
                        isActive
                          ? "bg-[#2c1f17] text-white shadow-[0_6px_18px_rgba(44,31,23,0.14)]"
                          : "text-panel-text hover:bg-black/[0.035] hover:text-panel-text-strong"
                      )}
                    >
                      {isActive && <span className="absolute left-0 h-5 w-0.5 rounded-full bg-[#008060]" />}
                      <span className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-lg transition-colors",
                        isActive ? "bg-white" : "bg-[#f6f6f7] group-hover:bg-white"
                      )}>
                        <Icon size={15} className={cn(isActive ? "text-[#008060]" : "text-panel-icon group-hover:text-panel-label")} />
                      </span>
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-[#e1e3e5] p-3 space-y-1">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium text-panel-text transition-all hover:bg-black/[0.035] hover:text-panel-text-strong"
          >
            <Store size={16} className="text-panel-icon" />
            View Store
          </Link>
          <button
            onClick={async () => { const { signOut } = await import("next-auth/react"); await signOut({ callbackUrl: "/login" }); }}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium text-panel-text transition-all hover:bg-black/[0.035] hover:text-panel-text-strong"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-panel-icon"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className={contentMarginClass}>
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-[#e1e3e5] bg-white px-3 sm:gap-4 sm:px-5 md:px-7">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={sidebarOpen}
            className="-ml-1 rounded-xl p-2 text-panel-text transition-colors hover:bg-panel-hover lg:hidden"
          >
            <Menu size={18} />
          </button>

          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="hidden min-w-[280px] max-w-[460px] flex-1 items-center gap-2 rounded-md border border-[#c9cccf] bg-[#f6f6f7] px-3 py-2 md:flex">
              <Search size={15} className="text-[#6d7175]" />
              <input
                aria-label="Search admin"
                placeholder="Search products, orders, customers"
                className="w-full bg-transparent text-[13px] outline-none placeholder:text-[#8c9196]"
              />
              <kbd className="rounded border border-[#d2d5d8] bg-white px-1.5 py-0.5 text-[10px] text-[#6d7175]">⌘ K</kbd>
            </div>
            <div className="flex min-w-0 items-center gap-1.5 text-sm md:hidden">
              <span className="truncate font-semibold text-[#202223]">{currentPageLabel}</span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Link href="/admin/products/new" className="hidden items-center gap-1.5 rounded-md bg-[#008060] px-3 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#006e52] sm:flex">
              <Plus size={14} /> Add product
            </Link>
            <NotificationBell />
            <div className="mx-0.5 hidden h-6 w-px bg-[#e1e3e5] sm:block" />
            <ProfileMenu userName={userName} userRole={userRole} userInitials={initials} basePath={`/${breadcrumbRoot.toLowerCase()}`} />
          </div>
        </header>

        {/* Page content */}
        <main className="mx-auto w-full max-w-[1500px] p-3 sm:p-4 md:p-6 lg:px-8 lg:py-7">
          {children}
        </main>
      </div>
    </div>
  );
}
