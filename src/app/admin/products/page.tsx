"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Plus, Search, Eye, Edit, Trash2, Package, CheckSquare, Square,
  MoreVertical, Copy, Archive, AlertTriangle, ChevronDown, X, Filter,
  ArrowUpDown, ArrowUp, ArrowDown,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { invalidateCache } from "@/lib/clientCache";
import { mergeProductPage } from "@/lib/mergeProductPage";
import { cn } from "@/lib/utils";
import PriceDisplay from "@/components/ui/PriceDisplay";
import toast from "react-hot-toast";

interface Product {
  id: string; name: string; slug: string; sku?: string;
  regularPrice: number; salePrice: number | null;
  status: string; isActive: boolean;
  stockQuantity: number; trackInventory: boolean; lowStockThreshold?: number;
  category: { name: string; slug: string } | null;
  subcategory?: { name: string; slug: string } | null;
  images: { url: string; isPrimary: boolean }[];
  createdAt: string; updatedAt: string;
  _count: { orderItems: number };
}

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "DRAFT", label: "Draft" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "ARCHIVED", label: "Archived" },
];

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700",
  DRAFT: "bg-amber-50 text-amber-700",
  INACTIVE: "bg-gray-100 text-gray-600",
  ARCHIVED: "bg-rose-50 text-rose-700",
};

const SORT_OPTIONS = [
  { value: "newest", label: "Recently Added" },
  { value: "updated", label: "Recently Updated" },
  { value: "name_asc", label: "Name A–Z" },
  { value: "name_desc", label: "Name Z–A" },
  { value: "price_asc", label: "Price Low → High" },
  { value: "price_desc", label: "Price High → Low" },
];

function StockBadge({ product }: { product: Product }) {
  if (product.stockQuantity === 0) return <span className="px-1.5 py-0.5 bg-red-50 text-red-600 text-[10px] font-medium rounded-full">Out of stock</span>;
  if (product.stockQuantity <= (product.lowStockThreshold || 5)) return <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 text-[10px] font-medium rounded-full">Low: {product.stockQuantity}</span>;
  return <span className="px-1.5 py-0.5 bg-green-50 text-green-600 text-[10px] font-medium rounded-full">{product.stockQuantity} in stock</span>;
}

function ActionMenu({ product, onAction, onClose }: { product: Product; onAction: (a: string, p: Product) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, [onClose]);
  const items = [
    { label: "Edit", icon: Edit, action: "edit" },
    { label: "View", icon: Eye, action: "view" },
    { label: "Duplicate", icon: Copy, action: "duplicate" },
    ...(product.status !== "ARCHIVED" ? [{ label: "Archive", icon: Archive, action: "archive" }] : []),
    ...(product._count.orderItems === 0 ? [{ label: "Delete", icon: Trash2, action: "delete", danger: true }] : []),
  ];
  return (
    <div ref={ref} className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl border border-black/[.06] shadow-xl z-50 py-1">
      {items.map((item) => (
        <button key={item.action} onClick={() => { onAction(item.action, product); onClose(); }}
          className={cn("w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-left transition-colors",
            item.danger ? "text-red-600 hover:bg-red-50" : "text-primary hover:bg-surface-muted")}>
          <item.icon size={13} className={item.danger ? "text-red-400" : "text-text-muted"} />{item.label}
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
          <div><h3 className="font-semibold text-primary">{title}</h3><p className="text-sm text-secondary mt-1">{message}</p></div>
        </div>
        <div className="flex items-center justify-end gap-2 mt-6">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-secondary hover:bg-surface-muted rounded-lg transition-colors">Cancel</button>
          <button onClick={onConfirm} className={cn("px-4 py-2 text-sm font-medium rounded-lg text-white transition-colors", danger ? "bg-red-600 hover:bg-red-700" : "bg-primary hover:bg-primary-hover")}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

interface DiagInfo {
  total: number; visibleOnStorefront: number; hiddenFromStorefront: number;
  breakdown: Record<string, { isActive_true: number; isActive_false: number }>;
  needsFix: { draftProducts: number; inactiveProducts: number; activeButInactive: number; totalFixable: number };
}

// The products list keeps its search/filter/sort selection here so that opening a
// product and coming back returns the user to the same list they were browsing.
const ADMIN_VIEW_KEY = "westhome-admin-products-view";
const ADMIN_SCROLL_KEY = "westhome-admin-products-scroll";

function readSavedView(): { search: string; status: string; category: string; sort: string } | null {
  try {
    const raw = sessionStorage.getItem(ADMIN_VIEW_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    return {
      search: typeof v?.search === "string" ? v.search : "",
      status: typeof v?.status === "string" ? v.status : "",
      category: typeof v?.category === "string" ? v.category : "",
      sort: typeof v?.sort === "string" && v.sort ? v.sort : "newest",
    };
  } catch {
    return null;
  }
}

export default function AdminProductsPage() {
  const router = useRouter();
  const adminProductsCacheKey = "wh-cache-/api/admin/products";
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const raw = sessionStorage.getItem(adminProductsCacheKey);
      if (raw) { const e = JSON.parse(raw); if (e.expires > Date.now()) return e.data.products || []; }
    } catch {}
    return [];
  });
  const hasProductsCache = (() => { try { const r = sessionStorage.getItem(adminProductsCacheKey); return r ? JSON.parse(r).expires > Date.now() : false; } catch { return false; } })();
  const [loading, setLoading] = useState(!hasProductsCache);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Seed the filters from the last visit so the first fetch already uses them
  const [search, setSearch] = useState(() => readSavedView()?.search ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(() => readSavedView()?.search ?? "");
  const [statusFilter, setStatusFilter] = useState(() => readSavedView()?.status ?? "");
  const [categoryFilter, setCategoryFilter] = useState(() => readSavedView()?.category ?? "");
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [sort, setSort] = useState(() => readSavedView()?.sort ?? "newest");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(() => {
    try {
      const raw = sessionStorage.getItem(adminProductsCacheKey);
      if (raw) { const e = JSON.parse(raw); if (e.expires > Date.now()) return e.data.total || 0; }
    } catch {}
    return 0;
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [confirmDlg, setConfirmDlg] = useState<{ title: string; message: string; confirmLabel: string; danger?: boolean; onConfirm: () => void } | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [diag, setDiag] = useState<DiagInfo | null>(null);
  const [diagLoading, setDiagLoading] = useState(false);
  const [fixing, setFixing] = useState(false);
  const scrollRestoreRef = useRef<number | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    fetch("/api/categories", { cache: "no-store" })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => setCategories((data?.categories || []).map((category: any) => ({ id: category.id, name: category.name }))))
      .catch(() => setCategories([]));
  }, []);
  // Keep the latest selection in a ref so the unmount cleanup can persist it
  const viewRef = useRef({ search, status: statusFilter, category: categoryFilter, sort });
  useEffect(() => {
    viewRef.current = { search, status: statusFilter, category: categoryFilter, sort };
  }, [search, statusFilter, categoryFilter, sort]);

  // Save the selection + scroll position when navigating away (e.g. opening a product)
  useEffect(() => {
    return () => {
      try {
        sessionStorage.setItem(ADMIN_VIEW_KEY, JSON.stringify(viewRef.current));
        sessionStorage.setItem(ADMIN_SCROLL_KEY, String(window.scrollY));
      } catch {}
    };
  }, []);

  // Restore the scroll position only once the list has rendered — scrolling before
  // the products are on screen would clamp to the top of an empty page.
  useEffect(() => {
    if (loading) return;
    let saved: string | null = null;
    try { saved = sessionStorage.getItem(ADMIN_SCROLL_KEY); } catch {}
    if (!saved) return;
    const target = Number.parseInt(saved, 10);
    if (Number.isNaN(target)) {
      try { sessionStorage.removeItem(ADMIN_SCROLL_KEY); } catch {}
      return;
    }
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => {
        window.scrollTo(0, target);
        try { sessionStorage.removeItem(ADMIN_SCROLL_KEY); } catch {}
      });
    });
    return () => {
      cancelAnimationFrame(outer);
      if (inner) cancelAnimationFrame(inner);
    };
  }, [loading, products.length]);

    const observerRef = useRef<IntersectionObserver | null>(null);
  // The observer can fire again before React has re-rendered with
  // `isFetchingMore = true`, and the callback closes over the previous
  // products/total. Without this ref guard a fast scroll advanced the page
  // twice, skipping a page of results and appending a duplicate batch.
  const pagingRef = useRef(false);
  const lastElementRef = useCallback((node: HTMLDivElement | null) => {
    if (loading || isFetchingMore) return;
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting) return;
      if (pagingRef.current) return;
      if (products.length >= total) return;
      pagingRef.current = true;
      setPage(p => p + 1);
    });
    if (node) observerRef.current.observe(node);
  }, [loading, isFetchingMore, products.length, total]);

  const fetchProducts = useCallback(async () => {
    const isLoadMore = page > 1;
    if (isLoadMore) {
      setIsFetchingMore(true);
    } else {
      setLoading(true);
    }
    setLoadError(null);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("q", debouncedSearch);
      if (statusFilter) params.set("status", statusFilter);
      if (categoryFilter) params.set("categoryId", categoryFilter);
      params.set("sort", sort);
      params.set("page", String(page));
      params.set("limit", "25");
      const res = await fetch("/api/admin/products?" + params.toString(), { cache: "no-store" });
      if (res.status === 401 || res.status === 403) {
        router.push("/login");
        return;
      }
      if (res.ok) { 
        const d = await res.json(); 
        // De-duplicate on append: a retried or overlapping page must never
        // render the same product twice.
        setProducts(prev => mergeProductPage(prev, d.products || [], !isLoadMore));
        setTotal(d.total); 
      }
      else { setLoadError("Failed to load products."); if (!isLoadMore) setProducts([]); }
    } catch { setLoadError("Failed to load products."); if (!isLoadMore) setProducts([]); } finally {
      setLoading(false); setIsFetchingMore(false); pagingRef.current = false;
      // Restore scroll position if one was saved before this fetch
      if (scrollRestoreRef.current !== null) {
        const y = scrollRestoreRef.current;
        scrollRestoreRef.current = null;
        requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo(0, y)));
      }
    }
  }, [debouncedSearch, statusFilter, categoryFilter, sort, page]);

  useEffect(() => { fetchProducts(); setSelectedIds(new Set()); }, [fetchProducts]);

  const toggleAll = () => { if (selectedIds.size === products.length) setSelectedIds(new Set()); else setSelectedIds(new Set(products.map(p => p.id))); };
  const toggleOne = (id: string) => { const s = new Set(selectedIds); s.has(id) ? s.delete(id) : s.add(id); setSelectedIds(s); };

  // Save scroll position before destructive actions so we can restore after fetch
  const saveScrollForRestore = () => { scrollRestoreRef.current = window.scrollY; };
  const invalidateAdminProductsCache = () => { try { sessionStorage.removeItem(adminProductsCacheKey); } catch {} };

  const handleAction = async (action: string, product: Product) => {
    if (action === "view") { window.open("/products/" + product.slug, "_blank"); return; }
    if (action === "edit") { router.push("/admin/products/" + product.id); return; }
    if (action === "duplicate") {
      saveScrollForRestore();
      toast.loading("Duplicating...");
      try { const res = await fetch("/api/admin/products/" + product.id + "/duplicate", { method: "POST" }); toast.dismiss();
        if (res.ok) { toast.success("Product duplicated"); fetchProducts(); } else { const d = await res.json(); toast.error(d.error || "Failed"); }
      } catch { toast.dismiss(); toast.error("Failed"); }
      return;
    }
    if (action === "archive") {
      setConfirmDlg({ title: "Archive product?", message: `"${product.name}" will be removed from the storefront.`, confirmLabel: "Archive",
        onConfirm: async () => { saveScrollForRestore(); const res = await fetch("/api/admin/products/" + product.id, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "ARCHIVED" }) });
          if (res.ok) { toast.success("Archived"); fetchProducts(); } else { const d = await res.json().catch(() => null); toast.error(d?.error || d?.message || "Failed to archive"); } setConfirmDlg(null); },
      }); return;
    }
    if (action === "delete") {
      if (product._count.orderItems > 0) {
        setConfirmDlg({ title: "Cannot delete", message: `This product has ${product._count.orderItems} order(s). Archive instead.`, confirmLabel: "Archive Instead",
          onConfirm: async () => { saveScrollForRestore(); await fetch("/api/admin/products/" + product.id, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "ARCHIVED" }) }); toast.success("Archived"); fetchProducts(); setConfirmDlg(null); },
        });
      } else {
        setConfirmDlg({ title: "Delete product?", message: `"${product.name}" will be permanently deleted.`, confirmLabel: "Delete", danger: true,
          onConfirm: async () => { saveScrollForRestore(); const res = await fetch("/api/admin/products/" + product.id, { method: "DELETE" }); if (res.ok) { toast.success("Deleted"); fetchProducts(); } else { const d = await res.json(); toast.error(d.message || "Failed"); } setConfirmDlg(null); },
        });
      }
    }
  };

  const handleBulk = async (action: string) => {
    const n = selectedIds.size; const isDel = action === "delete";
    setConfirmDlg({ title: isDel ? `Delete ${n} products?` : `${action} ${n} products?`, message: isDel ? "This cannot be undone." : "This will change status.", confirmLabel: isDel ? "Delete" : "Apply", danger: isDel,
      onConfirm: async () => { saveScrollForRestore(); try { const res = await fetch("/api/admin/products/bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ids: Array.from(selectedIds) }) }); const d = await res.json(); if (d.successCount > 0) toast.success(`${d.successCount} product(s) updated`); if (d.failCount > 0) toast.error(`${d.failCount} skipped`); if (d.error) toast.error(d.error); } catch { toast.error("Request failed — check your connection and try again"); } setSelectedIds(new Set()); setConfirmDlg(null); fetchProducts(); },
    });
  };

  
  const isCategoryActive = Boolean(categoryFilter);

  return (
    <div className="space-y-4">
      {confirmDlg && <ConfirmDialog {...confirmDlg} onCancel={() => setConfirmDlg(null)} />}

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-primary">Products</h1>
          <p className="text-xs text-text-muted mt-0.5">{total} product{total !== 1 ? "s" : ""}</p>
        </div>
        <Link href="/admin/products/new" className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary-hover transition-colors shrink-0">
          <Plus size={16} /> <span className="hidden sm:inline">Add Product</span>
        </Link>
      </div>


      {/* Diagnostic banner */}
      {!diag && !loading && (
        <button
          onClick={async () => {
            setDiagLoading(true);
            try {
              const res = await fetch("/api/admin/products/diagnose");
              if (res.ok) setDiag(await res.json());
            } catch {}
            setDiagLoading(false);
          }}
          disabled={diagLoading}
          className="flex items-center gap-2 w-full px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs font-medium text-amber-800 hover:bg-amber-100 transition-colors"
        >
          <AlertTriangle size={14} className="shrink-0" />
          {diagLoading ? "Checking product visibility…" : "Some products may be hidden from the storefront — tap to diagnose"}
        </button>
      )}
      {diag && diag.hiddenFromStorefront > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-amber-600" />
              <p className="text-xs font-semibold text-amber-800">
                {diag.hiddenFromStorefront} of {diag.total} products are hidden from the storefront
              </p>
            </div>
            <button onClick={() => setDiag(null)} className="text-amber-600 hover:text-amber-800"><X size={14} /></button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
            <div className="bg-white rounded-lg p-2 border border-amber-100">
              <p className="text-text-muted uppercase tracking-wider">ACTIVE + active=true</p>
              <p className="text-sm font-bold text-emerald-600 mt-0.5">{diag.breakdown.ACTIVE?.isActive_true ?? 0}</p>
              <p className="text-text-muted">Visible</p>
            </div>
            <div className="bg-white rounded-lg p-2 border border-amber-100">
              <p className="text-text-muted uppercase tracking-wider">ACTIVE + active=false</p>
              <p className="text-sm font-bold text-red-600 mt-0.5">{diag.breakdown.ACTIVE?.isActive_false ?? 0}</p>
              <p className="text-text-muted">Hidden</p>
            </div>
            <div className="bg-white rounded-lg p-2 border border-amber-100">
              <p className="text-text-muted uppercase tracking-wider">DRAFT</p>
              <p className="text-sm font-bold text-amber-600 mt-0.5">{diag.needsFix.draftProducts}</p>
              <p className="text-text-muted">Hidden</p>
            </div>
            <div className="bg-white rounded-lg p-2 border border-amber-100">
              <p className="text-text-muted uppercase tracking-wider">INACTIVE</p>
              <p className="text-sm font-bold text-amber-600 mt-0.5">{diag.needsFix.inactiveProducts}</p>
              <p className="text-text-muted">Hidden</p>
            </div>
          </div>
          <button
            onClick={async () => {
              if (!confirm(`Activate ${diag.needsFix.totalFixable} hidden product(s)? This will set them to ACTIVE status and make them visible on the storefront.`)) return;
              setFixing(true);
              try {
                const res = await fetch("/api/admin/products/diagnose", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ excludeArchived: true }) });
                const d = await res.json();
                if (d.success) {
                  toast.success(d.message);
                  setDiag(null);
                  fetchProducts();
                } else {
                  toast.error(d.error || "Failed");
                }
              } catch { toast.error("Failed to activate products"); }
              setFixing(false);
            }}
            disabled={fixing}
            className="w-full px-4 py-2 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50"
          >
            {fixing ? "Activating…" : `Activate all ${diag.needsFix.totalFixable} hidden products`}
          </button>
        </div>
      )}
      {diag && diag.hiddenFromStorefront === 0 && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-medium text-emerald-800">
          <CheckSquare size={14} className="shrink-0" />
          All {diag.total} products are visible on the storefront.
          <button onClick={() => setDiag(null)} className="ml-auto text-emerald-600 hover:text-emerald-800"><X size={14} /></button>
        </div>
      )}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search products..."
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-black/[.06] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
        {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2"><X size={14} className="text-text-muted" /></button>}
      </div>

      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
        {STATUS_OPTIONS.map(o => (
          <button key={o.value} onClick={() => { setStatusFilter(o.value); setPage(1); }}
            className={cn("px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-all shrink-0 border",
              statusFilter === o.value
                ? "bg-primary text-white border-primary shadow-sm"
                : "bg-white border-black/[.06] text-secondary hover:bg-surface-muted")}>
            {o.label}
          </button>
        ))}
        <select
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
          aria-label="Filter by category"
          className={cn(
            "appearance-none px-3 py-1.5 pr-8 rounded-full text-[11px] font-medium whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-accent/30 shrink-0 transition-all border bg-no-repeat",
            isCategoryActive
              ? "bg-primary text-white border-primary shadow-sm"
              : "bg-white border-black/[.06] text-secondary hover:bg-surface-muted"
          )}
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")", backgroundPosition: "calc(100% - 10px) 50%", backgroundSize: "12px 12px" }}
        >
          <option value="" className="text-black bg-white">All Categories</option>
          {categories.map((category) => <option key={category.id} value={category.id} className="text-black bg-white">{category.name}</option>)}
        </select>
        <button onClick={() => setShowFilters(!showFilters)} className={cn("px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors shrink-0 flex items-center gap-1 border",
          showFilters ? "bg-primary text-white border-primary" : "bg-white border-black/[.06] text-secondary hover:bg-surface-muted")}>
          <ArrowUpDown size={11} /> Sort
        </button>
      </div>

      {showFilters && (
        <div className="bg-white rounded-xl border border-black/[.06] p-3">
          <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2 font-medium">Sort by</p>
          <div className="flex flex-wrap gap-1.5">
            {SORT_OPTIONS.map(o => (
              <button key={o.value} onClick={() => { setSort(o.value); setShowFilters(false); }}
                className={cn("px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors",
                  sort === o.value ? "bg-primary text-white" : "bg-surface-muted text-secondary hover:bg-border")}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedIds.size > 0 && (
        <div className="sticky top-14 z-20 flex items-center gap-2 bg-accent/5 border border-accent/20 rounded-xl px-4 py-2.5">
          <span className="text-xs font-semibold text-accent">{selectedIds.size} selected</span>
          <div className="flex items-center gap-1.5 flex-wrap flex-1">
            <button onClick={() => handleBulk("ACTIVE")} className="px-2.5 py-1 text-[10px] font-medium bg-green-50 text-green-700 rounded-lg">Activate</button>
            <button onClick={() => handleBulk("INACTIVE")} className="px-2.5 py-1 text-[10px] font-medium bg-gray-100 text-gray-600 rounded-lg">Deactivate</button>
            <button onClick={() => handleBulk("ARCHIVED")} className="px-2.5 py-1 text-[10px] font-medium bg-amber-50 text-amber-700 rounded-lg">Archive</button>
            <button onClick={() => handleBulk("delete")} className="px-2.5 py-1 text-[10px] font-medium bg-red-50 text-red-600 rounded-lg">Delete</button>
          </div>
          <button onClick={() => setSelectedIds(new Set())} className="text-[10px] text-text-muted hover:text-primary">Clear</button>
        </div>
      )}

      <div className="md:hidden space-y-2">
        {loading ? Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-black/[.06] p-3 flex gap-3 animate-pulse">
            <div className="w-14 h-14 rounded-lg bg-surface-muted shrink-0" />
            <div className="flex-1 space-y-2"><div className="h-4 w-32 bg-surface-muted rounded" /><div className="h-3 w-20 bg-surface-muted rounded" /><div className="h-3 w-16 bg-surface-muted rounded" /></div>
          </div>
        )) : products.length > 0 ? products.map(p => (
          <div key={p.id} className={cn("bg-white rounded-xl border border-black/[.06] p-3 flex gap-3 transition-colors", selectedIds.has(p.id) && "border-accent bg-accent/[.03]")}>
            <button onClick={() => toggleOne(p.id)} className="pt-0.5 shrink-0">{selectedIds.has(p.id) ? <CheckSquare size={18} className="text-accent" /> : <Square size={18} className="text-text-muted" />}</button>
            <Link href={`/admin/products/${p.id}`} className="w-14 h-14 rounded-lg overflow-hidden bg-surface-muted shrink-0 block">{p.images[0] ? <img src={p.images[0].url} alt={p.name} className="w-full h-full object-cover" /> : <Package size={18} className="text-text-muted m-auto mt-3" />}</Link>
            <div className="flex-1 min-w-0">
              <Link href={`/admin/products/${p.id}`}><p className="text-sm font-medium text-primary line-clamp-2 leading-snug">{p.name}</p></Link>
              <p className="text-[10px] text-text-muted mt-0.5">{p.subcategory?.name || p.category?.name || "Uncategorized"}</p>
              <div className="flex items-center gap-2 mt-1.5"><PriceDisplay regularPrice={p.regularPrice} salePrice={p.salePrice} size="sm" /><span className="text-[10px] text-text-muted">·</span><StockBadge product={p} /></div>
            </div>
            <div className="flex flex-col items-end justify-between shrink-0">
              <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-semibold", STATUS_COLORS[p.status] || "bg-gray-100 text-gray-600")}>{p.status.charAt(0) + p.status.slice(1).toLowerCase()}</span>
              <div className="relative"><button onClick={() => setOpenMenuId(openMenuId === p.id ? null : p.id)} className="p-1.5 hover:bg-surface-muted rounded-lg"><MoreVertical size={14} className="text-text-muted" /></button>{openMenuId === p.id && <ActionMenu product={p} onAction={handleAction} onClose={() => setOpenMenuId(null)} />}</div>
            </div>
          </div>
        )) : (
          <div className="bg-white rounded-xl border border-black/[.06] py-12 text-center"><Package size={32} className="text-text-muted mx-auto mb-2" /><p className="text-sm font-medium text-primary">No products found</p><p className="text-xs text-text-muted mt-1">Try changing your search or filters.</p></div>
        )}
      </div>

      <div className="hidden md:block bg-white rounded-2xl border border-black/[.06] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-black/[.06] bg-surface-muted/50">
              <th className="w-10 px-4 py-3"><button onClick={toggleAll} className="text-text-muted hover:text-primary">{selectedIds.size === products.length && products.length > 0 ? <CheckSquare size={16} className="text-accent" /> : <Square size={16} />}</button></th>
              <th className="text-left px-4 py-3 font-medium text-text-muted text-[11px] uppercase tracking-wider">Product</th><th className="text-left px-4 py-3 font-medium text-text-muted text-[11px] uppercase tracking-wider">SKU</th><th className="text-left px-4 py-3 font-medium text-text-muted text-[11px] uppercase tracking-wider">Category</th><th className="text-right px-4 py-3 font-medium text-text-muted text-[11px] uppercase tracking-wider">Price</th><th className="text-center px-4 py-3 font-medium text-text-muted text-[11px] uppercase tracking-wider">Stock</th><th className="text-center px-4 py-3 font-medium text-text-muted text-[11px] uppercase tracking-wider">Status</th><th className="w-12 px-4 py-3"></th>
            </tr></thead>
            <tbody>
              {loading ? Array.from({ length: 5 }).map((_, i) => <tr key={i} className="border-b border-black/[.06]"><td className="px-4 py-3"><div className="h-4 w-4 bg-surface-muted rounded animate-pulse" /></td><td className="px-4 py-3"><div className="flex items-center gap-3"><div className="h-10 w-10 bg-surface-muted rounded-lg animate-pulse" /><div className="h-4 w-40 bg-surface-muted rounded animate-pulse" /></div></td><td className="px-4 py-3"><div className="h-4 w-16 bg-surface-muted rounded animate-pulse" /></td><td className="px-4 py-3"><div className="h-4 w-20 bg-surface-muted rounded animate-pulse" /></td><td className="px-4 py-3"><div className="h-4 w-16 bg-surface-muted rounded animate-pulse ml-auto" /></td><td className="px-4 py-3"><div className="h-4 w-12 bg-surface-muted rounded animate-pulse mx-auto" /></td><td className="px-4 py-3"><div className="h-5 w-16 bg-surface-muted rounded-full animate-pulse mx-auto" /></td><td className="px-4 py-3"><div className="h-5 w-5 bg-surface-muted rounded animate-pulse ml-auto" /></td></tr>) : products.length > 0 ? products.map(p => <tr key={p.id} className={cn("border-b border-black/[.06] last:border-0 hover:bg-surface-muted/30 transition-colors", selectedIds.has(p.id) && "bg-accent/[.03]")}>
                <td className="px-4 py-3"><button onClick={() => toggleOne(p.id)} className="text-text-muted hover:text-primary">{selectedIds.has(p.id) ? <CheckSquare size={16} className="text-accent" /> : <Square size={16} />}</button></td>
                <td className="px-4 py-3"><Link href={`/admin/products/${p.id}`} className="flex items-center gap-3 group"><div className="w-10 h-10 rounded-lg overflow-hidden bg-surface-muted shrink-0">{p.images[0] ? <img src={p.images[0].url} alt={p.name} className="w-full h-full object-cover" /> : <Package size={14} className="text-text-muted m-auto mt-2" />}</div><p className="font-medium text-primary truncate max-w-[250px] group-hover:text-accent transition-colors">{p.name}</p></Link></td>
                <td className="px-4 py-3 text-xs text-text-muted">{p.sku || "—"}</td><td className="px-4 py-3 text-xs text-secondary">{p.subcategory?.name || p.category?.name || "—"}</td><td className="px-4 py-3 text-right"><PriceDisplay regularPrice={p.regularPrice} salePrice={p.salePrice} size="sm" /></td><td className="px-4 py-3 text-center"><StockBadge product={p} /></td><td className="px-4 py-3 text-center"><span className={cn("px-2.5 py-1 rounded-full text-[10px] font-semibold", STATUS_COLORS[p.status] || "bg-gray-100 text-gray-600")}>{p.status.charAt(0) + p.status.slice(1).toLowerCase()}</span></td>
                <td className="px-4 py-3"><div className="relative flex items-center gap-1"><Link href={`/admin/products/${p.id}`} className="p-1.5 hover:bg-surface-muted rounded-lg"><Edit size={14} className="text-text-muted" /></Link><button onClick={() => setOpenMenuId(openMenuId === p.id ? null : p.id)} className="p-1.5 hover:bg-surface-muted rounded-lg"><MoreVertical size={14} className="text-text-muted" /></button>{openMenuId === p.id && <ActionMenu product={p} onAction={handleAction} onClose={() => setOpenMenuId(null)} />}</div></td>
              </tr>) : (loadError ? <tr><td colSpan={8} className="px-4 py-12 text-center"><Package size={32} className="text-text-muted mx-auto mb-2" /><p className="text-sm font-medium text-red-500">{loadError}</p><button onClick={() => fetchProducts()} className="mt-2 text-xs font-medium text-accent underline">Retry</button></td></tr> : <tr><td colSpan={8} className="px-4 py-12 text-center"><Package size={32} className="text-text-muted mx-auto mb-2" /><p className="text-sm font-medium text-primary">No products found</p><p className="text-xs text-text-muted mt-1">Try changing your search or filters.</p></td></tr>)}
            </tbody>
          </table>
        </div>
      </div>

            {(products.length < total || isFetchingMore) && total > 0 && (
        <div ref={lastElementRef} className="py-6 flex items-center justify-center">
          {isFetchingMore ? (
            <div className="flex items-center gap-2 text-sm text-text-muted">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              Loading more products...
            </div>
          ) : (
            <div className="h-4" /> 
          )}
        </div>
      )}
      {!loading && products.length === total && total > 0 && (
        <div className="py-6 text-center text-xs text-text-muted">
          End of list. Showing all {total} products.
        </div>
      )}
    </div>
  );
}
