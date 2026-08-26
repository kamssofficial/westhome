"use client";
import { useState, useEffect } from "react";
import { Eye, ShoppingCart, MousePointerClick, MessageSquare, TrendingUp, Package, BarChart3, Users } from "lucide-react";
import { formatPrice, cn } from "@/lib/utils";

interface ProductAnalyticsData {
  product: { id: string; name: string; slug: string };
  summary: {
    views: number; uniqueVisitors: number; clicks: number; addToCart: number;
    buyNow: number; whatsappEnquiries: number; purchases: number; unitsSold: number;
    revenue: number; conversionRate: number; visitorConversionRate: number;
    cartConversionRate: number; buyNowConversionRate: number;
  };
  funnel: { views: number; clicks: number; addToCart: number; buyNow: number; purchases: number };
  viewsOverTime: { date: string; count: number }[];
}

const RANGES = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "90d", label: "90 Days" },
];

export default function ProductAnalytics({ productId }: { productId: string }) {
  const [data, setData] = useState<ProductAnalyticsData | null>(null);
  const [range, setRange] = useState("30d");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch("/api/analytics/product?productId=" + productId + "&range=" + range)
      .then(r => r.json())
      .then(d => { if (!d.error) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [productId, range]);

  if (loading) {
    return (
      <div className="bg-surface rounded-[1.35rem] border border-border p-5 animate-pulse">
        <div className="h-5 w-32 bg-gray-100 rounded mb-4" />
        <div className="grid grid-cols-3 gap-3">
          {Array.from({length:6}).map((_,i) => <div key={i} className="h-16 bg-gray-50 rounded-lg" />)}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { summary, funnel } = data;
  const funnelMax = Math.max(funnel.views, 1);

  return (
    <div className="bg-surface rounded-[1.35rem] border border-border p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold flex items-center gap-2">
          <BarChart3 size={16} className="text-accent" /> Product Analytics
        </h2>
        <div className="flex gap-1 bg-[#f7f5f2] rounded-lg p-0.5">
          {RANGES.map(r => (
            <button key={r.value} onClick={() => setRange(r.value)}
              className={cn("px-2 py-1 rounded-md text-[10px] font-medium transition-colors",
                range === r.value ? "bg-white text-[#1a1917] shadow-sm" : "text-[#6b6560] hover:text-[#1a1917]")}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <KPICard icon={Eye} label="Views" value={summary.views} sub={summary.uniqueVisitors + " unique"} color="bg-blue-50 text-blue-700" />
        <KPICard icon={MousePointerClick} label="Clicks" value={summary.clicks} color="bg-orange-50 text-orange-700" />
        <KPICard icon={ShoppingCart} label="Add to Cart" value={summary.addToCart} color="bg-amber-50 text-amber-700" />
        <KPICard icon={MessageSquare} label="WhatsApp" value={summary.whatsappEnquiries} color="bg-green-50 text-green-700" />
        <KPICard icon={Package} label="Purchases" value={summary.purchases} sub={summary.unitsSold + " units"} color="bg-emerald-50 text-emerald-700" />
        <KPICard icon={TrendingUp} label="Revenue" value={formatPrice(summary.revenue)} color="bg-emerald-50 text-emerald-700" />
        <KPICard icon={TrendingUp} label="Conversion" value={summary.conversionRate + "%"} sub="views to purchase" color="bg-indigo-50 text-indigo-700" />
        <KPICard icon={Users} label="Cart Conv." value={summary.cartConversionRate + "%"} sub="cart to purchase" color="bg-violet-50 text-violet-700" />
      </div>

      {/* Funnel */}
      <div className="bg-white rounded-xl border border-black/[.06] p-4">
        <h3 className="text-xs font-semibold text-[#1a1917] mb-3">Purchase Funnel</h3>
        <div className="space-y-2">
          {[
            { label: "Views", count: funnel.views },
            { label: "Clicks", count: funnel.clicks },
            { label: "Add to Cart", count: funnel.addToCart },
            { label: "Buy Now", count: funnel.buyNow },
            { label: "Purchases", count: funnel.purchases },
          ].map((step, i) => {
            const pct = funnelMax > 0 ? Math.round((step.count / funnelMax) * 100) : 0;
            return (
              <div key={step.label} className="flex items-center gap-3">
                <span className="text-[10px] text-[#6b6560] w-20 shrink-0">{step.label}</span>
                <div className="flex-1 h-4 bg-[#f7f5f2] rounded-full overflow-hidden">
                  <div className="h-full bg-[#d4a574] rounded-full" style={{ width: pct + "%" }} />
                </div>
                <span className="text-xs font-medium text-[#1a1917] w-12 text-right">{step.count}</span>
                <span className="text-[10px] text-[#b0aba6] w-10 text-right">{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Views over time */}
      {data.viewsOverTime.length > 0 && (
        <div className="bg-white rounded-xl border border-black/[.06] p-4">
          <h3 className="text-xs font-semibold text-[#1a1917] mb-3">Views (7 days)</h3>
          <div className="flex items-end gap-1.5 h-20">
            {data.viewsOverTime.map((day, i) => {
              const maxV = Math.max(...data.viewsOverTime.map(d => d.count), 1);
              const h = Math.max((day.count / maxV) * 60, 2);
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group">
                  <span className="text-[8px] text-[#b0aba6] opacity-0 group-hover:opacity-100">{day.count}</span>
                  <div className={cn("w-full max-w-6 rounded-t transition-all",
                    i === data.viewsOverTime.length - 1 ? "bg-[#d4a574]" : "bg-[#e8e4de]")} style={{ height: h + "px" }} />
                  <span className="text-[8px] text-[#b0aba6]">{day.date.split(",")[0]}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function KPICard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-lg border border-black/[.06] p-3">
      <div className={cn("w-6 h-6 rounded flex items-center justify-center mb-2", color)}>
        <Icon size={12} />
      </div>
      <p className="text-lg font-semibold text-[#1a1917]">{value}</p>
      <p className="text-[10px] font-medium text-[#6b6560]">{label}</p>
      {sub && <p className="text-[9px] text-[#b0aba6]">{sub}</p>}
    </div>
  );
}
