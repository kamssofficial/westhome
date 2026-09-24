"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";
import {
  Upload, X, GripVertical, Star, ImageIcon, ArrowUp, ArrowDown, AlertTriangle, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface ImageItem {
  id: string;
  url: string;
  alt?: string;
  isPrimary?: boolean;
  position?: number;
  imageType?: "PRODUCT" | "LIFESTYLE";
}

interface ImageUploaderProps {
  images: ImageItem[];
  onChange: (images: ImageItem[]) => void;
  folder?: string;
  maxImages?: number;
  allowLifestyle?: boolean;
}

interface StorageStatus {
  anyConfigured: boolean;
  missing: string | null;
}

type UploadPhase = "idle" | "uploading" | "done";

export default function ImageUploader({
  images,
  onChange,
  folder = "products",
  maxImages = 10,
  allowLifestyle = false,
}: ImageUploaderProps) {
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [doneCount, setDoneCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [brokenIds, setBrokenIds] = useState<Set<string>>(new Set());
  const [storage, setStorage] = useState<StorageStatus | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // The `images` prop is captured by the upload closure. Two uploads started
  // before the first resolves would each write `[...images, ...mine]` from
  // the same stale snapshot and silently drop one of the batches, so results
  // are merged through a ref that always holds the latest list.
  const imagesRef = useRef(images);
  useEffect(() => { imagesRef.current = images; }, [images]);

  // Ask the server up front whether it can store anything. Without this the
  // first thing an admin sees is a toast full of 503s and no explanation.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/upload")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d?.storage) return;
        setStorage({ anyConfigured: !!d.storage.anyConfigured, missing: d.storage.missing ?? null });
      })
      .catch(() => { /* offline or signed out — assume it may work */ });
    return () => { cancelled = true; };
  }, []);

  // Large photos are downscaled and re-encoded client-side before upload:
  // stays under the 4 MB server limit and keeps the storefront fast.
  const prepareFile = async (file: File): Promise<File> => {
    if (file.type === "image/gif" || file.size <= 1.5 * 1024 * 1024) return file;
    // Animated formats and anything the browser cannot decode are sent as-is
    // and validated server-side.
    if (!file.type.startsWith("image/") || typeof createImageBitmap !== "function") return file;
    try {
      const bitmap = await createImageBitmap(file);
      const maxDim = 2000;
      const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return file;
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close?.();
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
      if (!blob || blob.size >= file.size) return file;
      return new File([blob], file.name.replace(/\.(png|webp|jpeg|jpg)$/i, "") + ".jpg", { type: "image/jpeg" });
    } catch {
      return file;
    }
  };

  const reorderImages = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    const fromIndex = images.findIndex((image) => image.id === fromId);
    const toIndex = images.findIndex((image) => image.id === toId);
    if (fromIndex < 0 || toIndex < 0) return;
    const next = [...images];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    onChange(next.map((image, position) => ({ ...image, position })));
  };

  // Drag-and-drop is a mouse affordance. These two buttons are the touch
  // equivalent, and they are the only way to reorder on a phone.
  const moveImage = (id: string, direction: -1 | 1) => {
    const index = images.findIndex((img) => img.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= images.length) return;
    reorderImages(id, images[target].id);
  };

  const handleUpload = useCallback(
    async (fileList: FileList | File[]) => {
      const incoming = Array.from(fileList);
      if (incoming.length === 0) return;

      const current = imagesRef.current;
      const existingKeys = new Set(current.map((img) => `${img.url}`));
      // Same file twice in one drop (or a repeat click on the same picker) is
      // almost always a mistake, and duplicates are impossible to spot in a
      // grid of thumbnails.
      const fresh = incoming.filter((f) => !existingKeys.has(`${f.name}:${f.size}:${f.lastModified}`));
      if (fresh.length < incoming.length) {
        toast("Skipped image already added", { icon: "ℹ️" });
      }
      if (fresh.length === 0) return;

      if (current.length + fresh.length > maxImages) {
        toast.error(`Maximum ${maxImages} images allowed`);
        return;
      }

      setPhase("uploading");
      setDoneCount(0);
      setTotalCount(fresh.length);
      const newImages: ImageItem[] = [];
      let failures = 0;

      try {
        for (let i = 0; i < fresh.length; i++) {
          let file = fresh[i];
          if (!file.type.startsWith("image/")) {
            toast.error(`${file.name}: Please choose an image file`);
            failures++;
            setDoneCount(i + 1);
            continue;
          }
          // Downscale first: large photos get re-encoded well below the 4 MB
          // server limit, so the size check must run on the prepared file or
          // otherwise-valid photos are rejected in the UI.
          file = await prepareFile(file);
          if (file.size > 4 * 1024 * 1024) {
            toast.error(`${file.name}: Maximum file size is 4 MB`);
            failures++;
            setDoneCount(i + 1);
            continue;
          }
          try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("folder", folder);

            let res = await fetch("/api/upload", { method: "POST", body: formData });
            // One-shot retry for transient network blips; validation and
            // storage-config errors come back as JSON and are not retried.
            if (!res.ok && !res.headers.get("content-type")?.includes("application/json")) {
              res = await fetch("/api/upload", { method: "POST", body: formData });
            }

            if (res.ok) {
              const data = await res.json();
              newImages.push({
                id: `temp-${Date.now()}-${i}`,
                url: data.url,
                alt: file.name.replace(/\.[^/.]+$/, ""),
                isPrimary: current.length === 0 && i === 0,
                position: current.length + i,
                imageType: "PRODUCT",
              });
            } else {
              const data = await res.json().catch(() => null);
              if (data?.storage && data.storage.anyConfigured === false) {
                setStorage({ anyConfigured: false, missing: data.storage.missing ?? null });
              }
              const msg = data?.error || `Upload failed (${res.status})`;
              // One storage-wide failure means the next file will fail the
              // same way; stop instead of firing the same request N times.
              if (data?.storage && data.storage.anyConfigured === false) {
                failures += fresh.length - i;
                setDoneCount(fresh.length);
                toast.error(msg);
                break;
              }
              toast.error(`${file.name}: ${msg}`);
              failures++;
            }
          } catch {
            toast.error(`${file.name}: Upload error — server may be unreachable`);
            failures++;
          }
          setDoneCount(i + 1);
        }

        if (newImages.length > 0) {
          // Merge against the ref, not the closure snapshot, so a second
          // batch that finished first is never overwritten.
          onChange([...imagesRef.current, ...newImages]);
          toast.success(
            `${newImages.length} image${newImages.length === 1 ? "" : "s"} uploaded` +
              (failures ? ` · ${failures} failed` : "")
          );
        }
      } finally {
        setPhase("idle");
        setTotalCount(0);
        // Let the same file be picked again after a failure.
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [folder, maxImages, onChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files?.length) handleUpload(e.dataTransfer.files);
    },
    [handleUpload]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.length) handleUpload(e.target.files);
    },
    [handleUpload]
  );

  const removeImage = (id: string) => {
    const updated = images.filter((img) => img.id !== id);
    // If removed was primary, make first one primary
    if (updated.length > 0 && !updated.some((img) => img.isPrimary)) {
      updated[0] = { ...updated[0], isPrimary: true };
    }
    onChange(updated.map((img, i) => ({ ...img, position: i })));
  };

  const setPrimary = (id: string) => {
    onChange(images.map((img) => ({ ...img, isPrimary: img.id === id })));
  };

  const updateAlt = (id: string, alt: string) => {
    onChange(images.map((img) => (img.id === id ? { ...img, alt } : img)));
  };

  const toggleImageType = (id: string) => {
    if (!allowLifestyle) return;
    onChange(
      images.map((img) =>
        img.id === id
          ? { ...img, imageType: img.imageType === "LIFESTYLE" ? "PRODUCT" : "LIFESTYLE" }
          : img
      )
    );
  };

  const uploading = phase === "uploading";
  const full = images.length >= maxImages;
  const storageBlocked = storage?.anyConfigured === false;

  return (
    <div className="space-y-3">
      {/* Storage is not configured. Say so before the admin burns a minute
          uploading files that cannot possibly succeed. */}
      {storageBlocked ? (
        <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-warning/30 bg-warning/10 px-3.5 py-3">
          <AlertTriangle size={15} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
          <div className="min-w-0 text-xs">
            <p className="font-medium text-warning">Image storage is not configured</p>
            <p className="mt-0.5 leading-relaxed text-text-secondary">{storage?.missing}</p>
          </div>
        </div>
      ) : null}

      {/* Upload area — a real button so keyboard and screen-reader users can
          open the picker, not a click handler on a div. */}
      <button
        type="button"
        onClick={() => !uploading && !full && fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        disabled={uploading || full}
        aria-label={full ? `Maximum ${maxImages} images reached` : "Upload product images"}
        className={cn(
          "w-full rounded-xl border-2 border-dashed p-6 text-center transition-colors",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          full
            ? "cursor-not-allowed border-border bg-surface-muted/40 opacity-70"
            : dragOver
              ? "cursor-copy border-accent bg-accent/5"
              : "cursor-pointer border-border hover:border-accent/50 hover:bg-surface-muted/50"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          onChange={handleFileChange}
          className="sr-only"
          tabIndex={-1}
        />
        <div className="flex flex-col items-center gap-2">
          {uploading ? (
            <Loader2 size={24} className="animate-spin text-accent" aria-hidden="true" />
          ) : (
            <Upload size={24} className="text-text-muted" aria-hidden="true" />
          )}
          <p className="text-sm text-secondary">
            {uploading
              ? `Uploading… ${doneCount}/${totalCount}`
              : full
                ? `Maximum ${maxImages} images reached`
                : "Tap to browse, or drag images here"}
          </p>
          <p className="text-xs text-text-muted">
            JPEG, PNG, WebP, GIF • Max 4 MB (large photos are auto-optimized) • Up to {maxImages} images
          </p>
        </div>
      </button>

      {/* Image list */}
      {images.length > 0 && (
        <ul className="space-y-2">
          {images.map((image, index) => (
            <li
              key={image.id}
              draggable
              onDragStart={() => setDraggedId(image.id)}
              onDragEnd={() => setDraggedId(null)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (draggedId) reorderImages(draggedId, image.id);
                setDraggedId(null);
              }}
              className={cn(
                "flex items-start gap-2 rounded-lg border border-border-light bg-surface p-2.5 transition-all sm:items-center sm:gap-3 sm:p-3",
                draggedId === image.id && "opacity-50",
                draggedId && draggedId !== image.id && "border-accent/40"
              )}
            >
              {/* Drag handle (pointer devices) */}
              <span
                className="hidden cursor-grab text-text-muted active:cursor-grabbing sm:block"
                title="Drag to reorder"
              >
                <GripVertical size={16} aria-hidden="true" />
              </span>

              {/* Thumbnail */}
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-surface-muted sm:h-40 sm:w-40">
                {brokenIds.has(image.id) ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-error/10 p-1 text-center">
                    <ImageIcon size={16} className="text-error/70" aria-hidden="true" />
                    <span className="text-[9px] font-medium leading-tight text-error">Image unavailable — re-upload</span>
                  </div>
                ) : (
                  <Image
                    src={image.url}
                    alt={image.alt || ""}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 64px, 160px"
                    onError={() => setBrokenIds((prev) => new Set(prev).add(image.id))}
                  />
                )}
                {image.isPrimary && (
                  <span className="absolute left-0.5 top-0.5" title="Primary image">
                    <Star size={12} className="fill-warning text-warning" aria-hidden="true" />
                    <span className="sr-only">Primary image</span>
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1 space-y-1.5">
                <label className="sr-only" htmlFor={`alt-${image.id}`}>
                  Alt text for image {index + 1}
                </label>
                <input
                  id={`alt-${image.id}`}
                  type="text"
                  value={image.alt || ""}
                  onChange={(e) => updateAlt(image.id, e.target.value)}
                  placeholder="Alt text (describe the image)"
                  className="w-full rounded border border-border bg-surface px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-accent/30"
                />
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPrimary(image.id)}
                    aria-pressed={!!image.isPrimary}
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors",
                      image.isPrimary
                        ? "bg-warning/15 text-warning"
                        : "bg-surface-muted text-text-muted hover:bg-warning/10 hover:text-warning"
                    )}
                  >
                    {image.isPrimary ? "Primary" : "Set Primary"}
                  </button>
                  {allowLifestyle && (
                    <button
                      type="button"
                      onClick={() => toggleImageType(image.id)}
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors",
                        image.imageType === "LIFESTYLE"
                          ? "bg-info/15 text-info"
                          : "bg-surface-muted text-text-muted hover:bg-info/10 hover:text-info"
                      )}
                    >
                      {image.imageType === "LIFESTYLE" ? "Lifestyle" : "Product"}
                    </button>
                  )}
                  {/* Touch / keyboard reorder */}
                  <span className="ml-auto flex items-center gap-0.5 sm:hidden">
                    <button
                      type="button"
                      onClick={() => moveImage(image.id, -1)}
                      disabled={index === 0}
                      aria-label={`Move image ${index + 1} earlier`}
                      className="rounded-lg border border-border p-1.5 text-text-muted transition-colors hover:bg-surface-muted disabled:opacity-30"
                    >
                      <ArrowUp size={13} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveImage(image.id, 1)}
                      disabled={index === images.length - 1}
                      aria-label={`Move image ${index + 1} later`}
                      className="rounded-lg border border-border p-1.5 text-text-muted transition-colors hover:bg-surface-muted disabled:opacity-30"
                    >
                      <ArrowDown size={13} aria-hidden="true" />
                    </button>
                  </span>
                </div>
              </div>

              {/* Remove */}
              <button
                type="button"
                onClick={() => removeImage(image.id)}
                aria-label={`Remove image ${index + 1}`}
                className="shrink-0 rounded-lg p-1.5 text-text-muted transition-colors hover:bg-error/10 hover:text-error"
              >
                <X size={14} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {images.length === 0 && (
        <p className="flex items-center gap-2 text-xs text-text-muted">
          <ImageIcon size={14} aria-hidden="true" />
          No images uploaded yet
        </p>
      )}
    </div>
  );
}
