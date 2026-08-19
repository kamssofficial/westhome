"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useParams } from "next/navigation";
import { SlidersHorizontal, X, ChevronDown } from "lucide-react";
import ProductCard from "@/components/ui/ProductCard";
import { ProductGridSkeleton } from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import Button from "@/components/ui/Button";
import { cn, formatPrice } from "@/lib/utils";
import type { Product, Category, Subcategory } from "@/types";

const SORT_OPTIONS = [
  { value: "recommended", label: "Recommended" },
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "bestselling", label: "Best Selling" },
];

function CollectionContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const subcategorySlug = params.subcategory as string | undefined;

  const [products, setProducts] = useState<Product[]>([]);
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [sort, setSort] = useState("recommended");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch category info
        const catRes = await fetch("/api/categories");
        if (catRes.ok) {
          const catData = await catRes.json();
          const found = catData.categories.find((c: Category) => c.slug === slug);
          setCategory(found || null);
        }

        // Fetch products
        const params = new URLSearchParams();
        params.set("category", slug);
        if (subcategorySlug) params.set("subcategory", subcategorySlug);
        params.set("sort", sort);
        params.set("page", String(page));
        params.set("limit", "24");

        const prodRes = await fetch(`/api/products?${params.toString()}`);
        if (prodRes.ok) {
          const prodData = await prodRes.json();
          setProducts(prodData.products || []);
          setTotal(prodData.total || 0);
        }
      } catch (err) {
        console.error("Collection fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [slug, subcategorySlug, sort, page]);

  return (
    <div className="animate-fade-in">
      {/* Category header */}
      <div className="bg-surface-muted/50 border-b border-border-light">
        <div className="container-shop py-4 md:py-6">
          <h1 className="text-xl md:text-2xl font-serif text-foreground capitalize">
            {subcategorySlug?.replace(/-/g, " ") || category?.name || slug.replace(/-/g, " ")}
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            {total > 0 ? `${total} products` : "Browse this collection"}
          </p>

          {/* Subcategory links */}
          {category?.subcategories && category.subcategories.length > 0 && (
            <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-hide">
              {category.subcategories.map((sub) => (
                <Link
                  key={sub.id}
                  href={`/collections/${slug}/${sub.slug}`}
                  className={cn(
                    "flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                    subcategorySlug === sub.slug
                      ? "bg-primary text-white border-primary"
                      : "bg-white text-text-secondary border-border hover:border-foreground/20"
                  )}
                >
                  {sub.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="container-shop py-4 md:py-6">
        {/* Sort */}
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <span className="text-sm text-text-secondary">{total} products</span>
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => { setSort(e.target.value); setPage(1); }}
              className="px-3 py-2 pr-8 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 appearance-none"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          </div>
        </div>

        {loading ? (
          <ProductGridSkeleton count={8} />
        ) : products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 stagger-in">
            {products.map((product, i) => (
              <ProductCard key={product.id} product={product} priority={i < 4} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon="product"
            title="No products in this collection"
            description="This collection doesn't have any products yet. Check back soon!"
            action={{ label: "Browse All Products", href: "/shop" }}
          />
        )}

        {total > 24 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <span className="text-sm text-text-secondary px-3">Page {page} of {Math.ceil(total / 24)}</span>
            <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / 24)} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        )}
      </div>
    </div>
  );
}

// Need to import Link
import Link from "next/link";

export default function CollectionPage() {
  return (
    <Suspense fallback={<div className="container-shop py-8"><ProductGridSkeleton count={8} /></div>}>
      <CollectionContent />
    </Suspense>
  );
}
