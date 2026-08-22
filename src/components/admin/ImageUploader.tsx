"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import { Upload, X, GripVertical, Star, ImageIcon } from "lucide-react";
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

export default function ImageUploader({
  images,
  onChange,
  folder = "products",
  maxImages = 10,
  allowLifestyle = false,
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(
    async (files: FileList) => {
      if (images.length + files.length > maxImages) {
        toast.error(`Maximum ${maxImages} images allowed`);
        return;
      }

      setUploading(true);
      const newImages: ImageItem[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("folder", folder);

          const res = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });

          if (res.ok) {
            const data = await res.json();
            newImages.push({
              id: `temp-${Date.now()}-${i}`,
              url: data.url,
              alt: file.name.replace(/\.[^/.]+$/, ""),
              isPrimary: images.length === 0 && i === 0,
              position: images.length + i,
              imageType: "PRODUCT",
            });
          } else {
            toast.error(`Failed to upload ${file.name}`);
          }
        } catch {
          toast.error(`Failed to upload ${file.name}`);
        }
      }

      if (newImages.length > 0) {
        onChange([...images, ...newImages]);
        toast.success(`${newImages.length} image(s) uploaded`);
      }

      setUploading(false);
    },
    [images, onChange, folder, maxImages]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files) {
        handleUpload(e.dataTransfer.files);
      }
    },
    [handleUpload]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        handleUpload(e.target.files);
      }
    },
    [handleUpload]
  );

  const removeImage = (id: string) => {
    const updated = images.filter((img) => img.id !== id);
    // If removed was primary, make first one primary
    if (updated.length > 0 && !updated.some((img) => img.isPrimary)) {
      updated[0].isPrimary = true;
    }
    onChange(updated);
  };

  const setPrimary = (id: string) => {
    onChange(
      images.map((img) => ({
        ...img,
        isPrimary: img.id === id,
      }))
    );
  };

  const updateAlt = (id: string, alt: string) => {
    onChange(
      images.map((img) => (img.id === id ? { ...img, alt } : img))
    );
  };

  const toggleImageType = (id: string) => {
    if (!allowLifestyle) return;
    onChange(
      images.map((img) =>
        img.id === id
          ? {
              ...img,
              imageType: img.imageType === "LIFESTYLE" ? "PRODUCT" : "LIFESTYLE",
            }
          : img
      )
    );
  };

  return (
    <div className="space-y-3">
      {/* Upload area */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all",
          dragOver
            ? "border-accent bg-accent/5"
            : "border-border hover:border-accent/50 hover:bg-surface-muted/50"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
        <div className="flex flex-col items-center gap-2">
          {uploading ? (
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          ) : (
            <Upload size={24} className="text-text-muted" />
          )}
          <p className="text-sm text-secondary">
            {uploading
              ? "Uploading..."
              : "Drag images here or click to browse"}
          </p>
          <p className="text-xs text-text-muted">
            JPEG, PNG, WebP • Max 5MB • Up to {maxImages} images
          </p>
        </div>
      </div>

      {/* Image list */}
      {images.length > 0 && (
        <div className="space-y-2">
          {images.map((image, index) => (
            <div
              key={image.id}
              className="flex items-center gap-3 bg-white border border-border-light rounded-lg p-3"
            >
              {/* Drag handle */}
              <div className="text-text-muted cursor-grab">
                <GripVertical size={16} />
              </div>

              {/* Thumbnail */}
              <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-surface-muted flex-shrink-0">
                <Image
                  src={image.url}
                  alt={image.alt || ""}
                  fill
                  className="object-cover"
                  sizes="64px"
                />
                {image.isPrimary && (
                  <div className="absolute top-0.5 left-0.5">
                    <Star
                      size={12}
                      className="text-amber-400 fill-amber-400"
                    />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 space-y-1">
                <input
                  type="text"
                  value={image.alt || ""}
                  onChange={(e) => updateAlt(image.id, e.target.value)}
                  placeholder="Alt text"
                  className="w-full px-2 py-1 border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-accent/30"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPrimary(image.id)}
                    className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors",
                      image.isPrimary
                        ? "bg-amber-100 text-amber-700"
                        : "bg-surface-muted text-text-muted hover:bg-amber-50"
                    )}
                  >
                    {image.isPrimary ? "Primary" : "Set Primary"}
                  </button>
                  {allowLifestyle && (
                    <button
                      onClick={() => toggleImageType(image.id)}
                      className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors",
                        image.imageType === "LIFESTYLE"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-surface-muted text-text-muted hover:bg-blue-50"
                      )}
                    >
                      {image.imageType === "LIFESTYLE"
                        ? "Lifestyle"
                        : "Product"}
                    </button>
                  )}
                </div>
              </div>

              {/* Remove */}
              <button
                onClick={() => removeImage(image.id)}
                className="p-1.5 text-text-muted hover:text-error hover:bg-error/10 rounded-lg transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {images.length === 0 && (
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <ImageIcon size={14} />
          <span>No images uploaded yet</span>
        </div>
      )}
    </div>
  );
}
