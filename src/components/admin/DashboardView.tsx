"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import {
  AlertTriangle, BarChart3, Boxes, CheckCircle, Clock, CreditCard, Download,
  ExternalLink, Globe, Heart, IndianRupee, Layers, Map as MapIcon, Monitor,
  Package, Percent, RefreshCw, Search, Shield, ShoppingCart,
  Smartphone, Tablet, Target, Users, XCircle, Zap,
} from "lucide-react";
import { formatPrice, cn } from "@/lib/utils";
import {
  KPICard, Section, MiniBar, LiveUpdated, StatTile, StatusPill, EmptyState,
} from "@/components/admin/DashboardWidgets";

/* ─── Types ──────────────────────────────────────────────────────────────── */

export interface DashboardData {
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

// Every one of these is handled by /api/admin/dashboard.
const DATE_RANGES = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "thisMonth", label: "This month" },
  { value: "lastMonth", label: "Last month" },
];

// Real-time per-visitor rows from the existing /api/analytics/live endpoint.
export interface LiveVisitor {
  sessionId: string;
  device?: string | null;
  currentPage?: string | null;
  viewingProduct?: string | null;
  isCustomer: boolean;
  secondsSinceActive: number;
}
export interface LiveState {
  live: number;
  customers: number;
  guests: number;
  visitors: LiveVisitor[];
}
export const EMPTY_LIVE: LiveState = { live: 0, customers: 0, guests: 0, visitors: [] };

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function activeAgo(s: number): string {
  if (s < 45) return "Just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  return m < 60 ? `${m} min ago` : `${Math.floor(m / 60)}h ago`;
}

// Human, anonymized page label — never raw slugs or URLs with identifiers.
function prettyPage(path: string): string {
  if (!path || path === "/") return "the homepage";
  const p = path.replace(/^\/+/, "");
  if (p.startsWith("products/")) return "a product";
  if (p.startsWith("collections/")) return "a collection";
  if (p.startsWith("cart")) return "the cart";
  if (p.startsWith("checkout")) return "checkout";
  if (p.startsWith("search")) return "search";
  if (p.startsWith("account")) return "their account";
  if (p.startsWith("wishlist")) return "their wishlist";
  return "/" + p;
}

const count = (n: number | undefined) => (n || 0).toLocaleString("en-IN");
/** "1 order" reads wrong — pluralise only when the count warrants it. */
const plural = (n: number | undefined, one: string, many = `${one}s`) =>
  `${count(n)} ${(n || 0) === 1 ? one : many}`;
/** Share of the largest funnel stage. Rounding 0.4% to "0%" reads as zero, so
    anything under 1% keeps a decimal (or is explicitly marked as tiny). */
const share = (value: number | undefined, max: number | undefined) => {
  const p = max && max > 0 ? ((value || 0) / max) * 100 : 0;
  if (p <= 0) return "0%";
  if (p < 0.1) return "<0.1%";
  if (p < 1) return `${p.toFixed(1)}%`;
  return `${Math.round(p)}%`;
};
const money = (n: number | undefined) => formatPrice(n || 0);

/* ─── Dashboard view ─────────────────────────────────────────────────────────
   Pure presentation: no fetch, no timers, no database access. Every figure
   arrives as a prop, so the view renders with fixtures and can be
   screenshotted without a signed-in session. */

export interface DashboardViewProps {
  data: DashboardData | null;
  live: LiveState;
  range: string;
  onRangeChange: (value: string) => void;
  onRefresh: () => void;
  onExport: (label: string, endpoint: string) => void;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  lastUpdated: number | null;
  liveError: boolean;
  liveLoaded: boolean;
}

export default function DashboardView({
  data,
  live,
  range,
  onRangeChange,
  onRefresh,
  onExport,
  loading,
  refreshing,
  error,
  lastUpdated,
  liveError,
  liveLoaded,
}: DashboardViewProps) {
  const k = data?.kpis || {};
  const funnel = data?.funnel || {};
  const rangeLabel = DATE_RANGES.find((r) => r.value === range)?.label || "Selected period";
  const visitors = live.visitors || [];
  const exporting = [
    { label: "Orders CSV", endpoint: "/api/orders?all=true&limit=1000" },
    { label: "Products CSV", endpoint: "/api/products?limit=1000" },
    { label: "Customers CSV", endpoint: "/api/customers?limit=1000" },
  ];

  /* ── Early states ── */
  if (error && !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
          <p className="font-display text-xl text-primary">Couldn&rsquo;t load the dashboard</p>
          <p className="mt-1 text-xs text-text-muted">{error}</p>
          <button
            onClick={onRefresh}
            className="focus-ring mt-4 rounded-full bg-primary px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-primary-hover"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading dashboard">
        <div className="h-24 animate-pulse rounded-2xl bg-surface-muted" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-surface-muted" />
          ))}
        </div>
        <div className="h-80 animate-pulse rounded-2xl bg-surface-muted" />
      </div>
    );
  }

  /* ── Derived values ── */
  const deviceCounts: Record<string, number> = { desktop: 0, mobile: 0, tablet: 0, unknown: 0 };
  for (const v of visitors) {
    const d = (v.device || "unknown").toLowerCase();
    deviceCounts[d] = (deviceCounts[d] || 0) + 1;
  }

  const actionItems = [
    (k.outOfStock || 0) > 0 && {
      tone: "error" as const,
      icon: XCircle,
      text: `${count(k.outOfStock)} ${k.outOfStock === 1 ? "product is" : "products are"} out of stock`,
      href: "/admin/products",
      cta: "Fix",
    },
    (k.lowStock || 0) > 0 && {
      tone: "warning" as const,
      icon: AlertTriangle,
      text: `${count(k.lowStock)} ${k.lowStock === 1 ? "product is" : "products are"} low on stock`,
      href: "/admin/products",
      cta: "Restock",
    },
    (data?.payments?.failed || 0) > 0 && {
      tone: "error" as const,
      icon: XCircle,
      text: `${count(data?.payments?.failed)} failed ${data?.payments?.failed === 1 ? "payment" : "payments"}`,
      href: "/admin/orders",
      cta: "Review",
    },
    (k.pendingPayments || 0) > 0 && {
      tone: "warning" as const,
      icon: Clock,
      text: `${count(k.pendingPayments)} pending ${k.pendingPayments === 1 ? "payment" : "payments"}`,
      href: "/admin/orders",
      cta: "Review",
    },
  ].filter(Boolean) as {
    tone: "error" | "warning"; icon: ComponentType<{ size?: number; className?: string }>;
    text: string; href: string; cta: string;
  }[];

  const revenueMax = Math.max(...(data?.revenueOverTime || []).map((d) => d.revenue), 1);
  const statusRows = Object.entries(data?.orderStatus || {}).sort((a, b) => b[1] - a[1]);
  const categories = [...(data?.categoryAnalytics || [])].sort((a, b) => b.revenue - a.revenue);
  const categoryMax = Math.max(...categories.map((c) => c.revenue), 1);
  const searchRows = (data?.topSearches || []).slice(0, 8);
  const searchMax = Math.max(...searchRows.map((s) => s.count), 1);
  const recentOrders = (data?.activity?.recentOrders || []).slice(0, 8);

  const funnelStages = [
    { label: "Page views", value: funnel.pageViews, tone: "info" as const },
    { label: "Product views", value: funnel.productViews, tone: "info" as const },
    { label: "Cart adds", value: funnel.cartAdds, tone: "warning" as const },
    { label: "Checkout started", value: funnel.checkoutStarted, tone: "warning" as const },
    { label: "Payment started", value: funnel.paymentStarted, tone: "accent" as const },
    { label: "Orders completed", value: funnel.orderCompleted, tone: "success" as const },
  ].filter((s) => (s.value || 0) > 0);
  const funnelMax = funnelStages[0]?.value || 1;

  return (
    <div className="space-y-6 lg:space-y-8">

      {/* ── Page header ─────────────────────────────────────────────────────
          Not sticky: AdminShell already owns the sticky bar and breadcrumb. */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-label text-text-muted">Overview</p>
          <h1 className="font-display mt-2 text-3xl text-primary sm:text-4xl">Dashboard</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
            <span>{rangeLabel}</span>
            <span aria-hidden="true">·</span>
            <LiveUpdated at={lastUpdated} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="dashboard-range" className="sr-only">Date range</label>
          <select
            id="dashboard-range"
            value={range}
            onChange={(e) => onRangeChange(e.target.value)}
            className="focus-ring rounded-full border border-border bg-surface px-3 py-2 text-xs font-medium text-primary"
          >
            {DATE_RANGES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            aria-label="Refresh dashboard"
            className="focus-ring rounded-full border border-border bg-surface p-2.5 transition-colors hover:bg-surface-hover disabled:opacity-50"
          >
            <RefreshCw size={15} aria-hidden="true" className={cn("text-text-muted", refreshing && "animate-spin")} />
          </button>
        </div>
      </header>

      {error && data ? (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-2xl border border-error/30 bg-error/10 px-4 py-3 text-xs font-medium text-error"
        >
          <span>{error}</span>
          <button onClick={onRefresh} className="focus-ring underline">Retry</button>
        </div>
      ) : null}

      {/* ── Action required ─────────────────────────────────────────────────
          First on the page: it is the only block that needs a human today. */}
      {actionItems.length > 0 ? (
        <Section title="Action required" icon={AlertTriangle} badge={actionItems.length}>
          <ul className="space-y-2">
            {actionItems.map((item) => (
              <li key={item.text}>
                <Link
                  href={item.href}
                  className={cn(
                    "focus-ring flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition-colors",
                    item.tone === "error" ? "bg-error/10 hover:bg-error/15" : "bg-warning/10 hover:bg-warning/15"
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <item.icon size={14} aria-hidden="true" className={item.tone === "error" ? "text-error" : "text-warning"} />
                    <span className={cn("truncate text-xs font-medium", item.tone === "error" ? "text-error" : "text-warning")}>
                      {item.text}
                    </span>
                  </span>
                  <span className={cn("shrink-0 text-[11px] font-semibold", item.tone === "error" ? "text-error" : "text-warning")}>
                    {item.cta} →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {/* ── Live store ── */}
      <section
        aria-labelledby="live-heading"
        className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <h2 id="live-heading" className="font-display flex items-center gap-2.5 text-lg text-primary">
            <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
            </span>
            Live store
          </h2>
          <span className="flex items-center gap-2 text-[11px] text-text-muted">
            <span
              className={cn("h-1.5 w-1.5 rounded-full", liveError ? "bg-error" : "bg-success")}
              aria-hidden="true"
            />
            {liveError ? "Connection lost — retrying" : "Updating every 15s"}
          </span>
        </div>

        <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:gap-8">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-success/10">
              <span className="text-2xl font-semibold tabular-nums text-success">{live.live}</span>
            </div>
            <div>
              <p className="text-sm font-medium text-primary">
                {live.live === 1 ? "Visitor online" : "Visitors online"}
              </p>
              <p className="mt-0.5 text-xs text-text-muted" aria-live="polite">
                {deviceCounts.desktop || 0} desktop · {deviceCounts.mobile || 0} mobile
                {deviceCounts.tablet > 0 ? ` · ${deviceCounts.tablet} tablet` : ""}
              </p>
            </div>
          </div>
          <div className="sm:ml-auto sm:text-right">
            <p className="font-label text-text-muted">Active right now</p>
            <p className="mt-1 text-xs text-text-muted">
              {count(live.customers)} signed in · {count(live.guests)} guests
            </p>
          </div>
        </div>

        <div className="px-5 pb-5">
          <div className="mb-2.5 flex items-center justify-between">
            <h3 className="font-label text-text-muted">Live activity</h3>
            <span className="text-[11px] text-text-muted">
              {visitors.length === 1 ? "1 person" : `${visitors.length} people`} browsing
            </span>
          </div>
          {!liveLoaded ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-surface-muted" />
              ))}
            </div>
          ) : visitors.length === 0 ? (
            <EmptyState
              icon={Globe}
              title="No visitors online right now"
              hint="Live activity appears here the moment someone opens your store."
            />
          ) : (
            <ul className="space-y-2">
              {visitors.map((v) => {
                const Dev = v.device === "mobile" ? Smartphone : v.device === "tablet" ? Tablet : Monitor;
                const what = v.viewingProduct
                  ? `Viewing “${v.viewingProduct}”`
                  : v.currentPage
                    ? `Browsing ${prettyPage(v.currentPage)}`
                    : "Browsing the store";
                return (
                  <li
                    key={v.sessionId}
                    className="flex items-center gap-3 rounded-xl border border-border-light px-3 py-2.5 transition-colors hover:bg-surface-hover"
                  >
                    <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-primary">
                        <span className="font-medium">{v.isCustomer ? "Customer" : "Visitor"}</span>
                        <span className="text-text-muted"> · {what}</span>
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-text-muted">
                        <Dev size={11} aria-hidden="true" className="shrink-0" />
                        <span className="capitalize">{v.device || "Unknown device"}</span>
                        <span aria-hidden="true">·</span>
                        <span>{activeAgo(v.secondsSinceActive)}</span>
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {/* ── Store performance ── */}
      <section aria-labelledby="performance-heading">
        <div className="mb-4 flex items-end justify-between gap-3">
          <h2 id="performance-heading" className="font-display text-xl text-primary">Store performance</h2>
          <span className="font-label text-text-muted">{rangeLabel}</span>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KPICard
            label="Revenue" value={money(k.revenue)} icon={IndianRupee} tone="accent"
            trend={{ current: k.revenue || 0, previous: k.prevRevenue || 0 }} trendLabel="previous period"
            href="/admin/orders?status=NEW"
          />
          <KPICard
            label="Orders" value={count(k.totalOrders)} icon={ShoppingCart}
            trend={{ current: k.totalOrders || 0, previous: k.prevTotalOrders || 0 }} trendLabel="previous period"
            href="/admin/orders"
          />
          <KPICard
            label="Avg order value" value={money(k.avgOrderValue)} icon={BarChart3} tone="info"
            trend={{ current: k.avgOrderValue || 0, previous: k.prevAvgOrderValue || 0 }} trendLabel="previous period"
            href="/admin/orders"
          />
          <KPICard label="Conversion rate" value={`${k.conversionRate || 0}%`} icon={Target} tone="info" href="/admin/analytics" />
          <KPICard
            label="Customers" value={count(k.totalCustomers)} icon={Users}
            trend={{ current: k.newCustomers || 0, previous: k.prevNewCustomers || 0 }} trendLabel="previous period"
            hint={`${count(k.newCustomers)} new · ${count(k.returningCustomers)} returning`}
            href="/admin/customers"
          />
          <KPICard
            label="Units sold" value={count(k.unitsSold)} icon={Package} tone="warning"
            trend={{ current: k.unitsSold || 0, previous: k.prevUnitsSold || 0 }} trendLabel="previous period"
            href="/admin/orders"
          />
          <KPICard label="Products" value={count(k.totalProducts)} icon={Boxes} href="/admin/products" />
          <KPICard
            label="Cancelled" value={count(k.cancelledOrders)} icon={XCircle} tone="error"
            href="/admin/orders?status=CANCELLED"
          />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3">
          {[
            { label: "Today", value: k.ordersToday },
            { label: "This week", value: k.weekOrders },
            { label: "This month", value: k.monthOrders },
          ].map((q) => (
            <Link key={q.label} href="/admin/orders" className="focus-ring block rounded-2xl">
              <StatTile label={q.label} value={plural(q.value, "order")} />
            </Link>
          ))}
        </div>
      </section>

      {/* ── Revenue + funnel ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {(data?.revenueOverTime?.length || 0) > 0 ? (
          <Section title="Revenue" icon={BarChart3} hint={rangeLabel}>
            <div
              role="img"
              aria-label={`Revenue per day over ${rangeLabel}. Total ${money(k.revenue)}.`}
              className="flex h-40 items-end gap-1 sm:h-48"
            >
              {data!.revenueOverTime.map((d, i) => (
                <div key={i} className="group relative flex flex-1 flex-col items-center">
                  <div className="pointer-events-none absolute bottom-full z-10 mb-2 hidden whitespace-nowrap rounded-lg bg-primary px-2 py-1 text-[10px] text-white shadow-dropdown group-hover:block">
                    {d.date}: {money(d.revenue)} ({plural(d.orders, "order")})
                  </div>
                  <div
                    className="w-full rounded-t-md bg-accent/30 transition-colors group-hover:bg-accent/60"
                    style={{ height: `${Math.max((d.revenue / revenueMax) * 100, 2)}%` }}
                  />
                </div>
              ))}
            </div>
            <dl className="mt-4 flex items-center justify-between border-t border-border pt-3">
              <div>
                <dt className="text-xs text-text-muted">Total revenue</dt>
                <dd className="text-sm font-semibold text-primary tabular-nums">{money(k.revenue)}</dd>
              </div>
              <div className="text-right">
                <dt className="text-xs text-text-muted">Avg per day</dt>
                <dd className="text-sm font-semibold text-primary tabular-nums">
                  {money(Math.round((k.revenue || 0) / data!.revenueOverTime.length))}
                </dd>
              </div>
            </dl>
          </Section>
        ) : null}

        {funnelStages.length > 0 ? (
          <Section title="Sales funnel" icon={Target} hint={rangeLabel}>
            <ol className="space-y-3">
              {funnelStages.map((stage, i) => (
                <li key={stage.label}>
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <span className="text-xs font-medium text-primary">{stage.label}</span>
                    <span className="text-xs text-text-muted tabular-nums">
                      {count(stage.value)} ({share(stage.value, funnelMax)})
                    </span>
                  </div>
                  <MiniBar value={stage.value} max={funnelMax} tone={stage.tone} />
                  {i < funnelStages.length - 1 ? (
                    <p className="mt-1 text-[10px] text-text-muted">
                      {/* Drop-off is how much of this stage failed to advance, so it
                          is measured against the current stage and floored at 0 —
                          a stage that grew is not a negative drop-off. */}
                      {Math.max(0, Math.round(((stage.value - funnelStages[i + 1].value) / (stage.value || 1)) * 100))}% drop-off
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>
          </Section>
        ) : null}
      </div>

      {/* ── Orders + payments ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Orders by status" icon={ShoppingCart} badge={k.totalOrders} hint={rangeLabel}>
          {statusRows.length === 0 ? (
            <EmptyState icon={ShoppingCart} title="No orders yet" hint={`Nothing placed in ${rangeLabel.toLowerCase()}.`} />
          ) : (
            <ul>
              {statusRows.map(([status, n]) => (
                <li key={status}>
                  <Link
                    href={`/admin/orders?status=${status}`}
                    className="focus-ring flex items-center justify-between gap-3 border-b border-border-light py-2.5 transition-colors last:border-0 hover:bg-surface-hover"
                  >
                    <StatusPill status={status} />
                    <span className="text-sm font-medium text-primary tabular-nums">{count(n)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/admin/orders"
            className="focus-ring mt-3 flex items-center justify-center gap-1 rounded-full py-2 text-xs font-medium text-accent hover:underline"
          >
            View all orders
          </Link>
        </Section>

        <Section title="Payments" icon={CreditCard} hint={rangeLabel}>
          <div className="grid grid-cols-2 gap-3">
            <StatTile label="Successful" value={count(data?.payments?.success)} tone="success" />
            <StatTile label="Failed" value={count(data?.payments?.failed)} tone="error" />
            <StatTile label="Success rate" value={`${data?.payments?.successRate || 0}%`} tone="accent" />
            <StatTile label="Pending" value={count(k.pendingPayments)} tone="warning" />
          </div>
        </Section>
      </div>

      {/* ── Recent activity ── */}
      <Section title="Recent activity" icon={Clock}>
        {recentOrders.length === 0 ? (
          <EmptyState icon={Clock} title="No recent activity" hint="New orders will show up here." />
        ) : (
          <ul>
            {recentOrders.map((order: any) => (
              <li key={order.id}>
                <Link
                  href={`/admin/orders/${order.id}`}
                  className="focus-ring flex items-center justify-between gap-3 border-b border-border-light py-2.5 transition-colors last:border-0 hover:bg-surface-hover"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-muted">
                      {order.status === "DELIVERED" ? (
                        <CheckCircle size={14} aria-hidden="true" className="text-success" />
                      ) : order.status === "CANCELLED" ? (
                        <XCircle size={14} aria-hidden="true" className="text-error" />
                      ) : (
                        <ShoppingCart size={14} aria-hidden="true" className="text-text-secondary" />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-medium text-primary">{order.orderNumber}</span>
                      <span className="block truncate text-[11px] text-text-muted">
                        {order.customerName} ·{" "}
                        {new Date(order.createdAt).toLocaleString("en-IN", {
                          day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                        })}
                      </span>
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="text-xs font-semibold text-primary tabular-nums">
                      {money(Number(order.total))}
                    </span>
                    <StatusPill status={order.status} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* ── Products ────────────────────────────────────────────────────────
          One table carries every product metric. The old page rendered the
          same numbers four times over (by revenue, units, views, wishlists)
          plus a fifth copy in a table. */}
      <Section
        title="Product performance"
        icon={Package}
        hint={rangeLabel}
        defaultOpen={false}
      >
        {(data?.topByRevenue?.length || 0) === 0 ? (
          <EmptyState icon={Package} title="No product data yet" hint="Sales and views will appear here." />
        ) : (
          <div className="-mx-5 overflow-x-auto px-5">
            <table className="w-full min-w-[640px] text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className="py-2 pl-1 pr-2 text-left font-medium text-text-muted">Product</th>
                  <th scope="col" className="px-2 py-2 text-right font-medium text-text-muted">Views</th>
                  <th scope="col" className="px-2 py-2 text-right font-medium text-text-muted">Wishlist</th>
                  <th scope="col" className="px-2 py-2 text-right font-medium text-text-muted">Cart</th>
                  <th scope="col" className="px-2 py-2 text-right font-medium text-text-muted">Orders</th>
                  <th scope="col" className="px-2 py-2 text-right font-medium text-text-muted">Units</th>
                  <th scope="col" className="px-2 py-2 text-right font-medium text-text-muted">Revenue</th>
                  <th scope="col" className="px-2 py-2 text-right font-medium text-text-muted">Stock</th>
                </tr>
              </thead>
              <tbody>
                {data!.topByRevenue.slice(0, 15).map((item: any, i: number) => {
                  const views = data!.topByViews?.find((v: any) => v.productId === item.productId)?._count?.id || 0;
                  const wishlists = data!.topByWishlist?.find((w: any) => w.productId === item.productId)?._count?.id || 0;
                  const cartAdds = data!.topByCart?.find((c: any) => c.productId === item.productId)?._count?.id || 0;
                  const stock = item.product?.stockQuantity ?? 0;
                  const href = item.product?.slug ? `/admin/products/${item.product.slug}` : "/admin/products";
                  return (
                    <tr key={i} className="border-b border-border-light transition-colors last:border-0 hover:bg-surface-hover">
                      <td className="py-2 pl-1 pr-2">
                        <Link href={href} className="focus-ring flex items-center gap-2">
                          <span className="h-7 w-7 shrink-0 overflow-hidden rounded bg-surface-muted">
                            {item.product?.images?.[0]?.url ? (
                              <img src={item.product.images[0].url} alt="" className="h-full w-full object-cover" />
                            ) : null}
                          </span>
                          <span className="max-w-[160px] truncate font-medium text-primary">
                            {item.product?.name || "—"}
                          </span>
                        </Link>
                      </td>
                      <td className="px-2 py-2 text-right text-text-muted tabular-nums">{count(views)}</td>
                      <td className="px-2 py-2 text-right text-text-muted tabular-nums">{count(wishlists)}</td>
                      <td className="px-2 py-2 text-right text-text-muted tabular-nums">{count(cartAdds)}</td>
                      <td className="px-2 py-2 text-right text-primary tabular-nums">{count(item._count?.id)}</td>
                      <td className="px-2 py-2 text-right font-medium text-primary tabular-nums">
                        {count(Number(item._sum?.quantity || 0))}
                      </td>
                      <td className="px-2 py-2 text-right font-medium text-primary tabular-nums">
                        {money(Number(item._sum?.totalPrice || 0))}
                      </td>
                      <td className="px-2 py-2 text-right">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-medium tabular-nums",
                            stock === 0 ? "bg-error/10 text-error" : stock <= 5 ? "bg-warning/10 text-warning" : "bg-success/10 text-success"
                          )}
                        >
                          {stock}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* ── Customers + cart/wishlist ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Customer intelligence" icon={Users} hint={rangeLabel}>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Total" value={count(k.totalCustomers)} />
            <StatTile label="New" value={count(k.newCustomers)} tone="success" />
            <StatTile label="Returning" value={count(k.returningCustomers)} />
            <StatTile label="Wishlist items" value={count(data?.wishlist?.total)} />
          </div>
          {(data?.topCustomers?.length || 0) === 0 ? (
            <EmptyState icon={Users} title="No customer orders yet" />
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className="py-2 pr-2 text-left font-medium text-text-muted">Customer</th>
                  <th scope="col" className="px-2 py-2 text-right font-medium text-text-muted">Orders</th>
                  <th scope="col" className="py-2 pl-2 text-right font-medium text-text-muted">Spent</th>
                </tr>
              </thead>
              <tbody>
                {data!.topCustomers.slice(0, 10).map((c: any, i: number) => (
                  <tr key={i} className="border-b border-border-light last:border-0">
                    <td className="py-2 pr-2">
                      <span className="block truncate font-medium text-primary">{c.customer?.name || "Guest"}</span>
                      <span className="block truncate text-text-muted">{c.customer?.email}</span>
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">{count(c._count?.id)}</td>
                    <td className="py-2 pl-2 text-right font-medium tabular-nums">{money(c.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        <Section title="Cart & wishlist" icon={Heart} hint={rangeLabel}>
          <div className="mb-4 grid grid-cols-2 gap-3">
            <StatTile label="Cart additions" value={count(funnel.cartAdds)} />
            <StatTile label="Checkout started" value={count(funnel.checkoutStarted)} />
            <StatTile
              label="Cart → checkout"
              value={`${funnel.cartAdds > 0 ? Math.round((funnel.checkoutStarted / funnel.cartAdds) * 100) : 0}%`}
              tone="accent"
            />
            <StatTile
              label="Abandonment"
              value={`${funnel.cartAdds > 0 ? Math.round(((funnel.cartAdds - (funnel.checkoutStarted || 0)) / funnel.cartAdds) * 100) : 0}%`}
              tone="warning"
            />
            <StatTile label="Wishlist today" value={count(data?.wishlist?.today)} />
            {/* Cart adds are not a subset of wishlist saves, so this is a ratio,
                not a conversion rate — as a percentage it could pass 100%. */}
            <StatTile
              label="Cart adds per save"
              value={funnel.wishlistAdds > 0 ? `${(funnel.cartAdds / funnel.wishlistAdds).toFixed(2)}×` : "—"}
              tone="success"
            />
          </div>
          {(data?.topByWishlist?.length || 0) > 0 ? (
            <ul>
              {data!.topByWishlist.slice(0, 5).map((item: any, i: number) => (
                <li key={i}>
                  <Link
                    href={item.product?.slug ? `/admin/products/${item.product.slug}` : "/admin/products"}
                    className="focus-ring flex items-center gap-3 border-b border-border-light py-2 transition-colors last:border-0 hover:bg-surface-hover"
                  >
                    <span className="w-4 text-xs font-medium text-text-muted tabular-nums">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate text-xs font-medium text-primary">
                      {item.product?.name || "—"}
                    </span>
                    <span className="shrink-0 text-xs text-text-muted tabular-nums">
                      {plural(item._count?.id, "save")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </Section>
      </div>

      {/* ── Traffic ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Searches" icon={Search} hint={rangeLabel}>
          {searchRows.length === 0 ? (
            <EmptyState icon={Search} title="No search data yet" />
          ) : (
            <ul className="space-y-3">
              {searchRows.map((s: any, i: number) => (
                <li key={i}>
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <Link
                      href={`/search?q=${encodeURIComponent(s.query)}`}
                      className="focus-ring truncate text-xs text-primary hover:text-accent"
                    >
                      {s.query}
                    </Link>
                    <span className="shrink-0 text-[11px] text-text-muted tabular-nums">{count(s.count)}</span>
                  </div>
                  <MiniBar value={s.count} max={searchMax} tone="neutral" />
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Devices" icon={Monitor} hint={rangeLabel}>
          {(data?.deviceBreakdown?.length || 0) === 0 ? (
            <EmptyState icon={Monitor} title="No device data yet" />
          ) : (
            <ul className="space-y-3">
              {data!.deviceBreakdown.map((d: any) => {
                const total = data!.deviceBreakdown.reduce((s: number, x: any) => s + x.count, 0);
                const pct = total > 0 ? Math.round((d.count / total) * 100) : 0;
                const Icon = d.device === "mobile" ? Smartphone : d.device === "tablet" ? Tablet : Monitor;
                return (
                  <li key={d.device}>
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2 text-xs font-medium capitalize text-primary">
                        <Icon size={14} aria-hidden="true" className="text-text-muted" />
                        {d.device}
                      </span>
                      <span className="text-[11px] text-text-muted tabular-nums">{pct}% ({count(d.count)})</span>
                    </div>
                    <MiniBar value={d.count} max={total} tone="neutral" />
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-4 text-[11px] text-text-muted">
            {count(data?.uniqueVisitors)} unique visitors in {rangeLabel.toLowerCase()}.
          </p>
        </Section>
      </div>

      {/* ── Geography + categories ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {(data?.geographic?.length || 0) > 0 ? (
          <Section title="Where orders ship" icon={MapIcon} hint={rangeLabel}>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className="py-2 pr-2 text-left font-medium text-text-muted">State</th>
                  <th scope="col" className="px-2 py-2 text-right font-medium text-text-muted">Orders</th>
                  <th scope="col" className="py-2 pl-2 text-right font-medium text-text-muted">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {data!.geographic.map((g: any, i: number) => (
                  <tr key={i} className="border-b border-border-light last:border-0">
                    <td className="py-2 pr-2 font-medium text-primary">{g.state}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{count(g.orders)}</td>
                    <td className="py-2 pl-2 text-right font-medium tabular-nums">{money(g.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        ) : null}

        {categories.length > 0 ? (
          <Section title="Category performance" icon={Layers} hint={rangeLabel}>
            <ul className="space-y-3">
              {categories.map((cat: any) => (
                <li key={cat.id}>
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <span className="truncate text-xs font-medium text-primary">{cat.name}</span>
                    <span className="shrink-0 text-[11px] text-text-muted tabular-nums">
                      {count(cat.products)} products · {money(cat.revenue)}
                    </span>
                  </div>
                  <MiniBar value={cat.revenue} max={categoryMax} tone="accent" />
                </li>
              ))}
            </ul>
          </Section>
        ) : null}
      </div>

      {/* ── Insights ── */}
      {(data?.insights?.length || 0) > 0 ? (
        <Section title="WESTHOME insights" icon={Zap}>
          <ul className="space-y-2">
            {data!.insights.map((insight: string, i: number) => (
              <li key={i} className="flex items-start gap-2 rounded-xl bg-surface-muted/60 px-3 py-2">
                <Zap size={12} aria-hidden="true" className="mt-0.5 shrink-0 text-accent" />
                <p className="text-xs leading-relaxed text-primary">{insight}</p>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {/* ── Inventory watchlist ── */}
      {(data?.lowStockProducts?.length || 0) > 0 ? (
        <Section title="Inventory watchlist" icon={Boxes} badge={data!.lowStockProducts.length}>
          {/* Capped like every other list on the page — the API returns up to 50
              rows, which pushed the dashboard past 6,900px on its own. */}
          <ul className="space-y-2">
            {data!.lowStockProducts.slice(0, 8).map((p: any) => (
              <li key={p.id}>
                <Link
                  href="/admin/products"
                  className="focus-ring flex items-center justify-between gap-3 rounded-xl bg-warning/10 px-3 py-2.5 transition-colors hover:bg-warning/15"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-medium text-primary">{p.name}</span>
                    <span className="block text-[11px] text-warning">
                      {p.stock} left (threshold {p.threshold})
                    </span>
                  </span>
                  <span className="font-label shrink-0 rounded-full bg-warning/15 px-2 py-1 text-warning">Low</span>
                </Link>
              </li>
            ))}
          </ul>
          {data!.lowStockProducts.length > 8 ? (
            <Link
              href="/admin/products?stock=low"
              className="focus-ring mt-3 flex items-center justify-center gap-1 rounded-full py-2 text-xs font-medium text-accent hover:underline"
            >
              View all {count(data!.lowStockProducts.length)} low-stock products
            </Link>
          ) : null}
        </Section>
      ) : null}

      {/* ── Tools ── */}
      <Section title="Tools" icon={Shield} defaultOpen={false}>
        <p className="font-label mb-2 text-text-muted">Quick actions</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: "Add product", href: "/admin/products/new", icon: Package },
            { label: "Orders", href: "/admin/orders", icon: ShoppingCart },
            { label: "Customers", href: "/admin/customers", icon: Users },
            { label: "Inventory", href: "/admin/products", icon: Boxes },
            { label: "Categories", href: "/admin/categories", icon: Layers },
            { label: "Promotions", href: "/admin/promotions", icon: Percent },
            { label: "Settings", href: "/admin/settings", icon: Shield },
            { label: "View store", href: "/", icon: ExternalLink },
          ].map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="focus-ring flex items-center gap-2 rounded-xl bg-surface-muted/60 p-3 transition-colors hover:bg-surface-muted"
            >
              <action.icon size={14} aria-hidden="true" className="text-text-secondary" />
              <span className="text-xs font-medium text-primary">{action.label}</span>
            </Link>
          ))}
        </div>

        <p className="font-label mb-2 mt-5 text-text-muted">Export</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {exporting.map((exp) => (
            <button
              key={exp.label}
              type="button"
              onClick={() => onExport(exp.label, exp.endpoint)}
              className="focus-ring flex items-center gap-2 rounded-xl bg-surface-muted/60 p-3 text-left transition-colors hover:bg-surface-muted"
            >
              <Download size={14} aria-hidden="true" className="text-text-secondary" />
              <span className="text-xs font-medium text-primary">{exp.label}</span>
            </button>
          ))}
        </div>
      </Section>

      <div className="h-4" />
    </div>
  );
}
