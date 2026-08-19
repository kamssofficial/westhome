"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, ShoppingBag, ExternalLink } from "lucide-react";
import { cn, formatPrice, calculateDiscount, getWhatsAppUrl } from "@/lib/utils";
import { useWishlistStore } from "@/store/wishlist";
import { useCartStore } from "@/store/cart";
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
  const addToCart = useCartStore((s) => s.addItem);

  const primaryImage = product.images.find((i) => i.isPrimary) || product.images[0];
  const discount = calculateDiscount(product.regularPrice, product.salePrice || 0);
  const hasVariants = product.variants && product.variants.length > 0;
  const inStock = product.trackInventory ? product.stockQuantity > 0 : true;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!inStock) return;

    if (hasVariants) {
      // Redirect to product page to select variant
      window.location.href = `/products/${product.slug}`;
      return;
    }

    addToCart({
      id: product.id,
      productId: product.id,
      name: product.name,
      price: Number(product.salePrice || product.regularPrice),
      salePrice: product.salePrice ? Number(product.salePrice) : undefined,
      quantity: 1,
      image: primaryImage?.url,
      maxStock: product.stockQuantity,
    });
    toast.success("Added to cart");
  };

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
      className="group block"
    >
      <div className="bg-white rounded-xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300">
        {/* Image */}
        <div className="relative aspect-product bg-surface-muted overflow-hidden">
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
            <Image src="/images/products/placeholder-product.svg" alt={product.name} fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" className="object-cover opacity-60" />
          )}

          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {product.isNewArrival && (
              <span className="px-2 py-0.5 bg-primary text-white text-[10px] font-semibold rounded uppercase tracking-wider">
                New
              </span>
            )}
            {product.isBestseller && (
              <span className="px-2 py-0.5 bg-accent text-white text-[10px] font-semibold rounded uppercase tracking-wider">
                Bestseller
              </span>
            )}
            {product.isComingSoon && (
              <span className="px-2 py-0.5 bg-info text-white text-[10px] font-semibold rounded uppercase tracking-wider">
                Coming Soon
              </span>
            )}
            {!inStock && (
              <span className="px-2 py-0.5 bg-text-secondary text-white text-[10px] font-semibold rounded uppercase tracking-wider">
                Out of Stock
              </span>
            )}
          </div>

          {/* Discount badge */}
          {discount > 0 && (
            <span className="absolute top-2 right-2 px-2 py-0.5 bg-error text-white text-[10px] font-semibold rounded">
              -{discount}%
            </span>
          )}

          {/* Quick actions overlay */}
          <div className="absolute bottom-2 right-2 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              onClick={handleWishlist}
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-colors",
                isInWishlist
                  ? "bg-error text-white"
                  : "bg-white text-text-secondary hover:text-error"
              )}
              aria-label="Add to wishlist"
            >
              <Heart size={14} fill={isInWishlist ? "currentColor" : "none"} />
            </button>
            {inStock && !hasVariants && (
              <button
                onClick={handleAddToCart}
                className="w-8 h-8 rounded-full bg-white text-text-secondary hover:text-foreground flex items-center justify-center shadow-md transition-colors"
                aria-label="Add to cart"
              >
                <ShoppingBag size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="p-3">
          <p className="text-[11px] text-text-muted uppercase tracking-wider mb-1">
            {product.category?.name}
          </p>
          <h3 className="text-sm font-medium text-foreground line-clamp-2 mb-2 min-h-[2.5rem]">
            {product.name}
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">
              {formatPrice(product.salePrice || product.regularPrice)}
            </span>
            {product.salePrice && (
              <span className="text-xs text-text-muted line-through">
                {formatPrice(product.regularPrice)}
              </span>
            )}
          </div>
          {hasVariants && (
            <p className="text-[11px] text-text-muted mt-1">
              Multiple options available
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
