"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Package, ShoppingCart, Users, DollarSign,
  Eye, Heart, ShoppingBag, AlertTriangle, ArrowUpRight, ArrowDownRight,
  RefreshCw, Calendar, BarChart3, Target, Truck, Clock, Search, Filter,
  ChevronRight, Activity, Zap, Shield, Layers,
  PieChart, Map, MessageSquare, Smartphone, Monitor, Tablet, Star,
  ExternalLink, Download, MoreHorizontal, CheckCircle, XCircle,
  Package as PackageIcon, UserPlus, CreditCard, Percent, Boxes,
} from "lucide-react";
import { formatPrice, cn } from "@/lib/utils";
import { Trend, KPICard, Section, MiniBar } from "@/components/admin/DashboardWidgets";

// ─── Types ──
interface DashboardData {
  range: string;
  kpis: any;
  live: any;
  funnel: any;
  revenueOverTime: any[];
  orderStatus: Record<string, number>;
  topByRevenue: any[];
  topByUnits: any[];
  topByViews: any[];
  topByWishlist: any[];
  topByCart: any[];
  categoryAnalytics: any[];
  topCustomers: any[];
  geographic: any[];
  activity: any;
  topSearches: any[];
  deviceBreakdown: any[];
  wishlist: any;
  payments: any;
  lowStockProducts: any[];
  insights: string[];
  uniqueVisitors: number;
}

const DATE_RANGES = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "thisMonth", label: "This month" },
  { value: "lastMonth", label: "Last month" },
];

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-700", CONFIRMED: "bg-indigo-100 text-indigo-700",
  PROCESSING: "bg-amber-100 text-amber-700", SHIPPED: "bg-purple-100 text-purple-700",
  DELIVERED: "bg-green-100 text-green-700", CANCELLED: "bg-red-100 text-red-700",
  PAYMENT_FAILED: "bg-red-100 text-red-700",
};

// ─── Main Dashboard ──
export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [range, setRange] = useState("30d");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (r: string, silent = false) => {
    if (!silent) setLoading(true);
    setRefreshing(true);
    try {
      const res = await fetch(`/api/admin/dashboard?range=${r}`);
      if (res.status === 401 || res.status === 403) {
        // Stale/expired session — bounce to login instead of showing a fake zero dashboard.
        window.location.href = "/login";
        return;
      }
      if (res.ok) {
        setData(await res.json());
        setError(null);
      } else {
        setError("Failed to load dashboard data.");
      }
    } catch {
      setError("Failed to load dashboard data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(range); }, [range, fetchData]);

  const fmt = (n: number) => n >= 100000 ? `${(n / 100000).toFixed(1)}L` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);
  const fmtCurrency = (n: number) => `₹${n.toLocaleString("en-IN")}`;

  if (error && !data) {
    return (
      <div className="min-h-screen bg-[#f5f3ef] p-4 md:p-6 flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-black/[.06] p-8 max-w-md w-full text-center">
          <p className="text-sm font-semibold text-primary">Couldn't load the dashboard</p>
          <p className="text-xs text-text-muted mt-1">{error}</p>
          <button onClick={() => fetchData(range)} className="mt-4 px-4 py-2 text-xs font-medium bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors">Retry</button>
        </div>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-[#f5f3ef] p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="h-16 bg-white rounded-2xl animate-pulse" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <div key={i} className="h-28 bg-white rounded-2xl animate-pulse" />)}
          </div>
          <div className="h-80 bg-white rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  const k = data?.kpis || {};
  const live = data?.live || { sessions: 0, devices: [] };
  const funnel = data?.funnel || {};

  return (
    <div className="min-h-screen bg-[#f5f3ef]">
      {/* ── Sticky Header ── */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-black/[.06]">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-lg font-bold text-primary truncate">Dashboard</h1>
            {live.sessions > 0 && (
              <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                {live.sessions} live
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <select value={range} onChange={(e) => setRange(e.target.value)} className="px-3 py-1.5 text-xs font-medium border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-accent/30">
              {DATE_RANGES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <button onClick={() => fetchData(range)} disabled={refreshing} className="p-2 hover:bg-surface-muted rounded-lg transition-colors disabled:opacity-50">
              <RefreshCw size={16} className={cn("text-text-muted", refreshing && "animate-spin")} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 space-y-4">

        {error && data && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-medium rounded-xl px-4 py-2.5 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => fetchData(range)} className="underline font-semibold">Retry</button>
          </div>
        )}

        {/* ── SECTION 1: Live Store ── */}
        {live.sessions > 0 && (
          <Section title="Live Store" icon={Activity} badge={`${live.sessions} online`} defaultOpen>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
              <div className="text-center p-3 bg-surface-muted/50 rounded-xl">
                <p className="text-2xl font-bold text-primary">{live.sessions}</p>
                <p className="text-xs text-text-muted mt-1">Visitors Online</p>
              </div>
              {live.devices?.map((d: any) => (
                <div key={d.type} className="text-center p-3 bg-surface-muted/50 rounded-xl">
                  <p className="text-2xl font-bold text-primary">{d.count}</p>
                  <p className="text-xs text-text-muted mt-1 capitalize">{d.type}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ── SECTION 2: KPI Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KPICard label="Revenue" value={fmtCurrency(k.revenue)} icon={DollarSign} trend={{ current: k.revenue, previous: k.prevRevenue }} href="/admin/orders?status=NEW" bg="bg-emerald-50" accent="text-emerald-600" />
          <KPICard label="Orders" value={k.totalOrders || 0} icon={ShoppingCart} trend={{ current: k.totalOrders, previous: k.prevTotalOrders }} href="/admin/orders" />
          <KPICard label="Avg Order Value" value={fmtCurrency(k.avgOrderValue)} icon={BarChart3} trend={{ current: k.avgOrderValue, previous: k.prevAvgOrderValue }} href="/admin/orders" bg="bg-blue-50" accent="text-blue-600" />
          <KPICard label="Conversion Rate" value={`${k.conversionRate || 0}%`} icon={Target} href="/admin/analytics" bg="bg-purple-50" accent="text-purple-600" />
          <KPICard label="Customers" value={k.totalCustomers || 0} icon={Users} trend={{ current: k.newCustomers, previous: k.prevNewCustomers }} href="/admin/customers" />
          <KPICard label="Units Sold" value={k.unitsSold || 0} icon={Package} trend={{ current: k.unitsSold, previous: k.prevUnitsSold }} href="/admin/orders" bg="bg-amber-50" accent="text-amber-600" />
          <KPICard label="Products" value={k.totalProducts || 0} icon={Boxes} href="/admin/products" bg="bg-indigo-50" accent="text-indigo-600" />
          <KPICard label="Cancelled" value={k.cancelledOrders || 0} icon={XCircle} href="/admin/orders?status=CANCELLED" bg="bg-red-50" accent="text-red-500" />
        </div>

        {/* ── Revenue Quick Stats ── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Today", value: k.todayOrders, href: "/admin/orders" },
            { label: "This Week", value: k.weekOrders, href: "/admin/orders" },
            { label: "This Month", value: k.monthOrders, href: "/admin/orders" },
          ].map(q => (
            <Link key={q.label} href={q.href} className="bg-white rounded-2xl border border-black/[.06] p-4 text-center hover:shadow-md transition-all cursor-pointer">
              <p className="text-xs text-text-muted">{q.label}</p>
              <p className="text-lg font-bold text-primary mt-1">{q.value || 0} orders</p>
            </Link>
          ))}
        </div>

        {/* ── SECTION 3: Revenue Chart ── */}
        {data?.revenueOverTime?.length > 0 && (
          <Section title="Revenue Analytics" icon={BarChart3}>
            <div className="pt-4">
              <div className="flex items-end gap-1 h-40 sm:h-48">
                {data.revenueOverTime.map((d, i) => {
                  const maxRev = Math.max(...data.revenueOverTime.map(x => x.revenue), 1);
                  const h = (d.revenue / maxRev) * 100;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                      <div className="absolute bottom-full mb-2 hidden group-hover:block z-10 bg-primary text-white text-[10px] px-2 py-1 rounded-lg whitespace-nowrap shadow-lg">
                        {d.date}: {fmtCurrency(d.revenue)} ({d.orders} orders)
                      </div>
                      <div className="w-full bg-accent/20 rounded-t-md transition-all hover:bg-accent/40" style={{ height: `${Math.max(h, 2)}%` }} />
                      <span className="text-[9px] text-text-muted hidden sm:block">{d.date}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between items-center mt-4 pt-3 border-t border-border">
                <div>
                  <p className="text-xs text-text-muted">Total Revenue</p>
                  <p className="text-sm font-bold text-primary">{fmtCurrency(k.revenue)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-text-muted">Avg Daily</p>
                  <p className="text-sm font-bold text-primary">{fmtCurrency(data.revenueOverTime.length > 0 ? Math.round(k.revenue / data.revenueOverTime.length) : 0)}</p>
                </div>
              </div>
            </div>
          </Section>
        )}

        {/* ── SECTION 4: Sales Funnel ── */}
        {funnel.pageViews > 0 && (
          <Section title="Sales Funnel" icon={Target}>
            <div className="pt-4 space-y-3">
              {[
                { label: "Page Views", value: funnel.pageViews, color: "bg-blue-500" },
                { label: "Product Views", value: funnel.productViews, color: "bg-indigo-500" },
                { label: "Cart Adds", value: funnel.cartAdds, color: "bg-amber-500" },
                { label: "Checkout Started", value: funnel.checkoutStarted, color: "bg-orange-500" },
                { label: "Payment Started", value: funnel.paymentStarted, color: "bg-purple-500" },
                { label: "Orders Completed", value: funnel.orderCompleted, color: "bg-green-500" },
              ].filter(s => s.value > 0).map((stage, i, arr) => {
                const maxVal = arr[0]?.value || 1;
                return (
                  <div key={stage.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-primary">{stage.label}</span>
                      <span className="text-xs text-text-muted">{stage.value} ({maxVal > 0 ? Math.round((stage.value / maxVal) * 100) : 0}%)</span>
                    </div>
                    <MiniBar value={stage.value} max={maxVal} color={stage.color} />
                    {i < arr.length - 1 && arr[i + 1].value > 0 && (
                      <p className="text-[10px] text-text-muted mt-0.5">
                        {Math.round(((arr[i + 1].value - stage.value) / (stage.value || 1)) * 100)}% drop-off
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* ── Two-Column Layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* ── SECTION 5: Order Status ── */}
          <Section title="Order Status" icon={ShoppingCart} badge={k.totalOrders}>
            <div className="pt-4 space-y-2">
              {Object.entries(data?.orderStatus || {}).sort((a, b) => b[1] - a[1]).map(([status, count]) => (
                <Link key={status} href={"/admin/orders?status=" + status} className="flex items-center justify-between py-2 border-b border-border last:border-0 hover:bg-surface-muted/30 transition-colors rounded px-1 -mx-1">
                  <div className="flex items-center gap-2">
                    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium", STATUS_COLORS[status] || "bg-gray-100 text-gray-700")}>
                      {status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-primary">{count as number}</span>
                </Link>
              ))}
              {Object.keys(data?.orderStatus || {}).length === 0 && <p className="text-xs text-text-muted py-4 text-center">No orders yet</p>}
            </div>
            <Link href="/admin/orders" className="mt-3 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-accent hover:underline">
              View all orders <ChevronRight size={12} />
            </Link>
          </Section>

          {/* ── SECTION 11: Payment Analytics ── */}
          <Section title="Payment Analytics" icon={CreditCard}>
            <div className="pt-4 grid grid-cols-2 gap-3">
              <div className="p-3 bg-green-50 rounded-xl text-center">
                <p className="text-xl font-bold text-green-700">{data?.payments?.success || 0}</p>
                <p className="text-xs text-green-600 mt-1">Successful</p>
              </div>
              <div className="p-3 bg-red-50 rounded-xl text-center">
                <p className="text-xl font-bold text-red-600">{data?.payments?.failed || 0}</p>
                <p className="text-xs text-red-500 mt-1">Failed</p>
              </div>
              <div className="p-3 bg-surface-muted rounded-xl text-center">
                <p className="text-xl font-bold text-primary">{data?.payments?.successRate || 0}%</p>
                <p className="text-xs text-text-muted mt-1">Success Rate</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl text-center">
                <p className="text-xl font-bold text-amber-700">{k.pendingPayments || 0}</p>
                <p className="text-xs text-amber-600 mt-1">Pending</p>
              </div>
            </div>
          </Section>
        </div>

        {/* ── SECTION 7: Top Products ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[
            { title: "Best Sellers by Revenue", data: data?.topByRevenue || [], field: "revenue", format: fmtCurrency },
            { title: "Best Sellers by Units", data: data?.topByUnits || [], field: "quantity", format: (n: number) => `${n} units` },
            { title: "Most Viewed", data: data?.topByViews || [], field: "views", format: (n: number) => `${n} views` },
            { title: "Most Wishlisted", data: data?.topByWishlist || [], field: "wishlists", format: (n: number) => `${n} adds` },
          ].map(section => (
            <Section key={section.title} title={section.title} icon={Star} defaultOpen={false}>
              <div className="pt-4 space-y-2">
                {section.data.slice(0, 5).map((item: any, i: number) => (
                  <Link key={i} href={item.product?.slug ? "/admin/products/" + (item.product.slug) : "/admin/products"} className="flex items-center gap-3 py-2 border-b border-border last:border-0 hover:bg-surface-muted/30 transition-colors rounded px-1 -mx-1">
                    <span className="text-xs font-bold text-text-muted w-5">{i + 1}</span>
                    <div className="w-8 h-8 rounded-lg bg-surface-muted overflow-hidden shrink-0">
                      {item.product?.images?.[0]?.url && <img src={item.product.images[0].url} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-primary truncate">{item.product?.name || "Unknown"}</p>
                    </div>
                    <span className="text-xs font-semibold text-primary whitespace-nowrap">{section.format(item[section.field] || 0)}</span>
                  </Link>
                ))}
                {section.data.length === 0 && <p className="text-xs text-text-muted py-4 text-center">No data yet</p>}
              </div>
            </Section>
          ))}
        </div>

        {/* ── SECTION 6: Customer Analytics ── */}
        <Section title="Customer Intelligence" icon={Users}>
          <div className="pt-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="p-3 bg-surface-muted/50 rounded-xl text-center">
                <p className="text-xl font-bold text-primary">{k.totalCustomers || 0}</p>
                <p className="text-xs text-text-muted mt-1">Total Customers</p>
              </div>
              <div className="p-3 bg-surface-muted/50 rounded-xl text-center">
                <p className="text-xl font-bold text-primary">{k.newCustomers || 0}</p>
                <p className="text-xs text-text-muted mt-1">New</p>
              </div>
              <div className="p-3 bg-surface-muted/50 rounded-xl text-center">
                <p className="text-xl font-bold text-primary">{k.returningCustomers || 0}</p>
                <p className="text-xs text-text-muted mt-1">Returning</p>
              </div>
              <div className="p-3 bg-surface-muted/50 rounded-xl text-center">
                <p className="text-xl font-bold text-primary">{data?.wishlist?.total || 0}</p>
                <p className="text-xs text-text-muted mt-1">Wishlist Items</p>
              </div>
            </div>
            {data?.topCustomers?.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-border">
                    <th className="text-left py-2 px-2 font-medium text-text-muted">Customer</th>
                    <th className="text-right py-2 px-2 font-medium text-text-muted">Orders</th>
                    <th className="text-right py-2 px-2 font-medium text-text-muted">Total Spent</th>
                  </tr></thead>
                  <tbody>
                    {data.topCustomers.slice(0, 10).map((c: any, i: number) => (
                      <tr key={i} className="border-b border-border last:border-0">
                        <td className="py-2 px-2">
                          <p className="font-medium text-primary">{c.customer?.name || "Guest"}</p>
                          <p className="text-text-muted">{c.customer?.email}</p>
                        </td>
                        <td className="py-2 px-2 text-right">{c._count.id}</td>
                        <td className="py-2 px-2 text-right font-medium">{fmtCurrency(c.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Section>

        {/* ── SECTION 13: Inventory Intelligence ── */}
        <Section title="Inventory Intelligence" icon={AlertTriangle} badge={k.lowStock + k.outOfStock}>
          <div className="pt-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="p-3 bg-surface-muted/50 rounded-xl text-center">
                <p className="text-xl font-bold text-primary">{k.totalProducts || 0}</p>
                <p className="text-xs text-text-muted mt-1">Total Products</p>
              </div>
              <div className="p-3 bg-green-50 rounded-xl text-center">
                <p className="text-xl font-bold text-green-700">{(k.totalProducts || 0) - (k.outOfStock || 0) - (k.lowStock || 0)}</p>
                <p className="text-xs text-green-600 mt-1">Healthy Stock</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl text-center">
                <p className="text-xl font-bold text-amber-700">{k.lowStock || 0}</p>
                <p className="text-xs text-amber-600 mt-1">Low Stock</p>
              </div>
              <div className="p-3 bg-red-50 rounded-xl text-center">
                <p className="text-xl font-bold text-red-600">{k.outOfStock || 0}</p>
                <p className="text-xs text-red-500 mt-1">Out of Stock</p>
              </div>
            </div>
            {data?.lowStockProducts?.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-text-muted uppercase tracking-wider">Needs Attention</p>
                {data.lowStockProducts.map((p: any) => (
                  <Link key={p.id} href="/admin/products" className="flex items-center justify-between py-2 px-3 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors">
                    <div>
                      <p className="text-xs font-medium text-primary">{p.name}</p>
                      <p className="text-[10px] text-amber-600">{p.stock} left (threshold: {p.threshold})</p>
                    </div>
                    <span className="text-[10px] font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">Low</span>
                  </Link>
                ))}
              </div>
            )}
            <Link href="/admin/products" className="mt-3 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-accent hover:underline">
              Manage inventory <ChevronRight size={12} />
            </Link>
          </div>
        </Section>

        {/* ── Two-Column: Search + Devices ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* ── SECTION 15: Customer Behavior ── */}
          <Section title="What Customers Search For" icon={Search}>
            <div className="pt-4">
              {data?.topSearches?.length > 0 ? (
                <div className="space-y-2">
                  {data.topSearches.slice(0, 10).map((s: any, i: number) => (
                    <Link key={i} href={"/search?q=" + encodeURIComponent(s.query)} className="flex items-center justify-between py-1.5 hover:bg-surface-muted/30 transition-colors rounded px-1 -mx-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-text-muted w-4">{i + 1}.</span>
                        <span className="text-xs text-primary">{s.query}</span>
                      </div>
                      <span className="text-[10px] text-text-muted">{s.count} searches</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-text-muted py-4 text-center">No search data yet</p>
              )}
            </div>
          </Section>

          {/* ── SECTION 17: Device Analytics ── */}
          <Section title="Device Analytics" icon={Monitor}>
            <div className="pt-4">
              {data?.deviceBreakdown?.length > 0 ? (
                <div className="space-y-3">
                  {data.deviceBreakdown.map((d: any) => {
                    const total = data.deviceBreakdown.reduce((s: number, x: any) => s + x.count, 0);
                    const pct = total > 0 ? Math.round((d.count / total) * 100) : 0;
                    const Icon = d.device === "mobile" ? Smartphone : d.device === "tablet" ? Tablet : Monitor;
                    return (
                      <div key={d.device}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <Icon size={14} className="text-text-muted" />
                            <span className="text-xs font-medium text-primary capitalize">{d.device}</span>
                          </div>
                          <span className="text-xs text-text-muted">{pct}% ({d.count})</span>
                        </div>
                        <MiniBar value={d.count} max={total} />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-text-muted py-4 text-center">No device data yet</p>
              )}
            </div>
          </Section>
        </div>

        {/* ── SECTION 18: Geographic ── */}
        {data?.geographic?.length > 0 && (
          <Section title="Geographic Distribution" icon={Map} defaultOpen={false}>
            <div className="pt-4 overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-border">
                  <th className="text-left py-2 px-2 font-medium text-text-muted">State</th>
                  <th className="text-right py-2 px-2 font-medium text-text-muted">Orders</th>
                  <th className="text-right py-2 px-2 font-medium text-text-muted">Revenue</th>
                </tr></thead>
                <tbody>
                  {data.geographic.map((g: any, i: number) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="py-2 px-2 font-medium text-primary">{g.state}</td>
                      <td className="py-2 px-2 text-right">{g.orders}</td>
                      <td className="py-2 px-2 text-right font-medium">{fmtCurrency(g.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        )}

        {/* ── SECTION 19: Insights ── */}
        {data?.insights?.length > 0 && (
          <Section title="WESTHOME Insights" icon={Zap}>
            <div className="pt-4 space-y-2">
              {data.insights.map((insight: string, i: number) => (
                <div key={i} className="flex items-start gap-2 py-2 px-3 bg-surface-muted/50 rounded-lg">
                  <Zap size={12} className="text-accent mt-0.5 shrink-0" />
                  <p className="text-xs text-primary leading-relaxed">{insight}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ── SECTION 21: Recent Activity ── */}
        <Section title="Recent Activity" icon={Clock} defaultOpen={false}>
          <div className="pt-4 space-y-2">
            {data?.activity?.recentOrders?.slice(0, 8).map((order: any) => (
              <Link key={order.id} href={"/admin/orders/" + order.id} className="flex items-center justify-between py-2 border-b border-border last:border-0 hover:bg-surface-muted/30 transition-colors rounded px-1 -mx-1">
                <div className="flex items-center gap-2">
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", order.status === "DELIVERED" ? "bg-green-100" : order.status === "CANCELLED" ? "bg-red-100" : "bg-blue-100")}>
                    {order.status === "DELIVERED" ? <CheckCircle size={14} className="text-green-600" /> : order.status === "CANCELLED" ? <XCircle size={14} className="text-red-500" /> : <ShoppingCart size={14} className="text-blue-600" />}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-primary">{order.orderNumber}</p>
                    <p className="text-[10px] text-text-muted">{order.customerName} · {new Date(order.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-primary">{fmtCurrency(Number(order.total))}</p>
                  <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", STATUS_COLORS[order.status] || "bg-gray-100 text-gray-600")}>
                    {order.status.replace(/_/g, " ")}
                  </span>
                </div>
              </Link>
            ))}
            {data?.activity?.recentOrders?.length === 0 && <p className="text-xs text-text-muted py-4 text-center">No recent activity</p>}
          </div>
        </Section>

        {/* ── SECTION 6: Product Performance Table ── */}
        <Section title="Product Performance" icon={Package} defaultOpen={false}>
          <div className="pt-4">
            {data?.topByRevenue?.length > 0 ? (
              <div className="overflow-x-auto -mx-5 px-5">
                <table className="w-full text-xs min-w-[500px]">
                  <thead><tr className="border-b border-border">
                    <th className="text-left py-2 px-2 font-medium text-text-muted">Product</th>
                    <th className="text-right py-2 px-2 font-medium text-text-muted">Views</th>
                    <th className="text-right py-2 px-2 font-medium text-text-muted">Wishlists</th>
                    <th className="text-right py-2 px-2 font-medium text-text-muted">Cart Adds</th>
                    <th className="text-right py-2 px-2 font-medium text-text-muted">Orders</th>
                    <th className="text-right py-2 px-2 font-medium text-text-muted">Units</th>
                    <th className="text-right py-2 px-2 font-medium text-text-muted">Revenue</th>
                    <th className="text-right py-2 px-2 font-medium text-text-muted">Stock</th>
                  </tr></thead>
                  <tbody>
                    {data.topByRevenue.slice(0, 15).map((item: any, i: number) => {
                      const views = data.topByViews?.find((v: any) => v.productId === item.productId)?._count?.id || 0;
                      const wishlists = data.topByWishlist?.find((w: any) => w.productId === item.productId)?._count?.id || 0;
                      const cartAdds = data.topByCart?.find((c: any) => c.productId === item.productId)?._count?.id || 0;
                      const stock = item.product?.stockQuantity ?? 0;
                      return (
                        <tr key={i} className="border-b border-border last:border-0 hover:bg-surface-muted/30 cursor-pointer" onClick={() => { if (item.product?.slug) window.location.href = "/admin/products/" + item.product.slug; }}>
                          <td className="py-2 px-2">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded bg-surface-muted overflow-hidden shrink-0">
                                {item.product?.images?.[0]?.url && <img src={item.product.images[0].url} alt="" className="w-full h-full object-cover" />}
                              </div>
                              <span className="font-medium text-primary truncate max-w-[120px]">{item.product?.name || "—"}</span>
                            </div>
                          </td>
                          <td className="py-2 px-2 text-right text-text-muted">{views}</td>
                          <td className="py-2 px-2 text-right text-text-muted">{wishlists}</td>
                          <td className="py-2 px-2 text-right text-text-muted">{cartAdds}</td>
                          <td className="py-2 px-2 text-right">{item._count?.id || 0}</td>
                          <td className="py-2 px-2 text-right font-medium">{Number(item._sum?.quantity || 0)}</td>
                          <td className="py-2 px-2 text-right font-medium">{fmtCurrency(Number(item._sum?.totalPrice || 0))}</td>
                          <td className="py-2 px-2 text-right">
                            <span className={cn("px-1.5 py-0.5 rounded-full text-[10px] font-medium", stock === 0 ? "bg-red-100 text-red-600" : stock <= 5 ? "bg-amber-100 text-amber-600" : "bg-green-100 text-green-600")}>
                              {stock}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-text-muted py-4 text-center">No product data yet</p>
            )}
          </div>
        </Section>

        {/* ── SECTION 9: Wishlist Intelligence ── */}
        <Section title="Wishlist Intelligence" icon={Heart} defaultOpen={false}>
          <div className="pt-4">
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="p-3 bg-surface-muted/50 rounded-xl text-center">
                <p className="text-xl font-bold text-primary">{data?.wishlist?.total || 0}</p>
                <p className="text-xs text-text-muted mt-1">Total Items</p>
              </div>
              <div className="p-3 bg-surface-muted/50 rounded-xl text-center">
                <p className="text-xl font-bold text-primary">{data?.wishlist?.today || 0}</p>
                <p className="text-xs text-text-muted mt-1">Today</p>
              </div>
              <div className="p-3 bg-surface-muted/50 rounded-xl text-center">
                <p className="text-xl font-bold text-primary">{funnel.cartAdds > 0 && funnel.wishlistAdds > 0 ? Math.round((funnel.cartAdds / funnel.wishlistAdds) * 100) : 0}%</p>
                <p className="text-xs text-text-muted mt-1">Wishlist→Cart</p>
              </div>
            </div>
            {data?.topByWishlist?.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-text-muted uppercase tracking-wider">Most Wishlisted</p>
                {data.topByWishlist.slice(0, 5).map((item: any, i: number) => (
                  <Link key={i} href={item.product?.slug ? "/admin/products/" + (item.product.slug) : "/admin/products"} className="flex items-center gap-3 py-2 border-b border-border last:border-0 hover:bg-surface-muted/30 transition-colors rounded px-1 -mx-1">
                    <span className="text-xs font-bold text-text-muted w-5">{i + 1}</span>
                    <div className="w-7 h-7 rounded bg-surface-muted overflow-hidden shrink-0">
                      {item.product?.images?.[0]?.url && <img src={item.product.images[0].url} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <span className="text-xs font-medium text-primary truncate flex-1">{item.product?.name || "—"}</span>
                    <span className="text-xs font-semibold text-primary">{item._count?.id || 0} wishlists</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </Section>

        {/* ── SECTION 10: Cart Analytics ── */}
        <Section title="Cart Analytics" icon={ShoppingBag} defaultOpen={false}>
          <div className="pt-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="p-3 bg-surface-muted/50 rounded-xl text-center">
                <p className="text-xl font-bold text-primary">{funnel.cartAdds || 0}</p>
                <p className="text-xs text-text-muted mt-1">Cart Additions</p>
              </div>
              <div className="p-3 bg-surface-muted/50 rounded-xl text-center">
                <p className="text-xl font-bold text-primary">{funnel.checkoutStarted || 0}</p>
                <p className="text-xs text-text-muted mt-1">Checkout Started</p>
              </div>
              <div className="p-3 bg-surface-muted/50 rounded-xl text-center">
                <p className="text-xl font-bold text-primary">{funnel.cartAdds > 0 && funnel.checkoutStarted > 0 ? Math.round((funnel.checkoutStarted / funnel.cartAdds) * 100) : 0}%</p>
                <p className="text-xs text-text-muted mt-1">Cart→Checkout</p>
              </div>
              <div className="p-3 bg-surface-muted/50 rounded-xl text-center">
                <p className="text-xl font-bold text-primary">{funnel.cartAdds > 0 ? Math.round(((funnel.cartAdds - (funnel.checkoutStarted || 0)) / funnel.cartAdds) * 100) : 0}%</p>
                <p className="text-xs text-text-muted mt-1">Abandonment</p>
              </div>
            </div>
            {data?.topByCart?.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-text-muted uppercase tracking-wider">Most Added to Cart</p>
                {data.topByCart.slice(0, 5).map((item: any, i: number) => (
                  <Link key={i} href={item.product?.slug ? "/admin/products/" + (item.product.slug) : "/admin/products"} className="flex items-center gap-3 py-2 border-b border-border last:border-0 hover:bg-surface-muted/30 transition-colors rounded px-1 -mx-1">
                    <span className="text-xs font-bold text-text-muted w-5">{i + 1}</span>
                    <div className="w-7 h-7 rounded bg-surface-muted overflow-hidden shrink-0">
                      {item.product?.images?.[0]?.url && <img src={item.product.images[0].url} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <span className="text-xs font-medium text-primary truncate flex-1">{item.product?.name || "—"}</span>
                    <span className="text-xs font-semibold text-primary">{item._count?.id || 0} adds</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </Section>

        {/* ── SECTION 14: Category Analytics ── */}
        {data?.categoryAnalytics?.length > 0 && (
          <Section title="Category Performance" icon={Layers} defaultOpen={false}>
            <div className="pt-4">
              <div className="space-y-3">
                {data.categoryAnalytics.sort((a: any, b: any) => b.revenue - a.revenue).map((cat: any) => {
                  const maxRev = Math.max(...data.categoryAnalytics.map((c: any) => c.revenue), 1);
                  return (
                    <div key={cat.id} className="py-2 border-b border-border last:border-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-primary">{cat.name}</span>
                        <span className="text-xs text-text-muted">{cat.products} products · {fmtCurrency(cat.revenue)}</span>
                      </div>
                      <MiniBar value={cat.revenue} max={maxRev} />
                    </div>
                  );
                })}
              </div>
            </div>
          </Section>
        )}

        {/* ── SECTION 20: Alerts & Actions ── */}
        {((k.outOfStock || 0) > 0 || (k.lowStock || 0) > 0 || (data?.payments?.failed || 0) > 0 || (k.pendingPayments || 0) > 0) && (
          <Section title="Action Required" icon={AlertTriangle} badge={(k.outOfStock || 0) + (k.lowStock || 0) + (data?.payments?.failed || 0)}>
            <div className="pt-4 space-y-2">
              {(k.outOfStock || 0) > 0 && (
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <XCircle size={14} className="text-red-500" />
                    <span className="text-xs font-medium text-red-700">{k.outOfStock} product{k.outOfStock > 1 ? "s" : ""} out of stock</span>
                  </div>
                  <Link href="/admin/products" className="text-[10px] font-medium text-red-600 hover:underline">Fix →</Link>
                </div>
              )}
              {(k.lowStock || 0) > 0 && (
                <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={14} className="text-amber-500" />
                    <span className="text-xs font-medium text-amber-700">{k.lowStock} product{k.lowStock > 1 ? "s" : ""} low on stock</span>
                  </div>
                  <Link href="/admin/products" className="text-[10px] font-medium text-amber-600 hover:underline">Restock →</Link>
                </div>
              )}
              {(data?.payments?.failed || 0) > 0 && (
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <XCircle size={14} className="text-red-500" />
                    <span className="text-xs font-medium text-red-700">{data.payments.failed} failed payment{data.payments.failed > 1 ? "s" : ""}</span>
                  </div>
                  <Link href="/admin/orders" className="text-[10px] font-medium text-red-600 hover:underline">Review →</Link>
                </div>
              )}
              {(k.pendingPayments || 0) > 0 && (
                <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-amber-500" />
                    <span className="text-xs font-medium text-amber-700">{k.pendingPayments} pending payment{k.pendingPayments > 1 ? "s" : ""}</span>
                  </div>
                  <Link href="/admin/orders" className="text-[10px] font-medium text-amber-600 hover:underline">Review →</Link>
                </div>
              )}
            </div>
          </Section>
        )}

        {/* ── SECTION 23: Data Export ── */}
        <Section title="Data Export" icon={Download} defaultOpen={false}>
          <div className="pt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { label: "Orders CSV", endpoint: "/api/orders?all=true&limit=1000" },
              { label: "Products CSV", endpoint: "/api/products?limit=1000" },
              { label: "Customers CSV", endpoint: "/api/customers?limit=1000" },
            ].map(exp => (
              <button key={exp.label} onClick={async () => {
                try {
                  const res = await fetch(exp.endpoint);
                  const json = await res.json();
                  const rows = json.orders || json.products || json.customers || [];
                  if (!rows.length) return;
                  const headers = Object.keys(rows[0]).filter((k: string) => typeof rows[0][k] !== "object");
                  const esc = (v: any) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
                  const csvLines = [headers.join(',')];
                  for (const r of rows) { csvLines.push(headers.map((h: string) => esc(r[h])).join(',')); }
                  const csv = csvLines.join('\n');
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url; a.download = exp.label.toLowerCase().replace(/ /g, '-') + '.csv'; a.click();
                  URL.revokeObjectURL(url);
                } catch {}
              }} className="flex items-center gap-2 p-3 bg-surface-muted/50 rounded-xl hover:bg-surface-muted transition-colors text-left">
                <Download size={14} className="text-[#6b6560]" />
                <span className="text-xs font-medium text-primary">{exp.label}</span>
              </button>
            ))}
          </div>
        </Section>

        {/* ── SECTION 22: Quick Actions ── */}
        <Section title="Quick Actions" icon={Zap} defaultOpen={false}>
          <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: "Add Product", href: "/admin/products/new", icon: Package },
              { label: "View Orders", href: "/admin/orders", icon: ShoppingCart },
              { label: "Customers", href: "/admin/customers", icon: Users },
              { label: "Inventory", href: "/admin/products", icon: Boxes },
              { label: "Categories", href: "/admin/categories", icon: Layers },
              { label: "Coupons", href: "/admin/coupons", icon: Percent },
              { label: "Settings", href: "/admin/settings", icon: Shield },
              { label: "View Store", href: "/", icon: ExternalLink },
            ].map(action => (
              <Link key={action.label} href={action.href} className="flex items-center gap-2 p-3 bg-surface-muted/50 rounded-xl hover:bg-surface-muted transition-colors">
                <action.icon size={14} className="text-[#6b6560]" />
                <span className="text-xs font-medium text-primary">{action.label}</span>
              </Link>
            ))}
          </div>
        </Section>

        <div className="h-8" />
      </div>
    </div>
  );
}
