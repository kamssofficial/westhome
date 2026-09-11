"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { X, ImageIcon } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface CategoryData { id: string; name: string; slug: string; description?: string; image?: string | null; position: number; productCount: number; subcategories: any[]; }
interface CategoryModalProps { mode: "add" | "edit"; category?: CategoryData; existingNames: string[]; onClose: () => void; onSave: () => void; }

export default function CategoryModal({ mode, category, existingNames, onClose, onSave }: CategoryModalProps) {
  const [name, setName] = useState(category?.name || "");
  const [description, setDescription] = useState(category?.description || "");
  const [position, setPosition] = useState(category?.position ?? 0);
  const [imagePreview, setImagePreview] = useState<string | null>(category?.image || null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [nameError, setNameError] = useState("");
  const [formError, setFormError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEdit = mode === "edit";

  const validateName = (value: string): boolean => {
    if (!value.trim()) { setNameError("Category name is required"); return false; }
    const n = value.trim().toLowerCase();
    if (existingNames.some((e) => e.toLowerCase() === n && (!isEdit || e !== category?.name))) { setNameError("A category with this name already exists"); return false; }
    setNameError(""); return true;
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImagePreview(null); setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateName(name)) return;
    setSaving(true);
    try {
      let imageUrl = category?.image || null;
      if (imageFile) {
        setUploadingImage(true);
        const fd = new FormData(); fd.append("file", imageFile); fd.append("folder", "categories");
        const uploadRes = await fetch("/api/upload", { method: "POST", body: fd });
        if (!uploadRes.ok) {
          const uploadData = await uploadRes.json().catch(() => null);
          setFormError(uploadData?.error || "Image upload failed. Please try again.");
          setSaving(false); setUploadingImage(false); return;
        }
        const data = await uploadRes.json(); imageUrl = data.url;
        setUploadingImage(false);
      } else if (imagePreview === null && category?.image) { imageUrl = null; }
      const url = isEdit ? `/api/categories/${category!.id}` : "/api/categories";
      const method = isEdit ? "PUT" : "POST";
      const body: Record<string, any> = { name: name.trim(), description: description.trim() || null, image: imageUrl, position: isEdit ? category!.position : position };
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.ok) { onSave(); return; }
      const resData = await res.json().catch(() => null);
      setFormError(resData?.error || (isEdit ? "Failed to save category." : "Failed to create category."));
    } catch { setFormError("Something went wrong. Please try again."); } finally { setSaving(false); setUploadingImage(false); }
  };

  const ic = "w-full px-3 py-2.5 bg-white border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 transition-colors";
  return(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg shadow-modal animate-fade-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-white rounded-t-2xl sm:rounded-t-2xl z-10">
          <h2 className="font-semibold text-[#1a1917]">{isEdit?"Edit Category":"Add Category"}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-surface-muted rounded-lg transition-colors" aria-label="Close"><X size={18} className="text-text-muted" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div><label className="text-xs font-medium text-text-secondary mb-1.5 block">Category Name *</label>
            <input type="text" value={name} onChange={(e)=>{setName(e.target.value);if(nameError)validateName(e.target.value)}} onBlur={()=>name&&validateName(name)} className={cn(ic,nameError&&"border-error focus:ring-error/30")} placeholder="e.g. Wall Decor" autoFocus />
            {nameError&&<p className="text-xs text-error mt-1">{nameError}</p>}</div>
          <div><label className="text-xs font-medium text-text-secondary mb-1.5 block">Description</label>
            <textarea value={description} onChange={(e)=>setDescription(e.target.value)} className={cn(ic,"resize-none h-20")} placeholder="Optional description" /></div>
          {!isEdit&&(<div><label className="text-xs font-medium text-text-secondary mb-1.5 block">Display Order</label>
            <input type="number" value={position} onChange={(e)=>setPosition(parseInt(e.target.value)||0)} className={cn(ic,"w-24")} min={0} />
            <p className="text-[10px] text-text-muted mt-1">Lower numbers appear first.</p></div>)}
          <div><label className="text-xs font-medium text-text-secondary mb-1.5 block">Category Image</label>
            {imagePreview?(<div className="relative w-full h-40 rounded-xl overflow-hidden bg-surface-muted border border-border">
              <Image src={imagePreview} alt="Preview" fill className="object-cover" sizes="(max-width:500px)100vw,500px" />
              <button type="button" onClick={handleRemoveImage} className="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur-sm rounded-lg shadow-sm hover:bg-white transition-colors" aria-label="Remove image"><X size={14} className="text-text-secondary" /></button>
            </div>):(<button type="button" onClick={()=>fileInputRef.current?.click()} className="w-full border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-accent/50 hover:bg-surface-muted/50 transition-all cursor-pointer">
              <div className="flex flex-col items-center gap-2"><ImageIcon size={24} className="text-text-muted" /><p className="text-sm text-text-secondary">Click to upload</p><p className="text-[10px] text-text-muted">JPEG, PNG, WebP, Max 5MB</p></div></button>)}
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleImageSelect} className="hidden" /></div>
          {formError&&<p className="text-xs text-error bg-error/5 border border-error/20 rounded-lg px-3 py-2">{formError}</p>}
          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" size="lg" className="flex-1" loading={saving} disabled={saving}>{saving?(uploadingImage?"Uploading...":isEdit?"Saving...":"Creating..."):isEdit?"Save Changes":"Create Category"}</Button>
            <Button type="button" variant="ghost" size="lg" onClick={onClose} disabled={saving}>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

