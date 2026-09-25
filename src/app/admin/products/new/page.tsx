"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, X } from "lucide-react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import ImageUploader from "@/components/admin/ImageUploader";
import {
  type ProductFormState, type SetProductForm,
  BasicInfoSection, PricingStockSection, CategorySection, StatusSection, AdditionalDetailsSection, Section,
} from "@/components/admin/ProductFormFields";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

const INITIAL_FORM: ProductFormState = {
  name: "", sku: "", description: "", shortDescription: "",
  regularPrice: "", salePrice: "", stockQuantity: "0", lowStockThreshold: "5",
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

interface Category {
  id: string;
  name: string;
  slug: string;
  subcategories: { id: string; name: string; slug: string }[];
}

const inputClass = "w-full px-3 py-2.5 bg-white border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30";

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setFormState] = useState<ProductFormState>(INITIAL_FORM);
  const [images, setImages] = useState<any[]>([]);
  const [variants, setVariants] = useState<any[]>([]);

  const setForm: SetProductForm = (patch) => setFormState((f) => ({ ...f, ...patch }));

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) => setCategories(data.categories || []));
  }, []);

  const handleAddVariant = () => {
    setVariants([
      ...variants,
      { name: "", sku: "", price: "", salePrice: "", stockQuantity: "0", isActive: true, images: [], attributes: [] },
    ]);
  };

  const handleVariantImageUpload = async (index: number, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", "products");
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (res.ok) {
        const data = await res.json();
        const v = [...variants];
        v[index].images = [
          ...(v[index].images || []),
          { url: data.url, alt: file.name.replace(/\.[^/.]+$/, ""), isPrimary: v[index].images?.length === 0, position: v[index].images?.length || 0 },
        ];
        setVariants(v);
      } else {
        const data = await res.json().catch(() => null);
        toast.error(data?.error || `Image upload failed (${res.status})`);
      }
    } catch {
      toast.error("Image upload error — server may be unreachable");
    }
  };

  const removeVariantImage = (variantIndex: number, imageIndex: number) => {
    const v = [...variants];
    v[variantIndex].images = v[variantIndex].images.filter((_: any, i: number) => i !== imageIndex);
    if (v[variantIndex].images.length > 0 && !v[variantIndex].images.some((img: any) => img.isPrimary)) {
      v[variantIndex].images[0].isPrimary = true;
    }
    setVariants(v);
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
          images: images.map((img, i) => ({
            url: img.url,
            alt: img.alt || "",
            isPrimary: img.isPrimary ?? i === 0,
            position: img.position ?? i,
          })),
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
        const err = await res.json().catch(() => null);
        toast.error(err?.error || `Failed to create product (${res.status})`);
      }
    } catch {
      toast.error("Unable to reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <Link href="/admin/products" className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-foreground mb-4">
        <ArrowLeft size={16} /> Back to Products
      </Link>

      <h1 className="text-xl font-semibold mb-6">Create New Product</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Product images */}
        <Section title="Product Images">
          <ImageUploader images={images} onChange={setImages} folder="products" />
        </Section>

        <BasicInfoSection form={form} setForm={setForm} />
        <PricingStockSection form={form} setForm={setForm} />
        <CategorySection form={form} setForm={setForm} categories={categories} />
        <StatusSection form={form} setForm={setForm} />

        {/* Variants */}
        <Section
          title="Variants"
          headerRight={
            <Button type="button" variant="outline" size="sm" onClick={handleAddVariant}>
              <Plus size={14} /> Add Variant
            </Button>
          }
        >
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
                    <input type="number" placeholder="Sale Price" value={variant.salePrice} onChange={(e) => { const v = [...variants]; v[index].salePrice = e.target.value; setVariants(v); }} className={cn(inputClass, "text-xs")} />
                    <input type="number" placeholder="Stock" value={variant.stockQuantity} onChange={(e) => { const v = [...variants]; v[index].stockQuantity = e.target.value; setVariants(v); }} className={cn(inputClass, "text-xs")} />
                  </div>
                  {/* Variant images */}
                  <div className="mt-3">
                    <label className="text-xs font-medium text-text-secondary mb-1 block">Variant Images</label>
                    <div className="flex flex-wrap gap-2">
                      {(variant.images || []).map((img: any, imgIdx: number) => (
                        <div key={imgIdx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-border">
                          <img src={img.url} alt={img.alt || ""} className="w-full h-full object-cover" />
                          {img.isPrimary && (
                            <div className="absolute top-0.5 left-0.5 bg-amber-400 text-white text-[8px] px-1 rounded">Primary</div>
                          )}
                          <button type="button" onClick={() => removeVariantImage(index, imgIdx)} className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]">×</button>
                        </div>
                      ))}
                      <label className="w-16 h-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-accent/50">
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleVariantImageUpload(index, e.target.files[0]); }} />
                        <Plus size={16} className="text-text-muted" />
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        <AdditionalDetailsSection form={form} setForm={setForm} />

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
