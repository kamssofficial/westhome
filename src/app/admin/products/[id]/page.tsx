"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

export default function AdminProductEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);

  const [form, setForm] = useState({
    name: "", sku: "", description: "", shortDescription: "",
    regularPrice: "", salePrice: "", stockQuantity: "", lowStockThreshold: "5",
    trackInventory: true, allowBackorder: false, categoryId: "", subcategoryId: "",
    isFeatured: false, isBestseller: false, isNewArrival: false, isComingSoon: false,
    status: "DRAFT", purchaseMethod: "BOTH",
    allowCustomSize: false, customSizeUnit: "cm",
    seoTitle: "", seoDescription: "",
  });

  useEffect(() => {
    Promise.all([
      fetch(`/api/products/${id}`).then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
    ]).then(([prodData, catData]) => {
      if (prodData.product) {
        const p = prodData.product;
        setForm({
          name: p.name || "", sku: p.sku || "", description: p.description || "",
          shortDescription: p.shortDescription || "",
          regularPrice: String(p.regularPrice || ""), salePrice: p.salePrice ? String(p.salePrice) : "",
          stockQuantity: String(p.stockQuantity || 0), lowStockThreshold: String(p.lowStockThreshold || 5),
          trackInventory: p.trackInventory ?? true, allowBackorder: p.allowBackorder ?? false,
          categoryId: p.categoryId || "", subcategoryId: p.subcategoryId || "",
          isFeatured: p.isFeatured ?? false, isBestseller: p.isBestseller ?? false,
          isNewArrival: p.isNewArrival ?? false, isComingSoon: p.isComingSoon ?? false,
          status: p.status || "DRAFT", purchaseMethod: p.purchaseMethod || "BOTH",
          allowCustomSize: p.allowCustomSize ?? false, customSizeUnit: p.customSizeUnit || "cm",
          seoTitle: p.seoTitle || "", seoDescription: p.seoDescription || "",
        });
      }
      setCategories(catData.categories || []);
    }).finally(() => setLoading(false));
  }, [id]);

  const selectedCategory = categories.find((c) => c.id === form.categoryId);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          regularPrice: parseFloat(form.regularPrice) || 0,
          salePrice: form.salePrice ? parseFloat(form.salePrice) : null,
          stockQuantity: parseInt(form.stockQuantity) || 0,
          lowStockThreshold: parseInt(form.lowStockThreshold) || 5,
        }),
      });
      if (res.ok) {
        toast.success("Product updated");
      } else {
        toast.error("Failed to update");
      }
    } catch { toast.error("Failed to update"); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    try {
      await fetch(`/api/products/${id}`, { method: "DELETE" });
      toast.success("Product deleted");
      router.push("/admin/products");
    } catch { toast.error("Failed to delete"); }
  };

  const inputClass = "w-full px-3 py-2.5 bg-white border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30";

  if (loading) return <div className="py-8"><div className="animate-pulse h-64 bg-surface-muted rounded-xl" /></div>;

  return (
    <div className="max-w-3xl">
      <Link href="/admin/products" className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-foreground mb-4">
        <ArrowLeft size={16} /> Back to Products
      </Link>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Edit Product</h1>
        <button onClick={handleDelete} className="p-2 text-text-muted hover:text-error rounded-lg transition-colors">
          <Trash2 size={18} />
        </button>
      </div>

      <div className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-xl border border-border-light p-5">
          <h2 className="font-semibold mb-4">Basic Information</h2>
          <div className="space-y-4">
            <div><label className="text-xs font-medium text-text-secondary mb-1 block">Product Name *</label><input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} /></div>
            <div><label className="text-xs font-medium text-text-secondary mb-1 block">SKU</label><input type="text" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className={inputClass} /></div>
            <div><label className="text-xs font-medium text-text-secondary mb-1 block">Short Description</label><input type="text" value={form.shortDescription} onChange={(e) => setForm({ ...form, shortDescription: e.target.value })} className={inputClass} maxLength={160} /></div>
            <div><label className="text-xs font-medium text-text-secondary mb-1 block">Description</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={cn(inputClass, "min-h-[120px] resize-y")} rows={5} /></div>
          </div>
        </div>

        {/* Pricing & Stock */}
        <div className="bg-white rounded-xl border border-border-light p-5">
          <h2 className="font-semibold mb-4">Pricing & Stock</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="text-xs font-medium text-text-secondary mb-1 block">Regular Price (₹) *</label><input type="number" step="0.01" value={form.regularPrice} onChange={(e) => setForm({ ...form, regularPrice: e.target.value })} className={inputClass} /></div>
            <div><label className="text-xs font-medium text-text-secondary mb-1 block">Sale Price (₹)</label><input type="number" step="0.01" value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: e.target.value })} className={inputClass} /></div>
            <div><label className="text-xs font-medium text-text-secondary mb-1 block">Stock</label><input type="number" value={form.stockQuantity} onChange={(e) => setForm({ ...form, stockQuantity: e.target.value })} className={inputClass} /></div>
          </div>
          <div className="flex items-center gap-6 mt-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={form.trackInventory} onChange={(e) => setForm({ ...form, trackInventory: e.target.checked })} className="accent-accent" /> Track inventory</label>
            <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={form.allowBackorder} onChange={(e) => setForm({ ...form, allowBackorder: e.target.checked })} className="accent-accent" /> Allow backorder</label>
          </div>
        </div>

        {/* Category */}
        <div className="bg-white rounded-xl border border-border-light p-5">
          <h2 className="font-semibold mb-4">Category</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="text-xs font-medium text-text-secondary mb-1 block">Category *</label><select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className={inputClass}><option value="">Select</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            {selectedCategory?.subcategories?.length > 0 && (
              <div><label className="text-xs font-medium text-text-secondary mb-1 block">Subcategory</label><select value={form.subcategoryId} onChange={(e) => setForm({ ...form, subcategoryId: e.target.value })} className={inputClass}><option value="">None</option>{selectedCategory.subcategories.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
            )}
          </div>
        </div>

        {/* Status */}
        <div className="bg-white rounded-xl border border-border-light p-5">
          <h2 className="font-semibold mb-4">Status & Flags</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div><label className="text-xs font-medium text-text-secondary mb-1 block">Status</label><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputClass}><option value="DRAFT">Draft</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option><option value="ARCHIVED">Archived</option></select></div>
            <div><label className="text-xs font-medium text-text-secondary mb-1 block">Purchase Method</label><select value={form.purchaseMethod} onChange={(e) => setForm({ ...form, purchaseMethod: e.target.value })} className={inputClass}><option value="BUY_ONLINE">Buy Online</option><option value="WHATSAPP">WhatsApp Only</option><option value="BOTH">Both</option></select></div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {([["isFeatured", "Featured"], ["isBestseller", "Bestseller"], ["isNewArrival", "New Arrival"], ["isComingSoon", "Coming Soon"], ["allowCustomSize", "Custom Size"]] as const).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form[key] as boolean} onChange={(e) => setForm({ ...form, [key]: e.target.checked })} className="accent-accent" />
                {label}
              </label>
            ))}
          </div>
        </div>

        {/* SEO */}
        <div className="bg-white rounded-xl border border-border-light p-5">
          <h2 className="font-semibold mb-4">SEO</h2>
          <div className="space-y-4">
            <div><label className="text-xs font-medium text-text-secondary mb-1 block">SEO Title</label><input type="text" value={form.seoTitle} onChange={(e) => setForm({ ...form, seoTitle: e.target.value })} className={inputClass} maxLength={70} /></div>
            <div><label className="text-xs font-medium text-text-secondary mb-1 block">Meta Description</label><textarea value={form.seoDescription} onChange={(e) => setForm({ ...form, seoDescription: e.target.value })} className={cn(inputClass, "resize-y")} rows={2} maxLength={160} /></div>
          </div>
        </div>

        <Button onClick={handleSave} loading={saving} size="lg"><Save size={16} /> Save Changes</Button>
      </div>
    </div>
  );
}
