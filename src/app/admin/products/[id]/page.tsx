"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import ImageUploader from "@/components/admin/ImageUploader";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import ProductAnalytics from "@/components/admin/ProductAnalytics";

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
  const [variantAttributes, setVariantAttributes] = useState<{name: string; values: {value: string; colorCode?: string}[]}[]>([]);
  const [variants, setVariants] = useState<{id?: string; name: string; price: string; salePrice: string; stockQuantity: string; sku: string; attributes: {attributeName: string; value: string; colorCode?: string}[]}[]>([]);

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
        // Load images
        if (p.variantAttributes?.length) {
          setVariantAttributes(p.variantAttributes.map((a: any) => ({
            name: a.name,
            values: a.values?.map((v: any) => ({ value: v.value, colorCode: v.colorCode })) || [],
          })));
        }
        if (p.variants?.length) {
          setVariants(p.variants.map((v: any) => ({
            id: v.id, name: v.name,
            price: String(v.price || ''), salePrice: v.salePrice ? String(v.salePrice) : '',
            stockQuantity: String(v.stockQuantity || 0), sku: v.sku || '',
            attributes: v.attributes?.map((a: any) => ({ attributeName: a.attributeName, value: a.value, colorCode: a.colorCode })) || [],
          })));
        }
        if (p.images?.length) {
          setImages(p.images.map((img: any) => ({
            id: img.id, url: img.url, alt: img.alt || "", isPrimary: img.isPrimary, position: img.position,
            imageType: img.imageType || "PRODUCT",
          })));
        }
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
          regularPrice: parseFloat(form.salePrice || form.regularPrice) || 0,
          salePrice: parseFloat(form.salePrice || form.regularPrice) || null,
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
          variantAttributes: variantAttributes.map(a => ({ name: a.name, values: a.values })),
          variants: variants.map(v => ({ name: v.name, price: parseFloat(v.price) || 0, salePrice: v.salePrice ? parseFloat(v.salePrice) : null, stockQuantity: parseInt(v.stockQuantity) || 0, sku: v.sku || null, attributes: v.attributes })),
        }),
      });
      if (res.ok) {
        toast.success("Product updated");
        router.push("/admin/products");
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2"><label className="text-xs font-medium text-text-secondary mb-1 block">Price (₹)</label><input type="number" step="0.01" value={form.salePrice || form.regularPrice} onChange={(e) => setForm({ ...form, salePrice: e.target.value, regularPrice: e.target.value })} className={inputClass} /></div>
            <div><label className="text-xs font-medium text-text-secondary mb-1 block">Stock</label><input type="number" value={form.stockQuantity} onChange={(e) => setForm({ ...form, stockQuantity: e.target.value })} className={inputClass} /></div>
          </div>
          <div className="flex items-center gap-6 mt-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={form.trackInventory} onChange={(e) => setForm({ ...form, trackInventory: e.target.checked })} className="accent-accent" /> Track inventory</label>
            <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={form.allowBackorder} onChange={(e) => setForm({ ...form, allowBackorder: e.target.checked })} className="accent-accent" /> Allow backorder</label>
          </div>
        </div>

        {/* Category */}
        <div className="bg-surface rounded-[1.35rem] border border-border p-5">
          <h2 className="font-semibold mb-4">Category</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="text-xs font-medium text-text-secondary mb-1 block">Category *</label><select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className={inputClass}><option value="">Select</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            {selectedCategory?.subcategories?.length > 0 && (
              <div><label className="text-xs font-medium text-text-secondary mb-1 block">Subcategory</label><select value={form.subcategoryId} onChange={(e) => setForm({ ...form, subcategoryId: e.target.value })} className={inputClass}><option value="">None</option>{selectedCategory.subcategories.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
            )}
          </div>
        </div>

        {/* Status */}
        <div className="bg-surface rounded-[1.35rem] border border-border p-5">
          <h2 className="font-semibold mb-4">Status & Flags</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div><label className="text-xs font-medium text-text-secondary mb-1 block">Status</label><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputClass}><option value="DRAFT">Draft</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option><option value="ARCHIVED">Archived</option></select></div>
            <div><label className="text-xs font-medium text-text-secondary mb-1 block">Purchase Method</label><select value={form.purchaseMethod} onChange={(e) => setForm({ ...form, purchaseMethod: e.target.value })} className={inputClass}><option value="BUY_ONLINE">Buy Online</option><option value="ENQUIRY">Enquiry Only</option><option value="BOTH">Both</option></select></div>
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

        {/* Variants */}
        <div className="bg-surface rounded-[1.35rem] border border-border p-5">
          <h2 className="font-semibold mb-4">Size & Color Variants</h2>
          <p className="text-xs text-text-muted mb-4">Define attributes (Color, Size) and create variants with individual prices.</p>
          <div className="space-y-3 mb-4">
            {variantAttributes.map((attr, ai) => (
              <div key={ai} className="p-3 bg-surface-muted rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <input type="text" value={attr.name} onChange={(e) => { const a = [...variantAttributes]; a[ai].name = e.target.value; setVariantAttributes(a); }}
                    className="flex-1 px-3 py-1.5 bg-white border border-border rounded-lg text-xs font-medium" placeholder="Attribute (e.g. Color)" />
                  <button onClick={() => setVariantAttributes(variantAttributes.filter((_, i) => i !== ai))} className="p-1.5 text-error hover:bg-error/10 rounded-lg text-xs">Remove</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {attr.values.map((val, vi) => (
                    <div key={vi} className="flex items-center gap-1 bg-white border border-border rounded-lg px-2 py-1">
                      {attr.name.toLowerCase() === "color" && val.colorCode && <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: val.colorCode }} />}
                      <span className="text-xs">{val.value}</span>
                      <button onClick={() => { const a = [...variantAttributes]; a[ai].values = a[ai].values.filter((_, j) => j !== vi); setVariantAttributes(a); }} className="text-text-muted hover:text-error text-xs ml-1">×</button>
                    </div>
                  ))}
                  <input type="text" placeholder="Add value" className="px-2 py-1 bg-white border border-border rounded-lg text-xs w-20"
                    onKeyDown={(e) => { if (e.key === "Enter" && (e.target as HTMLInputElement).value.trim()) {
                      const a = [...variantAttributes]; a[ai].values = [...a[ai].values, { value: (e.target as HTMLInputElement).value.trim(), colorCode: attr.name.toLowerCase() === "color" ? "#888888" : undefined }]; setVariantAttributes(a); (e.target as HTMLInputElement).value = "";
                    }}} />
                </div>
              </div>
            ))}
            <button onClick={() => setVariantAttributes([...variantAttributes, { name: "", values: [] }])} className="text-xs text-accent hover:underline">+ Add Attribute (Color, Size, etc.)</button>
          </div>
          {variants.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-text-muted mb-2">Variants ({variants.length})</p>
              {variants.map((v, vi) => (
                <div key={vi} className="flex items-center gap-2 p-3 bg-surface-muted rounded-xl flex-wrap">
                  <span className="text-xs font-medium text-text-secondary min-w-[100px]">{v.name || "Variant " + (vi + 1)}</span>
                  <input type="number" step="0.01" value={v.price} onChange={(e) => { const vs = [...variants]; vs[vi].price = e.target.value; setVariants(vs); }}
                    className="w-24 px-2 py-1 bg-white border border-border rounded-lg text-xs" placeholder="Price" />
                  <input type="number" step="0.01" value={v.salePrice} onChange={(e) => { const vs = [...variants]; vs[vi].salePrice = e.target.value; setVariants(vs); }}
                    className="w-24 px-2 py-1 bg-white border border-border rounded-lg text-xs" placeholder="Sale Price" />
                  <input type="number" value={v.stockQuantity} onChange={(e) => { const vs = [...variants]; vs[vi].stockQuantity = e.target.value; setVariants(vs); }}
                    className="w-20 px-2 py-1 bg-white border border-border rounded-lg text-xs" placeholder="Stock" />
                  <button onClick={() => setVariants(variants.filter((_, i) => i !== vi))} className="p-1 text-error hover:bg-error/10 rounded text-xs">×</button>
                </div>
              ))}
            </div>
          )}
          {variantAttributes.length > 0 && variantAttributes.some(a => a.values.length > 0) && (
            <button onClick={() => {
              const combos: any[] = [];
              const attrArrays = variantAttributes.filter(a => a.values.length > 0);
              const gen = (idx: number, cur: any[]) => {
                if (idx === attrArrays.length) {
                  const name = cur.map(a => a.value).join(" / ");
                  const existing = variants.find(v => v.name === name);
                  combos.push(existing || { name, price: form.salePrice || "", salePrice: "", stockQuantity: "0", sku: "", attributes: cur });
                  return;
                }
                for (const val of attrArrays[idx].values) { gen(idx + 1, [...cur, { attributeName: attrArrays[idx].name, value: val.value, colorCode: val.colorCode }]); }
              };
              gen(0, []);
              setVariants(combos);
            }} className="mt-3 text-xs text-accent hover:underline">Generate Variants from Attributes</button>
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

        
        {/* Product Analytics */}
        <ProductAnalytics productId={id} />

        <Button onClick={handleSave} loading={saving} size="lg"><Save size={16} /> Save Changes</Button>
      </div>
    </div>
  );
}
