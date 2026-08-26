"use client";

import { useState, useEffect } from "react";
import { Save, Store, Truck, AlertTriangle, ImageIcon, Upload } from "lucide-react";
import toast from "react-hot-toast";

interface Settings {
  storeName: string; contactPhone: string; whatsappNumber: string; contactEmail: string;
  address: string; city: string; state: string; pinCode: string; currency: string;
  freeDeliveryThreshold: string; defaultDeliveryCharge: string; estimatedDeliveryDays: string; storePickup: boolean;
}
type Errors = Record<string, string>;
const D: Settings = { storeName: "", contactPhone: "", whatsappNumber: "", contactEmail: "", address: "", city: "", state: "", pinCode: "", currency: "INR", freeDeliveryThreshold: "2000", defaultDeliveryCharge: "49", estimatedDeliveryDays: "5", storePickup: false };
const STATES = ["Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Delhi","Jammu & Kashmir","Ladakh"];
const CURRS = [{ v: "INR", l: "\u20B9 INR \u2014 Indian Rupee" }, { v: "USD", l: "$ USD \u2014 US Dollar" }, { v: "AED", l: "AED \u2014 UAE Dirham" }, { v: "SAR", l: "SAR \u2014 Saudi Riyal" }];

function validate(s: Settings): Errors {
  const e: Errors = {};
  if (!s.storeName.trim()) e.storeName = "Store name is required";
  if (s.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.contactEmail)) e.contactEmail = "Enter a valid email address";
  if (s.contactPhone && !/^\+?[\d\s\-()]{7,15}$/.test(s.contactPhone.replace(/\s/g, ""))) e.contactPhone = "Enter a valid phone number";
  if (s.whatsappNumber && !/^\+?[\d\s\-()]{7,15}$/.test(s.whatsappNumber.replace(/\s/g, ""))) e.whatsappNumber = "Enter a valid WhatsApp number";
  if (s.pinCode && !/^\d{6}$/.test(s.pinCode)) e.pinCode = "PIN code must be 6 digits";
  if (!s.freeDeliveryThreshold || Number(s.freeDeliveryThreshold) < 0) e.freeDeliveryThreshold = "Enter a valid threshold";
  if (!s.defaultDeliveryCharge || Number(s.defaultDeliveryCharge) < 0) e.defaultDeliveryCharge = "Enter a valid charge";
  if (!s.estimatedDeliveryDays || Number(s.estimatedDeliveryDays) < 1) e.estimatedDeliveryDays = "Enter valid days";
  return e;
}

const ic = "w-full px-3 py-2.5 bg-white border border-black/[.06] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a574]/30 transition-colors";
const ie = "border-red-400 focus:ring-red-400/30";
const lc = "text-xs font-medium text-[#6b6560] mb-1.5 block";
function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (<div><label className={lc}>{label}</label>{children}{error && <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1"><AlertTriangle size={10} />{error}</p>}</div>);
}

export default function AdminSettingsPage() {
  const [s, setS] = useState<Settings>(D);
  const [errs, setErrs] = useState<Errors>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { (async () => { setLoading(true); try { const r = await fetch("/api/settings"); if (r.ok) { const d = await r.json(); if (d.settings) setS((p) => ({ ...p, ...d.settings, storePickup: d.settings.storePickup === true || d.settings.storePickup === "true" })); } } catch {} finally { setLoading(false); } })(); }, []);

  const [heroImage, setHeroImage] = useState<string | null>(null);
  const [heroUploading, setHeroUploading] = useState(false);
  const [heroPreview, setHeroPreview] = useState<string | null>(null);
  const [heroSaved, setHeroSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/hero-image").then(r => r.json()).then(d => {
      if (d.url) setHeroImage(d.url);
    }).catch(() => {});
  }, []);

  const handleHeroUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setHeroPreview(URL.createObjectURL(file));
  };

  const saveHero = async () => {
    if (!heroPreview) return;
    setHeroUploading(true);
    try {
      const fileInput = document.getElementById("hero-file-input") as HTMLInputElement;
      const file = fileInput?.files?.[0];
      if (!file) return;
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/hero-image", { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) {
        setHeroImage(data.url);
        setHeroPreview(null);
        setHeroSaved(true);
        setTimeout(() => setHeroSaved(false), 3000);
      }
    } catch (err) {
      console.error("Hero upload failed:", err);
    } finally {
      setHeroUploading(false);
    }
  };

  const removeHero = async () => {
    if (!confirm("Remove the hero image and restore default?")) return;
    try {
      await fetch("/api/admin/hero-image", { method: "DELETE" });
      setHeroImage(null);
      setHeroPreview(null);
    } catch {}
  };

  const u = (k: keyof Settings, v: string | boolean) => { setS((p) => ({ ...p, [k]: v })); setErrs((p) => { const n = { ...p }; delete n[k]; return n; }); setSaved(false); };

  const save = async () => {
    const e = validate(s); setErrs(e);
    if (Object.keys(e).length > 0) { toast.error("Please fix the errors below"); return; }
    setSaving(true);
    try {
      const r = await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(s) });
      if (r.ok) { toast.success("Store information updated successfully"); setSaved(true); }
      else { const d = await r.json().catch(() => ({})); toast.error(d.error || "Unable to save changes. Please try again."); }
    } catch { toast.error("Unable to save changes. Please try again."); } finally { setSaving(false); }
  };

  if (loading) return (<div className="max-w-4xl space-y-6"><div className="h-8 w-40 bg-gray-100 rounded animate-pulse" /><div className="h-48 bg-gray-50 rounded-2xl animate-pulse" /></div>);

  return (
    <div className="max-w-4xl space-y-6">
      <div><h1 className="text-xl font-semibold text-[#1a1917]">Settings</h1><p className="text-sm text-[#b0aba6] mt-0.5">Manage your store information and configuration</p></div>

      <div className="bg-white rounded-2xl border border-black/[.06] overflow-hidden">
        <div className="flex items-center gap-2.5 px-6 py-4 border-b border-black/[.06]"><Store size={16} className="text-[#d4a574]" /><h2 className="font-semibold text-sm text-[#1a1917]">Store Information</h2></div>
        <div className="p-6 space-y-5">
          <Field label="Store Name" error={errs.storeName}><input type="text" value={s.storeName} onChange={(e) => u("storeName", e.target.value)} className={ic + (errs.storeName ? " " + ie : "")} placeholder="WESTHOME" /></Field>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Contact Phone" error={errs.contactPhone}><input type="tel" value={s.contactPhone} onChange={(e) => u("contactPhone", e.target.value)} className={ic + (errs.contactPhone ? " " + ie : "")} placeholder="+91 98765 43210" /></Field>
            <Field label="WhatsApp Number" error={errs.whatsappNumber}><input type="tel" value={s.whatsappNumber} onChange={(e) => u("whatsappNumber", e.target.value)} className={ic + (errs.whatsappNumber ? " " + ie : "")} placeholder="+91 98765 43210" /></Field>
          </div>
          <Field label="Email" error={errs.contactEmail}><input type="email" value={s.contactEmail} onChange={(e) => u("contactEmail", e.target.value)} className={ic + (errs.contactEmail ? " " + ie : "")} placeholder="info@westhome.com" /></Field>
          <Field label="Address" error={errs.address}><textarea value={s.address} onChange={(e) => u("address", e.target.value)} className={ic + " min-h-[80px] resize-y"} placeholder="Full store address" rows={2} /></Field>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Field label="City" error={errs.city}><input type="text" value={s.city} onChange={(e) => u("city", e.target.value)} className={ic + (errs.city ? " " + ie : "")} placeholder="Kasaragod" /></Field>
            <Field label="State" error={errs.state}><select value={s.state} onChange={(e) => u("state", e.target.value)} className={ic + " appearance-none cursor-pointer"}><option value="">Select state</option>{STATES.map((st) => <option key={st} value={st}>{st}</option>)}</select></Field>
            <Field label="PIN Code" error={errs.pinCode}><input type="text" value={s.pinCode} onChange={(e) => u("pinCode", e.target.value.replace(/\D/g, "").slice(0, 6))} className={ic + (errs.pinCode ? " " + ie : "")} placeholder="673101" maxLength={6} /></Field>
            <Field label="Currency" error={errs.currency}><select value={s.currency} onChange={(e) => u("currency", e.target.value)} className={ic + " appearance-none cursor-pointer"}>{CURRS.map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}</select></Field>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-black/[.06] overflow-hidden">
        <div className="flex items-center gap-2.5 px-6 py-4 border-b border-black/[.06]"><Truck size={16} className="text-[#d4a574]" /><h2 className="font-semibold text-sm text-[#1a1917]">Delivery Configuration</h2></div>
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Field label="Free Delivery Threshold (\u20B9)" error={errs.freeDeliveryThreshold}><input type="number" value={s.freeDeliveryThreshold} min="0" onChange={(e) => u("freeDeliveryThreshold", e.target.value)} className={ic + (errs.freeDeliveryThreshold ? " " + ie : "")} /></Field>
            <Field label="Default Delivery Charge (\u20B9)" error={errs.defaultDeliveryCharge}><input type="number" value={s.defaultDeliveryCharge} min="0" onChange={(e) => u("defaultDeliveryCharge", e.target.value)} className={ic + (errs.defaultDeliveryCharge ? " " + ie : "")} /></Field>
            <Field label="Est. Delivery Days" error={errs.estimatedDeliveryDays}><input type="number" value={s.estimatedDeliveryDays} min="1" onChange={(e) => u("estimatedDeliveryDays", e.target.value)} className={ic + (errs.estimatedDeliveryDays ? " " + ie : "")} /></Field>
          </div>
          <label className="flex items-center gap-2.5 text-sm text-[#1a1917] cursor-pointer select-none">
            <input type="checkbox" checked={!!s.storePickup} onChange={(e) => u("storePickup", e.target.checked)} className="w-4 h-4 rounded border-black/[.06] accent-[#d4a574]" />Enable Store Pickup
          </label>
        </div>
      </div>

      {/* HERO IMAGE MANAGEMENT */}
      <div className="bg-white rounded-2xl border border-black/[.06] overflow-hidden">
        <div className="flex items-center gap-2.5 px-6 py-4 border-b border-black/[.06]">
          <ImageIcon size={16} className="text-[#d4a574]" />
          <h2 className="font-semibold text-sm text-[#1a1917]">Hero Image</h2>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-xs text-[#6b6560]">The main background image shown on the homepage hero section. Upload a high-quality image (recommended: 1920x1080 or larger).</p>
          
          {/* Current/Preview Image */}
          {(heroPreview || heroImage) && (
            <div className="relative rounded-xl overflow-hidden border border-black/[.06]">
              <img
                src={heroPreview || heroImage || ""}
                alt="Hero preview"
                className="w-full h-48 sm:h-64 object-cover"
              />
              <div className="absolute top-3 right-3 flex gap-2">
                {heroPreview && (
                  <button onClick={() => setHeroPreview(null)} className="px-3 py-1.5 bg-white/90 backdrop-blur text-xs font-medium rounded-lg hover:bg-white transition-colors">
                    Cancel
                  </button>
                )}
                <button onClick={removeHero} className="px-3 py-1.5 bg-red-500/90 backdrop-blur text-white text-xs font-medium rounded-lg hover:bg-red-600 transition-colors">
                  Remove
                </button>
              </div>
            </div>
          )}

          {/* Upload Controls */}
          <div className="flex items-center gap-3">
            <label htmlFor="hero-file-input" className="flex items-center gap-2 px-4 py-2.5 bg-[#f7f5f2] border border-black/[.06] rounded-xl text-sm font-medium text-[#1a1917] hover:bg-[#e8e4de] cursor-pointer transition-colors">
              <Upload size={15} className="text-[#d4a574]" />
              {heroImage ? "Replace Image" : "Upload Hero Image"}
            </label>
            <input
              id="hero-file-input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleHeroUpload}
            />
            {heroPreview && (
              <button
                onClick={saveHero}
                disabled={heroUploading}
                className="flex items-center gap-2 px-5 py-2.5 bg-stone-900 text-white text-sm font-medium rounded-xl hover:bg-stone-800 disabled:opacity-60 transition-colors"
              >
                <Save size={14} />
                {heroUploading ? "Uploading..." : "Save Hero Image"}
              </button>
            )}
          </div>

          {heroSaved && (
            <p className="text-xs text-emerald-600 font-medium">Hero image saved successfully</p>
          )}
        </div>
      </div>


      <div className="flex items-center justify-between">
        {saved && <p className="text-xs text-emerald-600 font-medium">All changes saved</p>}
        <button onClick={save} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-stone-900 text-white text-sm font-medium rounded-xl hover:bg-stone-800 disabled:opacity-60 transition-colors ml-auto">
          <Save size={15} />{saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
