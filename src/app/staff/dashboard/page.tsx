"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Package, ShoppingCart, Users, AlertTriangle, Eye, ArrowUpRight, Clock, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";

interface Stats { totalProducts: number; totalOrders: number; totalCustomers: number; pendingOrders: number; lowStock: number; ordersToday: number; recentOrders: any[]; lowStockProducts: any[]; }

const STATUS_STYLES: Record<string, string> = {
  NEW: "bg-cyan-50 text-cyan-700 border border-cyan-200",
  PENDING: "bg-amber-50 text-amber-700 border border-amber-200",
  CONFIRMED: "bg-blue-50 text-blue-700 border border-blue-200",
  PROCESSING: "bg-indigo-50 text-indigo-700 border border-indigo-200",
  SHIPPED: "bg-purple-50 text-purple-700 border border-purple-200",
  DELIVERED: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  CANCELLED: "bg-red-50 text-red-700 border border-red-200",
  RETURNED: "bg-orange-50 text-orange-700 border border-orange-200",
};

export default function StaffDashboard() {
  const [stats, setStats] = useState<Stats>({ totalProducts:0, totalOrders:0, totalCustomers:0, pendingOrders:0, lowStock:0, ordersToday:0, recentOrders:[], lowStockProducts:[] });
  const [loading, setLoading] = useState(true);
  const { data: session } = useSession();
  const user = session?.user as any;
  const userName = user?.name || "there";
  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? "Good morning" : greetingHour < 17 ? "Good afternoon" : "Good evening";

  useEffect(() => {
    Promise.all([
      fetch("/api/products?limit=1").then(r => r.json()),
      fetch("/api/orders?limit=10&all=true").then(r => r.json()).catch(() => ({ orders:[], total:0 })),
      fetch("/api/customers?limit=1&all=true").then(r => r.json()).catch(() => ({ total:0 })),
    ]).then(([products, ordersData, customers]) => {
      const orders = ordersData.orders || [];
      const pending = orders.filter((o:any) => o.status === "NEW" || o.status === "PENDING" || o.status === "CONFIRMED").length;
      const today = new Date().toDateString();
      const todayOrders = orders.filter((o:any) => new Date(o.createdAt).toDateString() === today).length;
      setStats({ totalProducts: products.total||0, totalOrders: ordersData.total||orders.length, totalCustomers: customers.total||0, pendingOrders: pending, lowStock:0, ordersToday: todayOrders, recentOrders: orders.slice(0,5), lowStockProducts: [] });
      fetch("/api/products?limit=100&all=true").then(r => r.json()).then(d => {
        const ls = (d.products||[]).filter((p:any) => p.stockQuantity <= (p.lowStockThreshold||5));
        setStats(prev => ({ ...prev, lowStock: ls.length, lowStockProducts: ls.slice(0,5) }));
      }).catch(()=>{});
    }).finally(() => setLoading(false));
  }, []);

  const kpis = [
    { label:"Products", value:stats.totalProducts, icon:Package, bg:"bg-[#f0ede8]", ic:"text-[#6b6560]", desc:"Total in catalogue" },
    { label:"Orders", value:stats.totalOrders, icon:ShoppingCart, bg:"bg-[#f0ede8]", ic:"text-[#6b6560]", desc:"All time" },
    { label:"Customers", value:stats.totalCustomers, icon:Users, bg:"bg-[#f0ede8]", ic:"text-[#6b6560]", desc:"Registered users" },
    { label:"Pending", value:stats.pendingOrders, icon:Clock, bg:"bg-amber-50", ic:"text-amber-600", desc:"Awaiting action" },
    { label:"Low Stock", value:stats.lowStock, icon:AlertTriangle, bg: stats.lowStock>0?"bg-red-50":"bg-[#f0ede8]", ic: stats.lowStock>0?"text-red-600":"text-[#6b6560]", desc:"Need attention" },
    { label:"Today", value:stats.ordersToday, icon:ArrowUpRight, bg:"bg-[#f0ede8]", ic:"text-[#6b6560]", desc:"Orders today" },
  ];

  const fmtDate = (s:string) => { const d=new Date(s),n=new Date(),m=Math.floor((n.getTime()-d.getTime())/60000); if(m<1) return "Just now"; if(m<60) return m+"m ago"; const h=Math.floor(m/60); if(h<24) return h+"h ago"; return d.toLocaleDateString("en-IN",{day:"numeric",month:"short"}); };

  const actions = [
    {l:"View Orders",h:"/staff/orders",I:ShoppingCart},
    {l:"View Products",h:"/staff/products",I:Package},
    {l:"View Customers",h:"/staff/customers",I:Users},
    {l:"View Store",h:"/",I:Eye},
  ];

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a1917] via-[#2d2926] to-[#1a1917] p-6 md:p-8 text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#d4a574]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="relative z-10">
          <div className="mb-1">
            <span className="text-base font-serif tracking-wide text-white/90 font-semibold">WESTHOME</span>
            <span className="block text-[9px] text-[#b0aba6] tracking-[0.15em] uppercase">Staff Panel</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-light tracking-tight mt-3">{greeting}</h1>
          <p className="text-white/90 text-lg sm:text-xl mt-0.5" style={{ fontFamily: "Iowan Old Style, Baskerville, Times New Roman, serif" }}>{userName}</p>
          <p className="text-[#8a857f] text-sm mt-1">Here&apos;s your store overview for today.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map(s => {
          const I = s.icon;
          return (
            <div key={s.label} className="bg-white rounded-2xl p-4 border border-black/[.06]">
              <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center mb-3", s.bg)}>
                <I size={18} className={s.ic} />
              </div>
              <p className="text-2xl font-semibold text-[#1a1917]">
                {loading ? "—" : s.value.toLocaleString()}
              </p>
              <p className="text-xs font-medium text-[#6b6560] mt-0.5">{s.label}</p>
              <p className="text-[10px] text-[#b0aba6] mt-0.5">{s.desc}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl p-5 border border-black/[.06]">
        <h2 className="text-[11px] font-semibold text-[#1a1917] mb-4 tracking-wide uppercase">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {actions.map(a => {
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
            ) : stats.recentOrders.map((o: any) => (
              <div key={o.id} className="px-5 py-3 flex items-center gap-3 hover:bg-[#f7f5f2] transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1a1917]">#{o.orderNumber}</p>
                  <p className="text-xs text-[#b0aba6] mt-0.5">{o.customerName || "Guest"}</p>
                </div>
                <p className="text-sm font-medium text-[#1a1917] flex-shrink-0">
                  {"₹"}{Number(o.total).toLocaleString()}
                </p>
                <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0",
                  STATUS_STYLES[o.status] || "bg-[#f0ede8] text-[#6b6560]")}>
                  {o.status}
                </span>
                <span className="text-[10px] text-[#b0aba6] flex-shrink-0 hidden sm:block">
                  {fmtDate(o.createdAt)}
                </span>
              </div>
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
            ) : stats.lowStockProducts.length === 0 ? (
              <div className="p-8 text-center">
                <CheckCircle2 size={24} className="text-emerald-400 mx-auto mb-2" />
                <p className="text-sm text-[#b0aba6]">All products well stocked</p>
              </div>
            ) : stats.lowStockProducts.map((p: any) => {
              const img = p.images?.find((i: any) => i.isPrimary)?.url || p.images?.[0]?.url;
              const crit = p.stockQuantity <= 1;
              return (
                <div key={p.id} className="px-5 py-3 flex items-center gap-3 hover:bg-[#f7f5f2] transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-[#f0ede8] flex-shrink-0 overflow-hidden">
                    {img && <img src={img} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1a1917] truncate">{p.name}</p>
                    <p className="text-xs text-[#b0aba6]">{p.subcategory?.name || p.category?.name || ""}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className={cn("text-xs font-semibold", crit ? "text-red-600" : "text-amber-600")}>
                      {p.stockQuantity} left
                    </span>
                    <p className={cn("text-[10px] mt-0.5", crit ? "text-red-500" : "text-amber-500")}>
                      {crit ? "Critical" : "Low"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
