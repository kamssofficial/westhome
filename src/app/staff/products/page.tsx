"use client";

import { useState, useEffect } from "react";
import { Search, ChevronDown, Pencil } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Product {
  id: string; name: string; slug: string; regularPrice: number; salePrice: number | null;
  stockQuantity: number; status: string; isActive: boolean;
  category: { name: string } | null; subcategory: { name: string } | null; images: { url: string; isPrimary: boolean }[];
}

export default function StaffProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [categories, setCategories] = useState<{ name: string; slug: string }[]>([]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("all", "true");
      if (search) params.set("q", search);
      if (categoryFilter) params.set("category", categoryFilter);
      params.set("limit", "50");
      const res = await fetch(`/api/products?${params.toString()}`);
      const data = await res.json();
      setProducts(data.products || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => {
    fetch("/api/categories").then(r => r.json()).then(d => setCategories(d.categories || [])).catch(() => {});
  }, []);

  useEffect(() => { fetchProducts(); }, [categoryFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#1a1917]">Products</h1>
        <p className="text-sm text-[#6b6560] mt-1">Browse and manage products</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={(e) => { e.preventDefault(); fetchProducts(); }} className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b0aba6]" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-black/[.08] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a574]/30 text-[#1a1917]" />
        </form>
        <div className="relative">
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2.5 pr-8 bg-white border border-black/[.08] rounded-xl text-sm focus:outline-none appearance-none text-[#1a1917]">
            <option value="">All Categories</option>
            {categories.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#b0aba6] pointer-events-none" />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-[#b0aba6] text-sm">Loading products...</div>
      ) : products.length === 0 ? (
        <div className="text-center py-12 text-[#b0aba6] text-sm">No products found</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((product) => {
            const img = product.images.find(i => i.isPrimary)?.url || product.images[0]?.url;
            return (
              <div key={product.id} className="bg-white rounded-2xl border border-black/[.06] overflow-hidden">
                <div className="aspect-square bg-[#f0ede8] relative">
                  {img ? <img src={img} alt={product.name} className="w-full h-full object-cover" /> :
                    <div className="w-full h-full flex items-center justify-center text-[#b0aba6] text-xs">No Image</div>}
                  <span className={cn("absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-medium",
                    product.stockQuantity > 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700")}>
                    {product.stockQuantity > 0 ? "In Stock" : "Out of Stock"}
                  </span>
                </div>
                <div className="p-3 relative">
                  <p className="text-[10px] text-[#d4a574] font-medium uppercase tracking-wider">{product.subcategory?.name || product.category?.name || "—"}</p>
                  <h3 className="text-sm font-medium text-[#1a1917] mt-0.5 line-clamp-1">{product.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm font-semibold text-[#1a1917]">₹{Number(product.regularPrice).toLocaleString()}</span>
                    {product.salePrice && <span className="text-xs text-[#b0aba6] line-through">₹{Number(product.salePrice).toLocaleString()}</span>}
                    </div>
                                        </div>
                    <Link href={"/admin/products/" + product.id} className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-[#d4a574] hover:text-[#c08a5a] transition-colors">
                      <Pencil size={10} /> Edit product
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
