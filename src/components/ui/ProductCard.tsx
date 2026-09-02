"use client";

import { useState, memo } from "react";
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

const BLUR_PLACEHOLDER = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJnIiB41PSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiNlYmU3ZGYiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiNmMGVkZTgiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIGZpbGw9InVybCgjZykiLz48L3N2Zz4=";

function ProductCardInner({ product, priority = false }: ProductCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const toggleWishlist = useWishlistStore((s) => s.toggleItem);
  const isInWishlist = useWishlistStore((s) => s.isInWishlist(product.id));

  const primaryImage = product.images.find((i) => i.isPrimary) || product.images[0];
  const inStock = product.trackInventory ? product.stockQuantity > 0 : true;
  const displayPrice = product.salePrice || product.regularPrice;
  const formattedPrice = formatPrice(displayPrice);

  const handleWishlist = (e: React.MouseEvent<HTMLButtonElement>) => {
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
    <article className="group block card-press">
      <div className="relative overflow-hidden rounded-xl bg-white shadow-sm transition-all duration-300 hover:shadow-card-hover">
        <Link
          href={`/products/${product.slug}`}
          className="block touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
          aria-label={`View ${product.name}`}
        >
          <div className="relative aspect-square overflow-hidden bg-surface-muted">
            {primaryImage && !imageError ? (
              <>
                {!imageLoaded && (
                  <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-[#ebe7df] via-[#f5f3ef] to-[#ebe7df]" />
                )}
                <Image
                  src={primaryImage.url}
                  alt={primaryImage.alt || product.name}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className={cn(
                    "object-cover transition-all duration-500",
                    imageLoaded ? "opacity-100 group-hover:scale-105" : "opacity-0"
                  )}
                  priority={priority}
                  placeholder="blur"
                  blurDataURL={BLUR_PLACEHOLDER}
                  onLoad={() => setImageLoaded(true)}
                  onError={() => setImageError(true)}
                  quality={priority ? 85 : 75}
                />
              </>
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center text-text-muted">
                <ImageOff size={24} className="mb-1 opacity-40" />
                <span className="text-[10px]">No image</span>
              </div>
            )}

            <div className="absolute left-3 top-3 flex flex-col gap-1">
              {product.isNewArrival && (
                <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-white">
                  New
                </span>
              )}
              {!inStock && (
                <span className="rounded-full bg-text-muted px-2 py-0.5 text-[10px] font-semibold text-white">
                  Sold Out
                </span>
              )}
            </div>
          </div>

          <div className="p-2.5">
            <p className="mb-0.5 font-label text-[9px] tracking-[0.15em] text-accent">
              {product.subcategory?.name || product.category?.name}
            </p>
            <h3 className="line-clamp-1 text-[13px] font-medium leading-snug text-primary">
              {product.name}
            </h3>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-sm font-semibold text-primary">{formattedPrice}</span>
            </div>
          </div>
        </Link>

        <button
          type="button"
          onClick={handleWishlist}
          className={cn(
            "absolute right-3 top-3 flex h-10 w-10 touch-target items-center justify-center rounded-full transition-all duration-200 active:scale-90",
            isInWishlist
              ? "bg-white text-error shadow-sm"
              : "bg-white/80 text-text-muted backdrop-blur-sm hover:bg-white hover:text-error"
          )}
          aria-label={isInWishlist ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
          aria-pressed={isInWishlist}
        >
          <Heart size={15} fill={isInWishlist ? "currentColor" : "none"} />
        </button>
      </div>
    </article>
  );
}

const ProductCard = memo(ProductCardInner);
export default ProductCard;
