"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { BarChart3, Eye, ShoppingCart, MousePointerClick, MessageSquare, TrendingUp, Users, Zap, Package, DollarSign, RefreshCw } from "lucide-react";
import { formatPrice, cn } from "@/lib/utils";

interface DashboardData {
  summary: {
    totalVisitors: number; activeToday: number; activeWeek: number; activeMonth: number;
    productViews: number; productClicks: number; addToCart: number; buyNow: number;
    whatsappEnquiries: number; purchases: number; unitsSold: number; revenue: number; conversionRate: number;
  };
  viewsOverTime: { date: string; count: number }[];
  purchasesOverTime: { date: string; count: number; revenue: number }[];
  topViewed: { productId: string; name: string; slug: string; count: number }[];
  topPurchased: { productId: string; name: string; slug: string; quantity: number; revenue: number; orders: number }[];
  deviceBreakdown: { device: string; count: number }[];
}

const RANGES = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "90d", label: "90 Days" },
];

export default function AnalyticsPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [live, setLive] = useState({ live: 0, customers: 0, guests: 0 });
  const [range, setRange] = useState("30d");
  const [loading, setLoading] = useState(true);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/analytics/dashboard?range=" + range).then(r => r.json()),
      fetch("/api/analytics/live").then(r => r.json()).catch(() => ({ live: 0, customers: 0, guests: 0 })),
    ]).then(([analytics, liveData]) => {
      setData(analytics);
      setLive(liveData);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [range]);
  useEffect(() => {
    const i = setInterval(() => {
      fetch("/api/analytics/live").then(r => r.json()).then(setLive).catch(() => {});
    }, 30000);
    return () => clearInterval(i);
  }, []);

  const maxViews = data ? Math.max(...data.viewsOverTime.map(d => d.count), 1) : 1;

  const StatCard = ({ label, value, icon: Icon, color, sub }: { label: string; value: string | number; icon: any; color: string; sub?: string }) => (
    <div className="bg-white rounded-xl border border-black/[.06] p-4 hover:shadow-sm transition-shadow">
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-3", color)}>
        <Icon size={16} />
      </div>
      <p className="text-2xl font-semibold tracking-tight text-[#1a1917]">{value}</p>
      <p className="text-xs font-medium text-[#6b6560] mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-[#b0aba6] mt-0.5">{sub}</p>}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[#1a1917]">Analytics</h1>
          <p className="text-sm text-[#6b6560] mt-0.5">Real-time customer activity</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live: {live.live}
          </div>
          <button onClick={fetchData} className="p-1.5 rounded-lg hover:bg-gray-100 text-[#6b6560]" title="Refresh">
            <RefreshCw size={14} />
          </button>
          <div className="flex gap-1 bg-[#f7f5f2] rounded-lg p-0.5">
            {RANGES.map(r => (
              <button key={r.value} onClick={() => setRange(r.value)}
                className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                  range === r.value ? "bg-white text-[#1a1917] shadow-sm" : "text-[#6b6560] hover:text-[#1a1917]")}>
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({length:8}).map((_,i) => (
            <div key={i} className="bg-white rounded-xl border border-black/[.06] p-4 animate-pulse">
              <div className="h-8 w-8 bg-gray-100 rounded-lg mb-3"/>
              <div className="h-6 w-16 bg-gray-100 rounded mb-1"/>
              <div className="h-3 w-20 bg-gray-100 rounded"/>
            </div>
          ))}
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Total Visitors" value={data.summary.totalVisitors} icon={Users} color="bg-violet-50 text-violet-700" sub={data.summary.activeToday + " today"} />
            <StatCard label="Product Views" value={data.summary.productViews} icon={Eye} color="bg-blue-50 text-blue-700" sub={data.summary.productClicks + " clicks"} />
            <StatCard label="Add to Cart" value={data.summary.addToCart} icon={ShoppingCart} color="bg-amber-50 text-amber-700" />
            <StatCard label="Buy Now" value={data.summary.buyNow} icon={MousePointerClick} color="bg-orange-50 text-orange-700" />
            <StatCard label="WhatsApp" value={data.summary.whatsappEnquiries} icon={MessageSquare} color="bg-green-50 text-green-700" />
            <StatCard label="Purchases" value={data.summary.purchases} icon={Package} color="bg-emerald-50 text-emerald-700" sub={data.summary.unitsSold + " units"} />
            <StatCard label="Revenue" value={formatPrice(data.summary.revenue)} icon={DollarSign} color="bg-emerald-50 text-emerald-700" />
            <StatCard label="Conversion" value={data.summary.conversionRate + "%"} icon={TrendingUp} color="bg-indigo-50 text-indigo-700" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-black/[.06] p-6">
              <h2 className="font-semibold text-sm flex items-center gap-2 text-[#1a1917] mb-4">
                <BarChart3 size={16} className="text-[#d4a574]" /> Product Views (7 days)
              </h2>
              <div className="flex items-end gap-2 h-36">
                {data.viewsOverTime.map((day, i) => {
                  const h = Math.max((day.count / maxViews) * 120, 4);
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                      <span className="text-[10px] text-[#b0aba6] opacity-0 group-hover:opacity-100 transition-opacity">{day.count}</span>
                      <div className="w-full flex justify-center">
                        <div className={cn("w-full max-w-8 rounded-t-md transition-all", i === data.viewsOverTime.length - 1 ? "bg-[#d4a574]" : "bg-[#e8e4de]")} style={{ height: h + "px" }} />
                      </div>
                      <span className={cn("text-[10px]", i === data.viewsOverTime.length - 1 ? "font-semibold text-[#d4a574]" : "text-[#b0aba6]")}>{day.date.split(",")[0]}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-black/[.06] p-6">
              <h2 className="font-semibold text-sm flex items-center gap-2 text-[#1a1917] mb-4">
                <TrendingUp size={16} className="text-[#d4a574]" /> Purchases & Revenue (7 days)
              </h2>
              <div className="space-y-2">
                {data.purchasesOverTime.map((day, i) => {
                  const maxRev = Math.max(...data.purchasesOverTime.map(d => d.revenue), 1);
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-[10px] text-[#b0aba6] w-8 shrink-0">{day.date.split(",")[0]}</span>
                      <div className="flex-1 h-5 bg-[#f7f5f2] rounded-full overflow-hidden">
                        <div className="h-full bg-[#d4a574] rounded-full" style={{ width: Math.max((day.revenue / maxRev) * 100, 2) + "%" }} />
                      </div>
                      <span className="text-xs text-[#6b6560] w-16 text-right shrink-0">{formatPrice(day.revenue)}</span>
                      <span className="text-[10px] text-[#b0aba6] w-6 text-right shrink-0">{day.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-black/[.06] p-6">
              <h2 className="font-semibold text-sm flex items-center gap-2 text-[#1a1917] mb-4"><Eye size={16} className="text-[#d4a574]" /> Top Viewed Products</h2>
              {data.topViewed.length > 0 ? (
                <div className="space-y-3">
                  {data.topViewed.map((p, i) => (
                    <Link key={p.productId} href={"/admin/products/" + p.slug} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#f7f5f2] transition-colors">
                      <span className="text-xs text-[#b0aba6] w-4">{i + 1}</span>
                      <div className="flex-1 min-w-0"><p className="text-sm font-medium text-[#1a1917] truncate">{p.name}</p></div>
                      <span className="text-sm font-semibold text-[#d4a574]">{p.count}</span>
                      <span className="text-[10px] text-[#b0aba6]">views</span>
                    </Link>
                  ))}
                </div>
              ) : <p className="text-sm text-[#b0aba6]">No product views yet</p>}
            </div>
            <div className="bg-white rounded-xl border border-black/[.06] p-6">
              <h2 className="font-semibold text-sm flex items-center gap-2 text-[#1a1917] mb-4"><Package size={16} className="text-[#d4a574]" /> Top Purchased Products</h2>
              {data.topPurchased.length > 0 ? (
                <div className="space-y-3">
                  {data.topPurchased.map((p, i) => (
                    <Link key={p.productId} href={"/admin/products/" + p.slug} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#f7f5f2] transition-colors">
                      <span className="text-xs text-[#b0aba6] w-4">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#1a1917] truncate">{p.name}</p>
                        <p className="text-[10px] text-[#b0aba6]">{p.orders} orders</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-[#d4a574]">{formatPrice(p.revenue)}</p>
                        <p className="text-[10px] text-[#b0aba6]">{p.quantity} units</p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : <p className="text-sm text-[#b0aba6]">No purchases yet</p>}
            </div>
          </div>

          {data.deviceBreakdown.length > 0 && (
            <div className="bg-white rounded-xl border border-black/[.06] p-6">
              <h2 className="font-semibold text-sm flex items-center gap-2 text-[#1a1917] mb-4"><Zap size={16} className="text-[#d4a574]" /> Device Breakdown</h2>
              <div className="flex gap-4">
                {data.deviceBreakdown.map((d) => {
                  const total = data.deviceBreakdown.reduce((s, x) => s + x.count, 0);
                  const pct = total > 0 ? Math.round((d.count / total) * 100) : 0;
                  return (
                    <div key={d.device} className="flex-1 text-center p-3 bg-[#f7f5f2] rounded-lg">
                      <p className="text-lg font-semibold text-[#1a1917]">{pct}%</p>
                      <p className="text-xs text-[#6b6560] capitalize">{d.device}</p>
                      <p className="text-[10px] text-[#b0aba6]">{d.count} events</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-black/[.06] p-6">
            <h2 className="font-semibold text-sm text-[#1a1917] mb-4">Quick Access</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Link href="/admin/orders" className="flex items-center gap-2 p-3 rounded-lg bg-[#f7f5f2] hover:bg-[#e8e4de] transition-colors text-sm text-[#1a1917] font-medium"><Package size={16} className="text-[#d4a574]" /> View Orders</Link>
              <Link href="/admin/products" className="flex items-center gap-2 p-3 rounded-lg bg-[#f7f5f2] hover:bg-[#e8e4de] transition-colors text-sm text-[#1a1917] font-medium"><BarChart3 size={16} className="text-[#d4a574]" /> Products</Link>
              <Link href="/admin/customers" className="flex items-center gap-2 p-3 rounded-lg bg-[#f7f5f2] hover:bg-[#e8e4de] transition-colors text-sm text-[#1a1917] font-medium"><Users size={16} className="text-[#d4a574]" /> Customers</Link>
              <Link href="/admin/categories" className="flex items-center gap-2 p-3 rounded-lg bg-[#f7f5f2] hover:bg-[#e8e4de] transition-colors text-sm text-[#1a1917] font-medium"><MessageSquare size={16} className="text-[#d4a574]" /> Categories</Link>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12 text-[#b0aba6]">No analytics data available</div>
      )}
    </div>
  );
}
