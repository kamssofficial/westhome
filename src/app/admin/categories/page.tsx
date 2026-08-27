"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { Pencil, Camera, ChevronDown, Trash2, GripVertical, Plus, X, ImageIcon, Loader2, FolderTree } from "lucide-react";
import { cn } from "@/lib/utils";
import CategoryModal from "@/components/admin/CategoryModal";
import CategoryDeleteModal from "@/components/admin/CategoryDeleteModal";

interface CategoryImage { id: string; url: string; alt?: string | null; position: number; isPrimary: boolean; }
interface SubCategory { id: string; name: string; slug: string; description?: string; image?: string | null; position: number; productCount: number; }
interface Category { id: string; name: string; slug: string; description?: string; image?: string | null; position: number; productCount: number; subcategories: SubCategory[]; images: CategoryImage[]; }

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reorderMode, setReorderMode] = useState(false);
  const [reorderList, setReorderList] = useState<Category[]>([]);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [deleteCategory, setDeleteCategory] = useState<Category | null>(null);
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);
  const [addSubName, setAddSubName] = useState("");
  const [addingSubTo, setAddingSubTo] = useState<string | null>(null);
  const dragItem = useRef<number>(null);
  const dragOverItem = useRef<number>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetRef = useRef<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/categories");
      if (res.ok) { const d = await res.json(); setCategories(d.categories || []); }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const handleSaveOrder = async () => {
    try {
      await fetch("/api/admin/categories/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryIds: reorderList.map(c => c.id) }),
      });
      setReorderMode(false);
      fetchCategories();
    } catch (e) { console.error(e); }
  };

  const handleDragStart = (index: number) => { dragItem.current = index; setDragIdx(index); };
  const handleDragEnter = (index: number) => { dragOverItem.current = index; setOverIdx(index); };
  const handleDragEnd = () => {
    if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
      const list = [...reorderList];
      const [moved] = list.splice(dragItem.current, 1);
      list.splice(dragOverItem.current, 0, moved);
      setReorderList(list);
    }
    dragItem.current = null; dragOverItem.current = null; setDragIdx(null); setOverIdx(null);
  };

  const handleImageUpload = async (categoryId: string, file: File) => {
    setUploadingImage(categoryId);
    try {
      const fd = new FormData(); fd.append("file", file); fd.append("folder", "categories");
      const uploadRes = await fetch("/api/upload", { method: "POST", body: fd });
      if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => ({ error: "Upload failed" }));
        setToast({ message: err.error || "Image upload failed — please try again", type: "error" });
        return;
      }
      const { url } = await uploadRes.json();
      // Try CategoryImage API first, fall back to updating category image field
      let saved = false;
      try {
        const imgRes = await fetch("/api/categories/" + categoryId + "/images", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, isPrimary: true, alt: file.name }),
        });
        saved = imgRes.ok;
        if (!saved) {
          const imgErr = await imgRes.json().catch(() => ({}));
          console.error("CategoryImage API failed:", imgErr);
        }
      } catch (e) { console.error("CategoryImage API error:", e); }
      if (!saved) {
        const putRes = await fetch("/api/categories/" + categoryId, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: url }),
        });
        if (!putRes.ok) {
          setToast({ message: "Image uploaded but failed to save to category", type: "error" });
          return;
        }
      }
      setToast({ message: "Image uploaded successfully", type: "success" });
      await fetchCategories();
    } catch (e) { 
      console.error(e); 
      setToast({ message: "Upload failed — please try again", type: "error" });
    } finally { setUploadingImage(null); }
  };

  const handleDeleteImage = async (categoryId: string, imageId: string) => {
    try {
      await fetch("/api/categories/" + categoryId + "/images/" + imageId, { method: "DELETE" });
      fetchCategories();
    } catch (e) { console.error(e); }
  };

  const handleArchiveCategory = async (id: string) => {
    try {
      await fetch("/api/categories/" + id, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: false }),
      });
      setDeleteCategory(null); fetchCategories();
    } catch (e) { console.error(e); }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      const res = await fetch("/api/categories/" + id, { method: "DELETE" });
      if (res.ok) { setDeleteCategory(null); fetchCategories(); }
    } catch (e) { console.error(e); }
  };

  const handleAddSubcategory = async (categoryId: string) => {
    if (!addSubName.trim()) return;
    try {
      const res = await fetch("/api/categories/" + categoryId + "/subcategories", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: addSubName.trim() }),
      });
      if (res.ok) { setAddSubName(""); setAddingSubTo(null); fetchCategories(); }
    } catch (e) { console.error(e); }
  };

  const handleDeleteSubcategory = async (categoryId: string, subId: string) => {
    try {
      await fetch("/api/categories/" + categoryId + "/subcategories/" + subId, { method: "DELETE" });
      fetchCategories();
    } catch (e) { console.error(e); }
  };

  const triggerImageUpload = (categoryId: string) => {
    uploadTargetRef.current = categoryId;
    imageInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const target = uploadTargetRef.current;
    if (file && target) { handleImageUpload(target, file); }
    uploadTargetRef.current = null;
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const currentList = reorderMode ? reorderList : categories;

  return (
    <div className="space-y-5">
      <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} className="absolute w-px h-px overflow-hidden" style={{ clip: "rect(0,0,0,0)", whiteSpace: "nowrap" }} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[#1a1917]">Categories</h1>
          <p className="text-sm text-[#8a857f] mt-0.5">Manage your product categories and their order</p>
        </div>
        <div className="flex items-center gap-2">
          {reorderMode ? (
            <>
              <button onClick={() => setReorderMode(false)} className="px-3.5 py-2 text-sm font-medium text-[#6b6560] bg-white border border-black/[.08] rounded-xl hover:bg-[#f7f5f2] transition-colors">Cancel</button>
              <button onClick={handleSaveOrder} className="px-3.5 py-2 text-sm font-medium text-white bg-[#1a1917] rounded-xl hover:bg-stone-800 transition-colors">Save Order</button>
            </>
          ) : (
            <>
              <button onClick={() => { setReorderMode(true); setReorderList([...categories]); }} className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-[#6b6560] bg-white border border-black/[.08] rounded-xl hover:bg-[#f7f5f2] transition-colors">
                <GripVertical size={15} className="text-[#b0aba6]" />
                Reorder
              </button>
              <button onClick={() => setShowAddModal(true)} className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-white bg-[#1a1917] rounded-xl hover:bg-stone-800 transition-colors">
                <Plus size={15} />
                Add Category
              </button>
            </>
          )}
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

      {!loading && currentList.length === 0 && (
        <div className="bg-white rounded-2xl border border-black/[.06] p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#f7f5f2] flex items-center justify-center mx-auto mb-4">
            <FolderTree size={24} className="text-[#b0aba6]" />
          </div>
          <h3 className="font-medium text-[#1a1917]">No categories yet</h3>
          <p className="text-sm text-[#8a857f] mt-1 mb-4">Create your first category to get started.</p>
          <button onClick={() => setShowAddModal(true)} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#1a1917] rounded-xl hover:bg-stone-800 transition-colors">
            <Plus size={15} /> Add Category
          </button>
        </div>
      )}

      {!loading && currentList.length > 0 && (
        <div className="space-y-2">
          {currentList.map((cat, idx) => {
            const isExpanded = expandedId === cat.id;
            const isUploading = uploadingImage === cat.id;
            const primaryImage = cat.images?.find(img => img.isPrimary) || cat.images?.[0] || null;
            const imgCount = cat.images?.length || 0;

            return (
              <div key={cat.id} className={cn("bg-white rounded-2xl border border-black/[.06] overflow-hidden transition-all duration-200", reorderMode && "cursor-grab", dragIdx === idx && "opacity-50 scale-[0.98]", overIdx === idx && idx !== dragIdx && "border-[#d4a574] border-dashed")}
                draggable={reorderMode}
                onDragStart={() => handleDragStart(idx)}
                onDragEnter={() => handleDragEnter(idx)}
                onDragOver={(e) => e.preventDefault()}
                onDragEnd={handleDragEnd}
              >
                <div className="flex items-center gap-3 p-3 sm:p-4">
                  {reorderMode && (
                    <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-[#f7f5f2] cursor-grab active:cursor-grabbing">
                      <GripVertical size={16} className="text-[#b0aba6]" />
                    </div>
                  )}
                  {!reorderMode && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#f7f5f2] flex items-center justify-center">
                      <span className="text-xs font-semibold text-[#8a857f]">{ "#" + (idx + 1) }</span>
                    </div>
                  )}
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
                  <div className="flex items-center gap-0.5 sm:gap-1">
                    <button onClick={() => setEditCategory(cat)} title="Edit category" aria-label="Edit category"
                      className="w-10 h-10 flex items-center justify-center rounded-xl text-[#6b6560] hover:text-[#1a1917] hover:bg-[#f7f5f2] active:bg-[#ece8e1] transition-all duration-150">
                      <Pencil size={17} strokeWidth={1.8} />
                    </button>
                    <button onClick={() => triggerImageUpload(cat.id)} title="Change image" aria-label="Change image" disabled={isUploading}
                      className="w-10 h-10 flex items-center justify-center rounded-xl text-[#6b6560] hover:text-[#1a1917] hover:bg-[#f7f5f2] active:bg-[#ece8e1] transition-all duration-150 disabled:opacity-40">
                      <Camera size={17} strokeWidth={1.8} />
                    </button>
                    <button onClick={() => setDeleteCategory(cat)} title="Delete category" aria-label="Delete category"
                      className="w-10 h-10 flex items-center justify-center rounded-xl text-[#8a857f] hover:text-red-600 hover:bg-red-50 active:bg-red-100 transition-all duration-150">
                      <Trash2 size={17} strokeWidth={1.8} />
                    </button>
                    <button onClick={() => setExpandedId(isExpanded ? null : cat.id)} title={isExpanded ? "Collapse" : "Expand subcategories"} aria-label="Toggle subcategories" aria-expanded={isExpanded}
                      className="w-10 h-10 flex items-center justify-center rounded-xl text-[#b0aba6] hover:text-[#6b6560] hover:bg-[#f7f5f2] active:bg-[#ece8e1] transition-all duration-150">
                      <ChevronDown size={17} strokeWidth={1.8} className={cn("transition-transform duration-300 ease-out", isExpanded && "rotate-180")} />
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-black/[.04] bg-[#faf8f5]/50 px-3 sm:px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-semibold text-[#8a857f] uppercase tracking-wider">Subcategories</h4>
                      <button onClick={() => setAddingSubTo(addingSubTo === cat.id ? null : cat.id)}
                        className="flex items-center gap-1 text-xs font-medium text-[#6b6560] hover:text-[#1a1917] transition-colors px-2 py-1 rounded-lg hover:bg-white">
                        <Plus size={13} /> Add
                      </button>
                    </div>

                    {addingSubTo === cat.id && (
                      <div className="flex items-center gap-2 mb-3 bg-white rounded-xl p-2 border border-black/[.06]">
                        <input type="text" value={addSubName} onChange={(e) => setAddSubName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") handleAddSubcategory(cat.id); if (e.key === "Escape") { setAddingSubTo(null); setAddSubName(""); } }}
                          placeholder="Subcategory name" className="flex-1 px-3 py-1.5 text-sm bg-transparent focus:outline-none" autoFocus />
                        <button onClick={() => handleAddSubcategory(cat.id)} className="px-3 py-1.5 text-xs font-medium text-white bg-[#1a1917] rounded-lg hover:bg-stone-800 transition-colors">Add</button>
                        <button onClick={() => { setAddingSubTo(null); setAddSubName(""); }} className="p-1.5 text-[#8a857f] hover:text-[#1a1917] transition-colors rounded-lg hover:bg-[#f7f5f2]">
                          <X size={14} />
                        </button>
                      </div>
                    )}

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
                            <button onClick={() => handleDeleteSubcategory(cat.id, sub.id)} title="Delete subcategory"
                              aria-label={"Delete " + sub.name}
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-[#b0aba6] hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all duration-150">
                              <Trash2 size={14} strokeWidth={1.8} />
                            </button>
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

      {showAddModal && (
        <CategoryModal
          mode="add"
          existingNames={categories.map(c => c.name)}
          onClose={() => setShowAddModal(false)}
          onSave={() => { setShowAddModal(false); fetchCategories(); }}
        />
      )}

      {editCategory && (
        <CategoryModal
          mode="edit"
          category={editCategory}
          existingNames={categories.map(c => c.name)}
          onClose={() => setEditCategory(null)}
          onSave={() => { setEditCategory(null); fetchCategories(); }}
        />
      )}

      {deleteCategory && (
        <CategoryDeleteModal
          category={{
            id: deleteCategory.id,
            name: deleteCategory.name,
            productCount: deleteCategory.productCount,
            subcategoryCount: deleteCategory.subcategories.length,
          }}
          onClose={() => setDeleteCategory(null)}
          onDelete={handleDeleteCategory}
          onArchive={handleArchiveCategory}
        />
      )}

      {toast && (
        <div className={"fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl text-sm font-medium shadow-lg transition-all duration-300 " + (toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white")}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
