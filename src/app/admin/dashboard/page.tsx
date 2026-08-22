"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  TrendingUp, TrendingDown, ShoppingBag, Package, Users,
  DollarSign, Clock, AlertTriangle, ArrowRight, Bell,
  BarChart3, ShoppingCart, Star, Inbox, ArrowUpRight,
  Zap, Layers, Crown,
} from "lucide-react";
import { formatPrice, formatDate, getStatusColor, cn } from "@/lib/utils";

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
  isRead: boolean;
  createdAt: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    revenue: 0,
    orders: 0,
    pendingOrders: 0,
    products: 0,
    customers: 0,
    lowStockProducts: 0,
  });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([]);
  const [salesTrend, setSalesTrend] = useState<SalesTrendDay[]>([]);
  const [statusBreakdown, setStatusBreakdown] = useState<StatusCount[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await fetch("/api/admin/dashboard");
        if (res.ok) {
          const data = await res.json();
          setStats(data.stats);
          setRecentOrders(data.recentOrders);
          setLowStockProducts(data.lowStockProducts);
          setSalesTrend(data.salesTrend);
          setStatusBreakdown(data.statusBreakdown);
          setTopProducts(data.topProducts);
          setNotifications(data.notifications);
        }
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const statCards = [
    {
      label: "Revenue",
      sublabel: "Last 30 days",
      value: formatPrice(stats.revenue),
      icon: DollarSign,
      color: "text-emerald-600",
      bg: "bg-gradient-to-br from-emerald-50 to-emerald-100/60",
      iconBg: "bg-emerald-100",
      borderColor: "border-emerald-100",
    },
    {
      label: "Orders",
      sublabel: "All time",
      value: stats.orders,
      icon: ShoppingBag,
      color: "text-blue-600",
      bg: "bg-gradient-to-br from-blue-50 to-blue-100/60",
      iconBg: "bg-blue-100",
      borderColor: "border-blue-100",
    },
    {
      label: "Products",
      sublabel: "Active listings",
      value: stats.products,
      icon: Package,
      color: "text-amber-600",
      bg: "bg-gradient-to-br from-amber-50 to-amber-100/60",
      iconBg: "bg-amber-100",
      borderColor: "border-amber-100",
    },
    {
      label: "Customers",
      sublabel: "Registered",
      value: stats.customers,
      icon: Users,
      color: "text-violet-600",
      bg: "bg-gradient-to-br from-violet-50 to-violet-100/60",
      iconBg: "bg-violet-100",
      borderColor: "border-violet-100",
    },
    {
      label: "Pending",
      sublabel: "Needs action",
      value: stats.pendingOrders,
      icon: Clock,
      color: "text-orange-600",
      bg: "bg-gradient-to-br from-orange-50 to-orange-100/60",
      iconBg: "bg-orange-100",
      borderColor: "border-orange-100",
    },
    {
      label: "Low Stock",
      sublabel: "Alerts",
      value: stats.lowStockProducts,
      icon: AlertTriangle,
      color: "text-rose-600",
      bg: "bg-gradient-to-br from-rose-50 to-rose-100/60",
      iconBg: "bg-rose-100",
      borderColor: "border-rose-100",
    },
  ];

  const maxRevenue = Math.max(...salesTrend.map((d) => d.revenue), 1);
  const totalStatusCount = statusBreakdown.reduce((sum, s) => sum + s.count, 0) || 1;

  const statusColors: Record<string, string> = {
    NEW: "bg-blue-500",
    CONFIRMED: "bg-indigo-500",
    PROCESSING: "bg-purple-500",
    SHIPPED: "bg-cyan-500",
    OUT_FOR_DELIVERY: "bg-orange-500",
    DELIVERED: "bg-emerald-500",
    CANCELLED: "bg-red-400",
    REFUNDED: "bg-gray-400",
    PAYMENT_FAILED: "bg-red-500",
    ON_HOLD: "bg-yellow-500",
  };

  const statusLabels: Record<string, string> = {
    NEW: "New",
    CONFIRMED: "Confirmed",
    PROCESSING: "Processing",
    SHIPPED: "Shipped",
    OUT_FOR_DELIVERY: "Out for Delivery",
    DELIVERED: "Delivered",
    CANCELLED: "Cancelled",
    REFUNDED: "Refunded",
    PAYMENT_FAILED: "Payment Failed",
    ON_HOLD: "On Hold",
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Brand Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900 p-6 md:p-8 text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
        <div className="relative z-10">
          <div className="mb-1">
            <span className="text-base font-serif tracking-wide text-white/90 font-semibold">WESTHOME</span>
            <span className="block text-[9px] text-text-muted tracking-[0.15em] uppercase">by BM Distributors</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-light tracking-tight mt-3">
            Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}
          </h1>
          <p className="text-stone-400 text-sm mt-1">Here&apos;s what&apos;s happening with your store today.</p>
          <div className="flex items-center gap-4 mt-4">
            <Link
              href="/admin/orders"
              className="flex items-center gap-1.5 text-xs font-medium bg-white/10 hover:bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full transition-colors"
            >
              View Orders <ArrowUpRight size={13} />
            </Link>
            <Link
              href="/admin/products/new"
              className="flex items-center gap-1.5 text-xs font-medium bg-accent hover:bg-accent-hover px-4 py-2 rounded-full transition-colors"
            >
              Add Product <ArrowUpRight size={13} />
            </Link>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map((card) => (
          <div
            key={card.label}
            className={cn(
              "rounded-[1.35rem] border p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5",
              card.bg,
              card.borderColor
            )}
          >
            <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center mb-3", card.iconBg)}>
              <card.icon size={17} className={card.color} />
            </div>
            <p className="text-2xl font-semibold tracking-tight">{card.value}</p>
            <p className="text-xs font-medium text-text-secondary mt-0.5">{card.label}</p>
            <p className="text-[10px] text-text-muted mt-0.5">{card.sublabel}</p>
          </div>
        ))}
      </div>

      {/* Sales Trend + Order Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 7-Day Sales Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-semibold text-sm flex items-center gap-2">
                <BarChart3 size={16} className="text-accent" />
                Sales Trend
              </h2>
              <p className="text-xs text-text-muted mt-0.5">Revenue over the last 7 days</p>
            </div>
            {salesTrend.some((d) => d.revenue > 0) && (
              <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full flex items-center gap-1">
                <TrendingUp size={12} />
                Active
              </span>
            )}
          </div>
          <div className="flex items-end gap-2 h-44">
            {salesTrend.map((day, i) => {
              const height = Math.max((day.revenue / maxRevenue) * 140, 4);
              const isToday = i === salesTrend.length - 1;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group">
                  <span className="text-[10px] text-text-muted font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    {day.revenue > 0 ? formatPrice(day.revenue) : ""}
                  </span>
                  <div className="w-full flex justify-center">
                    <div
                      className={cn(
                        "w-full max-w-10 rounded-t-lg transition-all duration-500",
                        isToday
                          ? "bg-gradient-to-t from-accent to-accent/70"
                          : day.revenue > 0
                            ? "bg-gradient-to-t from-stone-200 to-stone-100 hover:from-accent/40 hover:to-accent/20"
                            : "bg-surface-muted"
                      )}
                      style={{ height: `${height}px` }}
                    />
                  </div>
                  <span className={cn(
                    "text-[10px]",
                    isToday ? "font-semibold text-accent" : "text-text-muted"
                  )}>
                    {day.date.split(",")[0]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Order Status Breakdown */}
        <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-semibold text-sm flex items-center gap-2">
                <Layers size={16} className="text-accent" />
                Order Status
              </h2>
              <p className="text-xs text-text-muted mt-0.5">{totalStatusCount} total orders</p>
            </div>
          </div>
          <div className="space-y-3">
            {statusBreakdown.length > 0 ? (
              statusBreakdown
                .sort((a, b) => b.count - a.count)
                .map((s) => (
                  <div key={s.status}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={cn("w-2 h-2 rounded-full", statusColors[s.status] || "bg-gray-400")} />
                        <span className="text-xs font-medium text-text-secondary">
                          {statusLabels[s.status] || s.status.replace(/_/g, " ")}
                        </span>
                      </div>
                      <span className="text-xs font-semibold">{s.count}</span>
                    </div>
                    <div className="h-1.5 bg-surface-muted rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all duration-700 ease-out", statusColors[s.status] || "bg-gray-400")}
                        style={{ width: `${(s.count / totalStatusCount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="w-12 h-12 rounded-full bg-surface-muted flex items-center justify-center mb-3">
                  <ShoppingCart size={20} className="text-stone-400" />
                </div>
                <p className="text-xs text-text-muted">No orders yet</p>
                <p className="text-[10px] text-text-muted mt-0.5">Orders will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Products + Low Stock + Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top Selling Products */}
        <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-semibold text-sm flex items-center gap-2">
                <Crown size={16} className="text-accent" />
                Top Products
              </h2>
              <p className="text-xs text-text-muted mt-0.5">Best sellers this period</p>
            </div>
          </div>
          {topProducts.length > 0 ? (
            <div className="space-y-1">
              {topProducts.map((product, i) => (
                <Link
                  key={product.productId}
                  href={`/admin/products/${product.productId}`}
                  className="flex items-center gap-3 p-2.5 -mx-2.5 rounded-xl hover:bg-surface-muted/50 transition-all group"
                >
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0",
                    i === 0 ? "bg-amber-100 text-amber-700"
                      : i === 1 ? "bg-surface-muted text-text-secondary"
                        : i === 2 ? "bg-orange-100 text-orange-600"
                          : "bg-surface-muted text-text-muted"
                  )}>
                    #{i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate group-hover:text-accent transition-colors">{product.name}</p>
                    <p className="text-[11px] text-text-muted">
                      {product.quantitySold} sold · {formatPrice(product.revenue)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mb-3">
                <Star size={20} className="text-amber-400" />
              </div>
              <p className="text-xs font-medium text-text-secondary">No sales data yet</p>
              <p className="text-[10px] text-text-muted mt-0.5">Top products will rank here</p>
            </div>
          )}
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-semibold text-sm flex items-center gap-2">
                <Zap size={16} className="text-orange-500" />
                Low Stock Alerts
              </h2>
              <p className="text-xs text-text-muted mt-0.5">Items running low</p>
            </div>
            {lowStockProducts.length > 0 && (
              <span className="text-[10px] font-bold bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full">
                {lowStockProducts.length}
              </span>
            )}
          </div>
          {lowStockProducts.length > 0 ? (
            <div className="space-y-1.5">
              {lowStockProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-2.5 -mx-2.5 rounded-xl hover:bg-surface-muted/50 transition-all"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{product.name}</p>
                    <p className="text-[11px] text-text-muted">{formatPrice(product.regularPrice)}</p>
                  </div>
                  <span
                    className={cn(
                      "text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0 ml-3",
                      product.stockQuantity === 0
                        ? "bg-rose-100 text-rose-700"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    )}
                  >
                    {product.stockQuantity === 0 ? "Out of stock" : `${product.stockQuantity} left`}
                  </span>
                </div>
              ))}
              <Link
                href="/admin/products"
                className="flex items-center justify-center gap-1.5 text-xs font-medium text-accent hover:text-accent-hover mt-3 pt-3 border-t border-border transition-colors"
              >
                Manage inventory <ArrowRight size={12} />
              </Link>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
                <Package size={20} className="text-emerald-500" />
              </div>
              <p className="text-xs font-medium text-text-secondary">All stock levels healthy</p>
              <p className="text-[10px] text-text-muted mt-0.5">No items need attention</p>
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-semibold text-sm flex items-center gap-2">
                <Bell size={16} className="text-accent" />
                Notifications
              </h2>
              <p className="text-xs text-text-muted mt-0.5">Recent activity</p>
            </div>
            {notifications.filter((n) => !n.isRead).length > 0 && (
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            )}
          </div>
          {notifications.length > 0 ? (
            <div className="space-y-1">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={cn(
                    "p-2.5 -mx-2.5 rounded-xl transition-all",
                    !notif.isRead ? "bg-accent/5" : "hover:bg-surface-muted/50"
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    {!notif.isRead && (
                      <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-tight">{notif.title}</p>
                      <p className="text-[11px] text-text-muted mt-0.5 line-clamp-2">{notif.message}</p>
                      <p className="text-[10px] text-text-muted mt-1">{formatDate(notif.createdAt)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-12 h-12 rounded-full bg-surface-muted flex items-center justify-center mb-3">
                <Inbox size={20} className="text-stone-400" />
              </div>
              <p className="text-xs font-medium text-text-secondary">All caught up</p>
              <p className="text-[10px] text-text-muted mt-0.5">No new notifications</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <ShoppingBag size={16} className="text-accent" />
              Recent Orders
            </h2>
            <p className="text-xs text-text-muted mt-0.5">Latest customer orders</p>
          </div>
          <Link
            href="/admin/orders"
            className="flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent-hover transition-colors"
          >
            View All <ArrowRight size={13} />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted/50">
                <th className="text-left px-5 py-3 font-medium text-text-secondary text-xs uppercase tracking-wider">Order</th>
                <th className="text-left px-5 py-3 font-medium text-text-secondary text-xs uppercase tracking-wider">Customer</th>
                <th className="text-right px-5 py-3 font-medium text-text-secondary text-xs uppercase tracking-wider">Total</th>
                <th className="text-center px-5 py-3 font-medium text-text-secondary text-xs uppercase tracking-wider">Status</th>
                <th className="text-right px-5 py-3 font-medium text-text-secondary text-xs uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.length > 0 ? (
                recentOrders.map((order) => (
                  <tr key={order.id} className="border-b border-border last:border-0 hover:bg-surface-muted/50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <Link href={`/admin/orders/${order.id}`} className="font-semibold hover:text-accent transition-colors">
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-medium">{order.customerName}</p>
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold">{formatPrice(order.total)}</td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={cn("px-2.5 py-1 rounded-full text-[11px] font-semibold", getStatusColor(order.status))}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right text-text-muted text-xs">{formatDate(order.createdAt)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-14 h-14 rounded-2xl bg-surface-muted flex items-center justify-center mb-3">
                        <ShoppingBag size={24} className="text-stone-300" />
                      </div>
                      <p className="text-sm font-medium text-text-secondary">
                        {loading ? "Loading orders..." : "No orders yet"}
                      </p>
                      <p className="text-xs text-text-muted mt-0.5">
                        {!loading && "Orders will appear here once customers start shopping"}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
