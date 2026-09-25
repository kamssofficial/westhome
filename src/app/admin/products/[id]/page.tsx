"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Trash2, Plus, PackagePlus, X } from "lucide-react";
import Button from "@/components/ui/Button";
import ImageUploader from "@/components/admin/ImageUploader";
import {
  type ProductFormState, type SetProductForm,
  BasicInfoSection, PricingStockSection, CategorySection, StatusSection, AdditionalDetailsSection, Section,
} from "@/components/admin/ProductFormFields";
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

const EMPTY_FORM: ProductFormState = {
  name: "", sku: "", description: "", shortDescription: "",
  regularPrice: "", salePrice: "", stockQuantity: "", lowStockThreshold: "5",
  trackInventory: true, allowBackorder: false, categoryId: "", subcategoryId: "",
  isFeatured: false, isBestseller: false, isNewArrival: false, isComingSoon: false,
  status: "DRAFT", purchaseMethod: "BOTH",
  height: "", width: "", length: "", depth: "", diameter: "",
  dimensionUnit: "cm", weight: "", weightUnit: "kg", capacity: "", capacityUnit: "L",
  material: "", color: "", finish: "", shape: "", pattern: "",
  style: "", mountingType: "", usageLocation: "",
  careInstructions: "", warranty: "",
  packagingType: "", packagingDimensions: "", packagingWeight: "", includedItems: "",
  allowCustomSize: false, customSizeUnit: "cm",
  customSizeMinWidth: "", customSizeMinLength: "", customSizeMinHeight: "",
  customSizeMaxWidth: "", customSizeMaxLength: "", customSizeMaxHeight: "",
  customSizePricingMethod: "area", customSizeRequiresApproval: false,
  seoTitle: "", seoDescription: "",
};

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

  const [form, setFormState] = useState<ProductFormState>(EMPTY_FORM);
  const setForm: SetProductForm = (patch) => setFormState((f) => ({ ...f, ...patch }));

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
        setFormState({
          ...EMPTY_FORM,
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

  // With size variants, the storefront charges variant prices — the general
  // price is derived from them, so show it read-only instead of two competing
  // price inputs (the "two prices" problem).
  const hasVariants = variants.length > 0;
  const priceSummary = (() => {
    const priced = variants.filter((v) => v.price > 0);
    if (priced.length === 0) return null;
    const sale = priced.filter((v) => v.salePrice != null && v.salePrice > 0);
    const fmt = (n: number) => "₹" + n.toLocaleString("en-IN");
    if (sale.length === priced.length && priced.length > 1) {
      const lo = Math.min(...priced.map((v) => v.salePrice as number));
      const hi = Math.max(...priced.map((v) => v.salePrice as number));
      return lo === hi ? fmt(lo) : `${fmt(lo)} – ${fmt(hi)}`;
    }
    const lo = Math.min(...priced.map((v) => v.price));
    const hi = Math.max(...priced.map((v) => v.price));
    return lo === hi ? fmt(lo) : `${fmt(lo)} – ${fmt(hi)}`;
  })();

  const handleSave = async () => {
    if (!form.name.trim() || (!hasVariants && !form.regularPrice) || !form.categoryId) {
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
        <Section title="Product Images">
          <ImageUploader
            images={images}
            onChange={setImages}
            folder="products"
            maxImages={10}
            allowLifestyle
          />
        </Section>

        <BasicInfoSection form={form} setForm={setForm} />

        <PricingStockSection
          form={form}
          setForm={setForm}
          variantSummary={
            hasVariants ? (
              <div className="px-4 py-3 bg-surface-muted/60 border border-border rounded-xl">
                <p className="text-xs text-text-secondary mb-1">Price is set per size variant below — the storefront charges variant prices.</p>
                <p className="text-sm font-semibold text-primary">{priceSummary || "Set prices on the variants below"} <span className="text-xs font-normal text-text-secondary">· across {variants.length} size{variants.length === 1 ? "" : "s"}</span></p>
              </div>
            ) : undefined
          }
        />

        {/* Variants */}
        <Section
          title="Size Variants"
          headerRight={
            <div className="flex items-center gap-2">
              <button onClick={handleAddVariant} disabled={savingVariant} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-surface-muted hover:bg-surface-muted/70 text-foreground rounded-lg transition-colors disabled:opacity-50">
                <Plus size={14} /> Custom Variant
              </button>
              <button onClick={handleAddDefaultSizes} disabled={savingVariant} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-accent text-white hover:bg-accent/90 rounded-lg transition-colors disabled:opacity-50">
                <PackagePlus size={14} /> Add S/M/L (₹499/₹699/₹899)
              </button>
            </div>
          }
        >
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
        </Section>

        <CategorySection form={form} setForm={setForm} categories={categories} />
        <StatusSection form={form} setForm={setForm} includeArchived />

        <AdditionalDetailsSection form={form} setForm={setForm} />

        <Button onClick={handleSave} loading={saving} size="lg"><Save size={16} /> Save Changes</Button>
      </div>
    </div>
  );
}
