"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus, Search, Eye, Edit, Trash2, Package, CheckSquare, Square, MoreVertical, Copy, Archive, AlertTriangle } from "lucide-react";
import { formatPrice, cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface Product { id: string; name: string; slug: string; regularPrice: number; salePrice: number | null; status: string; category: { name: string }; subcategory?: { name: string } | null; images: { url: string }[]; _count: { orderItems: number }; }

const SO = [{v:"",l:"All Statuses"},{v:"ACTIVE",l:"Active"},{v:"DRAFT",l:"Draft"},{v:"INACTIVE",l:"Inactive"},{v:"ARCHIVED",l:"Archived"}];
const SC: Record<string,string> = {ACTIVE:"bg-emerald-50 text-emerald-700",DRAFT:"bg-amber-50 text-amber-700",INACTIVE:"bg-gray-100 text-gray-600",ARCHIVED:"bg-rose-50 text-rose-700"};

function ActionMenu({ product, onAction, onClose }: { product: Product; onAction: (a: string, p: Product) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, [onClose]);
  const items = [
    { label: "View Product", icon: Eye, action: "view" },
    { label: "Edit Product", icon: Edit, action: "edit" },
    { label: "Duplicate Product", icon: Copy, action: "duplicate" },
    ...(product.status !== "ARCHIVED" ? [{ label: "Archive Product", icon: Archive, action: "archive" }] : []),
    ...(product._count.orderItems === 0 ? [{ label: "Delete Product", icon: Trash2, action: "delete", danger: true }] : []),
  ];
  return (
    <div ref={ref} className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl border border-black/[.06] shadow-xl z-50 py-1">
      {items.map((item) => (
        <button key={item.action} onClick={() => { onAction(item.action, product); onClose(); }}
          className={cn("w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors",
            item.danger ? "text-red-600 hover:bg-red-50" : "text-[#1a1917] hover:bg-[#f7f5f2]")}>
          <item.icon size={14} className={item.danger ? "text-red-500" : "text-[#b0aba6]"} />{item.label}
        </button>
      ))}
    </div>
  );
}

function ConfirmDialog({ title, message, confirmLabel, danger, onConfirm, onCancel }: { title: string; message: string; confirmLabel: string; danger?: boolean; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 z-10">
        <div className="flex items-start gap-3 mb-4">
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", danger ? "bg-red-50" : "bg-amber-50")}>
            <AlertTriangle size={20} className={danger ? "text-red-500" : "text-amber-600"} />
          </div>
          <div><h3 className="font-semibold text-[#1a1917]">{title}</h3><p className="text-sm text-[#6b6560] mt-1">{message}</p></div>
        </div>
        <div className="flex items-center justify-end gap-2 mt-6">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-[#6b6560] hover:bg-[#f7f5f2] rounded-lg transition-colors">Cancel</button>
          <button onClick={onConfirm} className={cn("px-4 py-2 text-sm font-medium rounded-lg text-white transition-colors", danger ? "bg-red-600 hover:bg-red-700" : "bg-[#d4a574] hover:bg-[#c49564]")}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [confirmDlg, setConfirmDlg] = useState<{title:string;message:string;confirmLabel:string;danger?:boolean;onConfirm:()=>void}|null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const fetchProducts = async (append = false) => {
    if (append) setLoadingMore(true); else setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (statusFilter) params.set("status", statusFilter);
      params.set("page", String(append ? page : 1));
      params.set("limit", "50");
      const res = await fetch("/api/admin/products?" + params.toString());
      if (res.ok) {
        const d = await res.json();
        if (append) {
          setProducts(prev => [...prev, ...d.products]);
        } else {
          setProducts(d.products);
        }
        setTotal(d.total);
        setHasMore(d.products.length === 50);
        if (append) setPage(p => p + 1);
      }
    } catch (e) { console.error(e); } finally { if (append) setLoadingMore(false); else setLoading(false); }
  };

  useEffect(() => { setPage(1); setHasMore(true); fetchProducts(); setSelectedIds(new Set()); }, [search, statusFilter]);

  useEffect(() => {
    if (!sentinelRef.current || !hasMore || loading || loadingMore) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) fetchProducts(true); },
      { rootMargin: "200px" }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, page]);

  const toggleAll = () => { if (selectedIds.size === products.length) setSelectedIds(new Set()); else setSelectedIds(new Set(products.map(p => p.id))); };
  const toggleOne = (id: string) => { const s = new Set(selectedIds); if (s.has(id)) s.delete(id); else s.add(id); setSelectedIds(s); };

  const handleAction = async (action: string, product: Product) => {
    if (action === "view") { window.open("/products/" + product.slug, "_blank"); return; }
    if (action === "edit") { window.location.href = "/admin/products/" + product.id; return; }
    if (action === "duplicate") {
      toast.loading("Duplicating...");
      try { const res = await fetch("/api/admin/products/" + product.id + "/duplicate", { method: "POST" }); toast.dismiss();
        if (res.ok) { toast.success("Product duplicated"); fetchProducts(); } else { const d = await res.json(); toast.error(d.error || "Failed"); }
      } catch { toast.dismiss(); toast.error("Failed to duplicate"); }
      return;
    }
    if (action === "archive") {
      setConfirmDlg({ title: "Archive this product?", message: product.name + " will be removed from the storefront but preserved in admin.", confirmLabel: "Archive Product",
        onConfirm: async () => { const res = await fetch("/api/admin/products/" + product.id, { method: "PATCH", headers: {"Content-Type":"application/json"}, body: JSON.stringify({status:"ARCHIVED"}) });
          if (res.ok) { toast.success("Product archived"); fetchProducts(); } else toast.error("Failed"); setConfirmDlg(null); },
      }); return;
    }
    if (action === "delete") {
      if (product._count.orderItems > 0) {
        setConfirmDlg({ title: "Cannot delete this product", message: "This product has " + product._count.orderItems + " order(s). Deleting would destroy historical order data. Please archive instead.", confirmLabel: "Archive Instead",
          onConfirm: async () => { await fetch("/api/admin/products/" + product.id, { method: "PATCH", headers: {"Content-Type":"application/json"}, body: JSON.stringify({status:"ARCHIVED"}) }); toast.success("Product archived"); fetchProducts(); setConfirmDlg(null); },
        });
      } else {
        setConfirmDlg({ title: "Delete product?", message: "Are you sure you want to permanently delete \"" + product.name + "\"? This action cannot be undone.", confirmLabel: "Delete Product", danger: true,
          onConfirm: async () => { const res = await fetch("/api/admin/products/" + product.id, { method: "DELETE" }); if (res.ok) { toast.success("Product deleted"); fetchProducts(); } else { const d = await res.json(); toast.error(d.message || "Failed"); } setConfirmDlg(null); },
        });
      }
    }
  };

  const handleBulk = async (action: string) => {
    const n = selectedIds.size; const isDel = action === "delete";
    setConfirmDlg({ title: isDel ? "Delete " + n + " products?" : "Change " + n + " products to " + action + "?", message: isDel ? "This cannot be undone. Products with orders will be skipped." : "This will change the status of " + n + " products.", confirmLabel: isDel ? "Delete Products" : "Apply", danger: isDel,
      onConfirm: async () => { try { const res = await fetch("/api/admin/products/bulk", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ action, ids: Array.from(selectedIds) }) }); const d = await res.json(); if (d.successCount > 0) toast.success(d.successCount + " product(s) " + (isDel ? "deleted" : "updated")); if (d.failCount > 0) toast.error(d.failCount + " product(s) skipped (has orders)"); } catch { toast.error("Bulk action failed"); } setSelectedIds(new Set()); setConfirmDlg(null); fetchProducts(); },
    });
  };

  return (
    <div className="space-y-4">
      {confirmDlg && <ConfirmDialog {...confirmDlg} onCancel={() => setConfirmDlg(null)} />}
      <div className="flex items-center justify-between gap-4">
        <div><h1 className="text-xl font-semibold">Products</h1><p className="text-sm text-[#b0aba6] mt-0.5">{total} products</p></div>
        <Link href="/admin/products/new"><button className="flex items-center gap-1.5 px-4 py-2 bg-stone-900 text-white text-sm font-medium rounded-xl hover:bg-stone-800 transition-colors"><Plus size={16} /> Add Product</button></Link>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b0aba6]" />
          <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search by name, SKU, category..." className="w-full pl-9 pr-4 py-2 bg-white border border-black/[.06] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a574]/30" /></div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="px-3 py-2 border border-black/[.06] rounded-xl text-sm focus:outline-none appearance-none bg-white cursor-pointer">
          {SO.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}</select>
      </div>
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 bg-[#d4a574]/5 border border-[#d4a574]/20 rounded-xl px-4 py-3">
          <span className="text-sm font-medium text-[#d4a574]">{selectedIds.size} selected</span>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => handleBulk("ACTIVE")} className="px-3 py-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100">Activate</button>
            <button onClick={() => handleBulk("INACTIVE")} className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">Deactivate</button>
            <button onClick={() => handleBulk("ARCHIVED")} className="px-3 py-1.5 text-xs font-medium bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100">Archive</button>
            <button onClick={() => handleBulk("delete")} className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 rounded-lg hover:bg-red-100">Delete</button>
          </div>
          <button onClick={() => setSelectedIds(new Set())} className="ml-auto text-xs text-[#b0aba6] hover:text-[#1a1917]">Clear</button>
        </div>
      )}
      <div className="bg-white rounded-2xl border border-black/[.06] overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead>
          <tr className="border-b border-black/[.06] bg-[#f7f5f2]/50">
            <th className="w-10 px-4 py-3"><button onClick={toggleAll} className="text-[#b0aba6] hover:text-[#1a1917]">{selectedIds.size===products.length&&products.length>0?<CheckSquare size={16} className="text-[#d4a574]"/>:<Square size={16}/>}</button></th>
            <th className="text-left px-4 py-3 font-medium text-[#6b6560] text-[11px] uppercase tracking-wider">Product</th>
            <th className="text-left px-4 py-3 font-medium text-[#6b6560] text-[11px] uppercase tracking-wider hidden md:table-cell">Category</th>
            <th className="text-right px-4 py-3 font-medium text-[#6b6560] text-[11px] uppercase tracking-wider">Price</th>
            <th className="text-center px-4 py-3 font-medium text-[#6b6560] text-[11px] uppercase tracking-wider">Status</th>
            <th className="w-12 px-4 py-3"></th>
          </tr></thead><tbody>
          {loading ? Array.from({length:5}).map((_,i) => (
            <tr key={i} className="border-b border-black/[.06]"><td className="px-4 py-3"><div className="h-4 w-4 bg-gray-100 rounded animate-pulse"/></td><td className="px-4 py-3"><div className="h-5 w-40 bg-gray-100 rounded animate-pulse"/></td><td className="px-4 py-3 hidden md:table-cell"><div className="h-5 w-24 bg-gray-100 rounded animate-pulse"/></td><td className="px-4 py-3"><div className="h-5 w-16 bg-gray-100 rounded animate-pulse ml-auto"/></td><td className="px-4 py-3"><div className="h-5 w-16 bg-gray-100 rounded animate-pulse mx-auto"/></td><td className="px-4 py-3"><div className="h-5 w-5 bg-gray-100 rounded animate-pulse ml-auto"/></td></tr>
          )) : products.length > 0 ? products.map(p => (
            <tr key={p.id} className={cn("border-b border-black/[.06] last:border-0 hover:bg-[#f7f5f2]/30", selectedIds.has(p.id) && "bg-[#d4a574]/5")}>
              <td className="px-4 py-3"><button onClick={() => toggleOne(p.id)} className="text-[#b0aba6] hover:text-[#1a1917]">{selectedIds.has(p.id)?<CheckSquare size={16} className="text-[#d4a574]"/>:<Square size={16}/>}</button></td>
              <td className="px-4 py-3"><div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-[#f7f5f2] flex-shrink-0">{p.images[0]?<Image src={p.images[0].url} alt={p.name} width={40} height={40} className="w-full h-full object-cover"/>:<Package size={16} className="text-[#d1ccc6] m-auto mt-2"/>}</div>
                <p className="font-medium text-[#1a1917] truncate max-w-[200px] md:max-w-[300px]">{p.name}</p></div></td>
              <td className="px-4 py-3 hidden md:table-cell text-[#6b6560] text-xs">{p.subcategory?.name||p.category?.name}</td>
              <td className="px-4 py-3 text-right font-medium text-[#1a1917]">{formatPrice(p.salePrice||p.regularPrice)}</td>
              <td className="px-4 py-3 text-center"><span className={cn("px-2.5 py-1 rounded-full text-[11px] font-semibold", SC[p.status]||"bg-gray-100 text-gray-600")}>{p.status.charAt(0)+p.status.slice(1).toLowerCase()}</span></td>
              <td className="px-4 py-3"><div className="relative"><button onClick={() => setOpenMenuId(openMenuId===p.id?null:p.id)} className="p-1.5 hover:bg-[#f7f5f2] rounded-lg"><MoreVertical size={16} className="text-[#b0aba6]"/></button>
                {openMenuId===p.id && <ActionMenu product={p} onAction={handleAction} onClose={() => setOpenMenuId(null)}/>}</div></td>
            </tr>
          )) : (<tr><td colSpan={6} className="px-4 py-12 text-center"><Package size={32} className="text-[#d1ccc6] mx-auto mb-2"/><p className="text-sm text-[#b0aba6]">No products found</p></td></tr>)}
          </tbody></table></div></div>
      {total > 50 && (<div className="flex items-center justify-center gap-2">
        <button onClick={() => setPage(p=>p-1)} disabled={page<=1} className="px-4 py-2 text-sm font-medium border border-black/[.06] rounded-xl hover:bg-[#f7f5f2] disabled:opacity-40">Previous</button>
        <span className="text-sm text-[#6b6560]">Page {page} of {Math.ceil(total/50)}</span>
        <button onClick={() => setPage(p=>p+1)} disabled={page>=Math.ceil(total/50)} className="px-4 py-2 text-sm font-medium border border-black/[.06] rounded-xl hover:bg-[#f7f5f2] disabled:opacity-40">Next</button>
      </div>)}
    </div>
  );
}
