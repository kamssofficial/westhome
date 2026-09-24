"use client";
import { useState, useEffect, useRef } from "react";
import { Upload, Save, Trash2, RotateCcw, Image as ImageIcon, Check, X, Loader2, Maximize2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeroImage {
  url: string; filename: string; position: string;
  uploadedBy: string; uploadedByName: string;
  width?: number; height?: number; size?: number; createdAt: string;
}

const POSITIONS = [
  { value: "center", label: "Center" },
  { value: "center-left", label: "Left" },
  { value: "center-right", label: "Right" },
  { value: "top", label: "Top" },
  { value: "bottom", label: "Bottom" },
];

function formatSize(bytes?: number) {
  if (!bytes) return "";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}

function timeAgo(dateStr: string) {
  const d = new Date(dateStr);
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return mins + "m ago";
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + "h ago";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function HeroManager({ embedded = false }: { embedded?: boolean }) {
  const [active, setActive] = useState<HeroImage | null>(null);
  const [history, setHistory] = useState<HeroImage[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [position, setPosition] = useState("center");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [previewDimensions, setPreviewDimensions] = useState<{ w: number; h: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/admin/hero-image");
      const data = await res.json();
      setActive(data.active || null);
      setHistory(data.history || []);
      if (data.active?.position) setPosition(data.active.position);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(""); setSuccess("");
    const url = URL.createObjectURL(file);
    setPreview(url);
    setPreviewFile(file);
    // Get dimensions
    const img = new window.Image();
    img.onload = () => setPreviewDimensions({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = url;
  };

  const handlePublish = async () => {
    if (!previewFile) return;
    setUploading(true); setError(""); setSuccess("");
    try {
      const fd = new FormData();
      fd.append("file", previewFile);
      fd.append("position", position);
      const res = await fetch("/api/admin/hero-image", { method: "POST", body: fd });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      setActive(data.active);
      setPreview(null); setPreviewFile(null); setPreviewDimensions(null);
      setSuccess("Hero image published successfully");
      setTimeout(() => setSuccess(""), 3000);
      fetchData();
    } catch { setError("Upload failed. Please try again."); }
    finally { setUploading(false); }
  };

  const handlePositionChange = async (newPos: string) => {
    setPosition(newPos);
    if (active) {
      try {
        const res = await fetch("/api/admin/hero-image", {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ position: newPos }),
        });
        const data = await res.json();
        if (data.active) setActive(data.active);
      } catch {}
    }
  };

  const handleRemove = async () => {
    try {
      await fetch("/api/admin/hero-image", { method: "DELETE" });
      setActive(null); setShowRemoveConfirm(false);
      setSuccess("Hero image removed"); setTimeout(() => setSuccess(""), 3000);
    } catch { setError("Failed to remove image"); }
  };

  const handleRestore = async (url: string) => {
    try {
      const res = await fetch("/api/admin/hero-image", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restoreUrl: url }),
      });
      const data = await res.json();
      if (data.active) { setActive(data.active); setPosition(data.active.position); }
      setShowHistory(false);
      setSuccess("Image restored"); setTimeout(() => setSuccess(""), 3000);
      fetchData();
    } catch { setError("Failed to restore image"); }
  };

  const cancelPreview = () => {
    setPreview(null); setPreviewFile(null); setPreviewDimensions(null); setError("");
    if (fileRef.current) fileRef.current.value = "";
  };

  if (loading) {
    return <div className="bg-white rounded-2xl border border-black/[.06] p-6 animate-pulse"><div className="h-48 bg-gray-100 rounded-xl" /></div>;
  }

  return (
    <div className={cn("space-y-4", !embedded && "bg-white rounded-2xl border border-black/[.06] overflow-hidden")}>
      {!embedded && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/[.06]">
          <div className="flex items-center gap-2.5">
            <ImageIcon size={16} className="text-[#d4a574]" />
            <h2 className="font-semibold text-sm text-[#1a1917]">Hero Image</h2>
            {active && <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> LIVE</span>}
          </div>
          {history.length > 0 && (
            <button onClick={() => setShowHistory(!showHistory)} className="flex items-center gap-1.5 text-xs font-medium text-[#6b6560] hover:text-[#1a1917] px-3 py-1.5 rounded-lg hover:bg-[#f7f5f2] transition-colors">
              <Clock size={12} /> History ({history.length})
            </button>
          )}
        </div>
      )}

      {/* Status messages */}
      {error && <div className="mx-6 flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700"><X size={14} /> {error}</div>}
      {success && <div className="mx-6 flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700"><Check size={14} /> {success}</div>}

      <div className="p-6 space-y-4">
        {/* Active image preview */}
        {active && !preview && (
          <div className="space-y-3">
            <div className="relative rounded-xl overflow-hidden border border-black/[.06] bg-[#f0ede8]">
              <img src={active.url} alt="Current hero" className="w-full h-48 sm:h-64 object-cover" style={{
                objectPosition: active.position === "center-left" ? "left center" : active.position === "center-right" ? "right center" : active.position === "top" ? "center top" : active.position === "bottom" ? "center bottom" : "center center"
              }} />
              <div className="absolute top-3 left-3 flex items-center gap-2">
                <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500 text-white text-[10px] font-semibold rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#6b6560]">
              {active.width && active.height && <span className="flex items-center gap-1"><Maximize2 size={10} /> {active.width} x {active.height}</span>}
              {active.size && <span>{formatSize(active.size)}</span>}
              <span>by {active.uploadedByName}</span>
              <span>{timeAgo(active.createdAt)}</span>
            </div>
          </div>
        )}

        {preview && (
          <div className="space-y-3">
            <div className="relative rounded-xl overflow-hidden border-2 border-dashed border-[#d4a574] bg-[#f0ede8]">
              <img src={preview} alt="Preview" className="w-full h-48 sm:h-64 object-cover" style={{
                objectPosition: position === "center-left" ? "left center" : position === "center-right" ? "right center" : position === "top" ? "center top" : position === "bottom" ? "center bottom" : "center center"
              }} />
              <div className="absolute top-3 left-3"><span className="px-2.5 py-1 bg-amber-500 text-white text-[10px] font-semibold rounded-full">PREVIEW</span></div>
              <button onClick={cancelPreview} className="absolute top-3 right-3 p-1.5 bg-black/50 text-white rounded-full hover:bg-black/70"><X size={14} /></button>
            </div>
            {previewDimensions && (
              <div className="flex items-center gap-3 text-[11px] text-[#6b6560]">
                <span className="flex items-center gap-1"><Maximize2 size={10} /> {previewDimensions.w} x {previewDimensions.h}</span>
                {previewFile && <span>{formatSize(previewFile.size)}</span>}
              </div>
            )}
          </div>
        )}

        {(active || preview) && (
          <div>
            <label className="text-xs font-medium text-[#6b6560] mb-2 block">Image Position</label>
            <div className="flex gap-1.5 flex-wrap">
              {POSITIONS.map(p => (
                <button key={p.value} onClick={() => handlePositionChange(p.value)}
                  className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                    position === p.value ? "bg-[#1a1917] text-white border-[#1a1917]" : "bg-white text-[#6b6560] border-black/[.08] hover:border-[#d4a574]")}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileSelect} />
          {!preview ? (
            <button onClick={() => fileRef.current?.click()}
              className="w-full flex flex-col items-center gap-2 py-10 border-2 border-dashed border-black/[.08] rounded-xl hover:border-[#d4a574] hover:bg-[#fdf6f0]/50 transition-all group">
              <Upload size={20} className="text-[#b0aba6] group-hover:text-[#d4a574] transition-colors" />
              <span className="text-sm font-medium text-[#6b6560] group-hover:text-[#1a1917]">{active ? "Replace with new image" : "Upload hero image"}</span>
              <span className="text-[10px] text-[#b0aba6]">JPG, PNG, or WEBP — max 4MB</span>
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <button onClick={handlePublish} disabled={uploading}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#1a1917] text-white text-sm font-medium rounded-xl hover:bg-[#2a2925] disabled:opacity-60">
                {uploading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {uploading ? "Publishing..." : "Publish Image"}
              </button>
              <button onClick={cancelPreview} className="px-4 py-2.5 text-sm font-medium text-[#6b6560] hover:text-[#1a1917] rounded-xl hover:bg-[#f7f5f2]">Cancel</button>
            </div>
          )}
        </div>

        {active && !preview && !showRemoveConfirm && (
          <button onClick={() => setShowRemoveConfirm(true)} className="flex items-center gap-1.5 text-xs font-medium text-[#b0aba6] hover:text-red-600">
            <Trash2 size={11} /> Remove hero image
          </button>
        )}
        {showRemoveConfirm && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
            <span className="text-xs text-red-700 flex-1">Remove the hero image?</span>
            <button onClick={handleRemove} className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700">Remove</button>
            <button onClick={() => setShowRemoveConfirm(false)} className="px-3 py-1.5 text-xs font-medium text-[#6b6560] hover:bg-white rounded-lg">Cancel</button>
          </div>
        )}
      </div>

      {showHistory && history.length > 0 && (
        <div className="border-t border-black/[.06] p-6">
          <h3 className="text-xs font-semibold text-[#1a1917] mb-3 flex items-center gap-1.5"><Clock size={12} className="text-[#d4a574]" /> Previous Images</h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {history.map((h, i) => (
              <div key={i} className="relative group rounded-lg overflow-hidden border border-black/[.06] bg-[#f0ede8] cursor-pointer hover:border-[#d4a574]" onClick={() => handleRestore(h.url)}>
                <img src={h.url} alt="" className="w-full aspect-video object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                  <span className="flex items-center gap-1 px-2 py-1 bg-white rounded-md text-[10px] font-medium"><RotateCcw size={10} /> Restore</span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 px-1.5 py-1 bg-gradient-to-t from-black/60 to-transparent">
                  <p className="text-[9px] text-white/80">{timeAgo(h.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}