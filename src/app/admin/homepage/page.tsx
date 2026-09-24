"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Eye, EyeOff, GripVertical } from "lucide-react";
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

  useEffect(() => {
    fetchSections();
  }, []);

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
          sections.sort((a, b) => a.position - b.position).map((section) => (
            <div key={section.id} className="bg-surface rounded-[1.35rem] border border-border p-4">
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
                  <button className="p-1.5 hover:bg-surface-muted rounded-lg">
                    <Edit size={14} className="text-text-muted" />
                  </button>
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
              <Button variant="ghost" size="sm">
                <Plus size={14} /> Add
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
