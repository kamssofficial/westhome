"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  SlidersHorizontal,
  ChevronDown,
  Check,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Category } from "@/types";

export interface FilterState {
  collection: string;
  subcategory: string;
  style: string;
  material: string;
  color: string;
  size: string;
  pattern: string;
  shape: string;
  minPrice: string;
  maxPrice: string;
  inStock: string;
  sort: string;
}

export const EMPTY_FILTERS: FilterState = {
  collection: "",
  subcategory: "",
  style: "",
  material: "",
  color: "",
  size: "",
  pattern: "",
  shape: "",
  minPrice: "",
  maxPrice: "",
  inStock: "",
  sort: "recommended",
};

interface FilterOptions {
  subcategories: { name: string; slug: string; count: number }[];
  materials: string[];
  colors: string[];
  styles: string[];
  patterns: string[];
  shapes: string[];
  finishes: string[];
  dimensions: { lengths: number[] };
  priceRange: { min: number; max: number };
  totalProducts: number;
}


// Category-to-filter mapping: which filter fields are relevant for each collection
const CATEGORY_FILTERS: Record<string, string[]> = {
  "lamps":           ["type", "style", "material", "color", "size", "price"],
  "carpets":         ["type", "pattern", "material", "color", "size", "shape", "price"],
  "clocks":          ["type", "style", "material", "color", "size", "price"],
  "comforters":      ["type", "pattern", "material", "color", "size", "season", "price"],
  "wall-decor":      ["type", "style", "material", "color", "size", "price"],
  "accessories":     ["type", "style", "material", "color", "size", "price"],
  "laundry":         ["type", "material", "color", "size", "price"],
};

// Default filters when no collection is selected (Shop All)
const DEFAULT_FILTERS = ["type", "style", "material", "color", "size", "price"];

// Subcategory-to-filter mapping for Accessories subcategories
const SUBCATEGORY_FILTERS: Record<string, string[]> = {
  "soap-dispensers": ["material", "color", "size", "price"],
  "cushion-covers":  ["pattern", "material", "color", "size", "price"],
  "vases":           ["style", "material", "color", "size", "shape", "price"],
  "flower-pots":     ["style", "material", "color", "size", "shape", "price"],
  "tissue-boxes":    ["material", "color", "size", "price"],
  "dustbin":         ["material", "color", "size", "price"],
};

function getActiveFilters(collectionSlug: string, subcategorySlug: string): string[] {
  if (subcategorySlug && SUBCATEGORY_FILTERS[subcategorySlug]) {
    return SUBCATEGORY_FILTERS[subcategorySlug];
  }
  if (collectionSlug && CATEGORY_FILTERS[collectionSlug]) {
    return CATEGORY_FILTERS[collectionSlug];
  }
  return DEFAULT_FILTERS;
}

const EMPTY_OPTIONS: FilterOptions = {
  subcategories: [], materials: [], colors: [], styles: [],
  patterns: [], shapes: [], finishes: [],
  dimensions: { lengths: [] }, priceRange: { min: 0, max: 10000 }, totalProducts: 0,
};

function FilterSection({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  const sectionId = "fs-" + title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <div className="border-b border-black/[.04] last:border-0">
      <button type="button" aria-expanded={open} aria-controls={sectionId} onClick={() => setOpen(!open)} className="w-full flex items-center justify-between py-4 text-left">
        <span className="text-sm font-semibold text-[#1a1917]">{title}</span>
        <ChevronDown size={16} className={cn("text-[#b0aba6] transition-transform duration-200", open && "rotate-180")} />
      </button>
      <div id={sectionId} className={cn(          "overflow-hidden transition-all duration-200",
          open ? "max-h-[800px] opacity-100 pb-4" : "max-h-0 opacity-0")}>
        {children}
      </div>
    </div>
  );
}

function PillButton({ label, active, onClick, count }: { label: string; active: boolean; onClick: () => void; count?: number }) {
  return (
    <button type="button" onClick={onClick} className={cn("inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150", active ? "bg-[#1a1917] text-white" : "bg-white text-[#6b6560] border border-black/[.08] hover:border-black/[.15]")}>
      {label}
      {count !== undefined && count > 0 && <span className={cn("text-[9px] font-bold", active ? "text-white/70" : "text-[#b0aba6]")}>{count}</span>}
    </button>
  );
}

const SORT_OPTIONS = [
  { value: "recommended", label: "Recommended" },
  { value: "newest", label: "Newest" },
  { value: "bestselling", label: "Most Popular" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
];

export function SortDropdown({ value, onChange, hasPrices = true }: { value: string; onChange: (v: string) => void; hasPrices?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = SORT_OPTIONS.find((o) => o.value === value);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  const visibleOptions = hasPrices ? SORT_OPTIONS : SORT_OPTIONS.filter((o) => o.value !== "price_asc" && o.value !== "price_desc");
  return (
    <div ref={ref} className="relative">
      <button type="button" aria-label="Sort products" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen(!open)} className="flex items-center gap-1.5 px-3 py-2 rounded-[1.35rem] border border-black/[.08] bg-white text-sm font-medium text-[#1a1917] hover:bg-[#f7f5f2] transition-colors">
        <span className="hidden sm:inline">{selected?.label || "Sort"}</span>
        <span className="sm:hidden">Sort</span>
        <ChevronDown size={14} className={cn("text-[#b0aba6] transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-2 w-52 bg-white rounded-xl border border-black/[.08] shadow-lg z-[100] py-1.5">
          {visibleOptions.map((opt) => (
            <button key={opt.value} type="button" onClick={() => { onChange(opt.value); setOpen(false); }} className={cn("w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors", value === opt.value ? "text-[#1a1917] font-medium bg-[#f7f5f2]" : "text-[#6b6560] hover:bg-[#f7f5f2]")}>
              {value === opt.value && <Check size={14} className="text-[#d4a574] shrink-0" />}
              <span className={value === opt.value ? "" : "ml-[22px]"}>{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ActiveFilterChips({ filters, categories, onRemove, onClearAll }: { filters: FilterState; categories: Category[]; onRemove: (key: keyof FilterState) => void; onClearAll: () => void }) {
  const chips: { key: keyof FilterState; label: string }[] = [];
  if (filters.collection) { const cat = categories.find((c) => c.slug === filters.collection); chips.push({ key: "collection", label: cat?.name || filters.collection.replace(/-/g, " ") }); }
  if (filters.subcategory) chips.push({ key: "subcategory", label: filters.subcategory.replace(/-/g, " ") });
  if (filters.style) chips.push({ key: "style", label: filters.style });
  if (filters.material) chips.push({ key: "material", label: filters.material });
  if (filters.color) chips.push({ key: "color", label: filters.color });
  if (filters.size) chips.push({ key: "size", label: "Size: " + filters.size });
  if (filters.pattern) chips.push({ key: "pattern", label: "Pattern: " + filters.pattern });
  if (filters.shape) chips.push({ key: "shape", label: "Shape: " + filters.shape });
  if (filters.minPrice || filters.maxPrice) chips.push({ key: "minPrice", label: "\u20B9" + (filters.minPrice || "0") + " \u2013 \u20B9" + (filters.maxPrice || "\u221E") });
  if (filters.inStock) chips.push({ key: "inStock", label: "In Stock" });
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 items-center">
      {chips.map((chip) => (
        <span key={chip.key} className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#1a1917] text-white rounded-full text-xs font-medium">
          {chip.label}
          <button type="button" aria-label={"Remove " + chip.label + " filter"} onClick={() => onRemove(chip.key)} className="ml-0.5 hover:opacity-60"><X size={12} /></button>
        </span>
      ))}
      <button type="button" onClick={onClearAll} className="text-xs text-[#d4a574] font-medium hover:underline ml-1">Clear all</button>
    </div>
  );
}

interface FilterPanelProps {
  open: boolean;
  onClose: () => void;
  onApply: (filters: FilterState) => void;
  initialFilters: FilterState;
  categories: Category[];
  resultCount: number;
  fixedCollection?: string;
  initialCollection?: string;
  hasPrices?: boolean;
}

export default function FilterPanel({ open, onClose, onApply, initialFilters, categories, resultCount, fixedCollection, initialCollection = "", hasPrices = true }: FilterPanelProps) {
  const [f, setF] = useState<FilterState>(initialFilters);
  const [options, setOptions] = useState<FilterOptions>(EMPTY_OPTIONS);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => { if (open) setF(initialFilters); }, [open, initialFilters]);

  useEffect(() => {
    if (!open) return;
    const slug = f.collection || initialCollection || "";
    const url = slug ? "/api/filters?category=" + slug : "/api/filters";
    setLoadingOptions(true);
    fetch(url).then((r) => r.json()).then((data) => {
      setOptions({ subcategories: data.subcategories || [], materials: data.materials || [], colors: data.colors || [], styles: data.styles || [], patterns: data.patterns || [], shapes: data.shapes || [], finishes: data.finishes || [], dimensions: data.dimensions || { lengths: [] }, priceRange: data.priceRange || { min: 0, max: 10000 }, totalProducts: data.totalProducts || 0 });
    }).catch(() => setOptions(EMPTY_OPTIONS)).finally(() => setLoadingOptions(false));
  }, [open, f.collection, initialCollection]);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusTimer = window.setTimeout(() => closeButtonRef.current?.focus(), 0);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onClose(); return; }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'));
      if (focusable.length === 0) return;
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => { window.clearTimeout(focusTimer); document.removeEventListener("keydown", handleKeyDown); previousFocusRef.current?.focus(); previousFocusRef.current = null; };
  }, [open, onClose]);

  const set = useCallback(<K extends keyof FilterState>(key: K, val: FilterState[K]) => {
    setF((prev) => { const next = { ...prev, [key]: val }; if (key === "collection") next.subcategory = ""; return next; });
  }, []);

  const clearAll = () => { fixedCollection ? setF({ ...EMPTY_FILTERS, collection: fixedCollection }) : setF({ ...EMPTY_FILTERS }); };

  const individualFilterCount = [f.collection !== "" && !fixedCollection, f.subcategory !== "", f.style !== "", f.material !== "", f.color !== "", f.size !== "", f.pattern !== "", f.shape !== "", f.minPrice !== "" || f.maxPrice !== "", f.inStock !== ""].filter(Boolean).length;
  // Determine which filter sections to show based on collection/subcategory
  const activeFilterSet = getActiveFilters(f.collection || initialCollection, f.subcategory);
  const showType = activeFilterSet.includes("type") && options.subcategories.length > 0;
  const showStyle = activeFilterSet.includes("style") && options.styles.length > 0;
  const showMaterial = activeFilterSet.includes("material") && options.materials.length > 0;
  const showColor = activeFilterSet.includes("color") && options.colors.length > 0;
  const showSize = activeFilterSet.includes("size") && options.dimensions.lengths.length > 0;
  const showShape = activeFilterSet.includes("shape") && options.shapes.length > 0;
  const showPattern = activeFilterSet.includes("pattern") && options.patterns.length > 0;
  const showPrice = activeFilterSet.includes("price") && hasPrices;

  const showCollectionSection = !fixedCollection && categories.length > 0;

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm" aria-hidden="true" onClick={onClose} />
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="filter-panel-title" className={cn("fixed z-[70] bg-[#faf8f5] flex flex-col transition-transform duration-300 ease-out", "inset-x-0 bottom-0 top-[8vh] rounded-t-[1.5rem]", "md:inset-y-0 md:right-0 md:left-auto md:w-[380px] md:top-0 md:rounded-t-none md:rounded-l-[1.5rem]")}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/[.06] shrink-0">
          <div className="flex items-center gap-2.5">
            <SlidersHorizontal size={17} className="text-[#1a1917]" />
            <span id="filter-panel-title" className="text-base font-semibold text-[#1a1917]">Filters</span>
            {individualFilterCount > 0 && <span className="w-5 h-5 rounded-full bg-[#d4a574] text-white text-[10px] font-bold flex items-center justify-center">{individualFilterCount}</span>}
          </div>
          <div className="flex items-center gap-3">
            {individualFilterCount > 0 && <button type="button" onClick={clearAll} className="flex items-center gap-1 text-xs font-medium text-[#d4a574] hover:text-[#c49564] transition-colors"><RotateCcw size={12} />Clear All</button>}
            <button ref={closeButtonRef} type="button" aria-label="Close filters" onClick={onClose} className="w-8 h-8 flex items-center justify-center hover:bg-black/[.04] rounded-full transition-colors"><X size={18} className="text-[#6b6560]" /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-5" style={{ WebkitOverflowScrolling: "touch" }}>
          {showCollectionSection && (
            <FilterSection title="Collection" defaultOpen={true}>
              <div className="flex flex-wrap gap-1.5">
                <PillButton label="All" active={f.collection === ""} onClick={() => set("collection", "")} />
                {categories.map((cat) => <PillButton key={cat.slug} label={cat.name} active={f.collection === cat.slug} onClick={() => set("collection", cat.slug)} count={cat.productCount} />)}
              </div>
            </FilterSection>
          )}
          {showType && (
            <FilterSection title="Type" defaultOpen={true}>
              <div className="flex flex-wrap gap-1.5">
                <PillButton label="All" active={f.subcategory === ""} onClick={() => set("subcategory", "")} />
                {options.subcategories.map((sub) => <PillButton key={sub.slug} label={sub.name} active={f.subcategory === sub.slug} onClick={() => set("subcategory", sub.slug)} count={sub.count} />)}
              </div>
            </FilterSection>
          )}
          {showStyle && (
            <FilterSection title="Style" defaultOpen={false}>
              <div className="flex flex-wrap gap-1.5">
                <PillButton label="All" active={f.style === ""} onClick={() => set("style", "")} />
                {options.styles.map((s) => <PillButton key={s} label={s} active={f.style === s} onClick={() => set("style", f.style === s ? "" : s)} />)}
              </div>
            </FilterSection>
          )}
          {showMaterial && (
            <FilterSection title="Material" defaultOpen={false}>
              <div className="flex flex-wrap gap-1.5">
                <PillButton label="All" active={f.material === ""} onClick={() => set("material", "")} />
                {options.materials.map((m) => <PillButton key={m} label={m} active={f.material === m} onClick={() => set("material", f.material === m ? "" : m)} />)}
              </div>
            </FilterSection>
          )}
          {showColor && (
            <FilterSection title="Color" defaultOpen={false}>
              <div className="flex flex-wrap gap-1.5">
                <PillButton label="All" active={f.color === ""} onClick={() => set("color", "")} />
                {options.colors.map((c) => <PillButton key={c} label={c} active={f.color === c} onClick={() => set("color", f.color === c ? "" : c)} />)}
              </div>
            </FilterSection>
          )}
          {showSize && (
            <FilterSection title="Size" defaultOpen={false}>
              <div className="flex flex-wrap gap-1.5">
                <PillButton label="All" active={f.size === ""} onClick={() => set("size", "")} />
                {options.dimensions.lengths.map((len) => <PillButton key={len} label={len + " cm"} active={f.size === String(len)} onClick={() => set("size", f.size === String(len) ? "" : String(len))} />)}
              </div>
            </FilterSection>
          )}
          {/* SHAPE */}
          {showShape && (
            <FilterSection title="Shape" defaultOpen={false}>
              <div className="flex flex-wrap gap-1.5">
                <PillButton label="All" active={f.shape === ""} onClick={() => set("shape", "")} />
                {options.shapes.map((s) => <PillButton key={s} label={s} active={f.shape === s} onClick={() => set("shape", f.shape === s ? "" : s)} />)}
              </div>
            </FilterSection>
          )}

          {/* PATTERN */}
          {showPattern && (
            <FilterSection title="Pattern" defaultOpen={false}>
              <div className="flex flex-wrap gap-1.5">
                <PillButton label="All" active={f.pattern === ""} onClick={() => set("pattern", "")} />
                {options.patterns.map((p) => <PillButton key={p} label={p} active={f.pattern === p} onClick={() => set("pattern", f.pattern === p ? "" : p)} />)}
              </div>
            </FilterSection>
          )}

          {showPrice && (
            <FilterSection title="Price Range" defaultOpen={true}>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label htmlFor="filter-min-price" className="text-[10px] font-medium text-[#b0aba6] uppercase tracking-wider mb-1 block">Min</label>
                  <input id="filter-min-price" type="number" min="0" value={f.minPrice} onChange={(e) => set("minPrice", e.target.value)} placeholder="0" className="w-full px-3 py-2 bg-white border border-black/[.08] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a574]/30 transition-shadow" />
                </div>
                <span className="text-[#b0aba6] mt-4">&mdash;</span>
                <div className="flex-1">
                  <label htmlFor="filter-max-price" className="text-[10px] font-medium text-[#b0aba6] uppercase tracking-wider mb-1 block">Max</label>
                  <input id="filter-max-price" type="number" min="0" value={f.maxPrice} onChange={(e) => set("maxPrice", e.target.value)} placeholder="Any" className="w-full px-3 py-2 bg-white border border-black/[.08] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a574]/30 transition-shadow" />
                </div>
              </div>
            </FilterSection>
          )}
          <FilterSection title="Availability" defaultOpen={false}>
            <div className="flex gap-1.5">
              {[{ label: "All", value: "" }, { label: "In Stock", value: "true" }].map((opt) => <PillButton key={opt.value} label={opt.label} active={f.inStock === opt.value} onClick={() => set("inStock", opt.value)} />)}
            </div>
          </FilterSection>
          {loadingOptions && (
            <div className="py-4 flex items-center justify-center gap-2 text-[#b0aba6]">
              <div className="w-4 h-4 border-2 border-[#b0aba6] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs">Loading filters...</span>
            </div>
          )}
        </div>
        <div className="px-5 py-4 border-t border-black/[.06] shrink-0 bg-[#faf8f5]">
          <button type="button" onClick={() => { onApply(f); onClose(); }} className="w-full py-3.5 bg-[#1a1917] text-white rounded-2xl text-sm font-semibold hover:bg-[#2d2926] active:scale-[.98] transition-all min-h-[48px]">
            Show {resultCount} Result{resultCount !== 1 ? "s" : ""}
          </button>
        </div>
      </div>
    </>
  );
}
