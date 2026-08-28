"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

const input = "w-full px-3 py-2.5 bg-white border border-black/[.08] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a574]/30";

export default function StaffProductEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ name: "", sku: "", description: "", shortDescription: "", regularPrice: "", salePrice: "", stockQuantity: "0", lowStockThreshold: "5", trackInventory: true, allowBackorder: false, categoryId: "", subcategoryId: "", status: "DRAFT", purchaseMethod: "BOTH", isFeatured: false, isBestseller: false, isNewArrival: false, isComingSoon: false, material: "", color: "", finish: "", shape: "", pattern: "", style: "", mountingType: "", usageLocation: "", careInstructions: "", warranty: "", packagingType: "", packagingDimensions: "", includedItems: "", dimensionUnit: "cm", height: "", width: "", length: "", depth: "", diameter: "", weight: "", weightUnit: "kg", capacity: "", capacityUnit: "L", allowCustomSize: false, customSizeUnit: "cm", customSizeMinWidth: "", customSizeMinLength: "", customSizeMinHeight: "", customSizeMaxWidth: "", customSizeMaxLength: "", customSizeMaxHeight: "", customSizePricingMethod: "area", customSizeRequiresApproval: false, seoTitle: "", seoDescription: "" });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true); setError("");
      try {
        const [productRes, categoryRes] = await Promise.all([fetch(`/api/staff/products/${id}`, { cache: "no-store" }), fetch("/api/categories", { cache: "no-store" })]);
        const productData = await productRes.json().catch(() => ({}));
        const categoryData = await categoryRes.json().catch(() => ({}));
        if (!productRes.ok || !productData.product) throw new Error(productData.error || "Product not found");
        if (!cancelled) {
          const p = productData.product;
          const numeric = ["regularPrice", "salePrice", "stockQuantity", "lowStockThreshold", "height", "width", "length", "depth", "diameter", "weight", "capacity", "customSizeMinWidth", "customSizeMinLength", "customSizeMinHeight", "customSizeMaxWidth", "customSizeMaxLength", "customSizeMaxHeight"];
          const next = { ...form, ...p };
          numeric.forEach(k => { next[k] = p[k] == null ? "" : String(p[k]); });
          setForm(next); setCategories(categoryData.categories || []);
        }
      } catch (e: any) { if (!cancelled) { setError(e.message || "Failed to load product"); toast.error(e.message || "Failed to load product"); } }
      finally { if (!cancelled) setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, [id]);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const save = async () => {
    if (!form.name.trim() || !form.categoryId) { toast.error("Product name and category are required"); return; }
    const regular = Number(form.regularPrice); const sale = form.salePrice === "" ? null : Number(form.salePrice);
    if (!Number.isFinite(regular) || regular <= 0) { toast.error("Enter a valid regular price"); return; }
    if (sale !== null && (!Number.isFinite(sale) || sale >= regular)) { toast.error("Sale price must be less than regular price"); return; }
    setSaving(true);
    try {
      const numeric = ["regularPrice", "salePrice", "height", "width", "length", "depth", "diameter", "weight", "capacity", "customSizeMinWidth", "customSizeMinLength", "customSizeMinHeight", "customSizeMaxWidth", "customSizeMaxLength", "customSizeMaxHeight"];
      const b: any = { ...form, stockQuantity: Math.max(0, parseInt(form.stockQuantity, 10) || 0), lowStockThreshold: Math.max(0, parseInt(form.lowStockThreshold, 10) || 0) };
      numeric.forEach(k => { b[k] = b[k] === "" ? null : Number(b[k]); }); b.sku = b.sku?.trim() || null;
      const r = await fetch(`/api/staff/products/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Failed to update product");
      toast.success("Product updated successfully");
      setError("");
    } catch (e: any) { toast.error(e.message || "Failed to update product"); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="py-12 text-center text-sm text-[#8a857f]">Loading product...</div>;
  if (error && !form.name) return <div className="max-w-4xl py-12 text-center"><p className="text-sm text-red-600">{error}</p><Link href="/staff/products" className="inline-flex mt-4 text-sm underline">Back to Products</Link></div>;

  const category = categories.find(c => c.id === form.categoryId);
  const Field = ({ label, k, type = "text" }: any) => <div><label className="text-xs font-medium text-[#6b6560] mb-1.5 block">{label}</label><input type={type} value={form[k] ?? ""} onChange={e => set(k, e.target.value)} className={input}/></div>;
  const Toggle = ({ label, k }: any) => <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={!!form[k]} onChange={e => set(k, e.target.checked)}/>{label}</label>;
  return <div className="max-w-4xl space-y-5 pb-10"><div className="flex items-center justify-between gap-3"><div><Link href="/staff/products" className="inline-flex items-center gap-1.5 text-sm text-[#6b6560] hover:text-[#1a1917] mb-2"><ArrowLeft size={16}/> Back to Products</Link><h1 className="text-2xl font-semibold text-[#1a1917]">Edit Product</h1><p className="text-sm text-[#8a857f] mt-1">Update catalogue information and inventory.</p></div><button onClick={save} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1a1917] text-white rounded-xl text-sm font-medium disabled:opacity-50">{saving?<Loader2 size={16} className="animate-spin"/>:<Save size={16}/>} {saving?"Saving...":"Save Changes"}</button></div><section className="bg-white rounded-2xl border border-black/[.06] p-5 space-y-4"><h2 className="font-semibold">Basic Information</h2><Field label="Product Name *" k="name"/><Field label="SKU" k="sku"/><Field label="Short Description" k="shortDescription"/><div><label className="text-xs font-medium text-[#6b6560] mb-1.5 block">Description</label><textarea value={form.description??""} onChange={e=>set("description",e.target.value)} className={input+" min-h-32 resize-y"}/></div></section><section className="bg-white rounded-2xl border border-black/[.06] p-5 space-y-4"><h2 className="font-semibold">Pricing & Inventory</h2><div className="grid sm:grid-cols-3 gap-4"><Field label="Regular Price (₹) *" k="regularPrice" type="number"/><Field label="Sale Price (₹)" k="salePrice" type="number"/><Field label="Stock Quantity" k="stockQuantity" type="number"/><Field label="Low Stock Threshold" k="lowStockThreshold" type="number"/></div><div className="flex flex-wrap gap-6"><Toggle label="Track inventory" k="trackInventory"/><Toggle label="Allow backorder" k="allowBackorder"/></div></section><section className="bg-white rounded-2xl border border-black/[.06] p-5 space-y-4"><h2 className="font-semibold">Category & Status</h2><div className="grid sm:grid-cols-2 gap-4"><div><label className="text-xs font-medium text-[#6b6560] mb-1.5 block">Category *</label><select value={form.categoryId} onChange={e=>set("categoryId",e.target.value)} className={input}><option value="">Select category</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>{category?.subcategories?.length?<div><label className="text-xs font-medium text-[#6b6560] mb-1.5 block">Subcategory</label><select value={form.subcategoryId||""} onChange={e=>set("subcategoryId",e.target.value)} className={input}><option value="">None</option>{category.subcategories.map((s:any)=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div>:null}<div><label className="text-xs font-medium text-[#6b6560] mb-1.5 block">Status</label><select value={form.status} onChange={e=>set("status",e.target.value)} className={input}><option>DRAFT</option><option>ACTIVE</option><option>INACTIVE</option><option>ARCHIVED</option></select></div><div><label className="text-xs font-medium text-[#6b6560] mb-1.5 block">Purchase Method</label><select value={form.purchaseMethod} onChange={e=>set("purchaseMethod",e.target.value)} className={input}><option>BOTH</option><option>BUY_ONLINE</option><option>WHATSAPP</option></select></div></div><div className="flex flex-wrap gap-6"><Toggle label="Featured" k="isFeatured"/><Toggle label="Bestseller" k="isBestseller"/><Toggle label="New arrival" k="isNewArrival"/><Toggle label="Coming soon" k="isComingSoon"/></div></section><section className="bg-white rounded-2xl border border-black/[.06] p-5 space-y-4"><h2 className="font-semibold">Product Attributes</h2><div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4"><Field label="Material" k="material"/><Field label="Color" k="color"/><Field label="Finish" k="finish"/><Field label="Shape" k="shape"/><Field label="Pattern" k="pattern"/><Field label="Style" k="style"/><Field label="Mounting Type" k="mountingType"/><Field label="Usage Location" k="usageLocation"/></div></section><section className="bg-white rounded-2xl border border-black/[.06] p-5 space-y-4"><h2 className="font-semibold">Dimensions & Packaging</h2><div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4"><Field label="Height" k="height" type="number"/><Field label="Width" k="width" type="number"/><Field label="Length" k="length" type="number"/><Field label="Depth" k="depth" type="number"/><Field label="Diameter" k="diameter" type="number"/><Field label="Weight" k="weight" type="number"/><Field label="Capacity" k="capacity" type="number"/><Field label="Dimension Unit" k="dimensionUnit"/><Field label="Weight Unit" k="weightUnit"/><Field label="Capacity Unit" k="capacityUnit"/><Field label="Packaging Type" k="packagingType"/><Field label="Packaging Dimensions" k="packagingDimensions"/><Field label="Included Items" k="includedItems"/></div></section><section className="bg-white rounded-2xl border border-black/[.06] p-5 space-y-4"><h2 className="font-semibold">Product Information & SEO</h2><div><label className="text-xs font-medium text-[#6b6560] mb-1.5 block">Care Instructions</label><textarea value={form.careInstructions||""} onChange={e=>set("careInstructions",e.target.value)} className={input}/></div><Field label="Warranty" k="warranty"/><div className="grid sm:grid-cols-2 gap-4"><Field label="SEO Title" k="seoTitle"/><Field label="SEO Description" k="seoDescription"/></div></section><div className="flex justify-end"><button onClick={save} disabled={saving} className="inline-flex items-center gap-2 px-5 py-3 bg-[#1a1917] text-white rounded-xl text-sm font-medium disabled:opacity-50">{saving?<Loader2 size={16} className="animate-spin"/>:<Save size={16}/>} {saving?"Saving...":"Save Changes"}</button></div></div>;
}
