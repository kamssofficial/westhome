"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, ImageOff } from "lucide-react";
import { cn, calculateDiscount } from "@/lib/utils";
import PriceDisplay from "@/components/ui/PriceDisplay";
import { useWishlistStore } from "@/store/wishlist";
import toast from "react-hot-toast";
import type { Product } from "@/types";
import { resolveProductImage } from "@/lib/categoryImages";
import { reportImageError } from "@/lib/reportImageError";
import { useImageRetry } from "@/lib/useImageRetry";

// Swatch hex per palette name (mirrors scripts/add-palette-tags.mjs NAMED palette)
const COLOR_HEX: Record<string, string> = {
  Charcoal: "#282828", Black: "#141414", Grey: "#828282", Slate: "#5f6973",
  Cream: "#ebe6da", Ivory: "#f0ece2", Blush: "#deb0a8", Rose: "#c88c8c",
  Rust: "#aa5f37", Terracotta: "#b96e46", Amber: "#c89646", Gold: "#be9b50",
  Tan: "#be966e", Beige: "#d7c3a5", Olive: "#787d50", Indigo: "#465282",
  Navy: "#28325a", Maroon: "#782d32",
};

interface ProductCardProps {
  product: Product;
  priority?: boolean;
}

export default function ProductCard({ product, priority = false }: ProductCardProps) {
  const [imageError, setImageError] = useState(false);
  const toggleWishlist = useWishlistStore((s) => s.toggleItem);
  const isInWishlist = useWishlistStore((s) => s.isInWishlist(product.id));

  const primaryImage = product.images.find((i) => i.isPrimary) || product.images[0];
  const variantImage = product.variants?.[0]?.images?.[0];
  const displayImage = resolveProductImage(
    product.category?.slug,
    primaryImage?.url || variantImage?.url,
    product.slug,
  );
  const discount = calculateDiscount(product.regularPrice, product.salePrice || 0);
  // Silently retry transient proxy failures before showing the fallback /
  // reporting (see useImageRetry — most "broken" images heal on retry 1).
  const [retrySrc, handleImgError] = useImageRetry(displayImage, () => {
    setImageError(true);
    reportImageError({ url: displayImage, productId: product.id, productName: product.name });
  });
  // Mirror the detail page's buyability exactly. Stock 0 is always out of
  // stock regardless of trackInventory. For variant products the variants
  // decide (e.g. basket set: product stock 0, S/M/L stocked = buyable; or
  // product stock 1 but every size 0 = sold out, since checkout always picks
  // a variant). Products without variants use their own stock.
  const inStock =
    (product.variants?.length ?? 0) > 0
      ? product.variants.some((v) => v.stockQuantity > 0)
      : product.stockQuantity > 0;

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist({
      id: product.id,
      productId: product.id,
      name: product.name,
      slug: product.slug,
      price: Number(product.regularPrice),
      salePrice: product.salePrice ? Number(product.salePrice) : undefined,
      image: displayImage || undefined,
    });
    toast.success(isInWishlist ? "Removed from wishlist" : "Added to wishlist");
  };

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group block card-press touch-target"
    >
      <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-card-hover transition-all duration-300">
        {/* Image */}
        <div className="relative aspect-square bg-surface-muted overflow-hidden">
          {retrySrc && !imageError ? (
            <Image
              src={retrySrc}
              alt={primaryImage?.alt || variantImage?.alt || product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              priority={priority}
              onError={handleImgError}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-text-muted">
              <ImageOff size={24} className="mb-1 opacity-40" />
              <span className="text-[10px]">No image</span>
            </div>
          )}

          {/* Wishlist heart */}
          <button
            onClick={handleWishlist}
            className={cn(
              "absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90",
              isInWishlist
                ? "bg-white text-error shadow-sm"
                : "bg-white/80 backdrop-blur-sm text-text-muted hover:bg-white hover:text-error"
            )}
            aria-label={isInWishlist ? "Remove from wishlist" : "Add to wishlist"}
            aria-pressed={isInWishlist}
          >
            <Heart size={15} fill={isInWishlist ? "currentColor" : "none"} />
          </button>

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1">
            {product.isNewArrival && (
              <span className="px-2 py-0.5 bg-primary text-white text-[10px] font-semibold rounded-full">
                New
              </span>
            )}
            {discount > 0 && (
              <span className="px-2 py-0.5 bg-error text-white text-[10px] font-semibold rounded-full">
                -{discount}%
              </span>
            )}
            {!inStock && (
              <span className="px-2 py-0.5 bg-text-muted text-white text-[10px] font-semibold rounded-full">
                Sold Out
              </span>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="p-2.5">
          <p className="font-label text-[9px] tracking-[0.15em] text-accent mb-0.5">
            {product.subcategory?.name || product.category?.name}
          </p>
          <h3 className="text-[13px] font-medium text-primary line-clamp-1 leading-snug">
            {product.name}
          </h3>
          <div className="mt-1 flex items-center justify-between gap-2">
            <PriceDisplay regularPrice={product.regularPrice} salePrice={product.salePrice} size="md" />
            {(product as any).palette?.length > 0 && (
              <div className="flex items-center gap-1 shrink-0" title={(product as any).palette.join(" / ")}>
                {(product as any).palette.slice(0, 4).map((c: string) => (
                  <span
                    key={c}
                    className="w-3 h-3 rounded-full border border-black/10"
                    style={{ backgroundColor: COLOR_HEX[c] || "#ddd" }}
                    aria-label={`Available in ${c}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
