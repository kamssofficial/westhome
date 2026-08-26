"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Image, Upload, Save, ArrowLeft } from "lucide-react";

export default function StaffHeroImagePage() {
  const [heroImage, setHeroImage] = useState<string | null>(null);
  const [heroUploading, setHeroUploading] = useState(false);
  const [heroPreview, setHeroPreview] = useState<string | null>(null);
  const [heroSaved, setHeroSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/hero-image")
      .then(r => r.json())
      .then(d => {
        if (d.url) setHeroImage(d.url);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleHeroUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setHeroPreview(URL.createObjectURL(file));
  };

  const saveHero = async () => {
    if (!heroPreview) return;
    setHeroUploading(true);
    try {
      const fileInput = document.getElementById("staff-hero-file-input") as HTMLInputElement;
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

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/staff/dashboard" className="p-2 rounded-lg hover:bg-[#f7f5f2] transition-colors">
          <ArrowLeft size={18} className="text-[#6b6560]" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-[#1a1917]">Hero Image</h1>
          <p className="text-sm text-[#b0aba6] mt-0.5">Manage the homepage hero background image</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-black/[.06] overflow-hidden">
        <div className="flex items-center gap-2.5 px-6 py-4 border-b border-black/[.06]">
          <Image size={16} className="text-[#d4a574]" />
          <h2 className="font-semibold text-sm text-[#1a1917]">Current Hero Image</h2>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-xs text-[#6b6560]">The main background image shown on the homepage hero section. Upload a high-quality image (recommended: 1920x1080 or larger).</p>
          
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

          <div className="flex items-center gap-3">
            <label htmlFor="staff-hero-file-input" className="flex items-center gap-2 px-4 py-2.5 bg-[#f7f5f2] border border-black/[.06] rounded-xl text-sm font-medium text-[#1a1917] hover:bg-[#e8e4de] cursor-pointer transition-colors">
              <Upload size={15} className="text-[#d4a574]" />
              {heroImage ? "Replace Image" : "Upload Hero Image"}
            </label>
            <input
              id="staff-hero-file-input"
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
    </div>
  );
}
