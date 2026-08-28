"use client";
import { trackEvent } from "@/hooks/useAnalytics";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Search as SearchIcon, Grid3X3, List,
  X, Clock, TrendingUp, Loader2,
} from "lucide-react";
import ProductCard from "@/components/ui/ProductCard";
import { ProductGridSkeleton } from "@/components/ui/Skeleton";
import FilterPanel, { type FilterState, EMPTY_FILTERS, SortDropdown, ActiveFilterChips } from "@/components/shop/FilterPanel";
import { cn } from "@/lib/utils";
import type { Product, Category } from "@/types";

const POPULAR_SEARCHES = ["woven basket", "wall art", "soap dispenser", "abstract frame", "botanical", "ceramic"];
const PAGE_SIZE = 24;



function SearchContent() {
  const searchParams = useSearchParams();
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
  const [filters, setFilters] = useState<FilterState>({ ...EMPTY_FILTERS });
  const [sort, setSort] = useState("recommended");
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

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
    if (loadingRef.current) return;
    loadingRef.current = true;
    if (pageNum === 1) setLoading(true); else setLoadingMore(true);
    try {
      const params = new URLSearchParams();
      if (initialQuery) params.set("q", initialQuery);
      if (filters.collection) params.set("category", filters.collection);
      if (filters.subcategory) params.set("subcategory", filters.subcategory);
      if (filters.style) params.set("style", filters.style);
      if (filters.material) params.set("material", filters.material);
      if (filters.color) params.set("color", filters.color);
      if (filters.size) params.set("length", filters.size);
      if (filters.pattern) params.set("pattern", filters.pattern);
      if (filters.shape) params.set("shape", filters.shape);
      if (filters.frameSize) params.set("frameSize", filters.frameSize);
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
          if (query) trackEvent("SEARCH", { metadata: { query } });
      setTotal(data.total || 0);
      setHasMore(pageNum * PAGE_SIZE < (data.total || 0));
    } catch { if (!append) setProducts([]); }
    finally { setLoading(false); setLoadingMore(false); loadingRef.current = false; }
  }, [initialQuery, filters.collection, filters.subcategory, filters.style, filters.material, filters.color, filters.size, filters.pattern, filters.shape, filters.minPrice, filters.maxPrice, filters.inStock, sort]);

  useEffect(() => { setPage(1); setHasMore(true); fetchProducts(1, false); if (initialQuery) saveRecentSearch(initialQuery); }, [fetchProducts]);

  // Infinite scroll — stable observer
  const searchPageRef = useRef(1);
  const searchFetchRef = useRef(fetchProducts);
  searchFetchRef.current = fetchProducts;

  useEffect(() => {
    if (!sentinelRef.current) return;
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !loadingRef.current) {
        const next = searchPageRef.current + 1;
        searchPageRef.current = next;
        setPage(next);
        searchFetchRef.current(next, true);
      }
    }, { rootMargin: "400px" });
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, []);



  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault(); setShowSuggestions(false);
    if (query.trim()) window.location.href = "/search?q=" + encodeURIComponent(query.trim());
  };
  const clearSearch = () => { setQuery(""); window.location.href = "/search"; };
  const handleSuggestionClick = (s: string) => { setQuery(s); setShowSuggestions(false); window.location.href = "/search?q=" + encodeURIComponent(s); };
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

  const filterCount = [
    filters.collection !== "",
    filters.subcategory !== "",
    filters.style !== "",
    filters.material !== "",
    filters.color !== "",
    filters.size !== "",
    filters.pattern !== "",
    filters.shape !== "",
    filters.frameSize !== "",
    filters.minPrice !== "" || filters.maxPrice !== "",
    filters.inStock !== "",
  ].filter(Boolean).length;

  const showCatalogControls = loading || total > 0 || filterCount > 0;

  return (
    <div className="animate-fade-in">
      <div className="container-shop pt-3 pb-2">
        <div ref={suggestionsRef} className="relative">
          <form onSubmit={handleSearch} className="relative">
            <SearchIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b0aba6]" />
            <input ref={inputRef} id="search-products" aria-label="Search products" type="text" value={query} onChange={e => { setQuery(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)} placeholder="Search products..."
              className="w-full pl-10 pr-10 py-2.5 bg-white rounded-xl border border-black/[.08] text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a574]/30 text-[#1a1917]" />
            {query && <button type="button" aria-label="Clear search" onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#b0aba6] hover:text-[#1a1917]"><X size={16} /></button>}
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
      <div className="container-shop pb-3">
        {showCatalogControls && <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button type="button" aria-label="Open filters" aria-expanded={showFilters} aria-haspopup="dialog" onClick={() => setShowFilters(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-[1.35rem] border border-black/[.08] bg-white text-sm font-medium text-[#1a1917] hover:bg-[#f7f5f2] transition-colors">
              Filter
              {filterCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-[#d4a574] text-white text-[10px] font-bold flex items-center justify-center">{filterCount}</span>
              )}
            </button>
            {initialQuery && (
              <button type="button" aria-label="Clear search query" onClick={clearSearch} className="flex items-center gap-1 px-2.5 py-1.5 bg-[#d4a574]/10 text-[#d4a574] rounded-full text-xs font-medium hover:bg-[#d4a574]/20 transition-colors">
                &quot;{initialQuery}&quot; <X size={12} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <SortDropdown value={sort} onChange={setSort} />
            <button type="button" aria-label="Grid view" aria-pressed={viewMode === "grid"} onClick={() => setViewMode("grid")}
              className={cn("p-2 rounded-lg", viewMode === "grid" ? "bg-[#1a1917] text-white" : "bg-white border border-black/[.08]")}>
              <Grid3X3 size={16} />
            </button>
            <button type="button" aria-label="List view" aria-pressed={viewMode === "list"} onClick={() => setViewMode("list")}
              className={cn("p-2 rounded-lg", viewMode === "list" ? "bg-[#1a1917] text-white" : "bg-white border border-black/[.08]")}>
              <List size={16} />
            </button>
          </div>
        </div>}
        {showCatalogControls && <FilterPanel open={showFilters} onClose={() => setShowFilters(false)} onApply={applyFilters}
          initialFilters={filters} categories={categories} resultCount={total} />}
      </div>

      {/* Active Filter Chips */}
      {filterCount > 0 && (
        <div className="container-shop pb-2">
          <ActiveFilterChips filters={filters} categories={categories} onRemove={(key) => setFilters(p => ({...p, [key]: ""}))} onClearAll={() => setFilters({ ...EMPTY_FILTERS })} />
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
