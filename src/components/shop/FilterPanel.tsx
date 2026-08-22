"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import { X, SlidersHorizontal, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Category } from "@/types";

export interface FilterState {
  category: string;
  size: string;
  dimensions: string;
  minPrice: string;
  maxPrice: string;
  inStock: string;
}

export const EMPTY_FILTERS: FilterState = {
  category: "", size: "", dimensions: "", minPrice: "", maxPrice: "", inStock: "",
};

const PRICE_RANGES = [
  { label: "Under ₹500", min: "", max: "500" },
  { label: "₹500 – ₹1,000", min: "500", max: "1000" },
  { label: "₹1,000 – ₹2,000", min: "1000", max: "2000" },
  { label: "₹2,000 – ₹5,000", min: "2000", max: "5000" },
  { label: "₹5,000+", min: "5000", max: "" },
];

const SIZE_OPTIONS = [
  { label: "Small", value: "small", desc: "Under 50cm" },
  { label: "Medium", value: "medium", desc: "50–100cm" },
  { label: "Large", value: "large", desc: "100–150cm" },
  { label: "Extra Large", value: "xl", desc: "Over 150cm" },
];

interface FilterPanelProps {
  open: boolean;
  onClose: () => void;
  onApply: (filters: FilterState) => void;
  initialFilters: FilterState;
  categories: Category[];
  resultCount: number;
}

// Check if a category name suggests frame-type products
function isFrameCategory(name: string): boolean {
  return name.toLowerCase().includes("frame");
}

export default function FilterPanel({ open, onClose, onApply, initialFilters, categories, resultCount }: FilterPanelProps) {
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [dynamicDimensions, setDynamicDimensions] = useState<string[]>([]);
  const [loadingDims, setLoadingDims] = useState(false);

  // Reset local state when opening
  useEffect(() => {
    if (open) setFilters(initialFilters);
  }, [open, initialFilters]);

  // Fetch dimensions for a category
  const fetchDimensions = useCallback(async (catSlug: string) => {
    if (!catSlug) { setDynamicDimensions([]); return; }
    setLoadingDims(true);
    try {
      const res = await fetch("/api/products?category=" + catSlug + "&limit=200");
      const data = await res.json();
      const dims = new Set<string>();
      (data.products || []).forEach((p: any) => {
        if (p.width && p.height) {
          const w = Math.round(Number(p.width));
          const h = Math.round(Number(p.height));
          if (w > 0 && h > 0) {
            const [a, b] = w <= h ? [w, h] : [h, w];
            dims.add(a + " × " + b);
          }
        }
      });
      setDynamicDimensions([...dims].sort((x, y) => parseInt(x) - parseInt(y)));
    } catch { setDynamicDimensions([]); }
    finally { setLoadingDims(false); }
  }, []);

  // Fetch dimensions when category changes
  useEffect(() => {
    if (!open) return;
    if (filters.category) {
      const cat = categories.find(c => c.slug === filters.category);
      if (cat && isFrameCategory(cat.name)) {
        fetchDimensions(filters.category);
      } else {
        setDynamicDimensions([]);
        if (filters.dimensions) setFilters(p => ({ ...p, dimensions: "" }));
      }
    } else {
      setDynamicDimensions([]);
    }
  }, [open, filters.category, categories, fetchDimensions]);

  const set = <K extends keyof FilterState>(key: K, val: FilterState[K]) => {
    setFilters(prev => ({ ...prev, [key]: val }));
  };

  const clearAll = () => { setFilters(EMPTY_FILTERS); setDynamicDimensions([]); };

  const apply = () => { onApply(filters); onClose(); };

  // Count active filter groups (category=1, size/dims=1, price=1, inStock=1)
  const activeCount = [
    filters.category !== "",
    filters.size !== "" || filters.dimensions !== "",
    filters.minPrice !== "" || filters.maxPrice !== "",
    filters.inStock !== "",
  ].filter(Boolean).length;

  if (!open) return null;

  return (
    <Fragment>
      <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={cn(
        "fixed z-[70] bg-[#faf8f5] overflow-hidden flex flex-col transition-transform duration-300",
        "inset-x-0 bottom-0 top-[10vh] rounded-t-[1.5rem]",
        "md:inset-y-0 md:right-0 md:left-auto md:w-[380px] md:top-0 md:rounded-t-none md:rounded-l-[1.5rem]"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-black/[.06] shrink-0">
          <div className="flex items-center gap-2.5">
            <SlidersHorizontal size={18} className="text-[#1a1917]" />
            <span className="text-base font-semibold text-[#1a1917]">Filters</span>
            {activeCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-[#d4a574] text-white text-[10px] font-bold flex items-center justify-center">{activeCount}</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {activeCount > 0 && (
              <button type="button" onClick={clearAll} className="text-xs font-medium text-[#d4a574] hover:text-[#c49564] transition-colors">Clear all</button>
            )}
            <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center hover:bg-black/[.04] rounded-full transition-colors">
              <X size={18} className="text-[#6b6560]" />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-7">
          {/* CATEGORY */}
          <div>
            <h3 className="text-[11px] font-semibold text-[#b0aba6] uppercase tracking-[.12em] mb-3">Category</h3>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => set("category", "")}
                className={cn("px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 min-h-[44px]",
                  !filters.category ? "bg-[#1a1917] text-white shadow-sm" : "bg-white text-[#6b6560] border border-black/[.08] hover:border-black/[.15]"
                )}>All</button>
              {categories.map(cat => (
                <button key={cat.slug} type="button" onClick={() => {
                  const isFrames = isFrameCategory(cat.name);
                  setFilters(prev => ({
                    ...prev,
                    category: cat.slug,
                    dimensions: isFrames ? prev.dimensions : "",
                  }));
                }}
                  className={cn("px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 min-h-[44px]",
                    filters.category === cat.slug ? "bg-[#1a1917] text-white shadow-sm" : "bg-white text-[#6b6560] border border-black/[.08] hover:border-black/[.15]"
                  )}>{cat.name}</button>
              ))}
            </div>
          </div>

          {/* DIMENSIONS — show when frame category selected and dims exist */}
          {dynamicDimensions.length > 0 && (
            <div>
              <h3 className="text-[11px] font-semibold text-[#b0aba6] uppercase tracking-[.12em] mb-3">Dimensions</h3>
              {loadingDims ? (
                <div className="flex items-center gap-2 text-xs text-[#b0aba6] py-2">
                  <div className="w-4 h-4 border-2 border-[#d4a574] border-t-transparent rounded-full animate-spin" />
                  Loading dimensions...
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {dynamicDimensions.map(dim => (
                    <button key={dim} type="button" onClick={() => set("dimensions", filters.dimensions === dim ? "" : dim)}
                      className={cn("px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 min-h-[44px]",
                        filters.dimensions === dim
                          ? "bg-[#1a1917] text-white shadow-sm"
                          : "bg-white text-[#6b6560] border border-black/[.08] hover:border-black/[.15]"
                      )}>{dim}</button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SIZE — show when NOT a frame category with dims */}
          {dynamicDimensions.length === 0 && (
            <div>
              <h3 className="text-[11px] font-semibold text-[#b0aba6] uppercase tracking-[.12em] mb-3">Size</h3>
              <div className="grid grid-cols-2 gap-2">
                {SIZE_OPTIONS.map(s => (
                  <button key={s.value} type="button" onClick={() => set("size", filters.size === s.value ? "" : s.value)}
                    className={cn("px-4 py-3 rounded-xl text-left transition-all duration-200 min-h-[48px] flex flex-col justify-center",
                      filters.size === s.value
                        ? "bg-[#1a1917] text-white shadow-sm"
                        : "bg-white text-[#6b6560] border border-black/[.08] hover:border-black/[.15]"
                    )}>
                    <span className="text-sm font-medium">{s.label}</span>
                    <span className={cn("text-[10px] mt-0.5", filters.size === s.value ? "text-white/60" : "text-[#b0aba6]")}>{s.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* PRICE */}
          <div>
            <h3 className="text-[11px] font-semibold text-[#b0aba6] uppercase tracking-[.12em] mb-3">Price</h3>
            <div className="space-y-2">
              {PRICE_RANGES.map(r => {
                const isActive = filters.minPrice === r.min && filters.maxPrice === r.max;
                return (
                  <button key={r.label} type="button"
                    onClick={() => {
                      if (isActive) { set("minPrice", ""); set("maxPrice", ""); }
                      else { set("minPrice", r.min); set("maxPrice", r.max); }
                    }}
                    className={cn("w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 min-h-[44px] flex items-center",
                      isActive
                        ? "bg-[#1a1917] text-white shadow-sm"
                        : "bg-white text-[#6b6560] border border-black/[.08] hover:border-black/[.15]"
                    )}>
                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#d4a574] mr-2.5 shrink-0" />}
                    {r.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* AVAILABILITY */}
          <div>
            <h3 className="text-[11px] font-semibold text-[#b0aba6] uppercase tracking-[.12em] mb-3">Availability</h3>
            <div className="flex flex-wrap gap-2">
              {[{ label: "All", value: "" }, { label: "In Stock", value: "true" }].map(opt => (
                <button key={opt.value} type="button" onClick={() => set("inStock", opt.value)}
                  className={cn("px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 min-h-[44px]",
                    filters.inStock === opt.value
                      ? "bg-[#1a1917] text-white shadow-sm"
                      : "bg-white text-[#6b6560] border border-black/[.08] hover:border-black/[.15]"
                  )}>{opt.label}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Sticky footer */}
        <div className="px-6 py-4 border-t border-black/[.06] shrink-0 bg-[#faf8f5]">
          <button type="button" onClick={apply}
            className="w-full py-3.5 bg-[#1a1917] text-white rounded-2xl text-sm font-semibold hover:bg-[#2d2926] transition-colors min-h-[48px]">
            Show {resultCount} product{resultCount !== 1 ? "s" : ""}
          </button>
        </div>
      </div>
    </Fragment>
  );
}
