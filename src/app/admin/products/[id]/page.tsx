"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Trash2, Plus, PackagePlus, X } from "lucide-react";
import Button from "@/components/ui/Button";
import ImageUploader from "@/components/admin/ImageUploader";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface VariantItem {
  id: string;
  name: string;
  price: number;
  salePrice: number | null;
  stockQuantity: number;
  position: number;
  isActive: boolean;
  attributes?: { id: string; value: string; variantAttribute: { id: string; name: string } }[];
}

export default function AdminProductEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const productCacheKey = "wh-cache-product-" + id;
  const [loading, setLoading] = useState(() => {
    try {
      const raw = sessionStorage.getItem(productCacheKey);
      if (raw) { const e = JSON.parse(raw); if (e.expires > Date.now()) return false; }
    } catch {}
    return true;
  });
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);

  const [form, setForm] = useState({
    name: "", sku: "", description: "", shortDescription: "",
    regularPrice: "", salePrice: "", stockQuantity: "", lowStockThreshold: "5",
    trackInventory: true, allowBackorder: false, categoryId: "", subcategoryId: "",
    isFeatured: false, isBestseller: false, isNewArrival: false, isComingSoon: false,
    status: "DRAFT", purchaseMethod: "BOTH",
    // Physical dimensions
    height: "", width: "", length: "", depth: "", diameter: "",
    dimensionUnit: "cm", weight: "", weightUnit: "kg",
    capacity: "", capacityUnit: "L",
    // Physical attributes
    material: "", color: "", finish: "", shape: "", pattern: "",
    style: "", mountingType: "", usageLocation: "",
    // Product information
    careInstructions: "", warranty: "",
    // Packaging
    packagingType: "", packagingDimensions: "", packagingWeight: "", includedItems: "",
    // Custom sizing
    allowCustomSize: false, customSizeUnit: "cm",
    customSizeMinWidth: "", customSizeMinLength: "", customSizeMinHeight: "",
    customSizeMaxWidth: "", customSizeMaxLength: "", customSizeMaxHeight: "",
    customSizePricingMethod: "area", customSizeRequiresApproval: false,
    // SEO
    seoTitle: "", seoDescription: "",
  });

  const [images, setImages] = useState<any[]>([]);
  const [variants, setVariants] = useState<VariantItem[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(true);
  const [savingVariant, setSavingVariant] = useState(false);

  const loadVariants = () => {
    setLoadingVariants(true);
    fetch(`/api/admin/products/${id}/variants`)
      .then((r) => (r.ok ? r.json() : { variants: [] }))
      .then((d) => {
        setVariants(d.variants || []);
        setLoadingVariants(false);
      })
      .catch(() => {
        setVariants([]);
        setLoadingVariants(false);
      });
  };

  useEffect(() => {
    fetch(`/api/admin/products/${id}/variants`)
      .then((r) => (r.ok ? r.json() : { variants: [] }))
      .then((d) => {
        setVariants(d.variants || []);
        setLoadingVariants(false);
      })
      .catch(() => {
        setVariants([]);
        setLoadingVariants(false);
      });
  }, [id]);

  const reloadProduct = (silent = false) => {
    if (!silent) {
      setLoading(true);
      setLoadFailed(false);
    }
    Promise.all([
      fetch(`/api/products/${id}`, { cache: "no-store" }).then((r) =>
        r.ok ? r.json() : Promise.reject(new Error(`load ${r.status}`))
      ),
      fetch("/api/categories", { cache: "no-store" }).then((r) =>
        r.ok ? r.json() : { categories: [] }
      ),
    ])
      .then(([prodData, catData]) => {
        if (!prodData.product) throw new Error("not found");
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
          // Physical dimensions
          height: p.height ? String(p.height) : "", width: p.width ? String(p.width) : "",
          length: p.length ? String(p.length) : "", depth: p.depth ? String(p.depth) : "",
          diameter: p.diameter ? String(p.diameter) : "", dimensionUnit: p.dimensionUnit || "cm",
          weight: p.weight ? String(p.weight) : "", weightUnit: p.weightUnit || "kg",
          capacity: p.capacity ? String(p.capacity) : "", capacityUnit: p.capacityUnit || "L",
          // Physical attributes
          material: p.material || "", color: p.color || "", finish: p.finish || "",
          shape: p.shape || "", pattern: p.pattern || "", style: p.style || "",
          mountingType: p.mountingType || "", usageLocation: p.usageLocation || "",
          // Product information
          careInstructions: p.careInstructions || "", warranty: p.warranty || "",
          // Packaging
          packagingType: p.packagingType || "", packagingDimensions: p.packagingDimensions || "",
          packagingWeight: p.packagingWeight ? String(p.packagingWeight) : "", includedItems: p.includedItems || "",
          // Custom sizing
          allowCustomSize: p.allowCustomSize ?? false, customSizeUnit: p.customSizeUnit || "cm",
          customSizeMinWidth: p.customSizeMinWidth ? String(p.customSizeMinWidth) : "",
          customSizeMinLength: p.customSizeMinLength ? String(p.customSizeMinLength) : "",
          customSizeMinHeight: p.customSizeMinHeight ? String(p.customSizeMinHeight) : "",
          customSizeMaxWidth: p.customSizeMaxWidth ? String(p.customSizeMaxWidth) : "",
          customSizeMaxLength: p.customSizeMaxLength ? String(p.customSizeMaxLength) : "",
          customSizeMaxHeight: p.customSizeMaxHeight ? String(p.customSizeMaxHeight) : "",
          customSizePricingMethod: p.customSizePricingMethod || "area",
          customSizeRequiresApproval: p.customSizeRequiresApproval ?? false,
          // SEO
          seoTitle: p.seoTitle || "", seoDescription: p.seoDescription || "",
        });
        // Load images (always overwrite so removed images disappear on reload)
        setImages(
          (p.images || []).map((img: any) => ({
            id: img.id, url: img.url, alt: img.alt || "", isPrimary: img.isPrimary, position: img.position,
            imageType: img.imageType || "PRODUCT",
          }))
        );
        setCategories(catData.categories || []);
        setLoading(false);
      })
      .catch((err) => {
        if (silent) return; // keep the current form on a failed background refresh
        if (String(err?.message).includes("load 401")) {
          // Session expired while editing — send to login and come back here after
          toast.error("Your session expired. Please log in again.");
          router.replace(`/login?callbackUrl=${encodeURIComponent(`/admin/products/${id}`)}`);
          return;
        }
        setLoadFailed(true);
        setLoading(false);
      });
  };

  useEffect(() => {
    reloadProduct();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const selectedCategory = categories.find((c) => c.id === form.categoryId);

  const handleSave = async () => {
    if (!form.name.trim() || !form.regularPrice || !form.categoryId) {
      toast.error("Name, price, and category are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "PUT",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          regularPrice: parseFloat(form.regularPrice) || 0,
          salePrice: form.salePrice ? parseFloat(form.salePrice) : null,
          stockQuantity: parseInt(form.stockQuantity) || 0,
          lowStockThreshold: parseInt(form.lowStockThreshold) || 5,
          // Physical dimensions
          height: form.height ? parseFloat(form.height) : null,
          width: form.width ? parseFloat(form.width) : null,
          length: form.length ? parseFloat(form.length) : null,
          depth: form.depth ? parseFloat(form.depth) : null,
          diameter: form.diameter ? parseFloat(form.diameter) : null,
          weight: form.weight ? parseFloat(form.weight) : null,
          capacity: form.capacity ? parseFloat(form.capacity) : null,
          // Custom size
          customSizeMinWidth: form.customSizeMinWidth ? parseFloat(form.customSizeMinWidth) : null,
          customSizeMinLength: form.customSizeMinLength ? parseFloat(form.customSizeMinLength) : null,
          customSizeMinHeight: form.customSizeMinHeight ? parseFloat(form.customSizeMinHeight) : null,
          customSizeMaxWidth: form.customSizeMaxWidth ? parseFloat(form.customSizeMaxWidth) : null,
          customSizeMaxLength: form.customSizeMaxLength ? parseFloat(form.customSizeMaxLength) : null,
          customSizeMaxHeight: form.customSizeMaxHeight ? parseFloat(form.customSizeMaxHeight) : null,
          // Packaging
          packagingWeight: form.packagingWeight ? parseFloat(form.packagingWeight) : null,
          images: images,
        }),
      });
      if (res.status === 401) {
        toast.error("Your session expired. Please log in again.");
        router.replace(`/login?callbackUrl=${encodeURIComponent(`/admin/products/${id}`)}`);
        return;
      }
      if (res.ok) {
        // Close the editor and return to the list, which restores the saved
        // filters + scroll position (see ADMIN_VIEW_KEY / ADMIN_SCROLL_KEY in
        // the list page). Caches are cleared so the list refetches fresh data.
        clearProductCaches();
        toast.success("Product updated");
        router.push("/admin/products");
      } else {
        const data = await res.json().catch(() => null);
        toast.error(data?.error || "Failed to update product");
      }
    } catch { toast.error("Unable to reach the server. Please try again."); } finally { setSaving(false); }
  };

  // Drop cached copies so the list/edit pages don't keep showing a deleted product
  const clearProductCaches = () => {
    try {
      sessionStorage.removeItem(productCacheKey);
      sessionStorage.removeItem("wh-cache-/api/admin/products");
    } catch {}
  };

  const handleDelete = async () => {
    if (deleting) return;
    if (!confirm("Delete this product? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);

      if (res.ok) {
        clearProductCaches();
        toast.success("Product deleted");
        router.push("/admin/products");
        return;
      }

      // Products with order history cannot be deleted without destroying those
      // orders — offer to archive instead (same behaviour as the products list).
      if (res.status === 409 && data?.canDelete === false) {
        const archiveIt = confirm(
          (data.message || "This product cannot be deleted.") + "\n\nArchive it instead?"
        );
        if (!archiveIt) return;
        const archiveRes = await fetch(`/api/admin/products/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "ARCHIVED" }),
        });
        if (archiveRes.ok) {
          clearProductCaches();
          toast.success("Product archived");
          router.push("/admin/products");
        } else {
          const archiveData = await archiveRes.json().catch(() => null);
          toast.error(archiveData?.error || archiveData?.message || "Failed to archive product");
        }
        return;
      }

      toast.error(data?.message || data?.error || ("Failed to delete product (" + res.status + ")"));
    } catch {
      toast.error("Unable to reach the server while deleting");
    } finally {
      setDeleting(false);
    }
  };

  const handleAddDefaultSizes = async () => {
    setSavingVariant(true);
    try {
      const res = await fetch("/api/admin/products/batch-size-variants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: [id] }),
      });
      const data = await res.json().catch(() => null);
      const result = data?.results?.[0];
      if (res.ok && result && !result.error) {
        if (result.created > 0) {
          toast.success(`Added ${result.created} size variants`);
          loadVariants();
        } else {
          toast.success("Size variants already exist");
        }
      } else {
        toast.error(result?.error || data?.error || `Failed to add variants (${res.status})`);
      }
    } catch { toast.error("Unable to reach the server while adding variants"); } finally { setSavingVariant(false); }
  };

  const handleUpdateVariant = async (
    variantId: string,
    data: { name?: string; price?: number; salePrice?: number | null; stockQuantity?: number }
  ) => {
    try {
      const res = await fetch(`/api/admin/products/${id}/variants/${variantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        toast.success("Variant updated");
        loadVariants();
      } else {
        const d = await res.json().catch(() => null);
        toast.error(d?.error || `Failed to update variant (${res.status})`);
      }
    } catch { toast.error("Unable to reach the server while updating variant"); }
  };

  const handleDeleteVariant = async (variantId: string) => {
    if (!confirm("Delete this variant? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/admin/products/${id}/variants/${variantId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Variant deleted");
        loadVariants();
      } else {
        const d = await res.json().catch(() => null);
        toast.error(d?.error || `Failed to delete variant (${res.status})`);
      }
    } catch { toast.error("Unable to reach the server while deleting variant"); }
  };

  const handleAddVariant = async () => {
    const name = prompt("Variant name (e.g. Small, Medium, XL):");
    if (!name) return;
    const priceStr = prompt("Regular price (₹):");
    if (!priceStr) return;
    const price = parseFloat(priceStr);
    if (isNaN(price) || price <= 0) { toast.error("Invalid price"); return; }
    const saleStr = prompt("Sale price (₹) — leave blank for no sale:");
    const salePrice = saleStr && saleStr.trim() !== "" ? parseFloat(saleStr) : null;
    if (saleStr && saleStr.trim() !== "" && (isNaN(salePrice as number) || (salePrice as number) <= 0)) { toast.error("Invalid sale price"); return; }
    setSavingVariant(true);
    try {
      const res = await fetch(`/api/admin/products/${id}/variants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, price, salePrice,
          attributes: [{ attributeName: "Size", value: name }],
        }),
      });
      if (res.ok) {
        toast.success("Variant created");
        loadVariants();
      } else {
        const data = await res.json().catch(() => null);
        toast.error(data?.error || `Failed to create variant (${res.status})`);
      }
    } catch { toast.error("Unable to reach the server while creating variant"); } finally { setSavingVariant(false); }
  };

  const inputClass = "w-full px-3 py-2.5 bg-white border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30";

  // Show form immediately — fields populate as data loads
  // (removing the full-page skeleton that blocked the UI for seconds)

  if (loadFailed) {
    return (
      <div className="max-w-md py-16 text-center">
        <h1 className="text-lg font-semibold mb-2">Could not load this product</h1>
        <p className="text-sm text-text-secondary mb-6">
          The product may have been deleted, or the connection failed. Check your internet and try again.
        </p>
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" onClick={() => router.push("/admin/products")}>Back to Products</Button>
          <Button onClick={() => reloadProduct()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <Link href="/admin/products" className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-foreground mb-4">
        <ArrowLeft size={16} /> Back to Products
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3"><h1 className="text-xl font-semibold">Edit Product</h1>{form.sku && <span className="text-xs font-mono bg-surface-muted text-text-secondary px-2 py-1 rounded-lg border border-border">SKU: {form.sku}</span>}</div>
        <button onClick={handleDelete} disabled={deleting} title="Delete product" aria-label="Delete product" className="p-2 text-text-muted hover:text-error rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          <Trash2 size={18} />
        </button>
      </div>

      <div className="space-y-6">
        {/* Images */}
        <div className="bg-surface rounded-[1.35rem] border border-border p-5">
          <h2 className="font-semibold mb-4">Product Images</h2>
          <ImageUploader
            images={images}
            onChange={setImages}
            folder="products"
            maxImages={10}
            allowLifestyle
          />
        </div>

        {/* Basic Info */}
        <div className="bg-surface rounded-[1.35rem] border border-border p-5">
          <h2 className="font-semibold mb-4">Basic Information</h2>
          <div className="space-y-4">
            <div><label className="text-xs font-medium text-text-secondary mb-1 block">Product Name *</label><input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} /></div>
            <div><label className="text-xs font-medium text-text-secondary mb-1 block">SKU</label><input type="text" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className={inputClass} /></div>
            <div><label className="text-xs font-medium text-text-secondary mb-1 block">Short Description</label><input type="text" value={form.shortDescription} onChange={(e) => setForm({ ...form, shortDescription: e.target.value })} className={inputClass} maxLength={160} /></div>
            <div><label className="text-xs font-medium text-text-secondary mb-1 block">Description</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={cn(inputClass, "min-h-[120px] resize-y")} rows={5} /></div>
          </div>
        </div>

        {/* Pricing & Stock */}
        <div className="bg-surface rounded-[1.35rem] border border-border p-5">
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

        {/* Variants */}
        <div className="bg-surface rounded-[1.35rem] border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Size Variants</h2>
            <div className="flex items-center gap-2">
              <button onClick={handleAddVariant} disabled={savingVariant} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-surface-muted hover:bg-surface-muted/70 text-foreground rounded-lg transition-colors disabled:opacity-50">
                <Plus size={14} /> Custom Variant
              </button>
              <button onClick={handleAddDefaultSizes} disabled={savingVariant} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-accent text-white hover:bg-accent/90 rounded-lg transition-colors disabled:opacity-50">
                <PackagePlus size={14} /> Add S/M/L (₹499/₹699/₹899)
              </button>
            </div>
          </div>

          {loadingVariants ? (
            <div className="animate-pulse h-24 bg-surface-muted rounded-lg" />
          ) : variants.length === 0 ? (
            <p className="text-sm text-text-secondary py-4 text-center border border-dashed border-border rounded-lg">
              No variants yet. Click &quot;Add S/M/L&quot; to add Small, Medium and Large size options.
            </p>
          ) : (
            <div className="space-y-2">
              {variants.map((v) => (
                <div key={v.id} className="flex items-center gap-3 p-3 bg-surface-muted/40 rounded-lg border border-border">
                  <div className="w-28">
                    <input
                      defaultValue={v.name}
                      onBlur={(e) => { if (e.target.value !== v.name) handleUpdateVariant(v.id, { name: e.target.value }); }}
                      className="w-full px-2 py-1.5 bg-white border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                    />
                    <p className="text-[10px] text-text-muted mt-0.5 px-1">
                      {v.attributes?.map((a) => a.variantAttribute.name).join(", ") || "Size"}
                    </p>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    defaultValue={v.price}
                    onBlur={(e) => { const p = parseFloat(e.target.value); if (!isNaN(p) && p !== v.price) handleUpdateVariant(v.id, { price: p }); }}
                    className="w-28 px-2 py-1.5 bg-white border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                    placeholder="₹ price"
                    title="Regular price"
                  />
                  <input
                    type="number"
                    step="0.01"
                    defaultValue={v.salePrice ?? ""}
                    onBlur={(e) => { const s = e.target.value.trim() === "" ? null : parseFloat(e.target.value); if (s !== v.salePrice) handleUpdateVariant(v.id, { salePrice: (s && !isNaN(s)) ? s : null }); }}
                    className="w-28 px-2 py-1.5 bg-white border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                    placeholder="₹ sale"
                    title="Sale price (optional)"
                  />
                  <input
                    type="number"
                    defaultValue={v.stockQuantity ?? 0}
                    onBlur={(e) => { const s = parseInt(e.target.value) || 0; if (s !== v.stockQuantity) handleUpdateVariant(v.id, { stockQuantity: s }); }}
                    className="w-20 px-2 py-1.5 bg-white border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                    placeholder="Stock"
                  />
                  <span className="text-xs text-text-muted flex-1">Regular / Sale / Stock</span>
                  <button onClick={() => handleDeleteVariant(v.id)} className="p-1.5 text-text-muted hover:text-error rounded-md transition-colors" title="Delete variant">
                    <X size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-text-muted mt-3">
            Storefront shows a size selector only when variants exist. Live price/stock defaults to the first active variant.
          </p>
        </div>

        {/* Category */}
        <div className="bg-surface rounded-[1.35rem] border border-border p-5">
          <h2 className="font-semibold mb-4">Category</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="text-xs font-medium text-text-secondary mb-1 block">Category *</label><select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className={cn(inputClass, form.categoryId && "bg-primary text-white border-primary")}><option value="" className="text-black bg-white">Select</option>{categories.map((c) => <option key={c.id} value={c.id} className="text-black bg-white">{c.name}</option>)}</select></div>
            {selectedCategory?.subcategories?.length > 0 && (
              <div><label className="text-xs font-medium text-text-secondary mb-1 block">Subcategory</label><select value={form.subcategoryId} onChange={(e) => setForm({ ...form, subcategoryId: e.target.value })} className={cn(inputClass, form.subcategoryId && "bg-primary text-white border-primary")}><option value="" className="text-black bg-white">None</option>{selectedCategory.subcategories.map((s: any) => <option key={s.id} value={s.id} className="text-black bg-white">{s.name}</option>)}</select></div>
            )}
          </div>
        </div>

        {/* Status */}
        <div className="bg-surface rounded-[1.35rem] border border-border p-5">
          <h2 className="font-semibold mb-4">Status & Flags</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div><label className="text-xs font-medium text-text-secondary mb-1 block">Status</label><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputClass}><option value="DRAFT">Draft</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option><option value="ARCHIVED">Archived</option></select></div>
            <div><label className="text-xs font-medium text-text-secondary mb-1 block">Purchase Method</label><select value={form.purchaseMethod} onChange={(e) => setForm({ ...form, purchaseMethod: e.target.value })} className={inputClass}><option value="BUY_ONLINE">Buy Online</option><option value="WHATSAPP">WhatsApp Only</option><option value="BOTH">Both</option></select></div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {([["isFeatured", "Featured"], ["isBestseller", "Bestseller"], ["isNewArrival", "New Arrival"], ["isComingSoon", "Coming Soon"]] as const).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form[key] as boolean} onChange={(e) => setForm({ ...form, [key]: e.target.checked })} className="accent-accent" />
                {label}
              </label>
            ))}
          </div>
        </div>

        {/* Physical Dimensions */}
        <div className="bg-surface rounded-[1.35rem] border border-border p-5">
          <h2 className="font-semibold mb-4">Physical Dimensions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div><label className="text-xs font-medium text-text-secondary mb-1 block">Height</label><input type="number" step="0.1" value={form.height} onChange={(e) => setForm({ ...form, height: e.target.value })} className={inputClass} placeholder="0" /></div>
            <div><label className="text-xs font-medium text-text-secondary mb-1 block">Width</label><input type="number" step="0.1" value={form.width} onChange={(e) => setForm({ ...form, width: e.target.value })} className={inputClass} placeholder="0" /></div>
            <div><label className="text-xs font-medium text-text-secondary mb-1 block">Length</label><input type="number" step="0.1" value={form.length} onChange={(e) => setForm({ ...form, length: e.target.value })} className={inputClass} placeholder="0" /></div>
            <div><label className="text-xs font-medium text-text-secondary mb-1 block">Depth</label><input type="number" step="0.1" value={form.depth} onChange={(e) => setForm({ ...form, depth: e.target.value })} className={inputClass} placeholder="0" /></div>
            <div><label className="text-xs font-medium text-text-secondary mb-1 block">Diameter</label><input type="number" step="0.1" value={form.diameter} onChange={(e) => setForm({ ...form, diameter: e.target.value })} className={inputClass} placeholder="0" /></div>
            <div><label className="text-xs font-medium text-text-secondary mb-1 block">Dimension Unit</label><select value={form.dimensionUnit} onChange={(e) => setForm({ ...form, dimensionUnit: e.target.value })} className={inputClass}><option value="cm">cm</option><option value="mm">mm</option><option value="in">inches</option></select></div>
            <div><label className="text-xs font-medium text-text-secondary mb-1 block">Weight</label><input type="number" step="0.1" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} className={inputClass} placeholder="0" /></div>
            <div><label className="text-xs font-medium text-text-secondary mb-1 block">Weight Unit</label><select value={form.weightUnit} onChange={(e) => setForm({ ...form, weightUnit: e.target.value })} className={inputClass}><option value="kg">kg</option><option value="g">g</option></select></div>
          </div>
        </div>

        {/* Material & Appearance */}
        <div className="bg-surface rounded-[1.35rem] border border-border p-5">
          <h2 className="font-semibold mb-4">Material & Appearance</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="text-xs font-medium text-text-secondary mb-1 block">Material</label><input type="text" value={form.material} onChange={(e) => setForm({ ...form, material: e.target.value })} className={inputClass} placeholder="e.g. Ceramic, Wool, Velvet" /></div>
            <div><label className="text-xs font-medium text-text-secondary mb-1 block">Color</label><input type="text" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className={inputClass} placeholder="e.g. Gold, Cream, Black" /></div>
            <div><label className="text-xs font-medium text-text-secondary mb-1 block">Finish</label><input type="text" value={form.finish} onChange={(e) => setForm({ ...form, finish: e.target.value })} className={inputClass} placeholder="e.g. Matte, Gloss, Brushed" /></div>
            <div><label className="text-xs font-medium text-text-secondary mb-1 block">Shape</label><input type="text" value={form.shape} onChange={(e) => setForm({ ...form, shape: e.target.value })} className={inputClass} placeholder="e.g. Round, Rectangular" /></div>
            <div><label className="text-xs font-medium text-text-secondary mb-1 block">Pattern</label><input type="text" value={form.pattern} onChange={(e) => setForm({ ...form, pattern: e.target.value })} className={inputClass} placeholder="e.g. Solid, Geometric" /></div>
            <div><label className="text-xs font-medium text-text-secondary mb-1 block">Style</label><input type="text" value={form.style} onChange={(e) => setForm({ ...form, style: e.target.value })} className={inputClass} placeholder="e.g. Modern, Vintage" /></div>
            <div><label className="text-xs font-medium text-text-secondary mb-1 block">Mounting Type</label><input type="text" value={form.mountingType} onChange={(e) => setForm({ ...form, mountingType: e.target.value })} className={inputClass} placeholder="e.g. Wall-mount, Floor, Table" /></div>
            <div><label className="text-xs font-medium text-text-secondary mb-1 block">Usage Location</label><input type="text" value={form.usageLocation} onChange={(e) => setForm({ ...form, usageLocation: e.target.value })} className={inputClass} placeholder="e.g. Indoor, Bathroom" /></div>
          </div>
        </div>

        {/* Care & Packaging */}
        <div className="bg-surface rounded-[1.35rem] border border-border p-5">
          <h2 className="font-semibold mb-4">Care & Packaging</h2>
          <div className="space-y-4">
            <div><label className="text-xs font-medium text-text-secondary mb-1 block">Care Instructions</label><textarea value={form.careInstructions} onChange={(e) => setForm({ ...form, careInstructions: e.target.value })} className={cn(inputClass, "min-h-[80px] resize-y")} rows={3} placeholder="How to care for this product..." /></div>
            <div><label className="text-xs font-medium text-text-secondary mb-1 block">Warranty</label><input type="text" value={form.warranty} onChange={(e) => setForm({ ...form, warranty: e.target.value })} className={inputClass} placeholder="e.g. 1 year manufacturer warranty" /></div>
            <div><label className="text-xs font-medium text-text-secondary mb-1 block">Included Items</label><input type="text" value={form.includedItems} onChange={(e) => setForm({ ...form, includedItems: e.target.value })} className={inputClass} placeholder="What's included in the box" /></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><label className="text-xs font-medium text-text-secondary mb-1 block">Packaging Type</label><input type="text" value={form.packagingType} onChange={(e) => setForm({ ...form, packagingType: e.target.value })} className={inputClass} placeholder="e.g. Corrugated box" /></div>
              <div><label className="text-xs font-medium text-text-secondary mb-1 block">Packaging Dimensions</label><input type="text" value={form.packagingDimensions} onChange={(e) => setForm({ ...form, packagingDimensions: e.target.value })} className={inputClass} placeholder="e.g. 50x40x20 cm" /></div>
              <div><label className="text-xs font-medium text-text-secondary mb-1 block">Packaging Weight (kg)</label><input type="number" step="0.1" value={form.packagingWeight} onChange={(e) => setForm({ ...form, packagingWeight: e.target.value })} className={inputClass} placeholder="0" /></div>
            </div>
          </div>
        </div>

        {/* Custom Size */}
        <div className="bg-surface rounded-[1.35rem] border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Custom Size</h2>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.allowCustomSize} onChange={(e) => setForm({ ...form, allowCustomSize: e.target.checked })} className="accent-accent" />
              Enable Custom Sizing
            </label>
          </div>
          {form.allowCustomSize && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div><label className="text-xs font-medium text-text-secondary mb-1 block">Min Width</label><input type="number" value={form.customSizeMinWidth} onChange={(e) => setForm({ ...form, customSizeMinWidth: e.target.value })} className={inputClass} /></div>
                <div><label className="text-xs font-medium text-text-secondary mb-1 block">Min Length</label><input type="number" value={form.customSizeMinLength} onChange={(e) => setForm({ ...form, customSizeMinLength: e.target.value })} className={inputClass} /></div>
                <div><label className="text-xs font-medium text-text-secondary mb-1 block">Min Height</label><input type="number" value={form.customSizeMinHeight} onChange={(e) => setForm({ ...form, customSizeMinHeight: e.target.value })} className={inputClass} /></div>
                <div><label className="text-xs font-medium text-text-secondary mb-1 block">Max Width</label><input type="number" value={form.customSizeMaxWidth} onChange={(e) => setForm({ ...form, customSizeMaxWidth: e.target.value })} className={inputClass} /></div>
                <div><label className="text-xs font-medium text-text-secondary mb-1 block">Max Length</label><input type="number" value={form.customSizeMaxLength} onChange={(e) => setForm({ ...form, customSizeMaxLength: e.target.value })} className={inputClass} /></div>
                <div><label className="text-xs font-medium text-text-secondary mb-1 block">Max Height</label><input type="number" value={form.customSizeMaxHeight} onChange={(e) => setForm({ ...form, customSizeMaxHeight: e.target.value })} className={inputClass} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs font-medium text-text-secondary mb-1 block">Unit</label><select value={form.customSizeUnit} onChange={(e) => setForm({ ...form, customSizeUnit: e.target.value })} className={inputClass}><option value="cm">cm</option><option value="mm">mm</option><option value="in">inches</option></select></div>
                <div><label className="text-xs font-medium text-text-secondary mb-1 block">Pricing Method</label><select value={form.customSizePricingMethod} onChange={(e) => setForm({ ...form, customSizePricingMethod: e.target.value })} className={inputClass}><option value="area">By Area</option><option value="linear">By Length</option><option value="fixed">Fixed Price</option></select></div>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.customSizeRequiresApproval} onChange={(e) => setForm({ ...form, customSizeRequiresApproval: e.target.checked })} className="accent-accent" />
                Require admin approval for custom orders
              </label>
            </div>
          )}
        </div>

        {/* SEO */}
        <div className="bg-surface rounded-[1.35rem] border border-border p-5">
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
