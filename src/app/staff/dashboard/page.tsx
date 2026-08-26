"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Package, ShoppingCart, Users, AlertTriangle, Eye, ArrowUpRight, Clock, CheckCircle2, Bell } from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import { useSession } from "next-auth/react";
import NotificationBell from "@/components/admin/NotificationBell";

interface Stats {
  revenue: number;
  orders: number;
  pendingOrders: number;
  products: number;
  customers: number;
  lowStockProducts: number;
  recentOrders: { id: string; orderNumber: string; customerName: string; total: number; status: string; createdAt: string }[];
  lowStockProductsList: { id: string; name: string; stockQuantity: number; regularPrice: number }[];
}

const STATUS_STYLES: Record<string, string> = {
  NEW: "bg-blue-50 text-blue-700 border border-blue-200",
  CONFIRMED: "bg-indigo-50 text-indigo-700 border border-indigo-200",
  PROCESSING: "bg-purple-50 text-purple-700 border border-purple-200",
  SHIPPED: "bg-cyan-50 text-cyan-700 border border-cyan-200",
  OUT_FOR_DELIVERY: "bg-orange-50 text-orange-700 border border-orange-200",
  DELIVERED: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  CANCELLED: "bg-red-50 text-red-700 border border-red-200",
  ON_HOLD: "bg-yellow-50 text-yellow-700 border border-yellow-200",
};

export default function StaffDashboard() {
  const [stats, setStats] = useState<Stats>({
    revenue: 0, orders: 0, pendingOrders: 0, products: 0, customers: 0,
    lowStockProducts: 0, recentOrders: [], lowStockProductsList: [],
  });
  const [loading, setLoading] = useState(true);
  const { data: session } = useSession();
  const user = session?.user as any;
  const userName = user?.name || "there";
  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? "Good morning" : greetingHour < 17 ? "Good afternoon" : "Good evening";

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((r) => r.json())
      .then((data) => {
        setStats({
          revenue: data.stats?.revenue || 0,
          orders: data.stats?.orders || 0,
          pendingOrders: data.stats?.pendingOrders || 0,
          products: data.stats?.products || 0,
          customers: data.stats?.customers || 0,
          lowStockProducts: data.stats?.lowStockProducts || 0,
          recentOrders: (data.recentOrders || []).slice(0, 5),
          lowStockProductsList: (data.lowStockProducts || []).slice(0, 5),
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const kpis = [
    { label: "Products", value: stats.products, icon: Package, bg: "bg-[#f0ede8]", ic: "text-[#6b6560]", desc: "Total in catalogue", href: "/staff/products" },
    { label: "Orders", value: stats.orders, icon: ShoppingCart, bg: "bg-[#f0ede8]", ic: "text-[#6b6560]", desc: "All time", href: "/staff/orders" },
    { label: "Customers", value: stats.customers, icon: Users, bg: "bg-[#f0ede8]", ic: "text-[#6b6560]", desc: "Registered users", href: "/staff/customers" },
    { label: "Pending", value: stats.pendingOrders, icon: Clock, bg: "bg-amber-50", ic: "text-amber-600", desc: "Awaiting action", href: "/staff/orders" },
    { label: "Low Stock", value: stats.lowStockProducts, icon: AlertTriangle, bg: stats.lowStockProducts > 0 ? "bg-red-50" : "bg-[#f0ede8]", ic: stats.lowStockProducts > 0 ? "text-red-600" : "text-[#6b6560]", desc: "Need attention", href: "/staff/products" },
    { label: "Revenue", value: "₹" + Number(stats.revenue).toLocaleString("en-IN"), icon: ArrowUpRight, bg: "bg-emerald-50", ic: "text-emerald-600", desc: "Last 30 days", href: "/staff/orders" },
  ];

  const actions = [
    { l: "View Orders", h: "/staff/orders", I: ShoppingCart },
    { l: "View Products", h: "/staff/products", I: Package },
    { l: "View Customers", h: "/staff/customers", I: Users },
    { l: "View Store", h: "/", I: Eye },
  ];

  const fmtDate = (s: string) => {
    const d = new Date(s), n = new Date(), m = Math.floor((n.getTime() - d.getTime()) / 60000);
    if (m < 1) return "Just now";
    if (m < 60) return m + "m ago";
    const h = Math.floor(m / 60);
    if (h < 24) return h + "h ago";
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };

  return (
    <div className="space-y-8">
      {/* Header with notification bell */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a1917] via-[#2d2926] to-[#1a1917] p-6 md:p-8 text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#d4a574]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-base font-serif tracking-wide text-white/90 font-semibold">WESTHOME</span>
              <span className="block text-[9px] text-[#b0aba6] tracking-[0.15em] uppercase">Staff Panel</span>
            </div>
            <NotificationBell accentRing="ring-[#2d2926]" />
          </div>
          <h1 className="text-2xl md:text-3xl font-light tracking-tight mt-3">{greeting}</h1>
          <p className="text-white/90 text-lg sm:text-xl mt-0.5" style={{ fontFamily: "Iowan Old Style, Baskerville, Times New Roman, serif" }}>{userName}</p>
          <p className="text-[#8a857f] text-sm mt-1">Here&apos;s your store overview for today.</p>
        </div>
      </div>

      {/* KPI Cards — all clickable */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map((s) => {
          const I = s.icon;
          return (
            <Link key={s.label} href={s.href}
              className="bg-white rounded-2xl p-4 border border-black/[.06] hover:shadow-sm transition-shadow block group">
              <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center mb-3", s.bg)}>
                <I size={18} className={s.ic} />
              </div>
              <p className="text-2xl font-semibold text-[#1a1917]">
                {loading ? "—" : typeof s.value === "number" ? s.value.toLocaleString() : s.value}
              </p>
              <p className="text-xs font-medium text-[#6b6560] mt-0.5">{s.label}</p>
              <p className="text-[10px] text-[#b0aba6] mt-0.5">{s.desc}</p>
            </Link>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl p-5 border border-black/[.06]">
        <h2 className="text-[11px] font-semibold text-[#1a1917] mb-4 tracking-wide uppercase">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {actions.map((a) => {
            const Icon = a.I;
            return (
              <Link key={a.h} href={a.h}
                className="flex items-center gap-2.5 px-4 py-3 bg-[#f7f5f2] hover:bg-[#f0ede8] rounded-xl transition-colors text-sm font-medium text-[#1a1917]">
                <Icon size={16} className="text-[#6b6560]" />{a.l}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Orders + Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-black/[.06] overflow-hidden">
          <div className="px-5 py-4 border-b border-black/[.06] flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#1a1917]">Recent Orders</h2>
            <Link href="/staff/orders" className="text-xs font-medium text-[#d4a574] hover:text-[#c49564]">View all</Link>
          </div>
          <div className="divide-y divide-black/[.04]">
            {loading ? (
              <div className="p-8 text-center text-[#b0aba6] text-sm">Loading...</div>
            ) : stats.recentOrders.length === 0 ? (
              <div className="p-8 text-center">
                <ShoppingCart size={24} className="text-[#b0aba6] mx-auto mb-2" />
                <p className="text-sm text-[#b0aba6]">No orders yet</p>
              </div>
            ) : stats.recentOrders.map((o) => (
              <Link key={o.id} href={`/admin/orders/${o.id}`}
                className="px-5 py-3 flex items-center gap-3 hover:bg-[#f7f5f2] transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1a1917]">#{o.orderNumber}</p>
                  <p className="text-xs text-[#b0aba6] mt-0.5">{o.customerName || "Guest"}</p>
                </div>
                <p className="text-sm font-medium text-[#1a1917] flex-shrink-0">
                  {formatPrice(o.total)}
                </p>
                <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0",
                  STATUS_STYLES[o.status] || "bg-[#f0ede8] text-[#6b6560]")}>
                  {o.status.replace(/_/g, " ")}
                </span>
                <span className="text-[10px] text-[#b0aba6] flex-shrink-0 hidden sm:block">
                  {fmtDate(o.createdAt)}
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-black/[.06] overflow-hidden">
          <div className="px-5 py-4 border-b border-black/[.06] flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#1a1917]">Low Stock Alerts</h2>
            <Link href="/staff/products" className="text-xs font-medium text-[#d4a574] hover:text-[#c49564]">Manage inventory</Link>
          </div>
          <div className="divide-y divide-black/[.04]">
            {loading ? (
              <div className="p-8 text-center text-[#b0aba6] text-sm">Loading...</div>
            ) : stats.lowStockProductsList.length === 0 ? (
              <div className="p-8 text-center">
                <CheckCircle2 size={24} className="text-emerald-400 mx-auto mb-2" />
                <p className="text-sm text-[#b0aba6]">All products well stocked</p>
              </div>
            ) : stats.lowStockProductsList.map((p) => {
              const crit = p.stockQuantity <= 1;
              return (
                <Link key={p.id} href={`/admin/products/${p.id}`}
                  className="px-5 py-3 flex items-center gap-3 hover:bg-[#f7f5f2] transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1a1917] truncate">{p.name}</p>
                    <p className="text-xs text-[#b0aba6]">{formatPrice(p.regularPrice)}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className={cn("text-xs font-semibold", crit ? "text-red-600" : "text-amber-600")}>
                      {p.stockQuantity} left
                    </span>
                    <p className={cn("text-[10px] mt-0.5", crit ? "text-red-500" : "text-amber-500")}>
                      {crit ? "Critical" : "Low"}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
