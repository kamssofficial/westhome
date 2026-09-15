"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { ArrowLeft, ShoppingBag, Heart, MapPin, CreditCard, Settings, HelpCircle, LogOut, ChevronRight, User } from "lucide-react";

interface UserData {
  name: string;
  email: string;
  role: string;
}

const MENU_ITEMS = [
  { label: "My Orders", href: "/account/orders", icon: ShoppingBag },
  { label: "Wishlist", href: "/account/wishlist", icon: Heart },
  { label: "Addresses", href: "/account/addresses", icon: MapPin },
  { label: "Payment Methods", href: "/account/payment-methods", icon: CreditCard },
  { label: "Account Settings", href: "/account/settings", icon: Settings },
  { label: "Help & Support", href: "/contact", icon: HelpCircle },
];

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data) => {
        if (data?.user) {
          const role = data.user.role;
          // SAFETY: redirect admin/staff away from customer account
          if (role === "ADMIN") {
            window.location.href = "/admin/dashboard";
            return;
          }
          const staffRoles = ["MANAGER", "ORDER_MANAGER", "PRODUCT_MANAGER", "CONTENT_MANAGER"];
          if (staffRoles.includes(role)) {
            window.location.href = "/staff/dashboard";
            return;
          }
          setUser({ name: data.user.name || "Guest", email: data.user.email || "", role });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Show loading while checking role
  if (loading && !user) {
    return (
      <div className="animate-fade-in">
        <div className="px-4 pt-3 pb-2 flex items-center gap-3">
          <div className="w-7" />
          <div className="flex-1 text-center"><p className="text-sm font-semibold text-primary">My Account</p></div>
          <div className="w-7" />
        </div>
        <div className="px-4 py-4">
          <div className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-surface-muted animate-pulse" />
            <div className="space-y-2">
              <div className="skeleton h-4 w-24" />
              <div className="skeleton h-3 w-16" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="px-4 pt-3 pb-2 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1 hover:bg-surface-muted rounded-lg transition-colors"><ArrowLeft size={20} /></button>
        <div className="flex-1 text-center"><p className="text-sm font-semibold text-primary">My Account</p></div>
        <div className="w-7" />
      </div>

      <div className="px-4 py-4">
        <div className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-surface-muted flex items-center justify-center">
            <User size={24} className="text-secondary" />
          </div>
          <div>
            {user ? (
              <>
                <p className="text-sm font-semibold text-primary">{user.name}</p>
                <Link href="/account/settings" className="text-xs text-accent font-medium">View Profile</Link>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-primary">Guest User</p>
                <Link href="/login" className="text-xs text-accent font-medium">Sign in</Link>
              </>
            )}
          </div>
        </div>
      </div>

      {user ? (
        <>
          <div className="px-4">
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              {MENU_ITEMS.map((item, i) => {
                const Icon = item.icon;
                return (
                  <Link key={"menu-" + i} href={item.href} className={"flex items-center justify-between px-4 py-3.5 hover:bg-surface-muted transition-colors " + (i < MENU_ITEMS.length - 1 ? "border-b border-border" : "")}>
                    <div className="flex items-center gap-3">
                      <Icon size={18} className="text-secondary" />
                      <span className="text-sm font-medium text-primary">{item.label}</span>
                    </div>
                    <ChevronRight size={16} className="text-text-muted" />
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="px-4 mt-4 pb-8">
            <button onClick={() => signOut({ callbackUrl: "/" })} className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-error hover:bg-error/5 rounded-xl transition-colors">
              <LogOut size={16} /> Logout
            </button>
          </div>
        </>
      ) : (
        <div className="px-4 mt-4 pb-8">
          <Link href="/login" className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-xl transition-colors">
            Sign in to view your account
          </Link>
        </div>
      )}
    </div>
  );
}
