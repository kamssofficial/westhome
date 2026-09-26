"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { SlidersHorizontal, ChevronDown, ArrowLeft, Grid3X3, List, Loader2 } from "lucide-react";
import ProductCard from "@/components/ui/ProductCard";
import { ProductGridSkeleton } from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";
import type { Product, Category, Subcategory } from "@/types";
import { cachedFetch } from "@/lib/clientCache";

const SORT_OPTIONS = [
  { value: "recommended", label: "Recommended" },
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
];

const PAGE_SIZE = 24;

interface SubcategoryContentProps {
  slug: string;
  subcategorySlug: string;
  initialCategory: any;
  initialSubcategory: any;
  initialProducts: Product[];
  initialTotal: number;
}

function SubcategoryContent({
  slug,
  subcategorySlug,
  initialCategory,
  initialSubcategory,
  initialProducts,
  initialTotal,
}: SubcategoryContentProps) {

  const [products, setProducts] = useState<Product[]>(initialProducts || []);
  const [category] = useState<Category | null>(initialCategory || null);
  const [subcategory] = useState<Subcategory | null>(initialSubcategory || null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [total, setTotal] = useState(initialTotal || 0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [sort, setSort] = useState("recommended");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [material, setMaterial] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [onSaleOnly, setOnSaleOnly] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // The first page is already server-rendered. Keep it visible through hydration
  // and only fetch again when the shopper changes sort/filters or requests more.
  const hydratedInitialView = useRef(false);

  const fetchProducts = useCallback(async (pageNum: number, append: boolean) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);
    try {
      const fetchParams = new URLSearchParams();
      fetchParams.set("category", slug);
      fetchParams.set("subcategory", subcategorySlug);
      fetchParams.set("sort", sort);
      fetchParams.set("page", String(pageNum));
      fetchParams.set("limit", String(PAGE_SIZE));
      if (minPrice) fetchParams.set("minPrice", minPrice);
      if (maxPrice) fetchParams.set("maxPrice", maxPrice);
      if (material) fetchParams.set("material", material);
      if (inStockOnly) fetchParams.set("inStock", "true");
      if (onSaleOnly) fetchParams.set("onSale", "true");

      const url = `/api/products?lite=true&${fetchParams.toString()}`;
      const prodData = await cachedFetch<any>(url, { ttl: 60_000 });
      const newProducts = prodData.products || [];
      const prodTotal = prodData.total || 0;
      if (append) setProducts((prev) => [...prev, ...newProducts]);
      else setProducts(newProducts);
      setTotal(prodTotal);
      setHasMore(pageNum * PAGE_SIZE < prodTotal);
    } catch (err) {
      console.error("Subcategory fetch error:", err);
      if (!append) setProducts([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [slug, subcategorySlug, sort, minPrice, maxPrice, material, inStockOnly, onSaleOnly]);

  // Do not repeat the server render on hydration.
  useEffect(() => {
    if (!hydratedInitialView.current) {
      hydratedInitialView.current = true;
      return;
    }
    setPage(1);
    setHasMore(true);
    fetchProducts(1, false);
  }, [fetchProducts]);

  // Infinite scroll observer
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          const next = page + 1;
          setPage(next);
          fetchProducts(next, true);
        }
      },
      { rootMargin: "300px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, page, fetchProducts]);

  return (
    <div className="animate-fade-in">
      {/* Back button */}
      <div className="px-4 pt-3 pb-2">
        <Link href={`/collections/${slug}`} className="p-1 hover:bg-surface-muted rounded-lg transition-colors inline-flex">
          <ArrowLeft size={20} />
        </Link>
      </div>

      {/* Title + count */}
      <div className="px-4 pb-3">
        <div className="flex items-center gap-2 text-xs text-text-muted mb-1">
          <Link href={`/collections/${slug}`} className="hover:text-primary transition-colors">{category?.name || slug.replace(/-/g, " ")}</Link>
          <span>/</span>
          <span className="text-primary font-medium">{subcategory?.name || subcategorySlug.replace(/-/g, " ")}</span>
        </div>
        <h1 className="text-2xl font-semibold text-primary">{subcategory?.name || subcategorySlug.replace(/-/g, " ")}</h1>

      </div>

      {/* Filter / Sort bar */}
      <div className="px-4 pb-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-colors",
              showFilters ? "bg-primary text-white border-primary" : "bg-white border-border"
            )}
          >
            <SlidersHorizontal size={14} /> Filter
          </button>
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={sort}
                onChange={(e) => { setSort(e.target.value); setPage(1); }}
                className="px-3 py-2 pr-8 rounded-xl border border-border bg-white text-sm focus:outline-none appearance-none"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            </div>
            <button
              onClick={() => setViewMode("grid")}
              className={cn("p-2 rounded-lg", viewMode === "grid" ? "bg-primary text-white" : "bg-white border border-border")}
            >
              <Grid3X3 size={16} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn("p-2 rounded-lg", viewMode === "list" ? "bg-primary text-white" : "bg-white border border-border")}
            >
              <List size={16} />
            </button>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="bg-white rounded-xl p-4 shadow-sm mt-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-medium text-text-secondary mb-1 block">Min Price (₹)</label>
                <input type="number" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" placeholder="0" />
              </div>
              <div>
                <label className="text-xs font-medium text-text-secondary mb-1 block">Max Price (₹)</label>
                <input type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" placeholder="Any" />
              </div>
              <div>
                <label className="text-xs font-medium text-text-secondary mb-1 block">Material</label>
                <input type="text" value={material} onChange={(e) => setMaterial(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" placeholder="e.g. Ceramic" />
              </div>
              <div className="flex items-end gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={inStockOnly} onChange={(e) => setInStockOnly(e.target.checked)} className="accent-accent" />
                  In Stock
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={onSaleOnly} onChange={(e) => setOnSaleOnly(e.target.checked)} className="accent-accent" />
                  On Sale
                </label>
              </div>
            </div>
            {(minPrice || maxPrice || material || inStockOnly || onSaleOnly) && (
              <button
                onClick={() => { setMinPrice(""); setMaxPrice(""); setMaterial(""); setInStockOnly(false); setOnSaleOnly(false); }}
                className="mt-3 text-xs text-accent hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Product grid */}
      <div className="px-4 pb-8">
        {loading ? (
          <ProductGridSkeleton count={8} />
        ) : products.length > 0 ? (
          <>
            <div className={cn(
              "gap-3",
              viewMode === "grid" ? "grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 lg:grid-cols-4" : "flex flex-col"
            )}>
              {products.map((product, i) => (
                <ProductCard key={product.id} product={product} priority={i < 4} />
              ))}
            </div>
            {/* Infinite scroll sentinel */}
            {hasMore && <div ref={sentinelRef} className="h-10" />}
            {loadingMore && (
              <div className="flex items-center justify-center gap-2 py-6 text-text-muted">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-sm">Loading more...</span>
              </div>
            )}
            {!hasMore && products.length > 0 && (
              <p className="text-center text-xs text-text-muted py-6">End of collection.</p>
            )}
          </>
        ) : (
          <EmptyState
            icon="product"
            title="No products yet"
            description="This subcategory doesn't have any products yet. Check back soon!"
            action={{ label: "Browse All Products", href: "/shop" }}
          />
        )}
      </div>
    </div>
  );
}

export default function SubcategoryContentClient(props: SubcategoryContentProps) {
  return <SubcategoryContent {...props} />;
}
