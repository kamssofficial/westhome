"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Package, ShoppingCart, Users, TrendingUp, TrendingDown, DollarSign,
  Eye, Heart, ShoppingBag, AlertTriangle, ArrowUpRight, ArrowDownRight,
  RefreshCw, Calendar, BarChart3, Target, Truck, Clock, Search, Filter,
  ChevronDown, ChevronRight, Minus, Activity, Zap, Shield, Layers,
  PieChart, Map, MessageSquare, Smartphone, Monitor, Tablet, Star,
  ExternalLink, Download, MoreHorizontal, CheckCircle, XCircle,
  Package as PackageIcon, UserPlus, CreditCard, Percent, Boxes,
} from "lucide-react";
import { formatPrice, cn } from "@/lib/utils";

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

// ─── Helpers ──
function Trend({ current, previous, className }: { current: number; previous: number; className?: string }) {
  const pct = previous === 0 ? (current > 0 ? 100 : 0) : Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return <span className={cn("text-xs text-text-muted flex items-center gap-0.5", className)}><Minus size={12} /> 0%</span>;
  return (
    <span className={cn("text-xs font-medium flex items-center gap-0.5", pct > 0 ? "text-green-600" : "text-red-500", className)}>
      {pct > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      {Math.abs(pct)}%
    </span>
  );
}

function KPICard({ label, value, icon: Icon, trend, href, bg, accent }: { label: string; value: string | number; icon: any; trend?: { current: number; previous: number }; href?: string; bg?: string; accent?: string }) {
  const card = (
    <div className={cn("bg-white rounded-2xl border border-black/[.06] p-4 hover:shadow-md transition-all", href && "cursor-pointer")}>
      <div className="flex items-start justify-between mb-3">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", bg || "bg-[#f0ede8]")}>
          <Icon size={18} className={accent || "text-[#6b6560]"} />
        </div>
        {trend && <Trend current={trend.current} previous={trend.previous} />}
      </div>
      <p className="text-2xl font-bold text-primary tracking-tight">{value}</p>
      <p className="text-xs text-text-muted mt-1">{label}</p>
      {href && <ExternalLink size={10} className="text-text-muted mt-2" />}
    </div>
  );
  return href ? <Link href={href}>{card}</Link> : card;
}

function Section({ title, icon: Icon, children, defaultOpen = true, badge }: { title: string; icon: any; children: React.ReactNode; defaultOpen?: boolean; badge?: string | number }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-2xl border border-black/[.06] overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-muted/30 transition-colors">
        <div className="flex items-center gap-3">
          <Icon size={18} className="text-[#6b6560]" />
          <h2 className="text-sm font-semibold text-primary">{title}</h2>
          {badge !== undefined && <span className="px-2 py-0.5 bg-accent/10 text-accent text-[10px] font-bold rounded-full">{badge}</span>}
        </div>
        <ChevronDown size={16} className={cn("text-text-muted transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="px-5 pb-5 border-t border-border">{children}</div>}
    </div>
  );
}

function MiniBar({ value, max, color }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-full h-1.5 bg-surface-muted rounded-full overflow-hidden">
      <div className={cn("h-full rounded-full transition-all", color || "bg-accent")} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ─── Main Dashboard ──
export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [range, setRange] = useState("30d");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (r: string, silent = false) => {
    if (!silent) setLoading(true);
    setRefreshing(true);
    try {
      const res = await fetch(`/api/admin/dashboard?range=${r}`);
      if (res.ok) setData(await res.json());
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(range); }, [range, fetchData]);

  const fmt = (n: number) => n >= 100000 ? `${(n / 100000).toFixed(1)}L` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);
  const fmtCurrency = (n: number) => `₹${n.toLocaleString("en-IN")}`;

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
          <KPICard label="Revenue" value={fmtCurrency(k.revenue)} icon={DollarSign} trend={{ current: k.revenue, previous: k.prevRevenue }} bg="bg-emerald-50" accent="text-emerald-600" />
          <KPICard label="Orders" value={k.totalOrders || 0} icon={ShoppingCart} trend={{ current: k.totalOrders, previous: k.prevTotalOrders }} />
          <KPICard label="Avg Order Value" value={fmtCurrency(k.avgOrderValue)} icon={BarChart3} trend={{ current: k.avgOrderValue, previous: k.prevAvgOrderValue }} bg="bg-blue-50" accent="text-blue-600" />
          <KPICard label="Conversion Rate" value={`${k.conversionRate || 0}%`} icon={Target} bg="bg-purple-50" accent="text-purple-600" />
          <KPICard label="Customers" value={k.totalCustomers || 0} icon={Users} trend={{ current: k.newCustomers, previous: k.prevNewCustomers }} href="/admin/customers" />
          <KPICard label="Units Sold" value={k.unitsSold || 0} icon={Package} trend={{ current: k.unitsSold, previous: k.prevUnitsSold }} bg="bg-amber-50" accent="text-amber-600" />
          <KPICard label="Products" value={k.totalProducts || 0} icon={Boxes} href="/admin/products" bg="bg-indigo-50" accent="text-indigo-600" />
          <KPICard label="Cancelled" value={k.cancelledOrders || 0} icon={XCircle} bg="bg-red-50" accent="text-red-500" />
        </div>

        {/* ── Revenue Quick Stats ── */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl border border-black/[.06] p-4 text-center">
            <p className="text-xs text-text-muted">Today</p>
            <p className="text-lg font-bold text-primary mt-1">{k.todayOrders || 0} orders</p>
          </div>
          <div className="bg-white rounded-2xl border border-black/[.06] p-4 text-center">
            <p className="text-xs text-text-muted">This Week</p>
            <p className="text-lg font-bold text-primary mt-1">{k.weekOrders || 0} orders</p>
          </div>
          <div className="bg-white rounded-2xl border border-black/[.06] p-4 text-center">
            <p className="text-xs text-text-muted">This Month</p>
            <p className="text-lg font-bold text-primary mt-1">{k.monthOrders || 0} orders</p>
          </div>
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
                <div key={status} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-2">
                    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium", STATUS_COLORS[status] || "bg-gray-100 text-gray-700")}>
                      {status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-primary">{count as number}</span>
                </div>
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
                  <div key={i} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                    <span className="text-xs font-bold text-text-muted w-5">{i + 1}</span>
                    <div className="w-8 h-8 rounded-lg bg-surface-muted overflow-hidden shrink-0">
                      {item.product?.images?.[0]?.url && <img src={item.product.images[0].url} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-primary truncate">{item.product?.name || "Unknown"}</p>
                    </div>
                    <span className="text-xs font-semibold text-primary whitespace-nowrap">{section.format(item[section.field] || 0)}</span>
                  </div>
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
                  <div key={p.id} className="flex items-center justify-between py-2 px-3 bg-amber-50 rounded-lg">
                    <div>
                      <p className="text-xs font-medium text-primary">{p.name}</p>
                      <p className="text-[10px] text-amber-600">{p.stock} left (threshold: {p.threshold})</p>
                    </div>
                    <span className="text-[10px] font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">Low</span>
                  </div>
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
                    <div key={i} className="flex items-center justify-between py-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-text-muted w-4">{i + 1}.</span>
                        <span className="text-xs text-primary">{s.query}</span>
                      </div>
                      <span className="text-[10px] text-text-muted">{s.count} searches</span>
                    </div>
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
              <div key={order.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
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
              </div>
            ))}
            {data?.activity?.recentOrders?.length === 0 && <p className="text-xs text-text-muted py-4 text-center">No recent activity</p>}
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
