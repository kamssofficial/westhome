"use client";
import { trackEvent } from "@/hooks/useAnalytics";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { SlidersHorizontal, ChevronDown, ArrowRight, ArrowLeft, Grid3X3, List, Loader2 } from "lucide-react";
import ProductCard from "@/components/ui/ProductCard";
import { ProductGridSkeleton } from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";

const SORT_OPTIONS = [
  { value: "recommended", label: "Recommended" },
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
];

const PAGE_SIZE = 24;

interface CollectionContentProps {
  category: any;
  initialProducts: any[];
  initialTotal: number;
}

function CategoryContent({ category: initialCategory, initialProducts, initialTotal: initialTotalCount }: CollectionContentProps) {
  const slug = initialCategory?.slug || "";

  // Track collection view
  const trackedRef = useState(false);
  useEffect(() => {
    if (!trackedRef[0] && initialCategory?.id) {
      trackedRef[1](true);
      trackEvent("COLLECTION_VIEW", { categoryId: initialCategory.id });
    }
  }, [initialCategory?.id]);

  const [products, setProducts] = useState<any[]>(initialProducts || []);
  const [category, setCategory] = useState<any>(initialCategory || null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [total, setTotal] = useState(initialTotalCount || 0);
  const [sort, setSort] = useState("recommended");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialProducts.length < initialTotalCount);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showSubcategories, setShowSubcategories] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [material, setMaterial] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [onSaleOnly, setOnSaleOnly] = useState(false);
  const [carpetLength, setCarpetLength] = useState("");
  const [error, setError] = useState(false);

  const observerRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  const fetchProducts = useCallback(async (pageNum: number, append: boolean = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true;

    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError(false);

    try {
      const fetchParams = new URLSearchParams();
      fetchParams.set("category", slug);
      fetchParams.set("sort", sort);
      fetchParams.set("page", String(pageNum));
      fetchParams.set("limit", String(PAGE_SIZE));
      if (minPrice) fetchParams.set("minPrice", minPrice);
      if (maxPrice) fetchParams.set("maxPrice", maxPrice);
      if (material) fetchParams.set("material", material);
      if (inStockOnly) fetchParams.set("inStock", "true");
      if (onSaleOnly) fetchParams.set("onSale", "true");
      if (carpetLength) fetchParams.set("length", carpetLength);

      const prodRes = await fetch("/api/products?lite=true&" + fetchParams.toString());
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        const newProducts = prodData.products || [];
        const newTotal = prodData.total || 0;

        if (append) {
          setProducts(prev => {
            const existingIds = new Set(prev.map((p: any) => p.id));
            const unique = newProducts.filter((p: any) => !existingIds.has(p.id));
            return [...prev, ...unique];
          });
        } else {
          setProducts(newProducts);
        }
        setTotal(newTotal);
        setHasMore(pageNum * PAGE_SIZE < newTotal);
      }
    } catch (err) {
      console.error("Collection fetch error:", err);
      setError(true);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      loadingRef.current = false;
    }
  }, [slug, sort, minPrice, maxPrice, material, inStockOnly, onSaleOnly]);

  // Reset and fetch page 1 when filters change
  useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchProducts(1, false);
  }, [fetchProducts]);

  // Intersection observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingRef.current && !loading) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchProducts(nextPage, true);
        }
      },
      { rootMargin: "200px" }
    );

    const el = observerRef.current;
    if (el) observer.observe(el);
    return () => { if (el) observer.unobserve(el); };
  }, [hasMore, loading, page, fetchProducts]);

  const hasSubcategories = category?.subcategories && category.subcategories.length > 0;
  const showCatalogControls = loading || products.length > 0 || total > 0;

  return (
    <div className="animate-fade-in">
      {/* Back button */}
      <div className="container-shop pt-10 pb-6 md:pt-16 md:pb-10">
        <Link href="/shop" aria-label="Back to shop" className="p-1 hover:bg-surface-muted rounded-lg transition-colors inline-flex">
          <ArrowLeft size={20} />
        </Link>
      </div>

      {/* Title */}
      <div className="container-shop pb-3">
        <h1 className="text-2xl font-semibold text-primary">{category?.name || slug.replace(/-/g, " ")}</h1>
      </div>

      {/* Filter / Sort bar */}
      {showCatalogControls && <div className="container-shop pb-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            aria-expanded={showFilters}
            aria-controls="collection-filter-panel"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-[1.35rem] border text-sm font-medium transition-colors",
              showFilters ? "bg-primary text-white border-primary" : "bg-surface border-border"
            )}
          >
            <SlidersHorizontal size={14} /> Filter
          </button>
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                aria-label="Sort products"
                value={sort}
                onChange={(e) => { setSort(e.target.value); }}
                className="px-3 py-2 pr-8 rounded-[1.35rem] border border-border bg-white text-sm focus:outline-none appearance-none"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            </div>
            <button
              type="button"
              aria-label="Grid view"
              aria-pressed={viewMode === "grid"}
              onClick={() => setViewMode("grid")}
              className={cn("p-2 rounded-lg", viewMode === "grid" ? "bg-primary text-white" : "bg-surface border border-border")}
            >
              <Grid3X3 size={16} />
            </button>
            <button
              type="button"
              aria-label="List view"
              aria-pressed={viewMode === "list"}
              onClick={() => setViewMode("list")}
              className={cn("p-2 rounded-lg", viewMode === "list" ? "bg-primary text-white" : "bg-surface border border-border")}
            >
              <List size={16} />
            </button>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div id="collection-filter-panel" className="bg-surface rounded-[1.35rem] border border-foreground/[.08] p-4 shadow-sm mt-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label htmlFor="collection-min-price" className="text-xs font-medium text-text-secondary mb-1 block">Min Price (₹)</label>
                <input id="collection-min-price" type="number" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" placeholder="0" />
              </div>
              <div>
                <label htmlFor="collection-max-price" className="text-xs font-medium text-text-secondary mb-1 block">Max Price (₹)</label>
                <input id="collection-max-price" type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" placeholder="Any" />
              </div>
              <div>
                <label htmlFor="collection-material" className="text-xs font-medium text-text-secondary mb-1 block">Material</label>
                <input id="collection-material" type="text" value={material} onChange={(e) => setMaterial(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" placeholder="e.g. Wool, Ceramic" />
              </div>
              <div>
                <label htmlFor="collection-length" className="text-xs font-medium text-text-secondary mb-1 block">Length (cm)</label>
                <input id="collection-length" type="number" value={carpetLength} onChange={(e) => setCarpetLength(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" placeholder="e.g. 100" />
              </div>
              <div className="flex items-end gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input id="collection-in-stock" type="checkbox" checked={inStockOnly} onChange={(e) => setInStockOnly(e.target.checked)} className="accent-accent" />
                  In Stock
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input id="collection-on-sale" type="checkbox" checked={onSaleOnly} onChange={(e) => setOnSaleOnly(e.target.checked)} className="accent-accent" />
                  On Sale
                </label>
              </div>
            </div>
            {(minPrice || maxPrice || material || inStockOnly || onSaleOnly || carpetLength) && (
              <button
                type="button"
                onClick={() => { setMinPrice(""); setMaxPrice(""); setMaterial(""); setInStockOnly(false); setOnSaleOnly(false); setCarpetLength(""); }}
                className="mt-3 text-xs text-accent hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>}

      {/* Subcategory grid (when applicable) */}
      {hasSubcategories && showSubcategories && (
        <div className="container-shop pb-4">
          <div className="grid grid-cols-2 gap-3">
            {category!.subcategories.map((sub) => (
              <Link
                key={sub.id}
                href={`/collections/${slug}/${sub.slug}`}
                className="group block bg-surface rounded-[1.35rem] border border-foreground/[.08] overflow-hidden shadow-sm hover:shadow-card transition-all"
              >
                <div className="relative aspect-[4/3] bg-surface-muted overflow-hidden flex items-center justify-center">
                  <span className="text-sm font-medium text-text-muted">{sub.name}</span>
                </div>
                <div className="p-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-primary">{sub.name}</h3>
                  <ArrowRight size={16} className="text-text-muted group-hover:text-primary transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Product grid */}
      <div className="container-shop pb-8">
        {loading && products.length === 0 ? (
          <ProductGridSkeleton count={8} />
        ) : products.length > 0 ? (
          <>
            <div className={cn(
              "gap-3",
              viewMode === "grid" ? "grid grid-cols-2" : "flex flex-col"
            )}>
              {products.map((product, i) => (
                <ProductCard key={product.id} product={product} priority={i < 4} />
              ))}
            </div>

            {/* Infinite scroll trigger */}
            <div ref={observerRef} className="py-4" />

            {/* Loading more */}
            {loadingMore && (
              <div className="flex items-center justify-center gap-2 py-4">
                <Loader2 size={16} className="animate-spin text-text-muted" />
                <span className="text-sm text-text-muted">Loading more...</span>
              </div>
            )}

            {/* Error state */}
            {error && !loading && (
              <div className="text-center py-4">
<button
                type="button"
                onClick={() => fetchProducts(page, true)}
                  className="text-sm text-accent hover:underline"
                >
                  Couldn&apos;t load more products. Tap to retry.
                </button>
              </div>
            )}

            {/* End of catalog */}
            {!hasMore && !loading && !loadingMore && (
              <p className="text-center text-xs text-text-muted py-4">End of collection.</p>
            )}
          </>
        ) : (
          <EmptyState
            icon="product"
            title="No products yet"
            description="This collection doesn't have any products yet. Check back soon!"
            action={{ label: "Browse All Products", href: "/shop" }}
          />
        )}
      </div>
    </div>
  );
}

export { CategoryContent as CollectionContentClient };
