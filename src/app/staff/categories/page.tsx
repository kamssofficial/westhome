"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { Camera, ChevronDown, ImageIcon, Loader2, FolderTree } from "lucide-react";
import { cn } from "@/lib/utils";

interface CategoryImage { id: string; url: string; alt?: string | null; position: number; isPrimary: boolean; }
interface SubCategory { id: string; name: string; slug: string; description?: string; image?: string | null; position: number; productCount: number; }
interface Category { id: string; name: string; slug: string; description?: string; image?: string | null; position: number; productCount: number; subcategories: SubCategory[]; images: CategoryImage[]; }

export default function StaffCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/categories");
      if (res.ok) { const d = await res.json(); setCategories(d.categories || []); }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const handleImageUpload = async (categoryId: string, file: File) => {
    setUploadingImage(categoryId);
    try {
      const fd = new FormData(); fd.append("file", file); fd.append("folder", "categories");
      const uploadRes = await fetch("/api/upload", { method: "POST", body: fd });
      if (uploadRes.ok) {
        const { url } = await uploadRes.json();
        // Try CategoryImage API first, fall back to updating category image field
        let saved = false;
        try {
          const imgRes = await fetch("/api/categories/" + categoryId + "/images", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url, isPrimary: true, alt: file.name }),
          });
          saved = imgRes.ok;
        } catch {}
        if (!saved) {
          await fetch("/api/categories/" + categoryId, {
            method: "PUT", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: url }),
          });
        }
        fetchCategories();
      }
    } catch (e) { console.error(e); }
    finally { setUploadingImage(null); }
  };

  const triggerImageUpload = (categoryId: string) => {
    setUploadTarget(categoryId);
    imageInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && uploadTarget) { handleImageUpload(uploadTarget, file); }
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  return (
    <div className="space-y-5">
      <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} className="hidden" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[#1a1917]">Categories</h1>
          <p className="text-sm text-[#8a857f] mt-0.5">View categories and manage their images</p>
        </div>
        <div className="flex items-center gap-2">
          <></>
        </div>
      </div>

      {loading && (
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-black/[.06] p-4 flex items-center gap-4 animate-pulse">
              <div className="w-8 h-8 bg-gray-100 rounded-lg" />
              <div className="w-14 h-14 bg-gray-100 rounded-xl" />
              <div className="flex-1 space-y-2"><div className="h-4 w-32 bg-gray-100 rounded-lg" /><div className="h-3 w-48 bg-gray-100 rounded-lg" /></div>
            </div>
          ))}
        </div>
      )}

      {!loading && categories.length === 0 && (
        <div className="bg-white rounded-2xl border border-black/[.06] p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#f7f5f2] flex items-center justify-center mx-auto mb-4">
            <FolderTree size={24} className="text-[#b0aba6]" />
          </div>
          <h3 className="font-medium text-[#1a1917]">No categories yet</h3>
          <p className="text-sm text-[#8a857f] mt-1">Categories are managed by admins.</p>
          
        </div>
      )}

      {!loading && categories.length > 0 && (
        <div className="space-y-2">
          {categories.map((cat, idx) => {
            const isExpanded = expandedId === cat.id;
            const isUploading = uploadingImage === cat.id;
            const primaryImage = cat.images?.find(img => img.isPrimary) || cat.images?.[0] || null;
            const imgCount = cat.images?.length || 0;

            return (
              <div key={cat.id} className="bg-white rounded-2xl border border-black/[.06] overflow-hidden transition-all duration-200"
               
               
               
               
               
              >
                <div className="flex items-center gap-3 p-3 sm:p-4">
                  
                  
                  <div className="flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-[#f7f5f2] relative">
                    {primaryImage ? (
                      <Image src={primaryImage.url} alt={cat.name} fill className="object-cover" sizes="(max-width:640px) 56px, 64px" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center">
                        <ImageIcon size={18} className="text-[#d1ccc6]" />
                      </div>
                    )}
                    {imgCount > 1 && (
                      <div className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-[#1a1917] text-white text-[10px] font-semibold rounded-full flex items-center justify-center ring-2 ring-white">
                        {imgCount}
                      </div>
                    )}
                    {isUploading && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Loader2 size={18} className="text-white animate-spin" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-[#1a1917] text-sm sm:text-base truncate">{cat.name}</h3>
                    <p className="text-xs text-[#8a857f] mt-0.5">
                      {cat.productCount + " product" + (cat.productCount !== 1 ? "s" : "")}
                      {" \u00b7 " + cat.subcategories.length + " subcategor" + (cat.subcategories.length !== 1 ? "ies" : "y")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => triggerImageUpload(cat.id)} title="Change image" aria-label="Change image" disabled={isUploading}
                      className="w-10 h-10 flex items-center justify-center rounded-xl text-[#6b6560] hover:text-[#1a1917] hover:bg-[#f7f5f2] active:bg-[#ece8e1] transition-all duration-150 disabled:opacity-40">
                      <Camera size={17} strokeWidth={1.8} />
                    </button>
                    <button onClick={() => setExpandedId(isExpanded ? null : cat.id)} title={isExpanded ? "Collapse" : "Expand subcategories"} aria-label="Toggle subcategories" aria-expanded={isExpanded}
                      className="w-10 h-10 flex items-center justify-center rounded-xl text-[#b0aba6] hover:text-[#6b6560] hover:bg-[#f7f5f2] active:bg-[#ece8e1] transition-all duration-150">
                      <ChevronDown size={17} strokeWidth={1.8} className={cn("transition-transform duration-300 ease-out", isExpanded && "rotate-180")} />
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-black/[.04] bg-[#faf8f5]/50 px-3 sm:px-4 py-3">
                    <h4 className="text-xs font-semibold text-[#8a857f] uppercase tracking-wider mb-2">Subcategories</h4>

                    {cat.subcategories.length > 0 ? (
                      <div className="space-y-0.5">
                        {cat.subcategories.map((sub) => (
                          <div key={sub.id} className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-white transition-colors group">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-white border border-black/[.04] overflow-hidden flex-shrink-0 flex items-center justify-center">
                                {sub.image ? (
                                  <Image src={sub.image} alt={sub.name} width={32} height={32} className="w-full h-full object-cover" />
                                ) : (
                                  <ImageIcon size={14} className="text-[#d1ccc6]" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-[#1a1917] truncate">{sub.name}</p>
                                <p className="text-xs text-[#8a857f]">
                                  {sub.productCount + " product" + (sub.productCount !== 1 ? "s" : "")}
                                </p>
                              </div>
                            </div>
                            
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[#b0aba6] py-3 text-center">No subcategories yet</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
