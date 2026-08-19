"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { SlidersHorizontal, X, ChevronDown, Grid3X3, LayoutGrid } from "lucide-react";
import ProductCard from "@/components/ui/ProductCard";
import { ProductGridSkeleton } from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { Product, Category } from "@/types";

const SORT_OPTIONS = [
  { value: "recommended", label: "Recommended" },
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "bestselling", label: "Best Selling" },
  { value: "rating", label: "Highest Rated" },
];

const PRICE_RANGES = [
  { label: "Under ₹500", min: 0, max: 500 },
  { label: "₹500 - ₹1,000", min: 500, max: 1000 },
  { label: "₹1,000 - ₹2,000", min: 1000, max: 2000 },
  { label: "₹2,000 - ₹5,000", min: 2000, max: 5000 },
  { label: "Over ₹5,000", min: 5000, max: 999999 },
];

const CATEGORIES = [
  { name: "Wall Decor", slug: "wall-decor" },
  { name: "Laundry", slug: "laundry" },
  { name: "Comforters", slug: "comforters" },
  { name: "Lamps", slug: "lamps" },
  { name: "Carpets", slug: "carpets" },
  { name: "Clocks", slug: "clocks" },
  { name: "Accessories", slug: "accessories" },
];

function ShopContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  // Filters state
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "");
  const [selectedPriceRange, setSelectedPriceRange] = useState<{ min: number; max: number } | null>(null);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [onSaleOnly, setOnSaleOnly] = useState(false);
  const [sort, setSort] = useState(searchParams.get("sort") || "recommended");
  const [page, setPage] = useState(1);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory) params.set("category", selectedCategory);
      if (selectedPriceRange) {
        params.set("minPrice", String(selectedPriceRange.min));
        params.set("maxPrice", String(selectedPriceRange.max));
      }
      if (inStockOnly) params.set("inStock", "true");
      if (onSaleOnly) params.set("onSale", "true");
      params.set("sort", sort);
      params.set("page", String(page));
      params.set("limit", "24");

      const res = await fetch(`/api/products?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error("Failed to fetch products:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, selectedPriceRange, inStockOnly, onSaleOnly, sort, page]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const activeFilterCount = [
    selectedCategory,
    selectedPriceRange,
    inStockOnly,
    onSaleOnly,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setSelectedCategory("");
    setSelectedPriceRange(null);
    setInStockOnly(false);
    setOnSaleOnly(false);
    setPage(1);
  };

  return (
    <div className="animate-fade-in">
      {/* Page header */}
      <div className="bg-surface-muted/50 border-b border-border-light">
        <div className="container-shop py-4 md:py-6">
          <h1 className="text-xl md:text-2xl font-serif text-foreground">Shop</h1>
          <p className="text-sm text-text-secondary mt-1">
            {total > 0 ? `${total} products` : "Browse our collection"}
          </p>
        </div>
      </div>

      <div className="container-shop py-4 md:py-6">
        {/* Filter & Sort bar */}
        <div className="flex items-center justify-between gap-3 mb-4 md:mb-6">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterOpen(true)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors",
                activeFilterCount > 0
                  ? "border-primary bg-primary text-white"
                  : "border-border bg-white hover:bg-surface-muted"
              )}
            >
              <SlidersHorizontal size={16} />
              <span className="hidden sm:inline">Filters</span>
              {activeFilterCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="text-xs text-text-secondary hover:text-foreground transition-colors"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Sort dropdown */}
          <div className="relative">
            <button
              onClick={() => setSortOpen(!sortOpen)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-white text-sm font-medium hover:bg-surface-muted transition-colors"
            >
              <span className="hidden sm:inline">
                {SORT_OPTIONS.find((o) => o.value === sort)?.label}
              </span>
              <span className="sm:hidden">Sort</span>
              <ChevronDown size={14} className={cn("transition-transform", sortOpen && "rotate-180")} />
            </button>
            {sortOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setSortOpen(false)} />
                <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-border rounded-lg shadow-dropdown z-20 py-1">
                  {SORT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setSort(option.value);
                        setSortOpen(false);
                        setPage(1);
                      }}
                      className={cn(
                        "w-full text-left px-3 py-2 text-sm transition-colors",
                        sort === option.value
                          ? "bg-surface-muted font-medium text-foreground"
                          : "text-text-secondary hover:bg-surface-muted"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Active filter pills */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {selectedCategory && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-surface-muted rounded-full text-xs font-medium">
                {CATEGORIES.find((c) => c.slug === selectedCategory)?.name}
                <button onClick={() => setSelectedCategory("")}>
                  <X size={12} />
                </button>
              </span>
            )}
            {selectedPriceRange && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-surface-muted rounded-full text-xs font-medium">
                {PRICE_RANGES.find(
                  (r) => r.min === selectedPriceRange.min && r.max === selectedPriceRange.max
                )?.label || `${selectedPriceRange.min} - ${selectedPriceRange.max}`}
                <button onClick={() => setSelectedPriceRange(null)}>
                  <X size={12} />
                </button>
              </span>
            )}
            {inStockOnly && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-surface-muted rounded-full text-xs font-medium">
                In Stock
                <button onClick={() => setInStockOnly(false)}>
                  <X size={12} />
                </button>
              </span>
            )}
            {onSaleOnly && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-surface-muted rounded-full text-xs font-medium">
                On Sale
                <button onClick={() => setOnSaleOnly(false)}>
                  <X size={12} />
                </button>
              </span>
            )}
          </div>
        )}

        {/* Product grid */}
        {loading ? (
          <ProductGridSkeleton count={8} />
        ) : products.length > 0 ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 stagger-in">
              {products.map((product, i) => (
                <ProductCard key={product.id} product={product} priority={i < 4} />
              ))}
            </div>

            {/* Pagination */}
            {total > 24 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <span className="text-sm text-text-secondary px-3">
                  Page {page} of {Math.ceil(total / 24)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= Math.ceil(total / 24)}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        ) : (
          <EmptyState
            icon="search"
            title="No products found"
            description="Try adjusting your filters or search terms to find what you're looking for."
            action={
              activeFilterCount > 0
                ? { label: "Clear Filters", href: "#" }
                : { label: "Browse Shop", href: "/shop" }
            }
          />
        )}
      </div>

      {/* Mobile filter drawer */}
      <div
        className={cn(
          "fixed inset-0 z-50 md:hidden transition-opacity duration-300",
          filterOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        <div className="absolute inset-0 bg-black/40" onClick={() => setFilterOpen(false)} />
        <div
          className={cn(
            "absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[80vh] overflow-y-auto transition-transform duration-300",
            filterOpen ? "translate-y-0" : "translate-y-full"
          )}
        >
          {/* Filter header */}
          <div className="sticky top-0 bg-white border-b border-border-light px-4 py-3 flex items-center justify-between">
            <h3 className="font-semibold">Filters</h3>
            <button onClick={() => setFilterOpen(false)} className="p-1">
              <X size={20} />
            </button>
          </div>

          <div className="p-4 space-y-6">
            {/* Category filter */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Category</h4>
              <div className="space-y-2">
                {CATEGORIES.map((cat) => (
                  <label
                    key={cat.slug}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-muted cursor-pointer transition-colors"
                  >
                    <input
                      type="radio"
                      name="category"
                      checked={selectedCategory === cat.slug}
                      onChange={() => {
                        setSelectedCategory(selectedCategory === cat.slug ? "" : cat.slug);
                        setPage(1);
                      }}
                      className="w-4 h-4 text-accent border-border accent-accent"
                    />
                    <span className="text-sm">{cat.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Price range */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Price Range</h4>
              <div className="space-y-2">
                {PRICE_RANGES.map((range) => (
                  <label
                    key={range.label}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-muted cursor-pointer transition-colors"
                  >
                    <input
                      type="radio"
                      name="price"
                      checked={
                        selectedPriceRange?.min === range.min &&
                        selectedPriceRange?.max === range.max
                      }
                      onChange={() => {
                        if (
                          selectedPriceRange?.min === range.min &&
                          selectedPriceRange?.max === range.max
                        ) {
                          setSelectedPriceRange(null);
                        } else {
                          setSelectedPriceRange({ min: range.min, max: range.max });
                        }
                        setPage(1);
                      }}
                      className="w-4 h-4 text-accent border-border accent-accent"
                    />
                    <span className="text-sm">{range.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Availability */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Availability</h4>
              <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-muted cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => {
                    setInStockOnly(e.target.checked);
                    setPage(1);
                  }}
                  className="w-4 h-4 text-accent border-border rounded accent-accent"
                />
                <span className="text-sm">In Stock Only</span>
              </label>
              <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-muted cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={onSaleOnly}
                  onChange={(e) => {
                    setOnSaleOnly(e.target.checked);
                    setPage(1);
                  }}
                  className="w-4 h-4 text-accent border-border rounded accent-accent"
                />
                <span className="text-sm">On Sale</span>
              </label>
            </div>
          </div>

          {/* Filter footer */}
          <div className="sticky bottom-0 bg-white border-t border-border-light p-4 flex gap-3">
            <Button variant="outline" className="flex-1" onClick={clearFilters}>
              Clear All
            </Button>
            <Button className="flex-1" onClick={() => setFilterOpen(false)}>
              Show Results ({total})
            </Button>
          </div>
        </div>
      </div>

      {/* Desktop filter sidebar (shown inline on desktop) */}
    </div>
  );
}

export default function ShopPage() {
  return (
    <Suspense fallback={<div className="container-shop py-8"><ProductGridSkeleton count={8} /></div>}>
      <ShopContent />
    </Suspense>
  );
}
