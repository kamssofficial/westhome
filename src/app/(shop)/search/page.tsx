"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search as SearchIcon, X, Clock, TrendingUp } from "lucide-react";
import ProductCard from "@/components/ui/ProductCard";
import { ProductGridSkeleton } from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import { useSearchStore } from "@/store/search";
import type { Product } from "@/types";

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get("q") || "";

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  const { recentSearches, popularSearches, addRecentSearch, clearRecentSearches } =
    useSearchStore();

  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery);
    }
  }, [initialQuery]);

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    addRecentSearch(searchQuery);

    try {
      const res = await fetch(`/api/products?q=${encodeURIComponent(searchQuery)}&limit=24`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.products || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      performSearch(query.trim());
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    router.push(`/search?q=${encodeURIComponent(suggestion)}`);
    performSearch(suggestion);
  };

  return (
    <div className="container-shop py-4 md:py-6 animate-fade-in">
      {/* Search input */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="relative">
          <SearchIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products..."
            className="w-full pl-10 pr-10 py-3 bg-white border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
            autoFocus
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(""); setResults([]); setTotal(0); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-foreground"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </form>

      {/* Show suggestions when no query */}
      {!initialQuery && results.length === 0 && !loading && (
        <div className="space-y-6">
          {/* Recent searches */}
          {recentSearches.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Clock size={14} />
                  Recent Searches
                </h3>
                <button
                  onClick={clearRecentSearches}
                  className="text-xs text-text-muted hover:text-foreground transition-colors"
                >
                  Clear
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recentSearches.slice(0, 8).map((search) => (
                  <button
                    key={search}
                    onClick={() => handleSuggestionClick(search)}
                    className="px-3 py-1.5 bg-surface-muted rounded-full text-sm hover:bg-surface-muted/80 transition-colors"
                  >
                    {search}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Popular searches */}
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <TrendingUp size={14} />
              Popular Searches
            </h3>
            <div className="flex flex-wrap gap-2">
              {popularSearches.map((search) => (
                <button
                  key={search}
                  onClick={() => handleSuggestionClick(search)}
                  className="px-3 py-1.5 bg-white border border-border rounded-full text-sm hover:border-foreground/20 transition-colors capitalize"
                >
                  {search}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && <ProductGridSkeleton count={8} />}

      {/* Results */}
      {!loading && results.length > 0 && (
        <div>
          <p className="text-sm text-text-secondary mb-4">
            {total} result{total !== 1 ? "s" : ""} for &ldquo;{initialQuery}&rdquo;
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 stagger-in">
            {results.map((product, i) => (
              <ProductCard key={product.id} product={product} priority={i < 4} />
            ))}
          </div>
        </div>
      )}

      {/* No results */}
      {!loading && initialQuery && results.length === 0 && (
        <EmptyState
          icon="search"
          title="No results found"
          description={`We couldn't find anything matching "${initialQuery}". Try different keywords or browse our categories.`}
          action={{ label: "Browse Shop", href: "/shop" }}
        />
      )}
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
