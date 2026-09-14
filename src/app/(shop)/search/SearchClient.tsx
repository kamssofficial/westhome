"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Search as SearchIcon, SlidersHorizontal, ChevronDown, Grid3X3, List,
  X, Clock, TrendingUp, Loader2, ArrowUpDown, Check,
} from "lucide-react";
import ProductCard from "@/components/ui/ProductCard";
import { ProductGridSkeleton } from "@/components/ui/Skeleton";
import FilterPanel, { type FilterState, EMPTY_FILTERS } from "@/components/shop/FilterPanel";
import { cn } from "@/lib/utils";
import type { Product, Category } from "@/types";

const POPULAR_SEARCHES = ["woven basket", "wall art", "soap dispenser", "abstract frame", "botanical", "ceramic"];
const PAGE_SIZE = 24;

const SORT_OPTIONS = [
  { label: "Recommended", value: "recommended" },
  { label: "Newest", value: "newest" },
  { label: "Price: Low → High", value: "price_asc" },
  { label: "Price: High → Low", value: "price_desc" },
  { label: "Name: A–Z", value: "name_asc" },
  { label: "Name: Z–A", value: "name_desc" },
];

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [filters, setFilters] = useState<FilterState>({ ...EMPTY_FILTERS });
  const [sort, setSort] = useState("recommended");
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try { const s = localStorage.getItem("westhome-recent-searches"); if (s) setRecentSearches(JSON.parse(s)); } catch {}
  }, []);

  useEffect(() => {
    fetch("/api/categories").then(r => r.json()).then(d => setCategories(d.categories || [])).catch(() => {});
  }, []);

  const saveRecentSearch = (q: string) => {
    if (!q.trim()) return;
    const updated = [q, ...recentSearches.filter(s => s !== q)].slice(0, 5);
    setRecentSearches(updated);
    try { localStorage.setItem("westhome-recent-searches", JSON.stringify(updated)); } catch {}
  };

  // Fetch products
  const fetchProducts = useCallback(async (pageNum: number, append = false) => {
    if (pageNum === 1) setLoading(true); else setLoadingMore(true);
    try {
      const params = new URLSearchParams();
      if (initialQuery) params.set("q", initialQuery);
      if (filters.category) params.set("category", filters.category);
      if (filters.subcategory) params.set("subcategory", filters.subcategory);
      if (filters.minPrice) params.set("minPrice", filters.minPrice);
      if (filters.maxPrice) params.set("maxPrice", filters.maxPrice);
      if (filters.inStock) params.set("inStock", filters.inStock);
      params.set("sort", sort);
      params.set("page", String(pageNum));
      params.set("limit", String(PAGE_SIZE));
      const res = await fetch("/api/products?lite=true&" + params.toString());
      const data = await res.json();
      if (append) setProducts(prev => [...prev, ...(data.products || [])]);
      else setProducts(data.products || []);
      setTotal(data.total || 0);
      setHasMore(pageNum * PAGE_SIZE < (data.total || 0));
    } catch { if (!append) setProducts([]); }
    finally { setLoading(false); setLoadingMore(false); }
  }, [initialQuery, filters.category, filters.subcategory, filters.minPrice, filters.maxPrice, filters.inStock, sort]);

  useEffect(() => { setPage(1); setHasMore(true); fetchProducts(1, false); if (initialQuery) saveRecentSearch(initialQuery); }, [fetchProducts]);

  useEffect(() => {
    if (!sentinelRef.current) return;
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
        const next = page + 1; setPage(next); fetchProducts(next, true);
      }
    }, { rootMargin: "300px" });
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [hasMore, loading, loadingMore, page, fetchProducts]);

  // Close sort on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (sortRef.current && !sortRef.current.contains(e.target as Node)) setShowSort(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault(); setShowSuggestions(false);
    if (query.trim()) router.push("/search?q=" + encodeURIComponent(query.trim()));
  };
  const clearSearch = () => { setQuery(""); router.push("/search"); };
  const handleSuggestionClick = (s: string) => { setQuery(s); setShowSuggestions(false); router.push("/search?q=" + encodeURIComponent(s)); };
  const clearRecentSearch = (s: string) => {
    const updated = recentSearches.filter(r => r !== s); setRecentSearches(updated);
    try { localStorage.setItem("westhome-recent-searches", JSON.stringify(updated)); } catch {}
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) setShowSuggestions(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const applyFilters = (f: FilterState) => { setFilters(f); };

  // Count active filter groups
  const filterCount = [
    filters.category !== "",
    filters.subcategory !== "",
    filters.minPrice !== "" || filters.maxPrice !== "",
    filters.inStock !== "",
  ].filter(Boolean).length;

  const selectedSortLabel = SORT_OPTIONS.find(o => o.value === sort)?.label || "Recommended";

  // Hide filter/sort/view controls entirely when there are no results and no active filters
  const showCatalogControls = loading || total > 0 || filterCount > 0;

  return (
    <div className="animate-fade-in">
      <div className="container-shop pt-3 pb-2">
        <div ref={suggestionsRef} className="relative">
          <form onSubmit={handleSearch} className="relative">
            <SearchIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b0aba6]" />
            <input ref={inputRef} type="text" value={query} onChange={e => { setQuery(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)} placeholder="Search products..."
              className="w-full pl-10 pr-10 py-2.5 bg-white rounded-xl border border-black/[.08] text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a574]/30 text-[#1a1917]" />
            {query && <button type="button" onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#b0aba6] hover:text-[#1a1917]"><X size={16} /></button>}
            {showSuggestions && !initialQuery && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-black/[.08] shadow-lg z-50 overflow-hidden">
                {recentSearches.length > 0 && (
                  <div className="p-3 border-b border-black/[.06]">
                    <p className="text-xs font-medium text-[#b0aba6] uppercase tracking-wider mb-2">Recent</p>
                    {recentSearches.map(s => (
                      <div key={s} className="flex items-center justify-between group">
                        <button type="button" onClick={() => handleSuggestionClick(s)} className="flex items-center gap-2 py-1.5 text-sm text-[#6b6560] hover:text-[#1a1917] transition-colors flex-1">
                          <Clock size={14} className="text-[#b0aba6]" />{s}
                        </button>
                        <button type="button" onClick={() => clearRecentSearch(s)} className="p-1 text-[#b0aba6] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><X size={12} /></button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="p-3">
                  <p className="text-xs font-medium text-[#b0aba6] uppercase tracking-wider mb-2">Popular</p>
                  <div className="flex flex-wrap gap-2">
                    {POPULAR_SEARCHES.map(s => (
                      <button key={s} type="button" onClick={() => handleSuggestionClick(s)}
                        className="flex items-center gap-1 px-2.5 py-1 bg-[#f7f5f2] rounded-full text-xs font-medium text-[#6b6560] hover:bg-[#f0ede8] transition-colors">
                        <TrendingUp size={10} />{s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Filter & Sort toolbar */}
      {showCatalogControls && <div className="container-shop pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button onClick={() => setShowFilters(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-black/[.08] bg-white text-sm font-medium text-[#1a1917] hover:bg-[#f7f5f2] transition-colors">
              <SlidersHorizontal size={14} /> Filter
              {filterCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-[#d4a574] text-white text-[10px] font-bold flex items-center justify-center">{filterCount}</span>
              )}
            </button>
            {initialQuery && (
              <button onClick={clearSearch} className="flex items-center gap-1 px-2.5 py-1.5 bg-[#d4a574]/10 text-[#d4a574] rounded-full text-xs font-medium hover:bg-[#d4a574]/20 transition-colors">
                &quot;{initialQuery}&quot; <X size={12} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div ref={sortRef} className="relative">
              <button onClick={() => setShowSort(!showSort)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-black/[.08] bg-white text-sm font-medium text-[#1a1917] hover:bg-[#f7f5f2] transition-colors">
                <ArrowUpDown size={14} className="text-[#6b6560]" />
                <span className="hidden sm:inline">{selectedSortLabel}</span>
                <span className="sm:hidden">Sort</span>
                <ChevronDown size={14} className={cn("text-[#b0aba6] transition-transform", showSort && "rotate-180")} />
              </button>
              {showSort && (
                <div className="absolute top-full right-0 mt-2 w-52 bg-white rounded-xl border border-black/[.08] shadow-lg z-50 py-1.5">
                  {SORT_OPTIONS.map(opt => (
                    <button key={opt.value} onClick={() => { setSort(opt.value); setShowSort(false); }}
                      className={cn("w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors",
                        sort === opt.value ? "text-[#1a1917] font-medium bg-[#f7f5f2]" : "text-[#6b6560] hover:bg-[#f7f5f2]"
                      )}>
                      {sort === opt.value && <Check size={14} className="text-[#d4a574] shrink-0" />}
                      <span className={sort === opt.value ? "" : "ml-[22px]"}>{opt.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => setViewMode("grid")} aria-label="Grid view"
              className={cn("p-2 rounded-lg", viewMode === "grid" ? "bg-[#1a1917] text-white" : "bg-white border border-black/[.08]")}>
              <Grid3X3 size={16} />
            </button>
            <button onClick={() => setViewMode("list")} aria-label="List view"
              className={cn("p-2 rounded-lg", viewMode === "list" ? "bg-[#1a1917] text-white" : "bg-white border border-black/[.08]")}>
              <List size={16} />
            </button>
          </div>
        </div>
        <FilterPanel open={showFilters} onClose={() => setShowFilters(false)} onApply={applyFilters}
          initialFilters={filters} categories={categories} resultCount={total} />
      </div>}

      {/* Active Filter Chips */}
      {filterCount > 0 && (
        <div className="container-shop pb-2">
          <div className="flex flex-wrap gap-2">
            {filters.category && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#1a1917] text-white rounded-full text-xs font-medium">
                {categories.find(c => c.slug === filters.category)?.name || filters.category}
                <button onClick={() => setFilters(p => ({...p, category: ""}))} className="ml-0.5 hover:opacity-60"><X size={12} /></button>
              </span>
            )}
            {filters.subcategory && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#1a1917] text-white rounded-full text-xs font-medium">
                {filters.subcategory.replace(/-/g, " ")}
                <button onClick={() => setFilters(p => ({...p, subcategory: ""}))} className="ml-0.5 hover:opacity-60"><X size={12} /></button>
              </span>
            )}
            {(filters.minPrice || filters.maxPrice) && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#1a1917] text-white rounded-full text-xs font-medium">
                {"₹"}{filters.minPrice || "0"} - {"₹"}{filters.maxPrice || "∞"}
                <button onClick={() => setFilters(p => ({...p, minPrice: "", maxPrice: ""}))} className="ml-0.5 hover:opacity-60"><X size={12} /></button>
              </span>
            )}
            {filters.inStock && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#1a1917] text-white rounded-full text-xs font-medium">
                In Stock
                <button onClick={() => setFilters(p => ({...p, inStock: ""}))} className="ml-0.5 hover:opacity-60"><X size={12} /></button>
              </span>
            )}
            <button onClick={() => setFilters({ ...EMPTY_FILTERS })} className="text-xs text-[#d4a574] font-medium hover:underline ml-1">Clear all</button>
          </div>
        </div>
      )}

      {/* Products */}
      <div className="container-shop pb-8">
        {loading ? <ProductGridSkeleton count={8} /> : products.length > 0 ? (
          <>
            <div className={cn("gap-3", viewMode === "grid" ? "grid grid-cols-2" : "flex flex-col")}>
              {products.map((product, i) => <ProductCard key={product.id} product={product} priority={i < 4} />)}
            </div>
            <div ref={sentinelRef} className="py-4">
              {loadingMore && <div className="flex items-center justify-center gap-2 text-[#b0aba6]"><Loader2 size={16} className="animate-spin" /><span className="text-sm">Loading more...</span></div>}
            </div>
          </>
        ) : (
          <div className="text-center py-16">
            <p className="text-[#b0aba6] text-sm">{initialQuery ? "No products found for \"" + initialQuery + "\"" : "No products available"}</p>
            {initialQuery && <button onClick={clearSearch} className="text-sm text-[#d4a574] hover:underline mt-2">Browse all products</button>}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="container-shop py-8"><ProductGridSkeleton count={8} /></div>}>
      <SearchContent />
    </Suspense>
  );
}
