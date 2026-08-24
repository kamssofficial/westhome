"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Plus, Edit, Trash2, GripVertical, ChevronRight, ChevronDown, Save, ArrowUpDown, Camera, X } from "lucide-react";
import Button from "@/components/ui/Button";
import toast from "react-hot-toast";

interface Subcategory {
  id: string;
  name: string;
  slug: string;
  position: number;
  isActive: boolean;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string | null;
  position: number;
  isActive: boolean;
  productCount: number;
  subcategories: Subcategory[];
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newSubcategoryName, setNewSubcategoryName] = useState("");
  const [addingSubTo, setAddingSubTo] = useState<string | null>(null);
  const [orderChanged, setOrderChanged] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [reorderMode, setReorderMode] = useState(false);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };


  const handleDragStart = (index: number) => { dragItem.current = index; };
  const handleDragEnter = (index: number) => { dragOverItem.current = index; };
  const handleDragEnd = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    const newCats = [...categories];
    const dragged = newCats[dragItem.current];
    newCats.splice(dragItem.current, 1);
    newCats.splice(dragOverItem.current, 0, dragged);
    dragItem.current = null;
    dragOverItem.current = null;
    setCategories(newCats);
    setOrderChanged(true);
  };

  const handleSaveOrder = async () => {
    setSavingOrder(true);
    try {
      const categoryIds = categories.map(c => c.id);
      const res = await fetch('/api/admin/categories/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryIds }),
      });
      if (res.ok) {
        toast.success('Category order saved');
        setOrderChanged(false);
        setReorderMode(false);
        fetchCategories();
      } else { toast.error('Failed to save order'); }
    } catch { toast.error('Failed to save order'); } finally { setSavingOrder(false); }
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newCats = [...categories];
    [newCats[index - 1], newCats[index]] = [newCats[index], newCats[index - 1]];
    setCategories(newCats);
    setOrderChanged(true);
  };

  const handleMoveDown = (index: number) => {
    if (index === categories.length - 1) return;
    const newCats = [...categories];
    [newCats[index], newCats[index + 1]] = [newCats[index + 1], newCats[index]];
    setCategories(newCats);
    setOrderChanged(true);
  };

  const handleCreateCategory = async () => {
    const name = prompt("Enter category name:");
    if (!name) return;
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, position: categories.length + 1 }),
      });
      if (res.ok) {
        toast.success("Category created");
        fetchCategories();
      }
    } catch {
      toast.error("Failed to create category");
    }
  };

  const handleUpdateCategory = async (id: string) => {
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName }),
      });
      if (res.ok) {
        toast.success("Category updated");
        setEditingId(null);
        fetchCategories();
      }
    } catch {
      toast.error("Failed to update category");
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`Delete category "${name}"? Products in this category will be unassigned.`)) return;
    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Category deleted");
        fetchCategories();
      }
    } catch {
      toast.error("Failed to delete category");
    }
  };

  const handleUploadImage = async (categoryId: string, file: File) => {
    try {
      const fd = new FormData(); fd.append("file", file); fd.append("folder", "categories");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (res.ok) {
        const data = await res.json();
        await fetch("/api/categories/" + categoryId, { method: "PUT", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ image: data.url || data.filePath }) });
        toast.success("Category image updated"); fetchCategories();
      } else toast.error("Failed to upload image");
    } catch { toast.error("Failed to upload image"); }
  };

  const handleRemoveImage = async (categoryId: string) => {
    try {
      await fetch("/api/categories/" + categoryId, { method: "PUT", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ image: null }) });
      toast.success("Category image removed"); fetchCategories();
    } catch { toast.error("Failed to remove image"); }
  };

  const handleAddSubcategory = async (categoryId: string) => {
    if (!newSubcategoryName.trim()) return;
    try {
      const res = await fetch(`/api/categories/${categoryId}/subcategories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newSubcategoryName }),
      });
      if (res.ok) {
        toast.success("Subcategory added");
        setNewSubcategoryName("");
        setAddingSubTo(null);
        fetchCategories();
      }
    } catch {
      toast.error("Failed to add subcategory");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Categories</h1>
          <p className="text-sm text-text-muted mt-1">Manage your product categories and their order</p>
        </div>
        <div className="flex items-center gap-2">
          {reorderMode ? (
            <>
              {orderChanged && (
                <Button onClick={handleSaveOrder} disabled={savingOrder} variant="primary">
                  <Save size={16} /> {savingOrder ? "Saving..." : "Save Order"}
                </Button>
              )}
              <Button onClick={() => { setReorderMode(false); setOrderChanged(false); fetchCategories(); }} variant="ghost">
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button onClick={() => setReorderMode(true)} variant="outline">
                <ArrowUpDown size={16} /> Reorder
              </Button>
              <Button size="sm" onClick={handleCreateCategory}>
                <Plus size={16} /> Add Category
              </Button>
            </>
          )}
        </div>
      </div>

      {reorderMode && (
        <div className="mb-4 p-3 bg-accent/10 border border-accent/20 rounded-xl text-sm text-accent">
          Drag categories up or down to reorder them. The new order will apply across the entire site.
        </div>
      )}

      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-8 text-text-muted">Loading...</div>
        ) : categories.map((cat) => (
          <div key={cat.id} className="bg-surface rounded-[1.35rem] border border-border">
            {/* Category row */}
            <div className={"flex items-center gap-3 p-4" + (reorderMode ? " cursor-move" : "")} draggable={reorderMode} onDragStart={() => handleDragStart(categories.indexOf(cat))} onDragEnter={() => handleDragEnter(categories.indexOf(cat))} onDragEnd={handleDragEnd} onDragOver={(e) => e.preventDefault()}>
              {reorderMode && (
                <div className="flex items-center gap-1">
                  <GripVertical size={16} className="text-text-muted" />
                  <div className="flex flex-col">
                    <button onClick={() => handleMoveUp(categories.indexOf(cat))} disabled={categories.indexOf(cat) === 0} className="p-0.5 hover:bg-surface-muted rounded disabled:opacity-30"><ChevronRight size={12} className="rotate-[-90deg]" /></button>
                    <button onClick={() => handleMoveDown(categories.indexOf(cat))} disabled={categories.indexOf(cat) === categories.length - 1} className="p-0.5 hover:bg-surface-muted rounded disabled:opacity-30"><ChevronRight size={12} className="rotate-90" /></button>
                  </div>
                </div>
              )}
              <span className="text-xs font-mono text-text-muted w-6 text-center">#{categories.indexOf(cat) + 1}</span>
              {cat.image && (
                <div className="w-8 h-8 rounded-lg overflow-hidden bg-surface-muted flex-shrink-0">
                  <Image src={cat.image} alt={cat.name} width={32} height={32} className="w-full h-full object-cover" />
                </div>
              )}
              {!reorderMode && (<button
                onClick={() => setExpandedId(expandedId === cat.id ? null : cat.id)}
                className="p-1 hover:bg-surface-muted rounded"
              >
                {expandedId === cat.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>)}

              {editingId === cat.id ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 px-3 py-1.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && handleUpdateCategory(cat.id)}
                  />
                  <Button size="sm" onClick={() => handleUpdateCategory(cat.id)}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                </div>
              ) : (
                <>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{cat.name}</p>
                    <p className="text-xs text-text-muted">{cat.productCount} products • {cat.subcategories.length} subcategories</p>
                  </div>
                  {!reorderMode && (<div className="flex items-center gap-1">
                    <button onClick={() => { setEditingId(cat.id); setEditName(cat.name); }} className="p-1.5 hover:bg-surface-muted rounded-lg">
                      <Edit size={14} className="text-text-muted" />
                    </button>
                    <label className="p-1.5 hover:bg-surface-muted rounded-lg cursor-pointer" title="Upload image">
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadImage(cat.id, f); }} />
                      <Camera size={14} className="text-text-muted" />
                    </label>
                    {cat.image && (
                      <button onClick={() => handleRemoveImage(cat.id)} className="p-1.5 hover:bg-error/10 rounded-lg" title="Remove image">
                        <X size={14} className="text-error" />
                      </button>
                    )}
                    <button onClick={() => handleDeleteCategory(cat.id, cat.name)} className="p-1.5 hover:bg-error/10 rounded-lg">
                      <Trash2 size={14} className="text-error" />
                    </button>
                  </div>)}
                </>
              )}
            </div>

            {/* Subcategories */}
            {!reorderMode && expandedId === cat.id && (
              <div className="border-t border-border px-4 pb-4 pt-3 ml-8">
                <p className="text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">Subcategories</p>
                {cat.subcategories.length > 0 ? (
                  <div className="space-y-1">
                    {cat.subcategories.map((sub) => (
                      <div key={sub.id} className="flex items-center justify-between px-3 py-2 bg-surface-muted rounded-lg">
                        <span className="text-sm">{sub.name}</span>
                        <button className="p-1 hover:bg-white rounded text-text-muted">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-text-muted">No subcategories</p>
                )}

                {/* Add subcategory */}
                {addingSubTo === cat.id ? (
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="text"
                      value={newSubcategoryName}
                      onChange={(e) => setNewSubcategoryName(e.target.value)}
                      placeholder="Subcategory name"
                      className="flex-1 px-3 py-1.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                      autoFocus
                      onKeyDown={(e) => e.key === "Enter" && handleAddSubcategory(cat.id)}
                    />
                    <Button size="sm" onClick={() => handleAddSubcategory(cat.id)}>Add</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setAddingSubTo(null); setNewSubcategoryName(""); }}>Cancel</Button>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingSubTo(cat.id)}
                    className="flex items-center gap-1 mt-2 text-xs text-accent hover:underline"
                  >
                    <Plus size={12} /> Add subcategory
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
