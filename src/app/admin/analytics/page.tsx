"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { BarChart3, Eye, ShoppingCart, MousePointerClick, MessageSquare, TrendingUp, Users, Package, DollarSign, RefreshCw, Globe, Monitor, Smartphone, Tablet, Search, AlertTriangle, ArrowUp, ArrowDown, Minus, Target, Filter, Activity, Radio, ChevronRight, ArrowRight, UserPlus, UserCheck, ShoppingBag, XCircle } from "lucide-react";
import { formatPrice, cn } from "@/lib/utils";

const RANGES = [{value:"today",label:"Today"},{value:"yesterday",label:"Yesterday"},{value:"7d",label:"7 Days"},{value:"30d",label:"30 Days"},{value:"90d",label:"90 Days"}];
const TABS = [{id:"overview",label:"Overview",icon:BarChart3},{id:"traffic",label:"Traffic",icon:Globe},{id:"products",label:"Products",icon:Package},{id:"categories",label:"Categories",icon:Filter},{id:"search",label:"Search",icon:Search},{id:"customers",label:"Customers",icon:Users},{id:"realtime",label:"Live",icon:Radio}];

function Pct({ c, p }) {
  if (p === 0) return c > 0 ? <span className="inline-flex items-center gap-0.5 text-emerald-600 text-[10px] font-medium"><ArrowUp size={10} />+100%</span> : <span className="text-[10px] text-[#b0aba6]">&mdash;</span>;
  const v = Math.round(((c - p) / p) * 100);
  if (v > 0) return <span className="inline-flex items-center gap-0.5 text-emerald-600 text-[10px] font-medium"><ArrowUp size={10} />+{v}%</span>;
  if (v < 0) return <span className="inline-flex items-center gap-0.5 text-red-500 text-[10px] font-medium"><ArrowDown size={10} />{v}%</span>;
  return <span className="inline-flex items-center gap-0.5 text-[#b0aba6] text-[10px] font-medium"><Minus size={10} />0%</span>;
}

function SC({ label, value, icon: Ic, color, sub, comp }: any) {
  return (<div className='bg-white rounded-xl border border-black/[.06] p-4 hover:shadow-sm transition-shadow'>
    <div className='flex items-center justify-between mb-3'><div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', color)}><Ic size={16} /></div>
    {comp && <Pct c={comp.current} p={comp.previous} />}</div>
    <p className='text-2xl font-semibold tracking-tight text-[#1a1917]'>{value}</p>
    <p className='text-xs font-medium text-[#6b6560] mt-0.5'>{label}</p>
    {sub && <p className='text-[10px] text-[#b0aba6] mt-0.5'>{sub}</p>}</div>);
}

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [live, setLive] = useState({ live: 0, customers: 0, guests: 0 });
  const [activities, setActivities] = useState([]);
  const [range, setRange] = useState('30d');
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [actLoading, setActLoading] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/analytics/dashboard?range=' + range).then(r => r.json()),
      fetch('/api/analytics/live').then(r => r.json()).catch(() => ({ live: 0, customers: 0, guests: 0 })),
    ]).then(([a, l]) => { setData(a); setLive(l); }).catch(() => {}).finally(() => setLoading(false));
  }, [range]);

  const fetchActivities = useCallback(() => {
    setActLoading(true);
    fetch('/api/analytics/activity?limit=40').then(r => r.json()).then(d => setActivities(d.activities || [])).catch(() => {}).finally(() => setActLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { const i = setInterval(() => fetch('/api/analytics/live').then(r => r.json()).then(setLive).catch(() => {}), 15000); return () => clearInterval(i); }, []);
  useEffect(() => { if (tab === 'realtime') { fetchActivities(); const i = setInterval(fetchActivities, 10000); return () => clearInterval(i); } }, [tab, fetchActivities]);

  const fmtTime = (iso) => new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const eI = { VIEW: Eye, CLICK: MousePointerClick, ADD_TO_CART: ShoppingCart, BUY_NOW: Target, WHATSAPP_ENQUIRY: MessageSquare, PURCHASE: Package, SEARCH: Search, COLLECTION_VIEW: Filter, CHECKOUT_STARTED: ShoppingBag };
  const eC = { VIEW: 'text-blue-500', CLICK: 'text-amber-500', ADD_TO_CART: 'text-orange-500', BUY_NOW: 'text-emerald-600', WHATSAPP_ENQUIRY: 'text-green-500', PURCHASE: 'text-emerald-700', SEARCH: 'text-indigo-500', COLLECTION_VIEW: 'text-violet-500', CHECKOUT_STARTED: 'text-rose-500' };
  return (<div className='space-y-6'>
    <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
      <div><h1 className='text-xl font-semibold text-[#1a1917]'>Business Intelligence</h1>
      <p className='text-sm text-[#6b6560] mt-0.5'>Real-time customer activity & performance</p></div>
      <div className='flex items-center gap-2 flex-wrap'>
        <div className='flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-medium'><span className='w-2 h-2 rounded-full bg-emerald-500 animate-pulse' /> Live: {live.live}</div>
        <button onClick={fetchData} className='p-1.5 rounded-lg hover:bg-gray-100 text-[#6b6560]'><RefreshCw size={14} /></button>
        <div className='flex gap-1 bg-[#f7f5f2] rounded-lg p-0.5'>{RANGES.map(r => (<button key={r.value} onClick={() => setRange(r.value)} className={cn('px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors', range === r.value ? 'bg-white text-[#1a1917] shadow-sm' : 'text-[#6b6560] hover:text-[#1a1917]')}>{r.label}</button>))}</div>
      </div>
    </div>
    <div className='flex gap-1 bg-[#f7f5f2] rounded-xl p-1 overflow-x-auto' style={{scrollbarWidth:'none'}}>{TABS.map(t => (<button key={t.id} onClick={() => setTab(t.id)} className={cn('flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap', tab === t.id ? 'bg-white text-[#1a1917] shadow-sm' : 'text-[#6b6560] hover:text-[#1a1917]')}><t.icon size={14} /> {t.label}{t.id === 'realtime' && live.live > 0 && <span className='w-1.5 h-1.5 rounded-full bg-emerald-500' />}</button>))}</div>
    {loading ? (<div className='grid grid-cols-2 md:grid-cols-4 gap-3'>{Array.from({length:8}).map((_,i) => (<div key={i} className='bg-white rounded-xl border border-black/[.06] p-4 animate-pulse'><div className='h-8 w-8 bg-gray-100 rounded-lg mb-3'/><div className='h-6 w-16 bg-gray-100 rounded mb-1'/><div className='h-3 w-20 bg-gray-100 rounded'/></div>))}</div>) : data ? (<>
      {tab === 'overview' && (<div className='space-y-4'>
        <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
          <SC label='Total Visitors' value={data.summary.totalVisitors} icon={Users} color='bg-violet-50 text-violet-700' sub={data.summary.activeToday + ' today'} comp={data.comparison?.visitors} />
          <SC label='Product Views' value={data.summary.productViews} icon={Eye} color='bg-blue-50 text-blue-700' sub={data.summary.productClicks + ' clicks'} />
          <SC label='Add to Cart' value={data.summary.addToCart} icon={ShoppingCart} color='bg-amber-50 text-amber-700' />
          <SC label='Buy Now' value={data.summary.buyNow} icon={MousePointerClick} color='bg-orange-50 text-orange-700' />
          <SC label='WhatsApp Enquiries' value={data.summary.whatsappEnquiries} icon={MessageSquare} color='bg-green-50 text-green-700' />
          <SC label='Purchases' value={data.summary.purchases} icon={Package} color='bg-emerald-50 text-emerald-700' sub={data.summary.unitsSold + ' units sold'} comp={data.comparison?.purchases} />
          <SC label='Revenue' value={formatPrice(data.summary.revenue)} icon={DollarSign} color='bg-emerald-50 text-emerald-700' comp={data.comparison?.revenue} />
          <SC label='Conversion Rate' value={data.summary.conversionRate + '%'} icon={TrendingUp} color='bg-indigo-50 text-indigo-700' comp={data.comparison?.conversion} />
        </div>
        <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
          <div className='bg-white rounded-xl border border-black/[.06] p-4'><p className='text-xs font-medium text-[#6b6560] mb-1'>Collection Views</p><p className='text-lg font-semibold text-[#1a1917]'>{data.summary.collectionViews || 0}</p></div>
          <div className='bg-white rounded-xl border border-black/[.06] p-4'><p className='text-xs font-medium text-[#6b6560] mb-1'>Searches</p><p className='text-lg font-semibold text-[#1a1917]'>{data.summary.searchCount || 0}</p></div>
          <div className='bg-white rounded-xl border border-black/[.06] p-4'><p className='text-xs font-medium text-[#6b6560] mb-1'>Checkout Started</p><p className='text-lg font-semibold text-[#1a1917]'>{data.summary.checkoutStarted || 0}</p></div>
          <div className='bg-white rounded-xl border border-black/[.06] p-4'><p className='text-xs font-medium text-[#6b6560] mb-1'>Abandoned Carts</p><p className='text-lg font-semibold text-red-600'>{data.abandonedCarts || 0}</p></div>
        </div>
        <div className='bg-white rounded-xl border border-black/[.06] p-6'><h2 className='font-semibold text-sm flex items-center gap-2 text-[#1a1917] mb-4'><Target size={16} className='text-[#d4a574]' /> Customer Funnel</h2><div className='space-y-3'>{[{l:'Visitors',v:data.summary.totalVisitors,i:Users},{l:'Collection Views',v:data.summary.collectionViews||0,i:Filter},{l:'Product Views',v:data.summary.productViews,i:Eye},{l:'Add to Cart',v:data.summary.addToCart,i:ShoppingCart},{l:'Checkout',v:data.summary.checkoutStarted||0,i:ShoppingBag},{l:'Buy Now',v:data.summary.buyNow,i:Target},{l:'Purchases',v:data.summary.purchases,i:Package}].map((s,i) => {const mx=Math.max(data.summary.totalVisitors,1);const pct=Math.round((s.v/mx)*100);return(<div key={i} className='flex items-center gap-3'><s.i size={14} className='text-[#d4a574] shrink-0' /><span className='text-xs text-[#6b6560] w-28 shrink-0'>{s.l}</span><div className='flex-1 h-6 bg-[#f7f5f2] rounded-full overflow-hidden'><div className='h-full bg-[#d4a574] rounded-full flex items-center pl-2' style={{width:Math.max(pct,3)+'%'}}>{pct>10 && <span className='text-[10px] font-medium text-white'>{pct}%</span>}</div></div><span className='text-xs font-semibold text-[#1a1917] w-12 text-right shrink-0'>{s.v.toLocaleString()}</span></div>);})}</div></div>
        {data.deviceBreakdown.length > 0 && (<div className='bg-white rounded-xl border border-black/[.06] p-6'><h2 className='font-semibold text-sm flex items-center gap-2 text-[#1a1917] mb-4'><Monitor size={16} className='text-[#d4a574]' /> Devices</h2><div className='flex gap-4 flex-wrap'>{data.deviceBreakdown.map((d) => {const tot=data.deviceBreakdown.reduce((s,x)=>s+x.count,0);const pct=tot>0?Math.round((d.count/tot)*100):0;const DI=d.device==='mobile'?Smartphone:d.device==='tablet'?Tablet:Monitor;return(<div key={d.device} className='flex-1 min-w-[100px] text-center p-3 bg-[#f7f5f2] rounded-lg'><DI size={20} className='mx-auto mb-1 text-[#d4a574]' /><p className='text-lg font-semibold text-[#1a1917]'>{pct}%</p><p className='text-xs text-[#6b6560] capitalize'>{d.device}</p></div>);})}</div></div>)}
      </div>)}
      {tab === 'traffic' && (<div className='space-y-4'>
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
          <div className='bg-white rounded-xl border border-black/[.06] p-6'><h2 className='font-semibold text-sm flex items-center gap-2 text-[#1a1917] mb-4'><Globe size={16} className='text-[#d4a574]' /> Traffic Sources</h2>
            {data.trafficSources && data.trafficSources.length > 0 ? <div className='space-y-3'>{data.trafficSources.map(ts => {const mx=Math.max(...data.trafficSources.map(x=>x.count),1);return(<div key={ts.source} className='flex items-center gap-3'><span className='text-xs font-medium text-[#6b6560] w-20 capitalize truncate shrink-0'>{ts.source}</span><div className='flex-1 h-5 bg-[#f7f5f2] rounded-full overflow-hidden'><div className='h-full bg-[#d4a574] rounded-full' style={{width:Math.round((ts.count/mx)*100)+'%'}} /></div><span className='text-xs font-semibold text-[#1a1917] w-10 text-right shrink-0'>{ts.count}</span></div>);})}</div> : <p className='text-sm text-[#b0aba6]'>No traffic data yet</p>}
          </div>
          <div className='bg-white rounded-xl border border-black/[.06] p-6'><h2 className='font-semibold text-sm flex items-center gap-2 text-[#1a1917] mb-4'><Monitor size={16} className='text-[#d4a574]' /> Devices</h2>
            <div className='space-y-3'>{data.deviceBreakdown.map(d => {const tot=data.deviceBreakdown.reduce((s,x)=>s+x.count,0);const pct=tot>0?Math.round((d.count/tot)*100):0;const DI=d.device==='mobile'?Smartphone:d.device==='tablet'?Tablet:Monitor;return(<div key={d.device} className='flex items-center gap-3'><DI size={14} className='text-[#d4a574] shrink-0' /><span className='text-xs font-medium text-[#6b6560] w-20 capitalize shrink-0'>{d.device}</span><div className='flex-1 h-5 bg-[#f7f5f2] rounded-full overflow-hidden'><div className='h-full bg-[#d4a574] rounded-full' style={{width:pct+'%'}} /></div><span className='text-xs font-semibold text-[#1a1917] w-12 text-right shrink-0'>{pct}%</span></div>);})}</div>
          </div>
        </div>
        <div className='bg-white rounded-xl border border-black/[.06] p-6'><h2 className='font-semibold text-sm flex items-center gap-2 text-[#1a1917] mb-4'><Search size={16} className='text-[#d4a574]' /> Popular Searches</h2>
          {data.topSearches && data.topSearches.length > 0 ? <div className='flex flex-wrap gap-2'>{data.topSearches.map((s,i) => (<div key={i} className='flex items-center gap-1.5 bg-[#f7f5f2] rounded-full px-3 py-1.5'><span className='text-xs font-medium text-[#1a1917]'>{s.query}</span><span className='text-[10px] bg-[#d4a574] text-white rounded-full px-1.5 py-0.5 font-medium'>{s.count}</span></div>))}</div> : <p className='text-sm text-[#b0aba6]'>No search data yet</p>}
        </div>
        <div className='bg-white rounded-xl border border-black/[.06] p-6'><h2 className='font-semibold text-sm flex items-center gap-2 text-[#1a1917] mb-4'><ArrowRight size={16} className='text-[#d4a574]' /> Customer Journey</h2><div className='flex flex-wrap items-center gap-2'>{[{l:'Visit',v:data.summary.totalVisitors},{l:'Browse',v:data.summary.collectionViews||data.summary.productViews},{l:'Cart',v:data.summary.addToCart},{l:'Checkout',v:data.summary.checkoutStarted||0},{l:'Buy',v:data.summary.purchases}].map((s,i,a) => (<div key={i} className='flex items-center gap-2'><div className='bg-[#f7f5f2] rounded-lg px-3 py-2 text-center'><p className='text-base font-semibold text-[#1a1917]'>{s.v.toLocaleString()}</p><p className='text-[10px] text-[#6b6560]'>{s.l}</p></div>{i<a.length-1 && <ChevronRight size={14} className='text-[#b0aba6]' />}</div>))}</div></div>
      </div>)}
      {tab === 'products' && (<div className='space-y-4'>
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
          <div className='bg-white rounded-xl border border-black/[.06] p-6'><h2 className='font-semibold text-sm flex items-center gap-2 text-[#1a1917] mb-4'><Eye size={16} className='text-[#d4a574]' /> Top Viewed Products</h2>
            {data.topViewed.length > 0 ? <div className='space-y-2'>{data.topViewed.map((p,i) => (<Link key={p.productId} href={'/admin/products/'+(p.slug||p.productId)} className='flex items-center gap-3 p-2 rounded-lg hover:bg-[#f7f5f2] transition-colors'><span className='text-xs text-[#b0aba6] w-4'>{i+1}</span><div className='flex-1 min-w-0'><p className='text-sm font-medium text-[#1a1917] truncate'>{p.name}</p></div><span className='text-sm font-semibold text-[#d4a574]'>{p.count}</span><span className='text-[10px] text-[#b0aba6] ml-1'>views</span>{p.stock!==undefined && <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium',p.stock>0?'bg-emerald-50 text-emerald-700':'bg-red-50 text-red-600')}>{p.stock>0?p.stock+' in stock':'OOS'}</span>}</Link>))}</div> : <p className='text-sm text-[#b0aba6]'>No views yet</p>}
          </div>
          <div className='bg-white rounded-xl border border-black/[.06] p-6'><h2 className='font-semibold text-sm flex items-center gap-2 text-[#1a1917] mb-4'><Package size={16} className='text-[#d4a574]' /> Top Purchased Products</h2>
            {data.topPurchased.length > 0 ? <div className='space-y-2'>{data.topPurchased.map((p,i) => (<Link key={p.productId} href={'/admin/products/'+(p.slug||p.productId)} className='flex items-center gap-3 p-2 rounded-lg hover:bg-[#f7f5f2] transition-colors'><span className='text-xs text-[#b0aba6] w-4'>{i+1}</span><div className='flex-1 min-w-0'><p className='text-sm font-medium text-[#1a1917] truncate'>{p.name}</p><p className='text-[10px] text-[#b0aba6]'>{p.orders} orders | {p.quantity} units</p></div><p className='text-sm font-semibold text-[#d4a574]'>{formatPrice(p.revenue)}</p></Link>))}</div> : <p className='text-sm text-[#b0aba6]'>No purchases yet</p>}
          </div>
        </div>
        <div className='bg-white rounded-xl border border-black/[.06] p-6'><h2 className='font-semibold text-sm flex items-center gap-2 text-[#1a1917] mb-4'><AlertTriangle size={16} className='text-amber-500' /> Performance Insights</h2>
          {data.topViewed.length > 0 ? <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>{data.topViewed.slice(0,6).map(p => {const pur=data.topPurchased.find(tp=>tp.productId===p.productId);const ord=pur?.orders||0;const rev=pur?.revenue||0;let ins='',col='';if(p.count>50&&ord===0){ins='High views, no purchases';col='bg-amber-50 text-amber-700 border-amber-200';}else if(p.count>20&&ord>0){ins='Good engagement';col='bg-emerald-50 text-emerald-700 border-emerald-200';}else if(p.count>10&&ord===0){ins='Needs conversion optimization';col='bg-blue-50 text-blue-700 border-blue-200';}else{ins='Low traffic';col='bg-gray-50 text-gray-600 border-gray-200';}return(<div key={p.productId} className={cn('rounded-lg border p-3',col)}><p className='text-xs font-medium truncate'>{p.name}</p><p className='text-[10px] mt-1 opacity-80'>{ins}</p><p className='text-[10px] mt-1 opacity-60'>{p.count} views | {ord} orders | {formatPrice(rev)}</p></div>);})}</div> : <p className='text-sm text-[#b0aba6]'>Not enough data</p>}
        </div>
      </div>)}
      {tab === 'categories' && (<div className='space-y-4'>
        {data.categoryAnalytics && data.categoryAnalytics.length > 0 ? <div className='bg-white rounded-xl border border-black/[.06] p-6'><h2 className='font-semibold text-sm flex items-center gap-2 text-[#1a1917] mb-4'><Filter size={16} className='text-[#d4a574]' /> Category Performance</h2>
          <div className='overflow-x-auto'><table className='w-full text-sm'><thead><tr className='border-b border-black/[.06]'><th className='text-left py-2 pr-4 text-xs font-medium text-[#6b6560]'>Category</th><th className='text-right py-2 px-3 text-xs font-medium text-[#6b6560]'>Views</th><th className='text-right py-2 px-3 text-xs font-medium text-[#6b6560]'>Clicks</th><th className='text-right py-2 px-3 text-xs font-medium text-[#6b6560]'>Cart</th></tr></thead>
          <tbody>{data.categoryAnalytics.sort((a,b)=>b.views-a.views).map(cat => (<tr key={cat.id} className='border-b border-black/[.03] hover:bg-[#f7f5f2]'><td className='py-2.5 pr-4'><Link href='/admin/categories' className='font-medium text-[#1a1917] hover:text-[#d4a574]'>{cat.name}</Link></td><td className='text-right py-2.5 px-3'>{cat.views}</td><td className='text-right py-2.5 px-3'>{cat.clicks}</td><td className='text-right py-2.5 px-3'>{cat.addToCart}</td></tr>))}</tbody></table></div></div> : <div className='bg-white rounded-xl border border-black/[.06] p-6 text-center'><Filter size={32} className='mx-auto text-[#b0aba6] mb-2' /><p className='text-sm text-[#b0aba6]'>No category data yet</p></div>}
      </div>)}
      {tab === 'search' && (<div className='space-y-4'>
        <div className='bg-white rounded-xl border border-black/[.06] p-6'><h2 className='font-semibold text-sm flex items-center gap-2 text-[#1a1917] mb-4'><Search size={16} className='text-[#d4a574]' /> Search Analytics</h2>
          <div className='grid grid-cols-2 md:grid-cols-3 gap-3 mb-6'>
            <div className='bg-[#f7f5f2] rounded-lg p-3'><p className='text-lg font-semibold text-[#1a1917]'>{data.summary.searchCount||0}</p><p className='text-xs text-[#6b6560]'>Total Searches</p></div>
            <div className='bg-[#f7f5f2] rounded-lg p-3'><p className='text-lg font-semibold text-[#1a1917]'>{data.topSearches?data.topSearches.length:0}</p><p className='text-xs text-[#6b6560]'>Unique Queries</p></div>
            <div className='bg-[#f7f5f2] rounded-lg p-3'><p className='text-lg font-semibold text-[#1a1917] truncate'>{data.topSearches&&data.topSearches.length>0?data.topSearches[0].query:'\u2014'}</p><p className='text-xs text-[#6b6560]'>Top Search</p></div>
          </div>
          {data.topSearches&&data.topSearches.length>0 ? <div className='space-y-2'>{data.topSearches.map((s,i) => {const mx=data.topSearches[0].count;return(<div key={i} className='flex items-center gap-3'><span className='text-xs text-[#b0aba6] w-6 text-right'>{i+1}.</span><span className='text-sm font-medium text-[#1a1917] w-40 truncate shrink-0'>{s.query}</span><div className='flex-1 h-5 bg-[#f7f5f2] rounded-full overflow-hidden'><div className='h-full bg-[#d4a574] rounded-full' style={{width:Math.round((s.count/mx)*100)+'%'}} /></div><span className='text-xs font-semibold text-[#1a1917] w-8 text-right shrink-0'>{s.count}</span></div>);})}</div> : <p className='text-sm text-[#b0aba6]'>No searches yet</p>}
        </div>
      </div>)}
      {tab === 'customers' && (<div className='space-y-4'>
        <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
          <SC label='New Customers' value={data.customerRetention?.newCustomers||0} icon={UserPlus} color='bg-violet-50 text-violet-700' />
          <SC label='Returning' value={data.customerRetention?.returningCustomers||0} icon={UserCheck} color='bg-emerald-50 text-emerald-700' />
          <SC label='Abandoned Carts' value={data.abandonedCarts||0} icon={XCircle} color='bg-red-50 text-red-600' />
          <SC label='Conversion' value={data.summary.conversionRate+'%'} icon={TrendingUp} color='bg-indigo-50 text-indigo-700' />
        </div>
        <div className='bg-white rounded-xl border border-black/[.06] p-6'><h2 className='font-semibold text-sm flex items-center gap-2 text-[#1a1917] mb-4'><Users size={16} className='text-[#d4a574]' /> Retention</h2>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            <div><h3 className='text-xs font-medium text-[#6b6560] mb-3'>New vs Returning</h3><div className='flex gap-3'><div className='flex-1 bg-violet-50 rounded-lg p-4 text-center'><p className='text-2xl font-bold text-violet-700'>{data.customerRetention?.newCustomers||0}</p><p className='text-xs text-violet-600 mt-1'>New</p></div><div className='flex-1 bg-emerald-50 rounded-lg p-4 text-center'><p className='text-2xl font-bold text-emerald-700'>{data.customerRetention?.returningCustomers||0}</p><p className='text-xs text-emerald-600 mt-1'>Returning</p></div></div></div>
            <div><h3 className='text-xs font-medium text-[#6b6560] mb-3'>Order Funnel</h3><div className='space-y-2'><div className='flex items-center justify-between text-sm'><span className='text-[#6b6560]'>Checkout Started</span><span className='font-medium'>{data.summary.checkoutStarted||0}</span></div><div className='flex items-center justify-between text-sm'><span className='text-[#6b6560]'>Purchases</span><span className='font-medium'>{data.summary.purchases}</span></div><div className='flex items-center justify-between text-sm'><span className='text-[#6b6560]'>Abandoned</span><span className='font-medium text-red-500'>{data.abandonedCarts||0}</span></div></div></div>
          </div>
        </div>
      </div>)}
      {tab === 'realtime' && (<div className='space-y-4'>
        <div className='grid grid-cols-2 md:grid-cols-3 gap-3'>
          <div className='bg-white rounded-xl border border-black/[.06] p-4 flex items-center gap-3'><div className='w-3 h-3 rounded-full bg-emerald-500 animate-pulse' /><div><p className='text-2xl font-semibold text-[#1a1917]'>{live.live}</p><p className='text-xs text-[#6b6560]'>Live Now</p></div></div>
          <div className='bg-white rounded-xl border border-black/[.06] p-4 flex items-center gap-3'><Users size={20} className='text-violet-500' /><div><p className='text-2xl font-semibold text-[#1a1917]'>{live.customers||0}</p><p className='text-xs text-[#6b6560]'>Customers</p></div></div>
          <div className='bg-white rounded-xl border border-black/[.06] p-4 flex items-center gap-3'><Globe size={20} className='text-blue-500' /><div><p className='text-2xl font-semibold text-[#1a1917]'>{live.guests||0}</p><p className='text-xs text-[#6b6560]'>Guests</p></div></div>
        </div>
        <div className='bg-white rounded-xl border border-black/[.06] p-6'><div className='flex items-center justify-between mb-4'><h2 className='font-semibold text-sm flex items-center gap-2 text-[#1a1917]'><Activity size={16} className='text-[#d4a574]' /> Live Activity</h2><button onClick={fetchActivities} className='text-xs text-[#d4a574] hover:underline'>Refresh</button></div>
          {actLoading ? <div className='space-y-2'>{Array.from({length:5}).map((_,i)=><div key={i} className='h-10 bg-gray-50 rounded-lg animate-pulse' />)}</div> : activities.length>0 ? <div className='space-y-1.5 max-h-[500px] overflow-y-auto'>{activities.map(a => {const Ico=eI[a.type]||Eye;return(<div key={a.id} className='flex items-center gap-3 p-2.5 rounded-lg hover:bg-[#f7f5f2]'><Ico size={14} className={eC[a.type]||'text-gray-400'} /><div className='flex-1 min-w-0'><p className='text-xs font-medium text-[#1a1917] truncate'>{a.product?a.type+': '+a.product:a.type}</p></div><span className='text-[10px] text-[#b0aba6] shrink-0'>{fmtTime(a.time)}</span></div>);})}</div> : <p className='text-sm text-[#b0aba6] text-center py-6'>No recent activity</p>}
        </div>
      </div>)}
      <div className='bg-white rounded-xl border border-black/[.06] p-6'><h2 className='font-semibold text-sm text-[#1a1917] mb-4'>Quick Access</h2><div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
        <Link href='/admin/orders' className='flex items-center gap-2 p-3 rounded-lg bg-[#f7f5f2] hover:bg-[#e8e4de] text-sm text-[#1a1917] font-medium'><Package size={16} className='text-[#d4a574]' /> Orders</Link>
        <Link href='/admin/products' className='flex items-center gap-2 p-3 rounded-lg bg-[#f7f5f2] hover:bg-[#e8e4de] text-sm text-[#1a1917] font-medium'><BarChart3 size={16} className='text-[#d4a574]' /> Products</Link>
        <Link href='/admin/customers' className='flex items-center gap-2 p-3 rounded-lg bg-[#f7f5f2] hover:bg-[#e8e4de] text-sm text-[#1a1917] font-medium'><Users size={16} className='text-[#d4a574]' /> Customers</Link>
        <Link href='/admin/categories' className='flex items-center gap-2 p-3 rounded-lg bg-[#f7f5f2] hover:bg-[#e8e4de] text-sm text-[#1a1917] font-medium'><Filter size={16} className='text-[#d4a574]' /> Categories</Link>
      </div></div>
    </>) : (<div className='text-center py-12 text-[#b0aba6]'>No analytics data available</div>)}
    </div>);
}
