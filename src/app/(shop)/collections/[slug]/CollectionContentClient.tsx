"use client";
import { trackEvent } from "@/hooks/useAnalytics";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import ProductCard from "@/components/ui/ProductCard";
import { ProductGridSkeleton } from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import FilterPanel, { SortDropdown, type FilterState, EMPTY_FILTERS } from "@/components/shop/FilterPanel";
import { cn } from "@/lib/utils";
import type { Category } from "@/types";

const PAGE_SIZE = 24;

interface CollectionContentProps {
  category: any;
  initialProducts: any[];
  initialTotal: number;
}

function CategoryContent({ category: initialCategory, initialProducts, initialTotal: initialTotalCount }: CollectionContentProps) {
  const slug = initialCategory?.slug || "";
  const [trackedRef] = useState(false);

  useEffect(() => {
    if (!trackedRef && initialCategory?.id) {
      trackEvent("COLLECTION_VIEW", { categoryId: initialCategory.id });
    }
  }, [initialCategory?.id, trackedRef]);

  const [products, setProducts] = useState<any[]>(initialProducts || []);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [total, setTotal] = useState(initialTotalCount || 0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialProducts.length < initialTotalCount);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({ ...EMPTY_FILTERS, sort: "recommended" });
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState(false);

  const observerRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    fetch("/api/categories").then(r => r.json()).then(d => setCategories(d.categories || [])).catch(() => {});
  }, []);

  const fetchProducts = useCallback(async (pageNum: number, append: boolean = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    if (append) setLoadingMore(true); else setLoading(true);
    setError(false);
    try {
      const fp = new URLSearchParams();
      fp.set("category", slug);
      fp.set("sort", filters.sort);
      fp.set("page", String(pageNum));
      fp.set("limit", String(PAGE_SIZE));
      if (filters.subcategory) fp.set("subcategory", filters.subcategory);
      if (filters.style) fp.set("style", filters.style);
      if (filters.material) fp.set("material", filters.material);
      if (filters.color) fp.set("color", filters.color);
      if (filters.size) fp.set("length", filters.size);
      if (filters.minPrice) fp.set("minPrice", filters.minPrice);
      if (filters.maxPrice) fp.set("maxPrice", filters.maxPrice);
      if (filters.inStock) fp.set("inStock", filters.inStock);
      const res = await fetch("/api/products?lite=true&" + fp.toString());
      if (res.ok) {
        const d = await res.json();
        if (append) { setProducts(prev => { const ids = new Set(prev.map((p: any) => p.id)); return [...prev, ...(d.products || []).filter((p: any) => !ids.has(p.id))]; }); }
        else setProducts(d.products || []);
        setTotal(d.total || 0);
        setHasMore(pageNum * PAGE_SIZE < (d.total || 0));
      }
    } catch { setError(true); }
    finally { setLoading(false); setLoadingMore(false); loadingRef.current = false; }
  }, [slug, filters]);

  useEffect(() => { setPage(1); setHasMore(true); fetchProducts(1, false); }, [fetchProducts]);

  useEffect(() => {
    const el = observerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loadingRef.current && !loading) {
        const next = page + 1; setPage(next); fetchProducts(next, true);
      }
    }, { rootMargin: "200px" });
    obs.observe(el);
    return () => obs.unobserve(el);
  }, [hasMore, loading, page, fetchProducts]);

  const hasSubcategories = initialCategory?.subcategories && initialCategory.subcategories.length > 0;
  const showCatalogControls = loading || products.length > 0 || total > 0;

  const activeChips: { key: string; label: string }[] = [];
  if (filters.subcategory) activeChips.push({ key: "subcategory", label: filters.subcategory.replace(/-/g, " ") });
  if (filters.style) activeChips.push({ key: "style", label: filters.style });
  if (filters.material) activeChips.push({ key: "material", label: filters.material });
  if (filters.color) activeChips.push({ key: "color", label: filters.color });
  if (filters.minPrice || filters.maxPrice) activeChips.push({ key: "minPrice", label: "₹" + (filters.minPrice || "0") + " – ₹" + (filters.maxPrice || "∞") });
  if (filters.inStock) activeChips.push({ key: "inStock", label: "In Stock" });

  const removeChip = (key: string) => setFilters(prev => ({ ...prev, [key]: "" }));

  return (
    <div className="animate-fade-in">
      <div className="container-shop pt-10 pb-6 md:pt-16 md:pb-10">
        <Link href="/shop" aria-label="Back to shop" className="p-1 hover:bg-surface-muted rounded-lg transition-colors inline-flex"><ArrowLeft size={20} /></Link>
      </div>
      <div className="container-shop pb-3">
        <h1 className="text-2xl font-semibold text-primary">{initialCategory?.name || slug.replace(/-/g, " ")}</h1>
        {total > 0 && <p className="text-sm text-text-secondary mt-1">{total} product{total !== 1 ? "s" : ""}</p>}
      </div>
      {showCatalogControls && (
        <div className="container-shop pb-3">
          <div className="flex items-center justify-between">
            <button type="button" aria-expanded={showFilters} aria-haspopup="dialog" onClick={() => setShowFilters(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-[1.35rem] border border-black/[.08] bg-white text-sm font-medium text-[#1a1917] hover:bg-[#f7f5f2] transition-colors">
              Filter
              {activeChips.length > 0 && <span className="w-5 h-5 rounded-full bg-[#d4a574] text-white text-[10px] font-bold flex items-center justify-center">{activeChips.length}</span>}
            </button>
            <SortDropdown value={filters.sort} onChange={(v) => setFilters(prev => ({ ...prev, sort: v }))} />
          </div>
        </div>
      )}
      {activeChips.length > 0 && (
        <div className="container-shop pb-2">
          <div className="flex flex-wrap gap-2 items-center">
            {activeChips.map(chip => (
              <span key={chip.key} className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#1a1917] text-white rounded-full text-xs font-medium">
                {chip.label}
                <button type="button" onClick={() => removeChip(chip.key)} className="ml-0.5 hover:opacity-60">x</button>
              </span>
            ))}
            <button type="button" onClick={() => setFilters(prev => ({ ...EMPTY_FILTERS, sort: prev.sort }))} className="text-xs text-[#d4a574] font-medium hover:underline ml-1">Clear all</button>
          </div>
        </div>
      )}
      <FilterPanel open={showFilters} onClose={() => setShowFilters(false)} onApply={(f) => setFilters(f)} initialFilters={filters} categories={categories} resultCount={total} fixedCollection={slug} initialCollection={slug} />
      {hasSubcategories && (
        <div className="container-shop pb-4">
          <div className="grid grid-cols-2 gap-3">
            {initialCategory.subcategories.map((sub: any) => (
              <Link key={sub.id} href={"/collections/" + slug + "/" + sub.slug} className="group block bg-surface rounded-[1.35rem] border border-foreground/[.08] overflow-hidden shadow-sm hover:shadow-card transition-all">
                <div className="relative aspect-[4/3] bg-surface-muted overflow-hidden flex items-center justify-center"><span className="text-sm font-medium text-text-muted">{sub.name}</span></div>
                <div className="p-3 flex items-center justify-between"><h3 className="text-sm font-semibold text-primary">{sub.name}</h3><ArrowRight size={16} className="text-text-muted group-hover:text-primary transition-colors" /></div>
              </Link>
            ))}
          </div>
        </div>
      )}
      <div className="container-shop pb-8">
        {loading && products.length === 0 ? <ProductGridSkeleton count={8} /> : products.length > 0 ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {products.map((product: any, i: number) => <ProductCard key={product.id} product={product} priority={i < 4} />)}
            </div>
            <div ref={observerRef} className="py-4" />
            {loadingMore && <div className="flex items-center justify-center gap-2 py-4"><Loader2 size={16} className="animate-spin text-text-muted" /><span className="text-sm text-text-muted">Loading more...</span></div>}
            {error && !loading && <div className="text-center py-4"><button type="button" onClick={() => fetchProducts(page, true)} className="text-sm text-accent hover:underline">Couldn&apos;t load more. Tap to retry.</button></div>}
            {!hasMore && !loading && !loadingMore && <p className="text-center text-xs text-text-muted py-4">End of collection.</p>}
          </>
        ) : <EmptyState icon="product" title="No products yet" description="This collection doesn&apos;t have any products yet. Check back soon!" action={{ label: "Browse All Products", href: "/shop" }} />}
      </div>
    </div>
  );
}

export { CategoryContent as CollectionContentClient };
