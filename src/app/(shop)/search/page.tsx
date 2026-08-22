"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Search as SearchIcon,
  SlidersHorizontal,
  ChevronDown,
  Grid3X3,
  List,
  X,
  Clock,
  TrendingUp,
  Loader2,
} from "lucide-react";
import ProductCard from "@/components/ui/ProductCard";
import { ProductGridSkeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";
import type { Product, Category } from "@/types";

const POPULAR_CATEGORIES = [
  { name: "Laundry Baskets", slug: "laundry-baskets" },
  { name: "Frames", slug: "frames" },
  { name: "Soap Dispensers", slug: "soap-dispensers" },
];

const POPULAR_SEARCHES = [
  "woven basket",
  "wall art",
  "soap dispenser",
  "abstract frame",
  "botanical",
  "ceramic",
];

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
  const [sort, setSort] = useState("recommended");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("westhome-recent-searches");
      if (saved) setRecentSearches(JSON.parse(saved));
    } catch {}
  }, []);

  // Load categories
  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) => setCategories(data.categories || []))
      .catch(() => {});
  }, []);

  // Save recent searches
  const saveRecentSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    const updated = [
      searchQuery,
      ...recentSearches.filter((s) => s !== searchQuery),
    ].slice(0, 5);
    setRecentSearches(updated);
    try {
      localStorage.setItem("westhome-recent-searches", JSON.stringify(updated));
    } catch {}
  };

  // Fetch products — resets on query/sort/category change
  const fetchProducts = useCallback(
    async (pageNum: number, append = false) => {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      try {
        const params = new URLSearchParams();
        if (initialQuery) params.set("q", initialQuery);
        if (selectedCategory) params.set("category", selectedCategory);
        params.set("sort", sort);
        params.set("page", String(pageNum));
        params.set("limit", String(PAGE_SIZE));

        const res = await fetch(`/api/products?${params.toString()}`);
        const data = await res.json();
        const newProducts = data.products || [];
        const totalFromAPI = data.total || 0;

        if (append) {
          setProducts((prev) => [...prev, ...newProducts]);
        } else {
          setProducts(newProducts);
        }
        setTotal(totalFromAPI);
        setHasMore(pageNum * PAGE_SIZE < totalFromAPI);
      } catch {
        if (!append) setProducts([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [initialQuery, sort, selectedCategory]
  );

  // Reset and fetch page 1 when filters change
  useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchProducts(1, false);
    if (initialQuery) saveRecentSearch(initialQuery);
  }, [fetchProducts]);

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    if (!sentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchProducts(nextPage, true);
        }
      },
      { rootMargin: "300px" }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, page, fetchProducts]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    if (query.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(query.trim())}`;
    }
  };

  const clearSearch = () => {
    setQuery("");
    window.location.href = "/search";
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    window.location.href = `/search?q=${encodeURIComponent(suggestion)}`;
  };

  const clearRecentSearch = (search: string) => {
    const updated = recentSearches.filter((s) => s !== search);
    setRecentSearches(updated);
    try {
      localStorage.setItem("westhome-recent-searches", JSON.stringify(updated));
    } catch {}
  };

  // Close suggestions on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const showSuggestionsPanel = showSuggestions && !initialQuery;

  return (
    <div className="animate-fade-in">
      {/* Search bar */}
      <div className="px-4 pt-3 pb-2">
        <div ref={suggestionsRef} className="relative">
          <form onSubmit={handleSearch} className="relative">
            <SearchIcon
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
            />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Search products..."
              className="w-full pl-10 pr-10 py-2.5 bg-white rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
            {query && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-primary"
              >
                <X size={16} />
              </button>
            )}

            {/* Suggestions Panel */}
            {showSuggestionsPanel && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-border shadow-dropdown z-50 overflow-hidden">
                {recentSearches.length > 0 && (
                  <div className="p-3 border-b border-border-light">
                    <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
                      Recent
                    </p>
                    {recentSearches.map((search) => (
                      <div
                        key={search}
                        className="flex items-center justify-between group"
                      >
                        <button
                          type="button"
                          onClick={() => handleSuggestionClick(search)}
                          className="flex items-center gap-2 py-1.5 text-sm text-secondary hover:text-primary transition-colors flex-1"
                        >
                          <Clock size={14} className="text-text-muted" />
                          {search}
                        </button>
                        <button
                          type="button"
                          onClick={() => clearRecentSearch(search)}
                          className="p-1 text-text-muted hover:text-error opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="p-3 border-b border-border-light">
                  <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
                    Popular
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {POPULAR_SEARCHES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleSuggestionClick(s)}
                        className="flex items-center gap-1 px-2.5 py-1 bg-surface-muted rounded-full text-xs font-medium text-secondary hover:bg-accent/10 hover:text-accent transition-colors"
                      >
                        <TrendingUp size={10} />
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3">
                  <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
                    Categories
                  </p>
                  <div className="grid grid-cols-2 gap-1">
                    {POPULAR_CATEGORIES.map((cat) => (
                      <Link
                        key={cat.slug}
                        href={`/collections/${cat.slug}`}
                        onClick={() => setShowSuggestions(false)}
                        className="px-3 py-2 text-sm text-secondary hover:text-primary hover:bg-surface-muted rounded-lg transition-colors"
                      >
                        {cat.name}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Filter & Sort */}
      <div className="px-4 pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-colors",
                showFilters
                  ? "bg-primary text-white border-primary"
                  : "border-border bg-white hover:bg-surface-muted"
              )}
            >
              <SlidersHorizontal size={14} /> Filter
            </button>
            {selectedCategory && (
              <button
                onClick={() => setSelectedCategory("")}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-accent/10 text-accent rounded-full text-xs font-medium hover:bg-accent/20 transition-colors"
              >
                {categories.find((c) => c.slug === selectedCategory)?.name ||
                  selectedCategory}
                <X size={12} />
              </button>
            )}
            {initialQuery && (
              <button
                onClick={clearSearch}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-accent/10 text-accent rounded-full text-xs font-medium hover:bg-accent/20 transition-colors"
              >
                &quot;{initialQuery}&quot;
                <X size={12} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="px-3 py-2 pr-8 rounded-xl border border-border bg-white text-sm focus:outline-none appearance-none"
              >
                <option value="recommended">Recommended</option>
                <option value="newest">Newest</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
              </select>
              <ChevronDown
                size={14}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
              />
            </div>
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "p-2 rounded-lg",
                viewMode === "grid"
                  ? "bg-primary text-white"
                  : "bg-white border border-border"
              )}
            >
              <Grid3X3 size={16} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "p-2 rounded-lg",
                viewMode === "list"
                  ? "bg-primary text-white"
                  : "bg-white border border-border"
              )}
            >
              <List size={16} />
            </button>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mt-3 p-3 bg-white rounded-xl border border-border">
            <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
              Category
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory("")}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                  !selectedCategory
                    ? "bg-primary text-white"
                    : "bg-surface-muted text-secondary hover:bg-primary/10"
                )}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.slug}
                  onClick={() => setSelectedCategory(cat.slug)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                    selectedCategory === cat.slug
                      ? "bg-primary text-white"
                      : "bg-surface-muted text-secondary hover:bg-primary/10"
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Results count */}
      <div className="px-4 pb-2">
        {loading ? (
          <p className="text-sm text-secondary">Loading...</p>
        ) : (
          <p className="text-sm text-secondary">
            {total} product{total !== 1 ? "s" : ""}
            {initialQuery ? ` matching "${initialQuery}"` : ""}
            {selectedCategory
              ? ` in ${categories.find((c) => c.slug === selectedCategory)?.name || selectedCategory}`
              : ""}
          </p>
        )}
      </div>

      {/* Products — infinite scroll */}
      <div className="px-4 pb-8">
        {loading ? (
          <ProductGridSkeleton count={8} />
        ) : products.length > 0 ? (
          <>
            <div
              className={cn(
                "gap-3",
                viewMode === "grid" ? "grid grid-cols-2" : "flex flex-col"
              )}
            >
              {products.map((product, i) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  priority={i < 4}
                />
              ))}
            </div>

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="py-4">
              {loadingMore && (
                <div className="flex items-center justify-center gap-2 text-text-muted">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-sm">Loading more...</span>
                </div>
              )}
              {!hasMore && products.length > PAGE_SIZE && (
                <p className="text-center text-sm text-text-muted">
                  All {total} products loaded
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-16">
            <p className="text-text-muted text-sm">
              {initialQuery
                ? `No products found for "${initialQuery}"`
                : "No products available"}
            </p>
            {initialQuery && (
              <button
                onClick={clearSearch}
                className="text-sm text-accent hover:underline mt-2"
              >
                Browse all products
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="px-4 py-8">
          <ProductGridSkeleton count={8} />
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
