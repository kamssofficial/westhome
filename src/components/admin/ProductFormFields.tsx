"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Shared building blocks for the admin product create/edit forms.
 *
 * The two pages keep their own form state and submit logic; these components
 * only render fields so both pages look and behave identically. Advanced
 * fields (dimensions, material, care, packaging, custom sizing, SEO) are
 * grouped in AdditionalDetailsSection, collapsed by default, so the everyday
 * flow stays short: Basic → Pricing → Category → Status → Images → Variants.
 */

export interface ProductFormState {
  name: string; sku: string; description: string; shortDescription: string;
  regularPrice: string; salePrice: string; stockQuantity: string; lowStockThreshold: string;
  trackInventory: boolean; allowBackorder: boolean; categoryId: string; subcategoryId: string;
  isFeatured: boolean; isBestseller: boolean; isNewArrival: boolean; isComingSoon: boolean;
  status: string; purchaseMethod: string;
  height: string; width: string; length: string; depth: string; diameter: string;
  dimensionUnit: string; weight: string; weightUnit: string; capacity: string; capacityUnit: string;
  material: string; color: string; finish: string; shape: string; pattern: string;
  style: string; mountingType: string; usageLocation: string;
  careInstructions: string; warranty: string;
  packagingType: string; packagingDimensions: string; packagingWeight: string; includedItems: string;
  allowCustomSize: boolean; customSizeUnit: string;
  customSizeMinWidth: string; customSizeMinLength: string; customSizeMinHeight: string;
  customSizeMaxWidth: string; customSizeMaxLength: string; customSizeMaxHeight: string;
  customSizePricingMethod: string; customSizeRequiresApproval: boolean;
  seoTitle: string; seoDescription: string;
}

export type SetProductForm = (patch: Partial<ProductFormState>) => void;

const inputClass = "w-full px-3 py-2.5 bg-white border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30";
const labelClass = "text-xs font-medium text-text-secondary mb-1 block";

export function Section({ title, headerRight, children }: { title: string; headerRight?: ReactNode; children: ReactNode }) {
  return (
    <div className="bg-surface rounded-[1.35rem] border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">{title}</h2>
        {headerRight}
      </div>
      {children}
    </div>
  );
}

export function TextField({ label, required, value, onChange, type = "text", placeholder, maxLength, step }: {
  label: string; required?: boolean; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; maxLength?: number; step?: string;
}) {
  return (
    <div>
      <label className={labelClass}>{label}{required && " *"}</label>
      <input type={type} step={step} value={value} maxLength={maxLength} placeholder={placeholder} required={required} onChange={(e) => onChange(e.target.value)} className={inputClass} />
    </div>
  );
}

export function TextAreaField({ label, value, onChange, rows = 3, placeholder, maxLength, className }: {
  label: string; value: string; onChange: (v: string) => void; rows?: number; placeholder?: string; maxLength?: number; className?: string;
}) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <textarea value={value} rows={rows} maxLength={maxLength} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={cn(inputClass, "resize-y", className)} />
    </div>
  );
}

export function SelectField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

export function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="accent-accent" />
      {label}
    </label>
  );
}

export function BasicInfoSection({ form, setForm }: { form: ProductFormState; setForm: SetProductForm }) {
  return (
    <Section title="Basic Information">
      <div className="space-y-4">
        <TextField label="Product Name" required value={form.name} onChange={(v) => setForm({ name: v })} />
        <TextField label="SKU" value={form.sku} onChange={(v) => setForm({ sku: v })} placeholder="Auto-generated if empty" />
        <TextField label="Short Description" value={form.shortDescription} onChange={(v) => setForm({ shortDescription: v })} maxLength={160} />
        <TextAreaField label="Description" value={form.description} onChange={(v) => setForm({ description: v })} rows={5} className="min-h-[120px]" />
      </div>
    </Section>
  );
}

export function PricingStockSection({ form, setForm, variantSummary }: {
  form: ProductFormState; setForm: SetProductForm; variantSummary?: ReactNode;
}) {
  return (
    <Section title="Pricing & Stock">
      {variantSummary ?? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TextField label="Regular Price (₹)" required type="number" step="0.01" value={form.regularPrice} onChange={(v) => setForm({ regularPrice: v })} />
          <TextField label="Sale Price (₹)" type="number" step="0.01" value={form.salePrice} onChange={(v) => setForm({ salePrice: v })} />
          <TextField label="Stock Quantity" type="number" value={form.stockQuantity} onChange={(v) => setForm({ stockQuantity: v })} />
        </div>
      )}
      <div className="flex items-center gap-6 mt-4">
        <Checkbox label="Allow backorder" checked={form.allowBackorder} onChange={(v) => setForm({ allowBackorder: v })} />
      </div>
    </Section>
  );
}

export function CategorySection({ form, setForm, categories }: {
  form: ProductFormState; setForm: SetProductForm;
  categories: { id: string; name: string; subcategories?: { id: string; name: string }[] }[];
}) {
  const selected = categories.find((c) => c.id === form.categoryId);
  const subcategories = selected?.subcategories ?? [];
  return (
    <Section title="Category">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Category *</label>
          <select value={form.categoryId} required onChange={(e) => setForm({ categoryId: e.target.value, subcategoryId: "" })} className={cn(inputClass, form.categoryId && "bg-primary text-white border-primary")}>
            <option value="" className="text-black bg-white">Select Category</option>
            {categories.map((cat) => <option key={cat.id} value={cat.id} className="text-black bg-white">{cat.name}</option>)}
          </select>
        </div>
        {subcategories.length > 0 && (
          <div>
            <label className={labelClass}>Subcategory</label>
            <select value={form.subcategoryId} onChange={(e) => setForm({ subcategoryId: e.target.value })} className={cn(inputClass, form.subcategoryId && "bg-primary text-white border-primary")}>
              <option value="" className="text-black bg-white">None</option>
              {subcategories.map((sub) => <option key={sub.id} value={sub.id} className="text-black bg-white">{sub.name}</option>)}
            </select>
          </div>
        )}
      </div>
    </Section>
  );
}

const VISIBILITY_FLAGS: [keyof ProductFormState, string][] = [
  ["isFeatured", "Featured"],
  ["isBestseller", "Bestseller"],
  ["isNewArrival", "New Arrival"],
  ["isComingSoon", "Coming Soon"],
];

export function StatusSection({ form, setForm, includeArchived = false }: {
  form: ProductFormState; setForm: SetProductForm; includeArchived?: boolean;
}) {
  return (
    <Section title="Status & Visibility">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SelectField
          label="Status"
          value={form.status}
          onChange={(v) => setForm({ status: v })}
          options={[
            { value: "DRAFT", label: "Draft" },
            { value: "ACTIVE", label: "Active" },
            { value: "INACTIVE", label: "Inactive" },
            ...(includeArchived ? [{ value: "ARCHIVED", label: "Archived" }] : []),
          ]}
        />
        <SelectField
          label="Purchase Method"
          value={form.purchaseMethod}
          onChange={(v) => setForm({ purchaseMethod: v })}
          options={[
            { value: "BUY_ONLINE", label: "Buy Online" },
            { value: "WHATSAPP", label: "WhatsApp Only" },
            { value: "BOTH", label: "Both" },
          ]}
        />
      </div>
      <div className="flex flex-wrap items-center gap-4 mt-4">
        {VISIBILITY_FLAGS.map(([key, label]) => (
          <Checkbox key={key} label={label} checked={form[key] as boolean} onChange={(v) => setForm({ [key]: v } as Partial<ProductFormState>)} />
        ))}
      </div>
    </Section>
  );
}

const FILLABLE_KEYS: (keyof ProductFormState)[] = [
  "height", "width", "length", "depth", "diameter", "weight", "capacity",
  "material", "color", "finish", "shape", "pattern", "style", "mountingType", "usageLocation",
  "careInstructions", "warranty", "includedItems", "packagingType", "packagingDimensions", "packagingWeight",
  "customSizeMinWidth", "customSizeMinLength", "customSizeMinHeight", "customSizeMaxWidth", "customSizeMaxLength", "customSizeMaxHeight",
  "seoTitle", "seoDescription",
];

function SubBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-3">{title}</h3>
      {children}
    </div>
  );
}

export function AdditionalDetailsSection({ form, setForm, defaultOpen = false }: {
  form: ProductFormState; setForm: SetProductForm; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const filled = FILLABLE_KEYS.filter((k) => typeof form[k] === "string" && (form[k] as string).trim() !== "").length;

  return (
    <div className="bg-surface rounded-[1.35rem] border border-border p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Additional Details</h2>
          <p className="text-xs text-text-muted mt-0.5">Dimensions, material, care, packaging, custom sizing, and SEO — all optional.</p>
        </div>
        <button type="button" onClick={() => setOpen(!open)} className="flex items-center gap-1.5 text-sm font-medium text-accent hover:underline whitespace-nowrap">
          <ChevronDown size={16} className={cn("transition-transform", open && "rotate-180")} />
          {open ? "Hide" : "Show"}
          {filled > 0 && <span className="text-xs font-normal text-text-muted">&nbsp;· {filled} filled</span>}
        </button>
      </div>

      {open && (
        <div className="mt-6 space-y-6">
          <SubBlock title="Physical Dimensions">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <TextField label="Height" type="number" step="0.1" value={form.height} onChange={(v) => setForm({ height: v })} placeholder="0" />
              <TextField label="Width" type="number" step="0.1" value={form.width} onChange={(v) => setForm({ width: v })} placeholder="0" />
              <TextField label="Length" type="number" step="0.1" value={form.length} onChange={(v) => setForm({ length: v })} placeholder="0" />
              <TextField label="Depth" type="number" step="0.1" value={form.depth} onChange={(v) => setForm({ depth: v })} placeholder="0" />
              <TextField label="Diameter" type="number" step="0.1" value={form.diameter} onChange={(v) => setForm({ diameter: v })} placeholder="0" />
              <SelectField label="Dimension Unit" value={form.dimensionUnit} onChange={(v) => setForm({ dimensionUnit: v })} options={[{ value: "cm", label: "cm" }, { value: "mm", label: "mm" }, { value: "in", label: "inches" }]} />
              <TextField label="Weight" type="number" step="0.1" value={form.weight} onChange={(v) => setForm({ weight: v })} placeholder="0" />
              <SelectField label="Weight Unit" value={form.weightUnit} onChange={(v) => setForm({ weightUnit: v })} options={[{ value: "kg", label: "kg" }, { value: "g", label: "g" }]} />
            </div>
          </SubBlock>

          <SubBlock title="Material & Appearance">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextField label="Material" value={form.material} onChange={(v) => setForm({ material: v })} placeholder="e.g. Ceramic, Wool, Velvet" />
              <TextField label="Color" value={form.color} onChange={(v) => setForm({ color: v })} placeholder="e.g. Gold, Cream, Black" />
              <TextField label="Finish" value={form.finish} onChange={(v) => setForm({ finish: v })} placeholder="e.g. Matte, Gloss, Brushed" />
              <TextField label="Shape" value={form.shape} onChange={(v) => setForm({ shape: v })} placeholder="e.g. Round, Rectangular" />
              <TextField label="Pattern" value={form.pattern} onChange={(v) => setForm({ pattern: v })} placeholder="e.g. Solid, Geometric" />
              <TextField label="Style" value={form.style} onChange={(v) => setForm({ style: v })} placeholder="e.g. Modern, Vintage" />
              <TextField label="Mounting Type" value={form.mountingType} onChange={(v) => setForm({ mountingType: v })} placeholder="e.g. Wall-mount, Floor, Table" />
              <TextField label="Usage Location" value={form.usageLocation} onChange={(v) => setForm({ usageLocation: v })} placeholder="e.g. Indoor, Bathroom" />
            </div>
          </SubBlock>

          <SubBlock title="Care & Packaging">
            <div className="space-y-4">
              <TextAreaField label="Care Instructions" value={form.careInstructions} onChange={(v) => setForm({ careInstructions: v })} rows={3} placeholder="How to care for this product..." className="min-h-[80px]" />
              <TextField label="Warranty" value={form.warranty} onChange={(v) => setForm({ warranty: v })} placeholder="e.g. 1 year manufacturer warranty" />
              <TextField label="Included Items" value={form.includedItems} onChange={(v) => setForm({ includedItems: v })} placeholder="What's included in the box" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <TextField label="Packaging Type" value={form.packagingType} onChange={(v) => setForm({ packagingType: v })} placeholder="e.g. Corrugated box" />
                <TextField label="Packaging Dimensions" value={form.packagingDimensions} onChange={(v) => setForm({ packagingDimensions: v })} placeholder="e.g. 50x40x20 cm" />
                <TextField label="Packaging Weight (kg)" type="number" step="0.1" value={form.packagingWeight} onChange={(v) => setForm({ packagingWeight: v })} placeholder="0" />
              </div>
            </div>
          </SubBlock>

          <SubBlock title="Custom Size">
            <div className="space-y-4">
              <Checkbox label="Enable Custom Sizing" checked={form.allowCustomSize} onChange={(v) => setForm({ allowCustomSize: v })} />
              {form.allowCustomSize && (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <TextField label="Min Width" type="number" value={form.customSizeMinWidth} onChange={(v) => setForm({ customSizeMinWidth: v })} />
                    <TextField label="Min Length" type="number" value={form.customSizeMinLength} onChange={(v) => setForm({ customSizeMinLength: v })} />
                    <TextField label="Min Height" type="number" value={form.customSizeMinHeight} onChange={(v) => setForm({ customSizeMinHeight: v })} />
                    <TextField label="Max Width" type="number" value={form.customSizeMaxWidth} onChange={(v) => setForm({ customSizeMaxWidth: v })} />
                    <TextField label="Max Length" type="number" value={form.customSizeMaxLength} onChange={(v) => setForm({ customSizeMaxLength: v })} />
                    <TextField label="Max Height" type="number" value={form.customSizeMaxHeight} onChange={(v) => setForm({ customSizeMaxHeight: v })} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <SelectField label="Unit" value={form.customSizeUnit} onChange={(v) => setForm({ customSizeUnit: v })} options={[{ value: "cm", label: "cm" }, { value: "mm", label: "mm" }, { value: "in", label: "inches" }]} />
                    <SelectField label="Pricing Method" value={form.customSizePricingMethod} onChange={(v) => setForm({ customSizePricingMethod: v })} options={[{ value: "area", label: "By Area" }, { value: "linear", label: "By Length" }, { value: "fixed", label: "Fixed Price" }]} />
                  </div>
                  <Checkbox label="Require admin approval for custom orders" checked={form.customSizeRequiresApproval} onChange={(v) => setForm({ customSizeRequiresApproval: v })} />
                </>
              )}
            </div>
          </SubBlock>

          <SubBlock title="SEO">
            <div className="space-y-4">
              <TextField label="SEO Title" value={form.seoTitle} onChange={(v) => setForm({ seoTitle: v })} maxLength={70} />
              <TextAreaField label="Meta Description" value={form.seoDescription} onChange={(v) => setForm({ seoDescription: v })} rows={2} maxLength={160} />
            </div>
          </SubBlock>
        </div>
      )}
    </div>
  );
}
