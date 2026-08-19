"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus, Search, Edit, Trash2, Eye, Package } from "lucide-react";
import Button from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatPrice, getStatusColor, cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface Product {
  id: string;
  name: string;
  slug: string;
  regularPrice: number;
  salePrice: number | null;
  stockQuantity: number;
  status: string;
  isActive: boolean;
  isFeatured: boolean;
  isNewArrival: boolean;
  category: { name: string };
  images: { url: string }[];
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      params.set("page", String(page));
      params.set("limit", "20");

      const res = await fetch(`/api/products?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products);
        setTotal(data.total);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [search, page]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Product deleted");
        fetchProducts();
      } else {
        toast.error("Failed to delete product");
      }
    } catch {
      toast.error("Failed to delete product");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Products</h1>
        <Link href="/admin/products/new">
          <Button size="sm">
            <Plus size={16} />
            Add Product
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search products..."
          className="w-full pl-9 pr-4 py-2 bg-white border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
      </div>

      {/* Products table */}
      <div className="bg-white rounded-xl border border-border-light overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-light bg-surface-muted/50">
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Product</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary hidden md:table-cell">Category</th>
                <th className="text-right px-4 py-3 font-medium text-text-secondary">Price</th>
                <th className="text-right px-4 py-3 font-medium text-text-secondary hidden md:table-cell">Stock</th>
                <th className="text-center px-4 py-3 font-medium text-text-secondary">Status</th>
                <th className="text-right px-4 py-3 font-medium text-text-secondary">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border-light">
                    <td className="px-4 py-3"><Skeleton className="h-5 w-40" /></td>
                    <td className="px-4 py-3 hidden md:table-cell"><Skeleton className="h-5 w-24" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-5 w-16 ml-auto" /></td>
                    <td className="px-4 py-3 hidden md:table-cell"><Skeleton className="h-5 w-12 ml-auto" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-5 w-16 mx-auto" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-5 w-16 ml-auto" /></td>
                  </tr>
                ))
              ) : products.length > 0 ? (
                products.map((product) => (
                  <tr key={product.id} className="border-b border-border-light last:border-0 hover:bg-surface-muted/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-surface-muted flex-shrink-0">
                          {product.images[0] && (
                            <Image src={product.images[0].url} alt={product.name} width={40} height={40} className="w-full h-full object-cover" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate max-w-[200px]">{product.name}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            {product.isFeatured && <span className="text-[10px] px-1 bg-accent/10 text-accent rounded">Featured</span>}
                            {product.isNewArrival && <span className="text-[10px] px-1 bg-info/10 text-info rounded">New</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-text-secondary">{product.category?.name}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatPrice(product.salePrice || product.regularPrice)}</td>
                    <td className="px-4 py-3 text-right hidden md:table-cell">
                      <span className={cn(product.stockQuantity <= 5 ? "text-error font-medium" : "")}>
                        {product.stockQuantity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", getStatusColor(product.status))}>
                        {product.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/products/${product.slug}`} target="_blank" className="p-1.5 hover:bg-surface-muted rounded-lg transition-colors">
                          <Eye size={14} className="text-text-muted" />
                        </Link>
                        <Link href={`/admin/products/${product.id}`} className="p-1.5 hover:bg-surface-muted rounded-lg transition-colors">
                          <Edit size={14} className="text-text-muted" />
                        </Link>
                        <button onClick={() => handleDelete(product.id, product.name)} className="p-1.5 hover:bg-error/10 rounded-lg transition-colors">
                          <Trash2 size={14} className="text-error" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-text-muted">
                    <Package size={32} className="mx-auto mb-2 text-text-muted" />
                    <p>No products found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {total > 20 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span className="text-sm text-text-secondary">Page {page} of {Math.ceil(total / 20)}</span>
          <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}
