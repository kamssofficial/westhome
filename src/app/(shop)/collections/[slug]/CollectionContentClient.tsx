"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { SlidersHorizontal, ChevronDown, ArrowRight, ArrowLeft, Grid3X3, List } from "lucide-react";
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




interface CollectionContentProps {
  category: any;
  initialProducts: any[];
  initialTotal: number;
}
function CategoryContent({ category: initialCategory, initialProducts, initialTotal: initialTotalCount }: CollectionContentProps) {
  const slug = initialCategory?.slug || "";

  const [products, setProducts] = useState<any[]>(initialProducts || []);
  const [category, setCategory] = useState<any>(initialCategory || null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [total, setTotal] = useState(initialTotalCount || 0);
  const [sort, setSort] = useState("recommended");
  const [page, setPage] = useState(1);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showSubcategories, setShowSubcategories] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [material, setMaterial] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [onSaleOnly, setOnSaleOnly] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const fetchParams = new URLSearchParams();
        fetchParams.set("category", slug);
        fetchParams.set("sort", sort);
        fetchParams.set("page", String(page));
        fetchParams.set("limit", "24");
        if (minPrice) fetchParams.set("minPrice", minPrice);
        if (maxPrice) fetchParams.set("maxPrice", maxPrice);
        if (material) fetchParams.set("material", material);
        if (inStockOnly) fetchParams.set("inStock", "true");
        if (onSaleOnly) fetchParams.set("onSale", "true");          const prodRes = await fetch("/api/products?lite=true&" + fetchParams.toString());
          if (prodRes.ok) {
            const prodData = await prodRes.json();
            setProducts((prev) => page === 1 ? (prodData.products || []) : [...prev, ...(prodData.products || [])]);
            setTotal(prodData.total || 0);
          }
      } catch (err) {
        console.error("Collection fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [slug, sort, page, minPrice, maxPrice, material, inStockOnly, onSaleOnly]);

  const hasMore = products.length < total;

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    setPage((p) => p + 1);
  }, [loadingMore, hasMore]);

  useEffect(() => {
    if (page === 1) return;
    setLoadingMore(false);
  }, [products.length]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { rootMargin: "200px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  const hasSubcategories = category?.subcategories && category.subcategories.length > 0;

  return (
    <div className="animate-fade-in">
      {/* Back button */}
      <div className="container-shop pt-10 pb-6 md:pt-16 md:pb-10">
        <Link href="/shop" className="p-1 hover:bg-surface-muted rounded-lg transition-colors inline-flex">
          <ArrowLeft size={20} />
        </Link>
      </div>

      {/* Title + count */}
      <div className="container-shop pb-3">
        <h1 className="text-2xl font-semibold text-primary">{category?.name || slug.replace(/-/g, " ")}</h1>
        
      </div>

      {/* Filter / Sort bar — always visible */}
      <div className="container-shop pb-3">
        <div className="flex items-center justify-between">
          <button
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
                value={sort}
                onChange={(e) => { setSort(e.target.value); setPage(1); }}
                className="px-3 py-2 pr-8 rounded-[1.35rem] border border-border bg-white text-sm focus:outline-none appearance-none"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            </div>
            <button
              onClick={() => setViewMode("grid")}
              className={cn("p-2 rounded-lg", viewMode === "grid" ? "bg-primary text-white" : "bg-surface border border-border")}
            >
              <Grid3X3 size={16} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn("p-2 rounded-lg", viewMode === "list" ? "bg-primary text-white" : "bg-surface border border-border")}
            >
              <List size={16} />
            </button>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="bg-surface rounded-[1.35rem] border border-foreground/[.08] p-4 shadow-sm mt-3">
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
                <input type="text" value={material} onChange={(e) => setMaterial(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" placeholder="e.g. Wool, Ceramic" />
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

      {/* Subcategory grid (when applicable) */}
      {hasSubcategories && showSubcategories && (
        <div className="container-shop pb-4">
          <div className="grid grid-cols-2 gap-3">
            {category!.subcategories.map((sub) => {
              return (
                <Link
                  key={sub.id}
                  href={`/collections/${slug}/${sub.slug}`}
                  className="group block bg-surface rounded-[1.35rem] border border-foreground/[.08] overflow-hidden shadow-sm hover:shadow-card transition-all"
                >
                  <div className="relative aspect-[4/3] bg-surface-muted overflow-hidden flex items-center justify-center">
                    <span className="text-sm font-medium text-text-muted">{sub.name}</span>
                  </div>
                  <div className="p-3 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-primary">{sub.name}</h3>
                      
                    </div>
                    <ArrowRight size={16} className="text-text-muted group-hover:text-primary transition-colors" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Product grid */}
      <div className="container-shop pb-8">
        {loading ? (
          <ProductGridSkeleton count={8} />
        ) : products.length > 0 ? (
          <div className={cn(
            "gap-3",
            viewMode === "grid" ? "grid grid-cols-2" : "flex flex-col"
          )}>
            {products.map((product, i) => (
              <ProductCard key={product.id} product={product} priority={i < 4} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon="product"
            title="No products yet"
            description="This collection doesn't have any products yet. Check back soon!"
            action={{ label: "Browse All Products", href: "/shop" }}
          />
        )}
        {hasMore && <div ref={sentinelRef} className="h-10" />}
        {loadingMore && (
          <div className="flex justify-center py-6">
            <div className="w-5 h-5 border-2 border-border border-t-primary rounded-full animate-spin" />
          </div>
        )}
        {!hasMore && products.length > 0 && (
          <p className="text-center text-xs text-text-muted py-6">All {total} products loaded</p>
        )}
      </div>
    </div>
  );
}

export { CategoryContent as CollectionContentClient };
