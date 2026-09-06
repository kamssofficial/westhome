"use client";

import { useState, useEffect, useCallback } from "react";
import { X, SlidersHorizontal, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Category } from "@/types";

export interface FilterState {
  category: string;
  subcategory: string;
  minPrice: string;
  maxPrice: string;
  inStock: string;
  sort: string;
}

export const EMPTY_FILTERS: FilterState = {
  category: "", subcategory: "", minPrice: "", maxPrice: "", inStock: "", sort: "recommended",
};

// Accessories subcategories
const ACCESSORIES_SUBS = [
  "Soap Dispensers", "Cushion Covers", "Vases", "Tissue Boxes",
  "Dustbins", "Flower Pots", "Trays & Holders", "Decor Accents",
];

interface FilterPanelProps {
  open: boolean;
  onClose: () => void;
  onApply: (filters: FilterState) => void;
  initialFilters: FilterState;
  categories: Category[];
  resultCount: number;
}

function Section({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-black/[.04] last:border-0">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="w-full flex items-center justify-between py-4 text-left">
        <span className="text-sm font-semibold text-[#1a1917]">{title}</span>
        <ChevronDown size={16} className={cn("text-[#b0aba6] transition-transform duration-200", open && "rotate-180")} />
      </button>
      {open && <div className="pb-4">{children}</div>}
    </div>
  );
}

export default function FilterPanel({ open, onClose, onApply, initialFilters, categories, resultCount }: FilterPanelProps) {
  const [f, setF] = useState<FilterState>(initialFilters);
  const [dynamicSubs, setDynamicSubs] = useState<{name:string;slug:string;count:number}[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(false);

  useEffect(() => { if (open) setF(initialFilters); }, [open, initialFilters]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Fetch subcategories when Accessories is selected
  useEffect(() => {
    if (!open || !f.category) { setDynamicSubs([]); return; }
    const cat = categories.find(c => c.slug === f.category);
    if (cat?.subcategories?.length) {
      setDynamicSubs(cat.subcategories.map((s:any) => ({ name: s.name, slug: s.slug, count: s.productCount || 0 })));
    } else {
      setDynamicSubs([]);
      if (f.subcategory) setF(p => ({ ...p, subcategory: "" }));
    }
  }, [open, f.category, categories]);

  const set = <K extends keyof FilterState>(key: K, val: FilterState[K]) => {
    setF(prev => {
      const next = { ...prev, [key]: val };
      // Clear subcategory when category changes to non-Accessories
      if (key === "category") {
        const cat = categories.find(c => c.slug === val);
        if (!cat?.subcategories?.length) next.subcategory = "";
      }
      return next;
    });
  };

  const clearAll = () => setF(EMPTY_FILTERS);

  const activeCount = [
    f.category !== "",
    f.subcategory !== "",
    f.minPrice !== "" || f.maxPrice !== "",
    f.inStock !== "",
  ].filter(Boolean).length;

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Filters"
        className={cn(
        "fixed z-[70] bg-[#faf8f5] overflow-hidden flex flex-col transition-transform duration-300",
        "inset-x-0 bottom-0 top-[8vh] rounded-t-[1.5rem]",
        "md:inset-y-0 md:right-0 md:left-auto md:w-[380px] md:top-0 md:rounded-t-none md:rounded-l-[1.5rem]"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/[.06] shrink-0">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={17} className="text-[#1a1917]" />
            <span className="text-base font-semibold text-[#1a1917]">Filters</span>
            {activeCount > 0 && <span className="w-5 h-5 rounded-full bg-[#d4a574] text-white text-[10px] font-bold flex items-center justify-center">{activeCount}</span>}
          </div>
          <div className="flex items-center gap-3">
            {activeCount > 0 && <button onClick={clearAll} className="text-xs font-medium text-[#d4a574] hover:text-[#c49564]">Clear All</button>}
            <button onClick={onClose} aria-label="Close filters" className="w-8 h-8 flex items-center justify-center hover:bg-black/[.04] rounded-full"><X size={18} className="text-[#6b6560]" /></button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5">
          {/* CATEGORY */}
          <Section title="Category" defaultOpen={true}>
            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => set("category", "")}
                className={cn("px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                  !f.category ? "bg-[#1a1917] text-white" : "bg-white text-[#6b6560] border border-black/[.08] hover:border-black/[.15]"
                )}>All</button>
              {categories.map(cat => (
                <button key={cat.slug} onClick={() => set("category", cat.slug)}
                  className={cn("px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                    f.category === cat.slug ? "bg-[#1a1917] text-white" : "bg-white text-[#6b6560] border border-black/[.08] hover:border-black/[.15]"
                  )}>{cat.name}</button>
              ))}
            </div>
          </Section>

          {/* SUBCATEGORY — only when category has subcategories */}
          {dynamicSubs.length > 0 && (
            <Section title="Subcategory" defaultOpen={true}>
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => set("subcategory", "")}
                  className={cn("px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                    !f.subcategory ? "bg-[#1a1917] text-white" : "bg-white text-[#6b6560] border border-black/[.08] hover:border-black/[.15]"
                  )}>All</button>
                {dynamicSubs.map(sub => (
                  <button key={sub.slug} onClick={() => set("subcategory", sub.slug)}
                    className={cn("px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                      f.subcategory === sub.slug ? "bg-[#1a1917] text-white" : "bg-white text-[#6b6560] border border-black/[.08] hover:border-black/[.15]"
                    )}>{sub.name}{sub.count > 0 && <span className="ml-1 text-[10px] opacity-60">{sub.count}</span>}</button>
                ))}
              </div>
            </Section>
          )}

          {/* PRICE */}
          <Section title="Price" defaultOpen={true}>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label htmlFor="filter-min-price" className="text-[10px] font-medium text-[#b0aba6] uppercase tracking-wider mb-1 block">Min</label>
                <input id="filter-min-price" type="number" min="0" value={f.minPrice} onChange={e => set("minPrice", e.target.value)}
                  placeholder="₹0" className="w-full px-3 py-2 bg-white border border-black/[.08] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a574]/30" />
              </div>
              <span className="text-[#b0aba6] mt-4">—</span>
              <div className="flex-1">
                <label className="text-[10px] font-medium text-[#b0aba6] uppercase tracking-wider mb-1 block">Max</label>
                <input type="number" min="0" value={f.maxPrice} onChange={e => set("maxPrice", e.target.value)}
                  placeholder="Any" className="w-full px-3 py-2 bg-white border border-black/[.08] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a574]/30" />
              </div>
            </div>
          </Section>

          {/* AVAILABILITY */}
          <Section title="Availability">
            <div className="flex gap-1.5">
              {[{ label: "All", value: "" }, { label: "In Stock", value: "true" }].map(opt => (
                <button key={opt.value} onClick={() => set("inStock", opt.value)}
                  className={cn("px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                    f.inStock === opt.value ? "bg-[#1a1917] text-white" : "bg-white text-[#6b6560] border border-black/[.08] hover:border-black/[.15]"
                  )}>{opt.label}</button>
              ))}
            </div>
          </Section>
        </div>

        {/* Sticky footer */}
        <div className="px-5 py-4 border-t border-black/[.06] shrink-0 bg-[#faf8f5]">
          <button onClick={() => { onApply(f); onClose(); }}
            className="w-full py-3.5 bg-[#1a1917] text-white rounded-2xl text-sm font-semibold hover:bg-[#2d2926] transition-colors min-h-[48px]">
            Show {resultCount} Result{resultCount !== 1 ? "s" : ""}
          </button>
        </div>
      </div>
    </>
  );
}
