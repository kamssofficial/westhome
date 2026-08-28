"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import ProductCard from "@/components/ui/ProductCard";
import { ProductGridSkeleton } from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import FilterPanel, { SortDropdown, type FilterState, EMPTY_FILTERS } from "@/components/shop/FilterPanel";
import { cn } from "@/lib/utils";
import type { Product, Category, Subcategory } from "@/types";

const PAGE_SIZE = 24;

function SubcategoryContent() {
  const params = useParams();
  const slug = params.slug as string;
  const subcategorySlug = params.subcategory as string;

  const [products, setProducts] = useState<Product[]>([]);
  const [category, setCategory] = useState<Category | null>(null);
  const [subcategory, setSubcategory] = useState<Subcategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({ ...EMPTY_FILTERS, sort: "recommended" });
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState(false);

  const observerRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const pageRef = useRef(1);

  // Fetch category/subcategory info and categories
  useEffect(() => {
    fetch("/api/categories").then(r => r.json()).then(d => {
      const cats = d.categories || [];
      setCategories(cats);
      const found = cats.find((c: Category) => c.slug === slug);
      setCategory(found || null);
      if (found?.subcategories) {
        const sub = found.subcategories.find((s: Subcategory) => s.slug === subcategorySlug);
        setSubcategory(sub || null);
      }
    }).catch(() => {});
  }, [slug, subcategorySlug]);

  const fetchRef = useRef<(pageNum: number, append?: boolean) => Promise<void>>(null);

  const fetchProducts = useCallback(async (pageNum: number, append = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    if (append) setLoadingMore(true); else setLoading(true);
    setError(false);
    try {
      const fp = new URLSearchParams();
      fp.set("category", slug);
      fp.set("subcategory", subcategorySlug);
      fp.set("sort", filters.sort);
      fp.set("page", String(pageNum));
      fp.set("limit", String(PAGE_SIZE));
      if (filters.style) fp.set("style", filters.style);
      if (filters.material) fp.set("material", filters.material);
      if (filters.color) fp.set("color", filters.color);
      if (filters.size) fp.set("length", filters.size);
      if (filters.pattern) fp.set("pattern", filters.pattern);
      if (filters.shape) fp.set("shape", filters.shape);
      if (filters.frameSize) fp.set("frameSize", filters.frameSize);
      if (filters.minPrice) fp.set("minPrice", filters.minPrice);
      if (filters.maxPrice) fp.set("maxPrice", filters.maxPrice);
      if (filters.inStock) fp.set("inStock", filters.inStock);
      const res = await fetch("/api/products?lite=true&" + fp.toString());
      if (res.ok) {
        const d = await res.json();
        if (append) { setProducts(prev => { const ids = new Set(prev.map((p) => p.id)); return [...prev, ...(d.products || []).filter((p: Product) => !ids.has(p.id))]; }); }
        else setProducts(d.products || []);
        setTotal(d.total || 0);
        setHasMore(pageNum * PAGE_SIZE < (d.total || 0));
      }
    } catch { setError(true); }
    finally { setLoading(false); setLoadingMore(false); loadingRef.current = false; }
  }, [slug, subcategorySlug, filters]);

  fetchRef.current = fetchProducts;

  useEffect(() => { pageRef.current = 1; setPage(1); setHasMore(true); fetchProducts(1, false); }, [fetchProducts]);

  useEffect(() => {
    const el = observerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !loadingRef.current) {
        const next = pageRef.current + 1;
        pageRef.current = next;
        setPage(next);
        fetchRef.current?.(next, true);
      }
    }, { rootMargin: "400px" });
    obs.observe(el);
    return () => obs.unobserve(el);
  }, []);

  const activeChips: { key: string; label: string }[] = [];
  if (filters.style) activeChips.push({ key: "style", label: filters.style });
  if (filters.material) activeChips.push({ key: "material", label: filters.material });
  if (filters.color) activeChips.push({ key: "color", label: filters.color });
  if (filters.pattern) activeChips.push({ key: "pattern", label: "Pattern: " + filters.pattern });
  if (filters.shape) activeChips.push({ key: "shape", label: "Shape: " + filters.shape });
  if (filters.minPrice || filters.maxPrice) activeChips.push({ key: "minPrice", label: "₹" + (filters.minPrice || "0") + " – ₹" + (filters.maxPrice || "∞") });
  if (filters.inStock) activeChips.push({ key: "inStock", label: "In Stock" });

  return (
    <div className="animate-fade-in">
      <div className="px-4 pt-3 pb-2">
        <Link href={"/collections/" + slug} className="p-1 hover:bg-surface-muted rounded-lg transition-colors inline-flex"><ArrowLeft size={20} /></Link>
      </div>
      <div className="px-4 pb-3">
        <div className="flex items-center gap-2 text-xs text-text-muted mb-1">
          <Link href={"/collections/" + slug} className="hover:text-primary transition-colors">{category?.name || slug.replace(/-/g, " ")}</Link>
          <span>/</span>
          <span className="text-primary font-medium">{subcategory?.name || subcategorySlug.replace(/-/g, " ")}</span>
        </div>
        <h1 className="text-2xl font-semibold text-primary">{subcategory?.name || subcategorySlug.replace(/-/g, " ")}</h1>
        {total > 0 && <p className="text-sm text-text-secondary mt-1">{total} product{total !== 1 ? "s" : ""}</p>}
      </div>
      <div className="px-4 pb-3">
        <div className="flex items-center justify-between">
          <button onClick={() => setShowFilters(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-[1.35rem] border border-black/[.08] bg-white text-sm font-medium text-[#1a1917] hover:bg-[#f7f5f2] transition-colors">
            Filter
            {activeChips.length > 0 && <span className="w-5 h-5 rounded-full bg-[#d4a574] text-white text-[10px] font-bold flex items-center justify-center">{activeChips.length}</span>}
          </button>
          <SortDropdown value={filters.sort} onChange={(v) => setFilters(prev => ({ ...prev, sort: v }))} />
        </div>
      </div>
      {activeChips.length > 0 && (
        <div className="px-4 pb-2">
          <div className="flex flex-wrap gap-2 items-center">
            {activeChips.map(chip => (
              <span key={chip.key} className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#1a1917] text-white rounded-full text-xs font-medium">
                {chip.label}
                <button type="button" onClick={() => setFilters(prev => ({ ...prev, [chip.key]: "" }))} className="ml-0.5 hover:opacity-60">x</button>
              </span>
            ))}
            <button type="button" onClick={() => setFilters(prev => ({ ...EMPTY_FILTERS, sort: prev.sort }))} className="text-xs text-[#d4a574] font-medium hover:underline ml-1">Clear all</button>
          </div>
        </div>
      )}
      <FilterPanel open={showFilters} onClose={() => setShowFilters(false)} onApply={(f) => setFilters(f)} initialFilters={filters} categories={categories} resultCount={total} fixedCollection={slug} initialCollection={slug} />
      <div className="px-4 pb-8">
        {loading && products.length === 0 ? <ProductGridSkeleton count={8} /> : products.length > 0 ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {products.map((product, i) => <ProductCard key={product.id} product={product} priority={i < 4} />)}
            </div>
            <div ref={observerRef} className="py-4" />
            {loadingMore && <div className="flex items-center justify-center gap-2 py-4"><Loader2 size={16} className="animate-spin text-text-muted" /><span className="text-sm text-text-muted">Loading more...</span></div>}
            {error && !loading && <div className="text-center py-4"><button onClick={() => fetchProducts(page, true)} className="text-sm text-accent hover:underline">Couldn&apos;t load more. Tap to retry.</button></div>}
            {!hasMore && !loading && !loadingMore && <p className="text-center text-xs text-text-muted py-4">You&apos;re all caught up.</p>}
          </>
        ) : <EmptyState icon="product" title="No products yet" description="This subcategory doesn&apos;t have any products yet. Check back soon!" action={{ label: "Browse All Products", href: "/shop" }} />}
      </div>
    </div>
  );
}

export default function SubcategoryPage() {
  return (
    <Suspense fallback={<div className="container-shop py-8"><ProductGridSkeleton count={8} /></div>}>
      <SubcategoryContent />
    </Suspense>
  );
}
