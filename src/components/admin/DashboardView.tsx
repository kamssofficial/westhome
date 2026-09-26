"use client";

import { useState, type ComponentType, type ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle, Activity, BarChart3, Boxes, CheckCircle, Clock, CreditCard, Download,
  ExternalLink, Eye, Globe, Heart, IndianRupee, Layers, LayoutDashboard,
  Map as MapIcon, Monitor, Package, Percent, RefreshCw, Search, Shield,
  ShoppingBag, ShoppingCart, Smartphone, Tablet,  Target, Ticket, TrendingDown,
  TrendingUp, Users, Wallet, XCircle, Zap,
} from "lucide-react";
import { formatPrice, cn } from "@/lib/utils";
import {
  KPICard, Section, MiniBar, LiveUpdated, StatTile, StatusPill, EmptyState,
  TONE_TINT,
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
  imageErrors?: number;
  // Payment method mix from completed payments (null method = COD)
  paymentMethods?: { method: string; count: number; amount: number }[];
  // Guest checkout vs signed-in accounts
  orderSources?: { guest: { orders: number; revenue: number }; account: { orders: number; revenue: number } };
  // Order-level money: gross items, discounts given, delivery collected
  orderMoney?: { subtotal: number; discount: number; delivery: number };
  // Coupons used in the range, most used first
  topCoupons?: { code: string; orders: number; discount: number }[];
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
  customerName?: string | null;
  customerEmail?: string | null;
  secondsSinceActive: number;
  sessionAgeSeconds?: number;
  lastActionType?: string | null;
  lastAction?: string | null;
  intent?: string | null;
  searchQuery?: string | null;
  lastActionAt?: string | null;
  lastActionSecondsAgo?: number;
}
export interface LiveState {
  live: number;
  customers: number;
  guests: number;
  visitors: LiveVisitor[];
}
export const EMPTY_LIVE: LiveState = { live: 0, customers: 0, guests: 0, visitors: [] };

/* ─── Tabs ──────────────────────────────────────────────────────────────────
   One long scroll buried every answer below the fold. Four focused tabs keep
   each screen to a couple of viewports while the band above stays put, so
   switching tabs never loses your place. */
const TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "sales", label: "Sales", icon: IndianRupee },
  { id: "customers", label: "Customers", icon: Users },
  { id: "catalog", label: "Catalog", icon: Package },
] as const;
type TabId = (typeof TABS)[number]["id"];

// Razorpay method codes → human labels. COD arrives as a null method on the
// payment row, which the loader maps to "COD" so it is counted, not dropped.
const METHOD_LABELS: Record<string, string> = {
  upi: "UPI", card: "Card", netbanking: "Net Banking", wallet: "Wallet",
  cod: "Cash on Delivery", emi: "EMI", paylater: "Pay Later",
};
const methodLabel = (m: string) => METHOD_LABELS[m.toLowerCase()] || m;

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

/** Searches, Devices and Category performance are the same list three times over:
    a label, a right-hand figure and a bar. One component, three callers. */
function DeviceIcon({ device }: { device?: string | null }) {
  const Icon = device === "mobile" ? Smartphone : device === "tablet" ? Tablet : Monitor;
  return <Icon size={14} aria-hidden="true" className="text-text-muted" />;
}

function BarList({
  rows,
  tone = "neutral",
}: {
  rows: { key: string; label: ReactNode; meta: ReactNode; value: number; max: number }[];
  tone?: "neutral" | "accent";
}) {
  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li key={row.key}>
          <div className="mb-1 flex items-center justify-between gap-3">
            {row.label}
            <span className="shrink-0 text-[11px] text-text-muted tabular-nums">{row.meta}</span>
          </div>
          <MiniBar value={row.value} max={row.max} tone={tone} />
        </li>
      ))}
    </ul>
  );
}
const money = (n: number | undefined) => formatPrice(n || 0);

/* Trend chip for the dark command band — same honesty rules as <Trend>
   (no previous period means "New", never a fake +100%), light skin. */
function DarkTrend({ current, previous, trendLabel }: { current: number; previous: number; trendLabel?: string }) {
  if (previous === 0) {
    if (current <= 0) return null;
    return <span className="rounded-full bg-[#f1f2f3] px-2 py-0.5 text-[10px] font-medium text-[#6d7175]">New</span>;
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return <span className="text-[11px] text-[#6d7175]">0%</span>;
  const up = pct > 0;
  return (
    <span
      className={cn("flex items-center gap-0.5 text-[11px] font-medium", up ? "text-[#008060]" : "text-[#d72c0d]")}
      title={trendLabel ? `${Math.abs(pct)}% vs ${trendLabel}` : undefined}
    >
      {up ? <TrendingUp size={11} aria-hidden="true" /> : <TrendingDown size={11} aria-hidden="true" />}
      {Math.abs(pct)}%
      {trendLabel ? <span className="sr-only"> vs {trendLabel}</span> : null}
    </span>
  );
}

/* Tab bar for the band. A real tablist: arrow keys move focus, aria-selected
   marks the open tab — keyboard users get the behaviour a tab implies. */
function TabBar({ tab, onChange }: { tab: TabId; onChange: (t: TabId) => void }) {
  return (
    <div
      role="tablist"
      aria-label="Dashboard sections"
      onKeyDown={(e) => {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        e.preventDefault();
        const i = TABS.findIndex((t) => t.id === tab);
        const next = e.key === "ArrowRight" ? (i + 1) % TABS.length : (i - 1 + TABS.length) % TABS.length;
        const id = TABS[next].id;
        onChange(id);
        document.getElementById(`dash-tab-${id}`)?.focus();
      }}
      className="mt-5 flex gap-1 overflow-x-auto rounded-lg bg-[#f6f6f7] p-1"
    >
      {TABS.map((t) => {
        const active = t.id === tab;
        return (
          <button
            key={t.id}
            id={`dash-tab-${t.id}`}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(t.id)}
            className={cn(
              "focus-ring flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
              active ? "bg-white text-[#202223] shadow-sm" : "text-[#6d7175] hover:bg-white hover:text-[#202223]"
            )}
          >
            <t.icon size={13} aria-hidden="true" />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

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
  /** Deep-link support: which tab starts open. Defaults to "overview". */
  initialTab?: TabId;
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
  initialTab = "overview",
}: DashboardViewProps) {
  const k = data?.kpis || {};
  const funnel = data?.funnel || {};
  const rangeLabel = DATE_RANGES.find((r) => r.value === range)?.label || "Selected period";
  const visitors = live.visitors || [];

  // Real-time behavior summary: derived only from active visitor sessions.
  const liveWatching = visitors.filter((v) => !!v.viewingProduct);
  const liveCart = visitors.filter((v) => v.currentPage?.startsWith("/cart") || v.lastActionType === "ADD_TO_CART");
  const liveSearching = visitors.filter((v) => v.lastActionType === "SEARCH");
  const liveHighIntent = visitors.filter((v) => v.intent === "High purchase intent" || v.lastActionType === "ADD_TO_CART" || v.lastActionType === "BUY_NOW");
  const watchingNow = Object.entries(
    liveWatching.reduce<Record<string, number>>((acc, v) => {
      const name = v.viewingProduct || "Unknown product";
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Business-health ratios use the same population and period as the KPI data.
  const cartToCheckout = funnel.cartAdds > 0 ? Math.round((funnel.checkoutStarted / funnel.cartAdds) * 100) : 0;
  const checkoutToOrder = funnel.checkoutStarted > 0 ? Math.round(((funnel.orderCompleted || 0) / funnel.checkoutStarted) * 100) : 0;
  const visitorToCart = (data?.uniqueVisitors || 0) > 0 ? Math.round(((funnel.cartAdds || 0) / data!.uniqueVisitors) * 100) : 0;
  const returningShare = (k.totalCustomers || 0) > 0 ? Math.round(((k.returningCustomers || 0) / k.totalCustomers) * 100) : 0;
  const guestRevenueShare = (k.revenue || 0) > 0 ? Math.round(((data?.orderSources?.guest.revenue || 0) / k.revenue) * 100) : 0;

  // An empty store is the normal state for a small shop, and the full card was
  // mostly emptiness — a zero in a 14×14 tile, two counters reading zero and an
  // empty-state box. Collapse it to one line; the full card comes back the moment
  // somebody arrives.
  const liveIdle = liveLoaded && (live.live || 0) === 0 && visitors.length === 0;
  const exporting = [
    { label: "Orders CSV", endpoint: "/api/orders?all=true&limit=1000" },
    { label: "Products CSV", endpoint: "/api/products?limit=1000" },
    { label: "Customers CSV", endpoint: "/api/customers?limit=1000" },
  ];
  // The active tab (must be declared before the early returns below).
  const [tab, setTab] = useState<TabId>(initialTab);
  // Payment-method bar rows (sales tab)
  const paymentMethodRows = data?.paymentMethods || [];
  const methodMax = Math.max(...paymentMethodRows.map(m => m.count), 1);
  const methodTotal = paymentMethodRows.reduce((s, m) => s + m.count, 0);

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
    // Mirrors the real layout — dark command band with four headline cells,
    // then the light live-store card and a chart row. The old skeleton was six
    // unrelated light cards in a 4-column grid, so every load reshuffled the
    // whole page the moment data arrived.
    return (
      <div className="space-y-6 lg:space-y-8" aria-busy="true" aria-label="Loading dashboard">
        <section className="overflow-hidden rounded-[1.75rem] bg-[#2C1F17] text-white shadow-sm">
          <div className="relative">
            {/* Same inset as the loaded band below, so nothing shifts when the
                real numbers replace the skeleton. */}
            <div className="flex flex-col gap-4 px-5 pt-6 sm:flex-row sm:items-end sm:justify-between sm:px-7">
              <div>
                <div className="h-2.5 w-16 animate-pulse rounded bg-white/20" />
                <div className="mt-3 h-8 w-40 animate-pulse rounded bg-white/15 sm:h-9" />
                <div className="mt-3 h-2.5 w-44 animate-pulse rounded bg-white/10" />
              </div>
              <div className="flex items-center gap-2">
                <div className="h-9 w-28 animate-pulse rounded-full bg-white/10" />
                <div className="h-9 w-9 animate-pulse rounded-full bg-white/10" />
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 border-t border-[#e1e3e5] lg:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={cn(
                    "border-b border-white/10 px-5 py-5 sm:px-7 lg:border-b-0",
                    i === 0 && "border-r",
                    i === 1 && "lg:border-r",
                    i === 2 && "border-r",
                  )}
                >
                  <div className="h-2.5 w-24 animate-pulse rounded bg-white/20" />
                  <div className="mt-4 h-7 w-28 animate-pulse rounded bg-white/25 sm:h-8" />
                  <div className="mt-2.5 h-2.5 w-20 animate-pulse rounded bg-white/10" />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div className="h-4 w-28 animate-pulse rounded bg-surface-muted" />
            <div className="h-2.5 w-32 animate-pulse rounded bg-surface-muted" />
          </div>
          <div className="grid grid-cols-2 gap-3 p-5 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-surface-muted" />
            ))}
          </div>
        </section>

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
  const deviceTotal = (data?.deviceBreakdown || []).reduce((s: number, d: any) => s + d.count, 0);
  // Indexed once rather than scanning three ranked lists for every table row.
  const countByProductId = (rows: any[] | undefined) =>
    new Map<string, number>((rows || []).map((r: any) => [r.productId, r._count?.id || 0]));
  const viewsByProduct = countByProductId(data?.topByViews);
  const wishlistsByProduct = countByProductId(data?.topByWishlist);
  const cartAddsByProduct = countByProductId(data?.topByCart);

  // Every stage is kept, zeros included. Filtering them out made the funnel read
  // as if cart adds converted straight into orders, when the truth was that
  // checkout was never started at all — a zero here is the most informative bar
  // on the chart, so the card is shown whenever there is any traffic to shape it.
  const funnelStages = [
    { label: "Page views", value: funnel.pageViews, tone: "info" as const },
    { label: "Product views", value: funnel.productViews, tone: "info" as const },
    { label: "Cart adds", value: funnel.cartAdds, tone: "warning" as const },
    { label: "Checkout started", value: funnel.checkoutStarted, tone: "warning" as const },
    { label: "Payment started", value: funnel.paymentStarted, tone: "accent" as const },
    { label: "Orders completed", value: funnel.orderCompleted, tone: "success" as const },
  ];
  const hasFunnel = (funnel.pageViews || 0) > 0;
  const funnelMax = funnel.pageViews || 1;

  return (
    <div className="space-y-6 lg:space-y-8">

      {/* ── Command band ─────────────────────────────────────────────────────
          The four numbers that answer "how are we doing?" live in one dark
          band; the operational layer (catalogue, customers, stock, cancella-
          tions) stays on light cards below. Not sticky — AdminShell owns the
          sticky bar and breadcrumb. */}
      <section
        className="relative overflow-hidden rounded-xl border border-[#e1e3e5] bg-white text-[#202223] shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
      >
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_100%_at_100%_0%,rgba(0,128,96,0.055),transparent_55%)]" />
        {/* The band is rounded-[1.75rem] and overflow-hidden, so the header needs
            its own inset: without it the eyebrow and the h1 sat in the corner and
            the 28px radius cut them. The metrics grid below keeps its own per-cell
            padding so its top rule can stay full-bleed. */}
        <div className="relative">
          <div className="flex flex-col gap-4 px-5 pt-6 sm:flex-row sm:items-end sm:justify-between sm:px-7">
            <div>
              <p className="font-label text-[#008060]">Overview</p>
              <h1 className="font-display mt-2 text-3xl sm:text-4xl">Dashboard</h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#6d7175]">
                <span>{rangeLabel}</span>
                <span aria-hidden="true">·</span>
                <LiveUpdated at={lastUpdated} onDark />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="dashboard-range" className="sr-only">Date range</label>
              <select
                id="dashboard-range"
                value={range}
                onChange={(e) => onRangeChange(e.target.value)}
                className="focus-ring rounded-md border border-[#c9cccf] bg-white px-3 py-2 text-xs font-medium text-[#202223] [&>option]:text-[#202223]"
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
                className="focus-ring rounded-md border border-[#c9cccf] bg-white p-2.5 transition-colors hover:bg-[#f6f6f7] disabled:opacity-50"
              >
                <RefreshCw size={15} aria-hidden="true" className={cn("text-[#6d7175]", refreshing && "animate-spin")} />
              </button>
            </div>
          </div>

          {/* Headline metrics. Every detail line is real range data, not a
              decorative caption: completed orders, today's orders, units sold
              and unique visitors. The tabs sit between headline and numbers:
              they scope everything below the band, never the band itself. */}
          <TabBar tab={tab} onChange={setTab} />
          <div className="mt-6 grid grid-cols-2 border-t border-white/10 lg:grid-cols-4">
            <div className="border-b border-r border-[#e1e3e5] px-5 py-5 sm:px-7 lg:border-b-0">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-[#6d7175]">
                  <IndianRupee size={12} aria-hidden="true" className="text-[#E8A87C]" />
                  Revenue
                </span>
                <DarkTrend current={k.revenue || 0} previous={k.prevRevenue || 0} trendLabel="previous period" />
              </div>
              <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums text-[#202223] sm:text-3xl">{money(k.revenue)}</p>
              <p className="mt-1.5 text-[11px] text-white/50">{plural(funnel.orderCompleted, "order")} completed</p>
            </div>
            <div className="border-b border-[#e1e3e5] px-5 py-5 sm:px-7 lg:border-b-0 lg:border-r">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-white/55">
                  <ShoppingCart size={12} aria-hidden="true" className="text-[#E8A87C]" />
                  Orders
                </span>
                <DarkTrend current={k.totalOrders || 0} previous={k.prevTotalOrders || 0} trendLabel="previous period" />
              </div>
              <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">{count(k.totalOrders)}</p>
              <p className="mt-1.5 text-[11px] text-white/50">{count(k.ordersToday)} today</p>
            </div>
            <div className="border-r border-[#e1e3e5] px-5 py-5 sm:px-7">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-white/55">
                  <BarChart3 size={12} aria-hidden="true" className="text-[#E8A87C]" />
                  Avg order value
                </span>
                <DarkTrend current={k.avgOrderValue || 0} previous={k.prevAvgOrderValue || 0} trendLabel="previous period" />
              </div>
              <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">{money(k.avgOrderValue)}</p>
              <p className="mt-1.5 text-[11px] text-white/50">{count(k.unitsSold)} units sold</p>
            </div>
            <div className="px-5 py-5 sm:px-7">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-white/55">
                  <Target size={12} aria-hidden="true" className="text-[#E8A87C]" />
                  Conversion rate
                </span>
              </div>
              <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">{k.conversionRate || 0}%</p>
              <p className="mt-1.5 text-[11px] text-white/50">{count(data?.uniqueVisitors)} unique visitors</p>
            </div>
          </div>
        </div>
      </section>

      {/* Everything below the band belongs to the active tab. Each tab's
          sections are wrapped in its own guard so switching never renders
          hidden work. */}
      <div id={`dash-panel-${tab}`} role="tabpanel" aria-label={TABS.find(t => t.id === tab)?.label}>

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
      {tab === "overview" && actionItems.length > 0 ? (
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

      {/* ── Live store (Overview tab) ── */}
      {tab === "overview" && (
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
          {liveIdle ? (
            <p className="text-sm text-text-muted" aria-live="polite">
              No one is on the store right now
              <span className="text-text-secondary">
                {" "}· {count(live.customers)} signed in · {count(live.guests)} guests
              </span>
            </p>
          ) : (
            <>
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
            </>
          )}
        </div>

        <div className="px-5 pb-5">
          <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-xl border border-border-light bg-surface-muted/40 px-3 py-2.5">
              <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-text-muted">
                <Eye size={12} /> Watching
              </div>
              <p className="mt-1 text-lg font-semibold tabular-nums text-primary">{liveWatching.length}</p>
            </div>
            <div className="rounded-xl border border-border-light bg-surface-muted/40 px-3 py-2.5">
              <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-text-muted">
                <ShoppingCart size={12} /> Cart intent
              </div>
              <p className="mt-1 text-lg font-semibold tabular-nums text-primary">{liveCart.length}</p>
            </div>
            <div className="rounded-xl border border-border-light bg-surface-muted/40 px-3 py-2.5">
              <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-text-muted">
                <Search size={12} /> Searching
              </div>
              <p className="mt-1 text-lg font-semibold tabular-nums text-primary">{liveSearching.length}</p>
            </div>
            <div className="rounded-xl border border-border-light bg-surface-muted/40 px-3 py-2.5">
              <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-text-muted">
                <Target size={12} /> High intent
              </div>
              <p className="mt-1 text-lg font-semibold tabular-nums text-primary">{liveHighIntent.length}</p>
            </div>
          </div>

          {watchingNow.length > 0 ? (
            <div className="mb-4 rounded-xl border border-border-light bg-white px-3 py-3">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-label text-text-muted">What visitors are watching now</h3>
                <span className="text-[10px] text-text-muted">live sessions</span>
              </div>
              <ul className="space-y-1.5">
                {watchingNow.map(([name, n]) => (
                  <li key={name} className="flex items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2 text-xs font-medium text-primary">
                      <Eye size={12} className="shrink-0 text-text-muted" />
                      <span className="truncate">{name}</span>
                    </span>
                    <span className="shrink-0 text-[11px] text-text-muted tabular-nums">{n} watching</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

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
            liveIdle ? (
              <p className="text-xs text-text-muted">
                Nobody is browsing. This list fills in the moment someone opens the store.
              </p>
            ) : (
              <EmptyState
                icon={Globe}
                title="No visitors online right now"
                hint="Live activity appears here the moment someone opens your store."
              />
            )
          ) : (
            <ul className="space-y-2">
              {visitors.map((v) => {
                const Dev = v.device === "mobile" ? Smartphone : v.device === "tablet" ? Tablet : Monitor;
                const identity = v.isCustomer ? (v.customerName || "Customer") : "Visitor";
                const current = v.viewingProduct
                  ? `Viewing “${v.viewingProduct}”`
                  : v.currentPage
                    ? `On ${prettyPage(v.currentPage)}`
                    : "Browsing the store";
                const action = v.lastAction || current;
                const sessionAge = v.sessionAgeSeconds || 0;
                const ageText = sessionAge < 60
                  ? `${sessionAge}s`
                  : sessionAge < 3600
                    ? `${Math.floor(sessionAge / 60)}m`
                    : `${Math.floor(sessionAge / 3600)}h ${Math.floor((sessionAge % 3600) / 60)}m`;
                return (
                  <li
                    key={v.sessionId}
                    className="flex items-start gap-3 rounded-xl border border-border-light px-3 py-2.5 transition-colors hover:bg-surface-hover"
                  >
                    <span className="relative mt-1.5 flex h-2 w-2 shrink-0" aria-hidden="true">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="truncate text-sm font-medium text-primary">{identity}</p>
                        {v.isCustomer ? <span className="rounded-full bg-success/10 px-1.5 py-0.5 text-[9px] font-medium text-success">Customer</span> : null}
                        {v.intent ? <span className="rounded-full bg-surface-muted px-1.5 py-0.5 text-[9px] font-medium text-text-muted">{v.intent}</span> : null}
                      </div>
                      <p className="mt-1 truncate text-xs text-primary">{action}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-text-muted">
                        <Dev size={11} aria-hidden="true" className="shrink-0" />
                        <span className="capitalize">{v.device || "Unknown device"}</span>
                        <span aria-hidden="true">·</span>
                        <span>active {activeAgo(v.secondsSinceActive)}</span>
                        <span aria-hidden="true">·</span>
                        <span>session {ageText}</span>
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
      )}

      {/* ── Store performance ──
          Headline money metrics live in the band above; this row is the
          operational layer: catalogue, customers and everything that needs
          a decision rather than a celebration. */}
      {tab === "overview" && (
      <Section title="Business analytics" icon={BarChart3} hint={rangeLabel}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Visitors" value={count(data?.uniqueVisitors)} />
          <StatTile label="Product views" value={count(funnel.productViews)} />
          <StatTile label="Visitor → cart" value={`${visitorToCart}%`} tone={visitorToCart > 0 ? "accent" : "neutral"} />
          <StatTile label="Checkout → order" value={`${checkoutToOrder}%`} tone={checkoutToOrder > 0 ? "success" : "neutral"} />
          <StatTile label="Cart → checkout" value={`${cartToCheckout}%`} tone={cartToCheckout > 0 ? "accent" : "neutral"} />
          <StatTile label="Returning share" value={`${returningShare}%`} tone={returningShare > 0 ? "success" : "neutral"} />
          <StatTile label="Guest revenue" value={`${guestRevenueShare}%`} hint="of completed revenue" />
          <StatTile label="Average order" value={money(k.avgOrderValue)} tone="success" />
          <StatTile
            label="Tracked image errors"
            value={count(data?.imageErrors)}
            hint="reported by storefront in this period"
            tone={(data?.imageErrors || 0) > 0 ? "warning" : "success"}
          />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border-light bg-surface-muted/40 px-3.5 py-3">
            <p className="font-label text-text-muted">Most viewed product</p>
            <p className="mt-1 truncate text-sm font-medium text-primary">{data?.topByViews?.[0]?.product?.name || "No product views yet"}</p>
            <p className="mt-0.5 text-[11px] text-text-muted">
              {count(data?.topByViews?.[0]?._count?.id || data?.topByViews?.[0]?.views)} views in {rangeLabel.toLowerCase()}
            </p>
          </div>
          <div className="rounded-xl border border-border-light bg-surface-muted/40 px-3.5 py-3">
            <p className="font-label text-text-muted">Top search</p>
            <p className="mt-1 truncate text-sm font-medium text-primary">{data?.topSearches?.[0]?.query || "No searches yet"}</p>
            <p className="mt-0.5 text-[11px] text-text-muted">
              {data?.topSearches?.[0] ? `${count(data.topSearches[0].count)} searches` : "Search behavior will appear here"}
            </p>
          </div>
        </div>
      </Section>
      )}

      {tab === "overview" && (
      <section aria-labelledby="performance-heading">
        <div className="mb-4 flex items-end justify-between gap-3">
          <h2 id="performance-heading" className="font-display text-xl text-primary">Store performance</h2>
          <span className="font-label text-text-muted">{rangeLabel}</span>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KPICard
            label="Customers" value={count(k.totalCustomers)} icon={Users}
            trend={{ current: k.newCustomers || 0, previous: k.prevNewCustomers || 0 }} trendLabel="previous period"
            href="/admin/customers"
            hint={`${count(k.newCustomers)} new`}
          />
          <KPICard
            label="Products" value={count(k.totalProducts)} icon={Boxes}
            href="/admin/products"
          />
          <KPICard
            label="Low stock" value={count(k.lowStock)} icon={AlertTriangle} tone="warning"
            href="/admin/products"
            hint="At or below threshold"
          />
          <KPICard
            label="Cancelled orders" value={count(k.cancelledOrders)} icon={XCircle} tone="error"
            href="/admin/orders?status=CANCELLED"
          />
        </div>
      </section>
      )}

      {/* ── Revenue + funnel (Sales tab) ── */}
      {tab === "sales" && (
      <div className="grid gap-4 lg:grid-cols-2">
        {(data?.revenueOverTime?.length || 0) > 0 ? (
          <Section title="Revenue" icon={BarChart3} hint={rangeLabel}>
            <div
              role="img"
              aria-label={`Revenue per day over ${rangeLabel}. Total ${money(k.revenue)}.`}
              className="flex h-40 items-end gap-1 sm:h-48"
            >
              {/* h-full gives each column a definite height — without it the
                  bar's percentage height resolved against an auto-height
                  parent and every bar collapsed to 0px, leaving the chart
                  empty. */}
              {data!.revenueOverTime.map((d, i) => (
                <div key={i} className="group relative flex h-full flex-1 flex-col justify-end">
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

        {hasFunnel ? (
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
                          a stage that grew is not a negative drop-off. A stage with
                          no visitors at all has no drop-off to report. */}
                      {(stage.value || 0) > 0
                        ? `${Math.max(0, Math.round(((stage.value - funnelStages[i + 1].value) / stage.value) * 100))}% drop-off`
                        : "no visitors reached this step"}
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>
          </Section>
        ) : null}
      </div>
      )}

      {/* ── Orders + payments (Sales tab) ── */}
      {tab === "sales" && (
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
      )}

      {/* ── Payment mix, order sources, discounts & coupons (Sales tab) ──
          The money questions the KPI band cannot answer: how customers paid,
          whether orders come from guests or accounts, what discounts cost and
          which coupons earned their keep. */}
      {tab === "sales" && (
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Payment methods" icon={Wallet} hint={rangeLabel}>
          {paymentMethodRows.length === 0 ? (
            <EmptyState icon={Wallet} title="No payments yet" hint={`Completed payments in ${rangeLabel.toLowerCase()} show up here.`} />
          ) : (
            <BarList
              rows={paymentMethodRows.map((m) => ({
                key: m.method,
                label: <span className="truncate text-xs font-medium text-primary">{methodLabel(m.method)}</span>,
                meta: `${methodTotal > 0 ? Math.round((m.count / methodTotal) * 100) : 0}% · ${money(m.amount)}`,
                value: m.count,
                max: methodMax,
              }))}
            />
          )}
        </Section>

        <Section title="Guest vs accounts" icon={ShoppingBag} hint={rangeLabel}>
          <div className="grid grid-cols-2 gap-3">
            <StatTile label="Guest orders" value={count(data?.orderSources?.guest.orders)} />
            <StatTile label="Account orders" value={count(data?.orderSources?.account.orders)} />
            <StatTile label="Guest revenue" value={money(data?.orderSources?.guest.revenue)} tone="accent" />
            <StatTile label="Account revenue" value={money(data?.orderSources?.account.revenue)} tone="success" />
          </div>
        </Section>

        <Section title="Discounts & delivery" icon={Percent} hint={rangeLabel}>
          <div className="grid grid-cols-2 gap-3">
            <StatTile label="Items subtotal" value={money(data?.orderMoney?.subtotal)} />
            <StatTile
              label="Discounts given"
              value={money(data?.orderMoney?.discount)}
              tone={(data?.orderMoney?.discount || 0) > 0 ? "warning" : "neutral"}
            />
            <StatTile label="Delivery collected" value={money(data?.orderMoney?.delivery)} tone="accent" />
            <StatTile label="Net revenue" value={money(k.revenue)} tone="success" />
          </div>
        </Section>

        <Section title="Top coupons" icon={Ticket} hint={rangeLabel}>
          {(data?.topCoupons?.length || 0) === 0 ? (
            <EmptyState icon={Ticket} title="No coupons used" hint={`No coupon codes were applied in ${rangeLabel.toLowerCase()}.`} />
          ) : (
            <BarList
              tone="accent"
              rows={data!.topCoupons!.map((c) => ({
                key: c.code,
                label: <span className="truncate text-xs font-medium text-primary">{c.code}</span>,
                meta: `${plural(c.orders, "order")} · ${money(c.discount)} off`,
                value: c.orders,
                max: Math.max(...data!.topCoupons!.map((x) => x.orders), 1),
              }))}
            />
          )}
        </Section>
      </div>
      )}

      {/* ── Recent activity (Overview tab) ── */}
      {tab === "overview" && (
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
      )}

      {/* ── Products ────────────────────────────────────────────────────────
          One table carries every product metric. The old page rendered the
          same numbers four times over (by revenue, units, views, wishlists)
          plus a fifth copy in a table. */}
      {tab === "catalog" && (
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
                  const views = viewsByProduct.get(item.productId) || 0;
                  const wishlists = wishlistsByProduct.get(item.productId) || 0;
                  const cartAdds = cartAddsByProduct.get(item.productId) || 0;
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
      )}

      {/* ── Customers + cart/wishlist (Customers tab) ── */}
      {tab === "customers" && (
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
            // Same escape hatch as the product table below: on phones the three
            // columns overflow the card, and without a scroll container the
            // card's overflow-hidden simply amputated the Spent column.
            <div className="-mx-5 overflow-x-auto px-5">
            <table className="w-full min-w-[360px] text-xs">
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
            </div>
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
      )}

      {/* ── Traffic (Customers tab) ── */}
      {tab === "customers" && (
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Searches" icon={Search} hint={rangeLabel}>
          {searchRows.length === 0 ? (
            <EmptyState icon={Search} title="No search data yet" />
          ) : (
            <BarList
              rows={searchRows.map((s: any) => ({
                key: s.query,
                label: (
                  <Link
                    href={`/search?q=${encodeURIComponent(s.query)}`}
                    className="focus-ring truncate text-xs text-primary hover:text-accent"
                  >
                    {s.query}
                  </Link>
                ),
                meta: count(s.count),
                value: s.count,
                max: searchMax,
              }))}
            />
          )}
        </Section>

        <Section title="Devices" icon={Monitor} hint={rangeLabel}>
          {(data?.deviceBreakdown?.length || 0) === 0 ? (
            <EmptyState icon={Monitor} title="No device data yet" />
          ) : (
            <BarList
              rows={data!.deviceBreakdown.map((d: any) => ({
                key: d.device,
                label: (
                  <span className="flex items-center gap-2 text-xs font-medium capitalize text-primary">
                    <DeviceIcon device={d.device} />
                    {d.device}
                  </span>
                ),
                meta: `${share(d.count, deviceTotal)} (${count(d.count)})`,
                value: d.count,
                max: deviceTotal,
              }))}
            />
          )}
          <p className="mt-4 text-[11px] text-text-muted">
            {count(data?.uniqueVisitors)} unique visitors in {rangeLabel.toLowerCase()}.
          </p>
        </Section>
      </div>
      )}

      {/* ── Geography (Sales tab) + categories (Catalog tab) ──
          One grid, two tabs: the wrapper stays, each child guards itself. */}
      <div className="grid gap-4 lg:grid-cols-2">
        {(data?.geographic?.length || 0) > 0 && tab === "sales" ? (
          <Section title="Where orders ship" icon={MapIcon} hint={rangeLabel}>
            {/* Scroll container, not clipping: narrow phones were losing the
                Revenue column to the card's overflow-hidden. */}
            <div className="-mx-5 overflow-x-auto px-5">
            <table className="w-full min-w-[360px] text-xs">
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
            </div>
          </Section>
        ) : null}

        {tab === "catalog" && categories.length > 0 ? (
          <Section title="Category performance" icon={Layers} hint={rangeLabel}>
            <BarList
              tone="accent"
              rows={categories.map((cat: any) => ({
                key: cat.id,
                label: <span className="truncate text-xs font-medium text-primary">{cat.name}</span>,
                meta: `${count(cat.products)} products · ${money(cat.revenue)}`,
                value: cat.revenue,
                max: categoryMax,
              }))}
            />
          </Section>
        ) : null}
      </div>

      {/* ── Insights (Overview tab) ── */}
      {tab === "overview" && (data?.insights?.length || 0) > 0 ? (
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

      {/* ── Inventory watchlist (Catalog tab) ── */}
      {tab === "catalog" && (data?.lowStockProducts?.length || 0) > 0 ? (
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
            { label: "Add product", href: "/admin/products/new", icon: Package, tone: "accent" as const },
            { label: "Orders", href: "/admin/orders", icon: ShoppingCart, tone: "info" as const },
            { label: "Customers", href: "/admin/customers", icon: Users, tone: "success" as const },
            { label: "Inventory", href: "/admin/products", icon: Boxes, tone: "warning" as const },
            { label: "Categories", href: "/admin/categories", icon: Layers, tone: "neutral" as const },
            { label: "Promotions", href: "/admin/promotions", icon: Percent, tone: "accent" as const },
            { label: "Settings", href: "/admin/settings", icon: Shield, tone: "neutral" as const },
            { label: "View store", href: "/", icon: ExternalLink, tone: "info" as const },
          ].map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="focus-ring flex items-center gap-2.5 rounded-xl border border-border-light bg-surface-muted/40 p-2.5 transition-all hover:-translate-y-0.5 hover:bg-surface-muted"
            >
              <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", TONE_TINT[action.tone])}>
                <action.icon size={13} aria-hidden="true" />
              </span>
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
    </div>
  );
}
