"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  TrendingUp, TrendingDown, ShoppingBag, Package, Users,
  DollarSign, Clock, AlertTriangle, ArrowRight, Bell,
  BarChart3, ShoppingCart, Star, Inbox, ArrowUpRight,
  Zap, Layers, Crown, Eye,
} from "lucide-react";
import { formatPrice, formatDate, getStatusColor, cn } from "@/lib/utils";
import { useSession } from "next-auth/react";

interface DashboardStats {
  revenue: number;
  orders: number;
  pendingOrders: number;
  products: number;
  customers: number;
  lowStockProducts: number;
}

interface RecentOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  total: number;
  status: string;
  createdAt: string;
}

interface LowStockProduct {
  id: string;
  name: string;
  slug: string;
  stockQuantity: number;
  regularPrice: number;
  salePrice: number | null;
  lowStockThreshold: number;
}

interface SalesTrendDay {
  date: string;
  revenue: number;
  orders: number;
}

interface StatusCount {
  status: string;
  count: number;
}

interface TopProduct {
  productId: string;
  name: string;
  slug: string;
  revenue: number;
  quantitySold: number;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  orderId?: string | null;
  isRead: boolean;
  createdAt: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({ revenue: 0, orders: 0, pendingOrders: 0, products: 0, customers: 0, lowStockProducts: 0 });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([]);
  const [salesTrend, setSalesTrend] = useState<SalesTrendDay[]>([]);
  const [statusBreakdown, setStatusBreakdown] = useState<StatusCount[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const { data: session } = useSession();
  const user = session?.user as any;
  const userName = user?.name || "there";
  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? "Good morning" : greetingHour < 17 ? "Good afternoon" : "Good evening";

  useEffect(() => {
    fetch("/api/notifications?limit=8")
      .then((r) => r.json())
      .then((data) => {
        setNotifications(data.notifications || []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((r) => r.json())
      .then((data) => {
        setStats(data.stats);
        setRecentOrders(data.recentOrders);
        setLowStockProducts(data.lowStockProducts);
        setSalesTrend(data.salesTrend);
        setStatusBreakdown(data.statusBreakdown);
        setTopProducts(data.topProducts);
        // notifications loaded separately
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const maxRevenue = Math.max(...salesTrend.map((d) => d.revenue), 1);
  const totalStatusCount = statusBreakdown.reduce((sum, s) => sum + s.count, 0) || 1;

  const statusColors: Record<string, string> = {
    NEW: "bg-blue-500", CONFIRMED: "bg-indigo-500", PROCESSING: "bg-purple-500",
    SHIPPED: "bg-cyan-500", OUT_FOR_DELIVERY: "bg-orange-500", DELIVERED: "bg-emerald-500",
    CANCELLED: "bg-red-400", REFUNDED: "bg-gray-400", PAYMENT_FAILED: "bg-red-500", ON_HOLD: "bg-yellow-500",
  };

  const statusLabels: Record<string, string> = {
    NEW: "New", CONFIRMED: "Confirmed", PROCESSING: "Processing", SHIPPED: "Shipped",
    OUT_FOR_DELIVERY: "Out for Delivery", DELIVERED: "Delivered", CANCELLED: "Cancelled",
    REFUNDED: "Refunded", PAYMENT_FAILED: "Payment Failed", ON_HOLD: "On Hold",
  };

  return (
    <div className="space-y-6">
      {/* Brand Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a1917] via-[#2d2926] to-[#1a1917] p-6 md:p-8 text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#d4a574]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="relative z-10">
          <div className="mb-1">
            <span className="text-base font-serif tracking-wide text-white/90 font-semibold">WESTHOME</span>
            <span className="block text-[9px] text-[#b0aba6] tracking-[0.15em] uppercase">by BM Distributors</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-light tracking-tight mt-3">
            {greeting}
          </h1>
          <p className="text-white/90 text-lg sm:text-xl mt-0.5" style={{ fontFamily: "Iowan Old Style, Baskerville, Times New Roman, serif" }}>{userName}</p>
          <p className="text-[#8a857f] text-sm mt-1">Here&apos;s what&apos;s happening with your store today.</p>
          <div className="flex items-center gap-3 mt-4">
            <Link href="/admin/orders" className="flex items-center gap-1.5 text-xs font-medium bg-white/10 hover:bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full transition-colors">
              View Orders <ArrowUpRight size={13} />
            </Link>
            <Link href="/admin/products/new" className="flex items-center gap-1.5 text-xs font-medium bg-[#d4a574] hover:bg-[#c49564] px-4 py-2 rounded-full transition-colors">
              Add Product <ArrowUpRight size={13} />
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Revenue", sub: "Last 30 days", value: formatPrice(stats.revenue), icon: DollarSign, accent: "text-emerald-700", bg: "bg-emerald-50", href: "/admin/orders" },
          { label: "Orders", sub: "All time", value: stats.orders, icon: ShoppingBag, accent: "text-blue-700", bg: "bg-blue-50", href: "/admin/orders" },
          { label: "Products", sub: "Active", value: stats.products, icon: Package, accent: "text-amber-700", bg: "bg-amber-50", href: "/admin/products" },
          { label: "Customers", sub: "Registered", value: stats.customers, icon: Users, accent: "text-violet-700", bg: "bg-violet-50", href: "/admin/customers" },
          { label: "Pending", sub: "Needs action", value: stats.pendingOrders, icon: Clock, accent: "text-orange-700", bg: "bg-orange-50", href: "/admin/orders?status=NEW" },
          { label: "Low Stock", sub: "Alerts", value: stats.lowStockProducts, icon: AlertTriangle, accent: "text-rose-700", bg: "bg-rose-50", href: "/admin/products" },
        ].map((card) => (
          <Link key={card.label} href={card.href} className="bg-white rounded-xl border border-black/[.06] p-4 hover:shadow-sm transition-shadow block group">
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-3", card.bg)}>
              <card.icon size={16} className={card.accent} />
            </div>
            <p className="text-2xl font-semibold tracking-tight text-[#1a1917]">{card.value}</p>
            <p className="text-xs font-medium text-[#6b6560] mt-0.5">{card.label}</p>
            <p className="text-[10px] text-[#b0aba6] mt-0.5">{card.sub}</p>
          </Link>
        ))}
      </div>

      {/* Chart + Order Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sales Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-black/[.06] p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-semibold text-sm flex items-center gap-2 text-[#1a1917]">
                <BarChart3 size={16} className="text-[#d4a574]" />
                Sales Trend
              </h2>
              <p className="text-xs text-[#b0aba6] mt-0.5">Revenue over the last 7 days</p>
            </div>
          </div>
          <div className="flex items-end gap-2 h-44">
            {salesTrend.map((day, i) => {
              const height = Math.max((day.revenue / maxRevenue) * 140, 4);
              const isToday = i === salesTrend.length - 1;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group">
                  <span className="text-[10px] text-[#b0aba6] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    {day.revenue > 0 ? formatPrice(day.revenue) : ""}
                  </span>
                  <div className="w-full flex justify-center">
                    <div
                      className={cn(
                        "w-full max-w-10 rounded-t-md transition-all duration-500",
                        isToday ? "bg-[#d4a574]" : day.revenue > 0 ? "bg-[#e8e4de] hover:bg-[#d4a574]/40" : "bg-[#f0ede8]"
                      )}
                      style={{ height: `${height}px` }}
                    />
                  </div>
                  <span className={cn("text-[10px]", isToday ? "font-semibold text-[#d4a574]" : "text-[#b0aba6]")}>
                    {day.date.split(",")[0]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Order Status */}
        <div className="bg-white rounded-xl border border-black/[.06] p-6">
          <div className="mb-5">
            <h2 className="font-semibold text-sm flex items-center gap-2 text-[#1a1917]">
              <Layers size={16} className="text-[#d4a574]" />
              Order Status
            </h2>
            <p className="text-xs text-[#b0aba6] mt-0.5">{totalStatusCount} total orders</p>
          </div>
          <div className="space-y-3">
            {statusBreakdown.length > 0 ? (
              statusBreakdown.sort((a, b) => b.count - a.count).map((s) => (
                <Link key={s.status} href={`/admin/orders?status=${s.status}`} className="block">
                  <div className="flex items-center justify-between mb-1.5 hover:opacity-80 transition-opacity">
                    <div className="flex items-center gap-2">
                      <span className={cn("w-2 h-2 rounded-full", statusColors[s.status] || "bg-gray-400")} />
                      <span className="text-xs font-medium text-[#6b6560]">{statusLabels[s.status] || s.status.replace(/_/g, " ")}</span>
                    </div>
                    <span className="text-xs font-semibold text-[#1a1917]">{s.count} <span className="text-[#b0aba6] font-normal">({Math.round((s.count / totalStatusCount) * 100)}%)</span></span>
                  </div>
                  <div className="h-1.5 bg-[#f0ede8] rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all duration-700", statusColors[s.status] || "bg-gray-400")} style={{ width: `${(s.count / totalStatusCount) * 100}%` }} />
                  </div>
                </Link>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <ShoppingCart size={20} className="text-[#d1ccc6] mb-2" />
                <p className="text-xs text-[#b0aba6]">No orders yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Products + Low Stock + Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top Products */}
        <div className="bg-white rounded-xl border border-black/[.06] p-6">
          <div className="mb-5">
            <h2 className="font-semibold text-sm flex items-center gap-2 text-[#1a1917]">
              <Crown size={16} className="text-[#d4a574]" />
              Top Products
            </h2>
            <p className="text-xs text-[#b0aba6] mt-0.5">Best sellers this period</p>
          </div>
          {topProducts.length > 0 ? (
            <div className="space-y-1">
              {topProducts.map((product, i) => (
                <Link key={product.productId} href={`/admin/products/${product.productId}`} className="flex items-center gap-3 p-2.5 -mx-2.5 rounded-xl hover:bg-[#f7f5f2] transition-all group">
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0", i === 0 ? "bg-amber-50 text-amber-700" : i === 1 ? "bg-[#f0ede8] text-[#6b6560]" : i === 2 ? "bg-orange-50 text-orange-600" : "bg-[#f7f5f2] text-[#b0aba6]")}>
                    #{i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-[#1a1917] group-hover:text-[#d4a574] transition-colors">{product.name}</p>
                    <p className="text-[11px] text-[#b0aba6]">{product.quantitySold} sold · {formatPrice(product.revenue)}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8">
              <Star size={20} className="text-[#d1ccc6] mb-2" />
              <p className="text-xs text-[#b0aba6]">No sales data yet</p>
            </div>
          )}
        </div>

        {/* Low Stock */}
        <div className="bg-white rounded-xl border border-black/[.06] p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-semibold text-sm flex items-center gap-2 text-[#1a1917]">
                <Zap size={16} className="text-orange-500" />
                Low Stock
              </h2>
              <p className="text-xs text-[#b0aba6] mt-0.5">Items running low</p>
            </div>
            {lowStockProducts.length > 0 && (
              <span className="text-[10px] font-bold bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full">{lowStockProducts.length}</span>
            )}
          </div>
          {lowStockProducts.length > 0 ? (
            <div className="space-y-1.5">
              {lowStockProducts.map((product) => (
                <Link key={product.id} href={`/admin/products/${product.id}`} className="flex items-center justify-between p-2.5 -mx-2.5 rounded-xl hover:bg-[#f7f5f2] transition-all group">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate text-[#1a1917] group-hover:text-[#d4a574] transition-colors">{product.name}</p>
                    <p className="text-[11px] text-[#b0aba6]">{formatPrice(product.salePrice && product.salePrice > 0 ? product.salePrice : product.regularPrice)}</p>
                  </div>
                  <span className={cn("text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0 ml-3", product.stockQuantity === 0 ? "bg-rose-50 text-rose-700" : product.stockQuantity <= 2 ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700")}>
                    {product.stockQuantity === 0 ? "Out of stock" : `${product.stockQuantity} left`}
                  </span>
                </Link>
              ))}
              <Link href="/admin/products" className="flex items-center justify-center gap-1.5 text-xs font-medium text-[#d4a574] hover:text-[#c49564] mt-3 pt-3 border-t border-black/[.06] transition-colors">
                Manage inventory <ArrowRight size={12} />
              </Link>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8">
              <Package size={20} className="text-emerald-500 mb-2" />
              <p className="text-xs text-[#b0aba6]">All stock levels healthy</p>
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-xl border border-black/[.06] p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-semibold text-sm flex items-center gap-2 text-[#1a1917]">
                <Bell size={16} className="text-[#d4a574]" />
                Notifications
              </h2>
              <p className="text-xs text-[#b0aba6] mt-0.5">Recent activity</p>
            </div>
            {notifications.filter((n) => !n.isRead).length > 0 && (
              <span className="w-2 h-2 rounded-full bg-[#d4a574] animate-pulse" />
            )}
          </div>
          {notifications.length > 0 ? (
            <div className="space-y-1">
              {notifications.map((notif) => (
                <Link key={notif.id} href={notif.orderId ? "/admin/orders/" + notif.orderId : notif.type.includes("PRODUCT") ? "/admin/products" : notif.type.includes("ORDER") ? "/admin/orders" : notif.type.includes("CUSTOMER") ? "/admin/customers" : "/admin/dashboard"} className={cn("block p-2.5 -mx-2.5 rounded-xl transition-all", !notif.isRead ? "bg-[#d4a574]/5" : "hover:bg-[#f7f5f2]")}>
                  <div className="flex items-start gap-2.5">
                    {!notif.isRead && <span className="w-1.5 h-1.5 rounded-full bg-[#d4a574] mt-1.5 shrink-0" />}
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-tight text-[#1a1917]">{notif.title}</p>
                      <p className="text-[11px] text-[#b0aba6] mt-0.5 line-clamp-2">{notif.message}</p>
                      <p className="text-[10px] text-[#d1ccc6] mt-1">{formatDate(notif.createdAt)}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8">
              <Inbox size={20} className="text-[#d1ccc6] mb-2" />
              <p className="text-xs text-[#b0aba6]">All caught up</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-xl border border-black/[.06] overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-black/[.06]">
          <div>
            <h2 className="font-semibold text-sm flex items-center gap-2 text-[#1a1917]">
              <ShoppingBag size={16} className="text-[#d4a574]" />
              Recent Orders
            </h2>
            <p className="text-xs text-[#b0aba6] mt-0.5">Latest customer orders</p>
          </div>
          <Link href="/admin/orders" className="flex items-center gap-1.5 text-xs font-medium text-[#d4a574] hover:text-[#c49564] transition-colors">
            View All <ArrowRight size={13} />
          </Link>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/[.06] bg-[#f7f5f2]/50">
                <th className="text-left px-5 py-3 font-medium text-[#6b6560] text-[11px] uppercase tracking-wider">Order</th>
                <th className="text-left px-5 py-3 font-medium text-[#6b6560] text-[11px] uppercase tracking-wider">Customer</th>
                <th className="text-right px-5 py-3 font-medium text-[#6b6560] text-[11px] uppercase tracking-wider">Total</th>
                <th className="text-center px-5 py-3 font-medium text-[#6b6560] text-[11px] uppercase tracking-wider">Status</th>
                <th className="text-right px-5 py-3 font-medium text-[#6b6560] text-[11px] uppercase tracking-wider">Date</th>
                <th className="text-center px-5 py-3 font-medium text-[#6b6560] text-[11px] uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.length > 0 ? recentOrders.map((order) => (
                <tr key={order.id} className="border-b border-black/[.06] last:border-0 hover:bg-[#f7f5f2]/30 transition-colors">
                  <td className="px-5 py-3.5">
                    <Link href={`/admin/orders/${order.id}`} className="font-semibold text-[#1a1917] hover:text-[#d4a574] transition-colors">{order.orderNumber}</Link>
                  </td>
                  <td className="px-5 py-3.5 text-[#6b6560]">{order.customerName}</td>
                  <td className="px-5 py-3.5 text-right font-semibold text-[#1a1917]">{formatPrice(order.total)}</td>
                  <td className="px-5 py-3.5 text-center">
                    <span className={cn("px-2.5 py-1 rounded-full text-[11px] font-semibold", getStatusColor(order.status))}>{order.status}</span>
                  </td>
                  <td className="px-5 py-3.5 text-right text-[#b0aba6] text-xs">{formatDate(order.createdAt)}</td>
                  <td className="px-5 py-3.5 text-center">
                    <Link href={`/admin/orders/${order.id}`} className="inline-flex items-center gap-1 text-xs font-medium text-[#d4a574] hover:text-[#c49564] transition-colors">
                      <Eye size={13} /> View
                    </Link>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <ShoppingBag size={24} className="text-[#d1ccc6] mx-auto mb-2" />
                    <p className="text-sm text-[#b0aba6]">{loading ? "Loading orders..." : "No orders yet"}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-black/[.06]">
          {recentOrders.length > 0 ? recentOrders.map((order) => (
            <Link key={order.id} href={`/admin/orders/${order.id}`} className="block p-4 hover:bg-[#f7f5f2]/30 transition-colors">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-semibold text-sm text-[#1a1917]">{order.orderNumber}</span>
                <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold", getStatusColor(order.status))}>{order.status}</span>
              </div>
              <p className="text-xs text-[#6b6560]">{order.customerName}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="font-semibold text-sm text-[#1a1917]">{formatPrice(order.total)}</span>
                <span className="text-[11px] text-[#b0aba6]">{formatDate(order.createdAt)}</span>
              </div>
            </Link>
          )) : (
            <div className="p-8 text-center">
              <p className="text-sm text-[#b0aba6]">{loading ? "Loading..." : "No orders yet"}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
