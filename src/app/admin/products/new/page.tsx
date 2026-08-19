"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Upload, Plus, X } from "lucide-react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface Category {
  id: string;
  name: string;
  slug: string;
  subcategories: { id: string; name: string; slug: string }[];
}

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  const [form, setForm] = useState({
    name: "",
    sku: "",
    description: "",
    shortDescription: "",
    regularPrice: "",
    salePrice: "",
    stockQuantity: "0",
    lowStockThreshold: "5",
    trackInventory: true,
    allowBackorder: false,
    categoryId: "",
    subcategoryId: "",
    isFeatured: false,
    isBestseller: false,
    isNewArrival: false,
    status: "DRAFT",
    purchaseMethod: "BOTH",
    allowCustomSize: false,
    customSizeUnit: "cm",
    seoTitle: "",
    seoDescription: "",
  });

  const [variants, setVariants] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) => setCategories(data.categories || []));
  }, []);

  const selectedCategory = categories.find((c) => c.id === form.categoryId);

  const handleAddVariant = () => {
    setVariants([
      ...variants,
      {
        name: "",
        sku: "",
        price: "",
        salePrice: "",
        stockQuantity: "0",
        isActive: true,
        attributes: [],
      },
    ]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.regularPrice || !form.categoryId) {
      toast.error("Name, price, and category are required");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          regularPrice: parseFloat(form.regularPrice),
          salePrice: form.salePrice ? parseFloat(form.salePrice) : null,
          stockQuantity: parseInt(form.stockQuantity),
          lowStockThreshold: parseInt(form.lowStockThreshold),
          variants: variants.map((v) => ({
            ...v,
            price: parseFloat(v.price || form.regularPrice),
            salePrice: v.salePrice ? parseFloat(v.salePrice) : null,
            stockQuantity: parseInt(v.stockQuantity || "0"),
          })),
        }),
      });

      if (res.ok) {
        toast.success("Product created!");
        router.push("/admin/products");
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to create product");
      }
    } catch {
      toast.error("Failed to create product");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-3 py-2.5 bg-white border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30";

  return (
    <div className="max-w-3xl">
      <Link href="/admin/products" className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-foreground mb-4">
        <ArrowLeft size={16} /> Back to Products
      </Link>

      <h1 className="text-xl font-semibold mb-6">Create New Product</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-xl border border-border-light p-5">
          <h2 className="font-semibold mb-4">Basic Information</h2>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-text-secondary mb-1 block">Product Name *</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} required />
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary mb-1 block">SKU</label>
              <input type="text" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className={inputClass} placeholder="Auto-generated if empty" />
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary mb-1 block">Short Description</label>
              <input type="text" value={form.shortDescription} onChange={(e) => setForm({ ...form, shortDescription: e.target.value })} className={inputClass} maxLength={160} />
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary mb-1 block">Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={cn(inputClass, "min-h-[120px] resize-y")} rows={5} />
            </div>
          </div>
        </div>

        {/* Pricing & Stock */}
        <div className="bg-white rounded-xl border border-border-light p-5">
          <h2 className="font-semibold mb-4">Pricing & Stock</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-text-secondary mb-1 block">Regular Price (₹) *</label>
              <input type="number" step="0.01" value={form.regularPrice} onChange={(e) => setForm({ ...form, regularPrice: e.target.value })} className={inputClass} required />
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary mb-1 block">Sale Price (₹)</label>
              <input type="number" step="0.01" value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary mb-1 block">Stock Quantity</label>
              <input type="number" value={form.stockQuantity} onChange={(e) => setForm({ ...form, stockQuantity: e.target.value })} className={inputClass} />
            </div>
          </div>
          <div className="flex items-center gap-6 mt-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.trackInventory} onChange={(e) => setForm({ ...form, trackInventory: e.target.checked })} className="accent-accent" />
              Track inventory
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.allowBackorder} onChange={(e) => setForm({ ...form, allowBackorder: e.target.checked })} className="accent-accent" />
              Allow backorder
            </label>
          </div>
        </div>

        {/* Category */}
        <div className="bg-white rounded-xl border border-border-light p-5">
          <h2 className="font-semibold mb-4">Category</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-text-secondary mb-1 block">Category *</label>
              <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value, subcategoryId: "" })} className={inputClass} required>
                <option value="">Select Category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            {selectedCategory?.subcategories && selectedCategory.subcategories.length > 0 && (
              <div>
                <label className="text-xs font-medium text-text-secondary mb-1 block">Subcategory</label>
                <select value={form.subcategoryId} onChange={(e) => setForm({ ...form, subcategoryId: e.target.value })} className={inputClass}>
                  <option value="">None</option>
                  {selectedCategory.subcategories.map((sub) => (
                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Status & Flags */}
        <div className="bg-white rounded-xl border border-border-light p-5">
          <h2 className="font-semibold mb-4">Status & Visibility</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-text-secondary mb-1 block">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputClass}>
                <option value="DRAFT">Draft</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary mb-1 block">Purchase Method</label>
              <select value={form.purchaseMethod} onChange={(e) => setForm({ ...form, purchaseMethod: e.target.value })} className={inputClass}>
                <option value="BUY_ONLINE">Buy Online</option>
                <option value="WHATSAPP">WhatsApp Only</option>
                <option value="BOTH">Both</option>
              </select>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 mt-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} className="accent-accent" />
              Featured
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.isBestseller} onChange={(e) => setForm({ ...form, isBestseller: e.target.checked })} className="accent-accent" />
              Bestseller
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.isNewArrival} onChange={(e) => setForm({ ...form, isNewArrival: e.target.checked })} className="accent-accent" />
              New Arrival
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.allowCustomSize} onChange={(e) => setForm({ ...form, allowCustomSize: e.target.checked })} className="accent-accent" />
              Custom Size
            </label>
          </div>
        </div>

        {/* Variants */}
        <div className="bg-white rounded-xl border border-border-light p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Variants</h2>
            <Button type="button" variant="outline" size="sm" onClick={handleAddVariant}>
              <Plus size={14} /> Add Variant
            </Button>
          </div>
          {variants.length === 0 ? (
            <p className="text-sm text-text-muted">No variants. Add variants for products with multiple options (size, color, etc).</p>
          ) : (
            <div className="space-y-3">
              {variants.map((variant, index) => (
                <div key={index} className="p-3 bg-surface-muted rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Variant {index + 1}</span>
                    <button type="button" onClick={() => setVariants(variants.filter((_, i) => i !== index))} className="p-1 text-error hover:bg-error/10 rounded">
                      <X size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <input type="text" placeholder="Name (e.g. Blue / Large)" value={variant.name} onChange={(e) => { const v = [...variants]; v[index].name = e.target.value; setVariants(v); }} className={cn(inputClass, "text-xs")} />
                    <input type="text" placeholder="SKU" value={variant.sku} onChange={(e) => { const v = [...variants]; v[index].sku = e.target.value; setVariants(v); }} className={cn(inputClass, "text-xs")} />
                    <input type="number" placeholder="Price" value={variant.price} onChange={(e) => { const v = [...variants]; v[index].price = e.target.value; setVariants(v); }} className={cn(inputClass, "text-xs")} />
                    <input type="number" placeholder="Stock" value={variant.stockQuantity} onChange={(e) => { const v = [...variants]; v[index].stockQuantity = e.target.value; setVariants(v); }} className={cn(inputClass, "text-xs")} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SEO */}
        <div className="bg-white rounded-xl border border-border-light p-5">
          <h2 className="font-semibold mb-4">SEO</h2>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-text-secondary mb-1 block">SEO Title</label>
              <input type="text" value={form.seoTitle} onChange={(e) => setForm({ ...form, seoTitle: e.target.value })} className={inputClass} maxLength={70} />
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary mb-1 block">Meta Description</label>
              <textarea value={form.seoDescription} onChange={(e) => setForm({ ...form, seoDescription: e.target.value })} className={cn(inputClass, "resize-y")} rows={2} maxLength={160} />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3">
          <Button type="submit" loading={loading} size="lg">
            Create Product
          </Button>
          <Link href="/admin/products">
            <Button type="button" variant="ghost" size="lg">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
