"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Edit, Eye, EyeOff, GripVertical, Trash2, X, Loader2, Image as ImageIcon } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface Section {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  buttonText: string;
  buttonLink: string;
  isActive: boolean;
  position: number;
}

export default function AdminHomepagePage() {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Section | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Section | null>(null);
  const [form, setForm] = useState({ title: "", subtitle: "", description: "", image: "", buttonText: "", buttonLink: "" });
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  useEffect(() => {
    fetchSections();
  }, []);

  const fetchSections = async () => {
    try {
      const res = await fetch("/api/homepage");
      if (res.ok) {
        const data = await res.json();
        setSections(data.sections || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSection = async (id: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/homepage/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      if (res.ok) {
        fetchSections();
        toast.success(isActive ? "Section hidden" : "Section shown");
      }
    } catch {
      toast.error("Failed to update section");
    }
  };

  const sectionTypes = [
    { type: "HERO", label: "Hero Banner", description: "Main banner with headline and CTA" },
    { type: "CATEGORIES", label: "Shop by Category", description: "Category grid" },
    { type: "FEATURED_PRODUCTS", label: "Featured Products", description: "Admin-selected products" },
    { type: "NEW_ARRIVALS", label: "New Arrivals", description: "Recently added products" },
    { type: "PROMOTIONAL_BANNER", label: "Promotional Banner", description: "Sale or campaign banner" },
    { type: "BRAND_STORY", label: "Why WESTHOME", description: "Brand value points" },
    { type: "STORE_INFO", label: "Store Information", description: "Contact and location details" },
  ];


  const handleAdd = async (type: string) => {
    setSaving(true);
    try {
      const res = await fetch("/api/homepage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, title: sectionTypes.find(t => t.type === type)?.label || type }) });
      if (res.ok) { toast.success("Section added"); setShowAddMenu(false); fetchSections(); } else { const err = await res.json(); toast.error(err.error || "Failed"); }
    } catch { toast.error("Failed"); } finally { setSaving(false); }
  };

  const handleDeleteSection = async () => {
    if (!deleteConfirm) return;
    try {
      const res = await fetch("/api/homepage/" + deleteConfirm.id, { method: "DELETE" });
      if (res.ok) { toast.success("Section removed"); setDeleteConfirm(null); fetchSections(); }
    } catch { toast.error("Failed"); }
  };

  const openEdit = (section: Section) => {
    setEditing(section);
    setForm({ title: section.title || "", subtitle: section.subtitle || "", description: section.description || "", image: section.image || "", buttonText: section.buttonText || "", buttonLink: section.buttonLink || "" });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      const fd = new FormData(); fd.append("file", file); fd.append("folder", "homepage");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (res.ok) { const d = await res.json(); setForm(f => ({ ...f, image: d.url })); toast.success("Image uploaded"); }
    } catch { toast.error("Upload failed"); }
  };

  const handleSave = async () => {
    if (!editing) return;
    try {
      const res = await fetch("/api/homepage/" + editing.id, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (res.ok) { toast.success("Saved"); setEditing(null); fetchSections(); }
    } catch { toast.error("Failed"); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Homepage Sections</h1>
          <p className="text-sm text-text-secondary mt-1">Manage the content shown on your homepage</p>
        </div>
      </div>

      {/* Section list */}
      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-8 text-text-muted">Loading...</div>
        ) : sections.length > 0 ? (
          [...sections].sort((a, b) => a.position - b.position).map((section, idx) => (
            <div key={section.id} draggable onDragStart={() => setDragIdx(idx)} onDragEnter={() => setOverIdx(idx)} onDragOver={e => e.preventDefault()} onDragEnd={() => { if (dragIdx !== null && overIdx !== null && dragIdx !== overIdx) { const list = [...sections].sort((a,b) => a.position - b.position); const [m] = list.splice(dragIdx, 1); list.splice(overIdx, 0, m); setSections(list.map((s, i) => ({ ...s, position: i }))); } setDragIdx(null); setOverIdx(null); }} className={cn("bg-surface rounded-[1.35rem] border border-border p-4 transition-all", dragIdx === idx && "opacity-50", overIdx === idx && idx !== dragIdx && "border-accent border-dashed")}>
              <div className="flex items-center gap-3">
                <GripVertical size={16} className="text-text-muted cursor-move" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium px-2 py-0.5 bg-surface-muted rounded">
                      {sectionTypes.find((s) => s.type === section.type)?.label || section.type}
                    </span>
                  </div>
                  <p className="text-sm font-medium mt-1">{section.title || "Untitled Section"}</p>
                  {section.description && (
                    <p className="text-xs text-text-muted mt-0.5 line-clamp-1">{section.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggleSection(section.id, section.isActive)}
                    className={cn(
                      "p-1.5 rounded-lg transition-colors",
                      section.isActive ? "text-success hover:bg-success/10" : "text-text-muted hover:bg-surface-muted"
                    )}
                  >
                    {section.isActive ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                  <button onClick={() => openEdit(section)} className="p-1.5 hover:bg-surface-muted rounded-lg"><Edit size={14} className="text-text-muted" /></button>
                  <button onClick={() => setDeleteConfirm(section)} className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 size={14} className="text-red-400" /></button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-surface rounded-[1.35rem] border border-border p-8 text-center">
            <p className="text-text-muted mb-4">No homepage sections configured yet.</p>
            <p className="text-sm text-text-muted">
              The homepage uses default content. Create sections to customize the homepage.
            </p>
          </div>
        )}
      </div>

      {/* Available section types */}
      <div>
        <h2 className="font-semibold text-sm mb-3">Available Section Types</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {sectionTypes.map((type) => (
            <div key={type.type} className="flex items-center justify-between p-3 bg-surface rounded-[1.35rem] border border-border">
              <div>
                <p className="text-sm font-medium">{type.label}</p>
                <p className="text-xs text-text-muted">{type.description}</p>
              </div>
              <button onClick={() => handleAdd(type.type)} disabled={saving} className="text-xs font-medium text-accent hover:bg-accent/10 px-2 py-1 rounded-lg flex items-center gap-1"><Plus size={14} /> Add</button>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setEditing(null)} />
          <div className="relative bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-md shadow-xl max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-white flex items-center justify-between p-5 border-b border-border rounded-t-3xl sm:rounded-t-2xl">
              <h2 className="font-semibold">Edit Section</h2>
              <button onClick={() => setEditing(null)} className="p-1.5 hover:bg-surface-muted rounded-lg"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div><label className="text-xs font-medium text-text-secondary mb-1 block">Title</label><input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full px-3 py-2.5 bg-white border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" /></div>
              <div><label className="text-xs font-medium text-text-secondary mb-1 block">Subtitle</label><input value={form.subtitle} onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))} className="w-full px-3 py-2.5 bg-white border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" /></div>
              <div><label className="text-xs font-medium text-text-secondary mb-1 block">Description</label><textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className="w-full px-3 py-2.5 bg-white border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none" /></div>
              <div><label className="text-xs font-medium text-text-secondary mb-1 block">Image</label><input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageUpload} className="hidden" />{form.image ? (<div className="relative rounded-lg overflow-hidden border border-border"><img src={form.image} alt="Preview" className="w-full h-40 object-cover" /><button onClick={() => setForm(f => ({ ...f, image: "" }))} className="absolute top-2 right-2 w-7 h-7 bg-black/50 rounded-full flex items-center justify-center text-white"><X size={14} /></button></div>) : (<button onClick={() => fileRef.current?.click()} className="w-full h-32 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 hover:bg-surface-muted transition-colors"><ImageIcon size={20} className="text-text-muted" /><span className="text-xs text-text-muted">Tap to upload</span></button>)}</div>
              <div><label className="text-xs font-medium text-text-secondary mb-1 block">Button Text</label><input value={form.buttonText} onChange={e => setForm(f => ({ ...f, buttonText: e.target.value }))} className="w-full px-3 py-2.5 bg-white border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" /></div>
              <div><label className="text-xs font-medium text-text-secondary mb-1 block">Button Link</label><input value={form.buttonLink} onChange={e => setForm(f => ({ ...f, buttonLink: e.target.value }))} className="w-full px-3 py-2.5 bg-white border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" /></div>
              <div className="flex gap-3 pt-2"><button onClick={handleSave} className="flex-1"><Button className="w-full">Save</Button></button><Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button></div>
            </div>
          </div>
        </div>
      )}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-white rounded-2xl w-full max-w-sm shadow-xl p-6 text-center">
            <h3 className="font-semibold">Remove this section?</h3>
            <div className="flex gap-3 mt-5"><Button variant="ghost" onClick={() => setDeleteConfirm(null)} className="flex-1">Cancel</Button><button onClick={handleDeleteSection} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700">Remove</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
