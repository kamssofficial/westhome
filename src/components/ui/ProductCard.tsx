"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, ImageOff } from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import { useWishlistStore } from "@/store/wishlist";
import toast from "react-hot-toast";
import type { Product } from "@/types";

interface ProductCardProps {
  product: Product;
  priority?: boolean;
}

export default function ProductCard({ product, priority = false }: ProductCardProps) {
  const [imageError, setImageError] = useState(false);
  const toggleWishlist = useWishlistStore((s) => s.toggleItem);
  const isInWishlist = useWishlistStore((s) => s.isInWishlist(product.id));

  const primaryImage = product.images.find((i) => i.isPrimary) || product.images[0];
  const inStock = product.trackInventory ? product.stockQuantity > 0 : true;

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
      image: primaryImage?.url,
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
          {primaryImage && !imageError ? (
            <Image
              src={primaryImage.url}
              alt={primaryImage.alt || product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              priority={priority}
              onError={() => setImageError(true)}
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
            type="button"
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
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm font-semibold text-primary">
              {formatPrice(product.salePrice || product.regularPrice)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
