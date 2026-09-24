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
    <div className="min-h-screen bg-panel">
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
          "fixed left-0 top-0 z-50 flex h-full flex-col border-r border-panel-border bg-panel-surface transition-transform duration-300 lg:translate-x-0",
          sidebarWidthClass,
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
        aria-label="Admin navigation"
      >
        {/* Brand header */}
        <div className="px-5 py-5 border-b border-panel-border">
          <Link href={homePath} className="flex flex-col gap-0.5">
            <WestHomeLogo size="sm" plain />
            <div className="mt-1.5 inline-flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-panel-mark" />
              <span className="text-[9px] text-panel-label tracking-wider uppercase font-medium">{panelLabel} Panel</span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-5 overflow-y-auto overscroll-contain px-3 py-4">
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
                        "flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-150 group",
                        isActive
                          ? "bg-panel-active text-panel-active-text shadow-sm"
                          : "text-panel-text hover:text-panel-text-strong hover:bg-panel-hover"
                      )}
                    >
                      <Icon size={16} className={cn(isActive ? "text-panel-active-text/70" : "text-panel-icon group-hover:text-panel-label")} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-panel-border space-y-0.5">
          <Link
            href="/"
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium text-panel-text hover:text-panel-text-strong hover:bg-panel-hover transition-all"
          >
            <Store size={16} className="text-panel-icon" />
            View Store
          </Link>
          <button
            onClick={async () => { const { signOut } = await import("next-auth/react"); await signOut({ callbackUrl: "/login" }); }}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium text-panel-text hover:text-panel-text-strong hover:bg-panel-hover transition-all w-full"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-panel-icon"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className={contentMarginClass}>
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-panel-border bg-panel-header/85 px-3 backdrop-blur-lg sm:gap-4 sm:px-4 md:px-6">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={sidebarOpen}
            className="-ml-1 rounded-xl p-2 text-panel-text transition-colors hover:bg-panel-hover lg:hidden"
          >
            <Menu size={18} />
          </button>

          {/* Breadcrumb — the root is decoration, so it yields to the page
              label on the narrowest screens instead of wrapping. */}
          <div className="flex min-w-0 flex-1 items-center gap-1.5 text-sm">
            <span className="hidden shrink-0 text-panel-icon sm:inline">{breadcrumbRoot}</span>
            <ChevronRight size={12} className="hidden shrink-0 text-panel-icon/70 sm:block" />
            <span className="truncate font-medium text-panel-text-strong">{currentPageLabel}</span>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <NotificationBell />
            <div className="mx-0.5 hidden h-6 w-px bg-panel-border sm:block" />
            <ProfileMenu userName={userName} userRole={userRole} userInitials={initials} basePath={`/${breadcrumbRoot.toLowerCase()}`} />
          </div>
        </header>

        {/* Page content */}
        <main className="mx-auto w-full max-w-[1400px] p-3 sm:p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
