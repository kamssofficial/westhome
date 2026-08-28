"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import ProductCard from "@/components/ui/ProductCard";
import { ProductGridSkeleton } from "@/components/ui/Skeleton";
import FilterPanel, {
  SortDropdown,
  ActiveFilterChips,
  type FilterState,
  EMPTY_FILTERS,
} from "@/components/shop/FilterPanel";
import { cn } from "@/lib/utils";
import type { Product, Category } from "@/types";

const PAGE_SIZE = 24;

export default function ShopAllPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [filters, setFilters] = useState<FilterState>({ ...EMPTY_FILTERS });
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState(false);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const pageRef = useRef(1);

  // Fetch categories on mount
  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories || []))
      .catch(() => {});
  }, []);

  // Fetch products
  const fetchRef = useRef<(pageNum: number, append?: boolean) => Promise<void>>(null);

  const fetchProducts = useCallback(
    async (pageNum: number, append = false) => {
      if (loadingRef.current) return;
      loadingRef.current = true;

      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(false);

      try {
        const params = new URLSearchParams();
        if (filters.collection) params.set("category", filters.collection);
        if (filters.subcategory) params.set("subcategory", filters.subcategory);
        if (filters.style) params.set("style", filters.style);
        if (filters.material) params.set("material", filters.material);
        if (filters.color) params.set("color", filters.color);
        if (filters.size) params.set("length", filters.size);
        if (filters.minPrice) params.set("minPrice", filters.minPrice);
        if (filters.maxPrice) params.set("maxPrice", filters.maxPrice);
        if (filters.inStock) params.set("inStock", filters.inStock);
        if (filters.sort) params.set("sort", filters.sort);
        params.set("page", String(pageNum));
        params.set("limit", String(PAGE_SIZE));

        const res = await fetch("/api/products?lite=true&" + params.toString());
        const data = await res.json();
        const newProducts = data.products || [];
        const newTotal = data.total || 0;

        if (append) {
          setProducts((prev) => {
            const ids = new Set(prev.map((p) => p.id));
            return [...prev, ...newProducts.filter((p: Product) => !ids.has(p.id))];
          });
        } else {
          setProducts(newProducts);
        }
        setTotal(newTotal);
        setHasMore(pageNum * PAGE_SIZE < newTotal);
      } catch {
        if (!append) setProducts([]);
        setError(true);
      } finally {
        setLoading(false);
        setLoadingMore(false);
        loadingRef.current = false;
      }
    },
    [filters]
  );

  fetchRef.current = fetchProducts;

  // Reset and fetch page 1 when filters change
  useEffect(() => {
    pageRef.current = 1;
    setPage(1);
    setHasMore(true);
    fetchProducts(1, false);
  }, [fetchProducts]);

  // Infinite scroll — stable observer, no page/fetchProducts in deps
  useEffect(() => {
    if (!sentinelRef.current) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingRef.current && !loading) {
          const next = pageRef.current + 1;
          pageRef.current = next;
          setPage(next);
          fetchRef.current?.(next, true);
        }
      },
      { rootMargin: "300px" }
    );
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [hasMore, loading]);

  const handleFilterRemove = (key: keyof FilterState) => {
    setFilters((prev) => ({ ...prev, [key]: "" }));
  };

  const hasPrices = true;

  return (
    <div className="animate-fade-in">
      {/* Back button */}
      <div className="container-shop pt-10 pb-3 md:pt-16 md:pb-3">
        <Link
          href="/shop"
          aria-label="Back to shop"
          className="p-1 hover:bg-surface-muted rounded-lg transition-colors inline-flex"
        >
          <ArrowLeft size={20} />
        </Link>
      </div>

      {/* Title */}
      <div className="container-shop pb-3">
        <p className="font-label mb-1 text-[9px] text-accent">Browse</p>
        <h1 className="font-display text-3xl md:text-5xl">All products.</h1>
        {total > 0 && (
          <p className="mt-2 text-sm text-text-secondary">
            {total} product{total !== 1 ? "s" : ""} available
          </p>
        )}
      </div>

      {/* Filter & Sort toolbar */}
      <div className="container-shop pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Open filters"
              aria-expanded={showFilters}
              aria-haspopup="dialog"
              onClick={() => setShowFilters(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-[1.35rem] border border-black/[.08] bg-white text-sm font-medium text-[#1a1917] hover:bg-[#f7f5f2] transition-colors"
            >
              Filter
              {(() => {
                const count = [
                  filters.collection !== "",
                  filters.subcategory !== "",
                  filters.style !== "",
                  filters.material !== "",
                  filters.color !== "",
                  filters.size !== "",
                  filters.pattern !== "",
                  filters.shape !== "",
                  filters.minPrice !== "" || filters.maxPrice !== "",
                  filters.inStock !== "",
                ].filter(Boolean).length;
                return count > 0 ? (
                  <span className="w-5 h-5 rounded-full bg-[#d4a574] text-white text-[10px] font-bold flex items-center justify-center">
                    {count}
                  </span>
                ) : null;
              })()}
            </button>
          </div>
          <SortDropdown
            value={filters.sort}
            onChange={(v) => setFilters((prev) => ({ ...prev, sort: v }))}
            hasPrices={hasPrices}
          />
        </div>
      </div>

      {/* Active Filter Chips */}
      <div className="container-shop pb-2">
        <ActiveFilterChips
          filters={filters}
          categories={categories}
          onRemove={handleFilterRemove}
          onClearAll={() => setFilters({ ...EMPTY_FILTERS })}
        />
      </div>

      {/* Filter Panel */}
      <FilterPanel
        open={showFilters}
        onClose={() => setShowFilters(false)}
        onApply={(f) => setFilters(f)}
        initialFilters={filters}
        categories={categories}
        resultCount={total}
        hasPrices={hasPrices}
      />

      {/* Products */}
      <div className="container-shop pb-8">
        {loading ? (
          <ProductGridSkeleton count={8} />
        ) : products.length > 0 ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {products.map((product, i) => (
                <ProductCard key={product.id} product={product} priority={i < 4} />
              ))}
            </div>

            <div ref={sentinelRef} className="py-4" />

            {loadingMore && (
              <div className="flex items-center justify-center gap-2 py-4">
                <Loader2 size={16} className="animate-spin text-text-muted" />
                <span className="text-sm text-text-muted">Loading more...</span>
              </div>
            )}

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

            {!hasMore && !loading && !loadingMore && (
              <p className="text-center text-xs text-text-muted py-4">
                End of collection.
              </p>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <p className="text-text-muted text-sm">
              No products found matching your filters.
            </p>
            <button
              type="button"
              onClick={() => setFilters({ ...EMPTY_FILTERS })}
              className="text-sm text-accent hover:underline mt-2"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
