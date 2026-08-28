"use client";
import { useTrackPageView, trackEvent } from "@/hooks/useAnalytics";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSettings } from "@/components/ui/SettingsContext";
import {
  Heart, Minus, Plus, Star, ChevronLeft, ChevronRight,
  MessageCircle, Share2, ChevronDown, ShieldCheck, Truck, Headphones, ShoppingBag, Ruler, X,
} from "lucide-react";
import ProductCard from "@/components/ui/ProductCard";
import { cn, formatPrice, getWhatsAppUrl, generateProductWhatsAppMessage } from "@/lib/utils"

import { useCartStore } from "@/store/cart";
import { useWishlistStore } from "@/store/wishlist";
import toast from "react-hot-toast";
import type { ProductVariant } from "@/types";


interface ProductDetailProps {
  product: any;
  reviews: any[];
  reviewAvg: number | null;
  reviewCount: number;
  relatedProducts: any[];
}
export default function ProductDetailClient(
  // Analytics tracking
{ product, reviews: initialReviews, reviewAvg: initialReviewAvg, reviewCount: initialReviewCount, relatedProducts: initialRelated }: ProductDetailProps) {
  const { whatsappNumber } = useSettings();
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(product?.variants?.length ? product.variants[0] : null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);
  const [reviews, setReviews] = useState<any[]>(initialReviews || []);
  const [reviewAvg, setReviewAvg] = useState<number | null>(initialReviewAvg);
  const [realReviewCount, setRealReviewCount] = useState(initialReviewCount || 0);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewMessage, setReviewMessage] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showSizeGuide, setShowSizeGuide] = useState(false);

  const addToCart = useCartStore((s) => s.addItem);
  const toggleWishlist = useWishlistStore((s) => s.toggleItem);
  const isInWishlist = useWishlistStore((s) => s.isInWishlist);

  // Track product page view
  useTrackPageView(product?.id, product?.categoryId, product?.subcategory?.id);





  

  if (!product) return null;

  const images = product.images?.length ? product.images : [];
  const currentPrice = selectedVariant?.salePrice || selectedVariant?.price || product.salePrice || product.regularPrice;
  const originalPrice = product.regularPrice;
  const inStock = product.trackInventory ? (selectedVariant?.stockQuantity ?? product.stockQuantity) > 0 : true;
  const rating = reviewAvg !== null ? reviewAvg : (product.rating || 0);
  const totalReviews = realReviewCount;

  const handleAddToCart = () => {
    trackEvent("ADD_TO_CART", { productId: product?.id, categoryId: product?.categoryId });
    if (!inStock) return;
    addToCart({
      id: selectedVariant?.id || product.id,
      productId: product.id,
      variantId: selectedVariant?.id,
      name: product.name,
      variantName: selectedVariant?.name,
      price: Number(currentPrice),
      salePrice: selectedVariant?.salePrice ? Number(selectedVariant.salePrice) : product.salePrice ? Number(product.salePrice) : undefined,
      quantity,
      image: images[selectedImageIndex]?.url,
      maxStock: selectedVariant?.stockQuantity ?? product.stockQuantity,
    });
    toast.success("Added to cart");
  };

  const handleBuyNow = () => {
    if (!inStock) return;
    addToCart({
      id: selectedVariant?.id || product.id,
      productId: product.id,
      variantId: selectedVariant?.id,
      name: product.name,
      variantName: selectedVariant?.name,
      price: Number(currentPrice),
      salePrice: selectedVariant?.salePrice ? Number(selectedVariant.salePrice) : product.salePrice ? Number(product.salePrice) : undefined,
      quantity,
      image: images[selectedImageIndex]?.url,
      maxStock: selectedVariant?.stockQuantity ?? product.stockQuantity,
    });
    window.location.href = '/checkout';
  };

  const whatsappUrl = getWhatsAppUrl(
    whatsappNumber.replace(/[^0-9]/g, ""),
    generateProductWhatsAppMessage(product.name, `${typeof window !== "undefined" ? window.location.origin : ""}/products/${product.slug}`)
  );

  return (
    <div className="animate-fade-in overflow-x-hidden">
      {/* Back header */}
      <div className="container-shop pt-3 pb-1 flex items-center justify-between">
        <Link href="/shop" className="p-1 hover:bg-surface-muted rounded-lg transition-colors">
          <ChevronLeft size={22} />
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              const url = typeof window !== "undefined" ? window.location.href : "";
              const text = product.name;
              if (navigator.share) {
                try { await navigator.share({ title: text, url }); } catch {}
              } else {
                try { await navigator.clipboard.writeText(url); toast.success("Link copied!"); } catch { toast.error("Failed to copy"); }
              }
            }}
            className="p-1 hover:bg-surface-muted rounded-lg transition-colors"
          >
            <Share2 size={20} />
          </button>
          <button
            onClick={() => {
              const wasInWishlist = isInWishlist(product.id);
              toggleWishlist({
                id: product.id, productId: product.id, name: product.name,
                slug: product.slug, price: Number(originalPrice),
                salePrice: product.salePrice ? Number(product.salePrice) : undefined,
                image: images[0]?.url,
              });
              toast.success(wasInWishlist ? "Removed from wishlist" : "Added to wishlist");
            }}
            className={cn(
              "p-1 rounded-lg transition-colors",
              isInWishlist(product.id) ? "text-error" : "hover:bg-surface-muted"
            )}
          >
            <Heart size={20} fill={isInWishlist(product.id) ? "currentColor" : "none"} />
          </button>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="container-shop py-2">
        <nav className="flex items-center gap-1.5 text-[11px] text-text-muted">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <span>/</span>
          <Link href="/shop" className="hover:text-primary transition-colors">Shop</Link>
          {product.subcategory ? (
            <>
              <span>/</span>
              <Link href={`/collections/${product.category?.slug}`} className="hover:text-primary transition-colors">{product.category?.name}</Link>
              <span>/</span>
              <Link href={`/collections/${product.category?.slug}/${product.subcategory?.slug}`} className="hover:text-primary transition-colors">{product.subcategory?.name}</Link>
            </>
          ) : product.category ? (
            <>
              <span>/</span>
              <Link href={`/collections/${product.category?.slug}`} className="hover:text-primary transition-colors">{product.category?.name}</Link>
            </>
          ) : null}
        </nav>
      </div>

      {/* Main image */}
      <div className="container-shop">
        <div className="relative aspect-square bg-white rounded-2xl overflow-hidden">
          <Image
            src={images[selectedImageIndex]?.url || ""}
            alt={images[selectedImageIndex]?.alt || product.name}
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
          {images.length > 1 && (
            <>
              <button
                onClick={() => setSelectedImageIndex((i) => (i > 0 ? i - 1 : images.length - 1))}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setSelectedImageIndex((i) => (i < images.length - 1 ? i + 1 : 0))}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center"
              >
                <ChevronRight size={16} />
              </button>
            </>
          )}
        </div>
        {/* Image dots */}
        {images.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 mt-3">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setSelectedImageIndex(i)}
                className={cn(
                  "rounded-full transition-all",
                  i === selectedImageIndex
                    ? "w-5 h-1.5 bg-primary"
                    : "w-1.5 h-1.5 bg-stone-300"
                )}
              />
            ))}
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="container-shop mt-4 overflow-hidden">
        <h1 className="text-xl font-semibold text-primary leading-snug break-words">{product.name}</h1>
        {selectedVariant?.name && (
          <p className="text-xs font-medium text-text-secondary mt-1">{selectedVariant.name}</p>
        )}
        {(product as any).frameSizeWidth && (product as any).frameSizeHeight && (
          <p className="text-xs font-medium text-text-secondary mt-1">
            Frame Size: {(product as any).frameSizeWidth} × {(product as any).frameSizeHeight} cm
          </p>
        )}
        <div className="flex items-baseline gap-2 mt-1.5">
          <p className="text-xl font-bold text-primary">{formatPrice(currentPrice)}</p>
          {selectedVariant?.salePrice && Number(selectedVariant.salePrice) < Number(product.regularPrice) && (
            <p className="text-sm text-text-muted line-through">{formatPrice(product.regularPrice)}</p>
          )}
          {!selectedVariant?.salePrice && product.salePrice && Number(product.salePrice) < Number(product.regularPrice) && (
            <p className="text-sm text-text-muted line-through">{formatPrice(product.regularPrice)}</p>
          )}
        </div>

        {/* Rating */}
        <div className="flex items-center gap-2 mt-2">
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} size={14} className={i < Math.floor(rating) ? "text-amber-400 fill-amber-400" : "text-stone-200"} />
            ))}
          </div>
          <span className="text-sm font-medium text-primary">{rating}</span>
          <span className="text-sm text-secondary">({totalReviews} Reviews)</span>
        </div>

        {/* Description */}
        {product.shortDescription && (
          <p className="text-sm text-secondary leading-relaxed mt-3.5">
            {product.shortDescription}
          </p>
        )}                {/* Variant Selection */}
        {product.variants && product.variants.length > 0 && (() => {
          const attrGroups: Record<string, { name: string; values: { value: string; colorCode?: string; variantId: string; price: number; salePrice?: number; inStock: boolean }[] }> = {};
          product.variants.forEach((v: any) => {
            v.attributes?.forEach((a: any) => {
              if (!attrGroups[a.attributeName]) attrGroups[a.attributeName] = { name: a.attributeName, values: [] };
              const already = attrGroups[a.attributeName].values.find((x) => x.value === a.value);
              if (!already) {
                attrGroups[a.attributeName].values.push({
                  value: a.value,
                  colorCode: a.colorCode,
                  variantId: v.id,
                  price: Number(v.salePrice || v.price),
                  salePrice: v.salePrice ? Number(v.salePrice) : undefined,
                  inStock: v.stockQuantity > 0,
                });
              }
            });
          });
          const groups = Object.values(attrGroups);
          if (groups.length === 0) return null;
          return (
            <div className="mt-5 space-y-4">
              {groups.map((group) => (
                <div key={group.name}>
                  <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">{group.name}</p>
                  <div className="flex flex-wrap gap-2">
                    {group.values.map((val) => {
                      const isSelected = selectedVariant?.id === val.variantId;
                      const isColor = group.name.toLowerCase() === 'color';
                      if (isColor) {
                        return (
                          <button key={val.value} onClick={() => { const variant = product.variants.find((v: any) => v.id === val.variantId); if (variant) setSelectedVariant(variant); }}
                            className={cn('w-9 h-9 rounded-full border-2 transition-all flex items-center justify-center', isSelected ? 'border-primary scale-110 ring-2 ring-primary/30' : 'border-border hover:border-foreground/30')}
                            title={val.value}>
                            <div className='w-6 h-6 rounded-full' style={{ backgroundColor: val.colorCode || val.value }} />
                          </button>
                        );
                      }
                      return (
                        <button key={val.value} onClick={() => { const variant = product.variants.find((v: any) => v.id === val.variantId); if (variant) setSelectedVariant(variant); }}
                          className={cn('px-4 py-2.5 rounded-xl text-sm font-medium border transition-all text-left min-w-[80px]',
                            isSelected ? 'border-primary bg-primary text-white' : 'border-border bg-white text-primary hover:border-foreground/30',
                            !val.inStock && 'opacity-40 cursor-not-allowed'
                          )}>
                          <span className="block text-xs leading-tight">{val.value}</span>
                          <span className={cn('block text-[11px] mt-0.5', isSelected ? 'text-white/70' : 'text-text-secondary')}>
                            {val.salePrice ? formatPrice(val.salePrice) : formatPrice(val.price)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}

        {/* Quantity */}
        <div className="flex items-center gap-4 mt-4">
          <div className="flex items-center border border-border rounded-[1.35rem] overflow-hidden">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-10 h-10 flex items-center justify-center hover:bg-surface-muted transition-colors"
            >
              <Minus size={16} />
            </button>
            <span className="w-12 text-center text-sm font-semibold">{quantity}</span>
            <button
              onClick={() => setQuantity((q) => Math.min(10, q + 1))}
              className="w-10 h-10 flex items-center justify-center hover:bg-surface-muted transition-colors"
            >
              <Plus size={16} />
            </button>
          </div>
          {((product as any).height || (product as any).width || (product as any).length || (product as any).depth || (product as any).diameter) && (
            <button
              onClick={() => setShowSizeGuide(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-primary transition-colors ml-auto"
            >
              <Ruler size={14} />
              Size Guide
            </button>
          )}
        </div>

        {/* Add to Cart */}
        <button
          onClick={handleAddToCart}
          disabled={!inStock}
          className={cn(
            "w-full h-12 rounded-2xl text-sm font-semibold transition-all duration-100 mt-5",
            inStock
              ? "bg-primary text-white hover:bg-primary-hover active:scale-[0.97] shadow-[0_4px_14px_rgba(31,33,31,0.18)]"
              : "bg-surface-muted text-text-muted cursor-not-allowed"
          )}
        >
          <span className="flex items-center justify-center gap-2">
            <ShoppingBag size={16} strokeWidth={2} />
            {inStock ? "Add to Cart" : "Out of Stock"}
          </span>
        </button>

        {/* Buy Now */}
        <button
          onClick={() => { trackEvent("BUY_NOW", { productId: product?.id, categoryId: product?.categoryId }); handleBuyNow(); }}
          disabled={!inStock}
          className={cn(
            "w-full h-12 rounded-2xl text-sm font-semibold transition-all duration-100 mt-2.5",
            inStock
              ? "bg-white text-primary border border-black/[.12] hover:bg-surface-muted active:scale-[0.97]"
              : "bg-surface-muted text-text-muted border border-black/[.06] cursor-not-allowed"
          )}
        >
          {inStock ? "Buy Now" : "Out of Stock"}
        </button>

        {/* Enquire on WhatsApp */}
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackEvent("WHATSAPP_ENQUIRY", { productId: product?.id, categoryId: product?.categoryId })}
          className="w-full h-12 rounded-2xl text-sm font-semibold border border-[#25D366]/35 bg-white text-[#25D366] hover:bg-[#25D366]/[0.06] active:scale-[0.97] transition-all duration-100 text-center flex items-center justify-center gap-2 mt-2.5"
        >
          <MessageCircle size={16} strokeWidth={2} />
          Enquire on WhatsApp
        </a>

        {/* Accordion sections */}
        <div className="mt-6 border-t border-border">
          {/* Product Details */}
          <div className="border-b border-border">
            <button
              onClick={() => setOpenAccordion(openAccordion === "details" ? null : "details")}
              className="w-full flex items-center justify-between py-4 text-sm font-medium text-primary"
            >
              Product Details
              <ChevronDown
                size={16}
                className={cn("transition-transform", openAccordion === "details" && "rotate-180")}
              />
            </button>
            <div
              className={cn(
                "overflow-hidden transition-all duration-300",
                openAccordion === "details" ? "max-h-96 pb-4" : "max-h-0"
              )}
            >
              <p className="text-sm text-secondary leading-relaxed">{product.description || product.shortDescription || "No details available."}</p>
            </div>
          </div>

          {/* Dimensions */}
          {(product as any).height || (product as any).width || (product as any).length || (product as any).depth || (product as any).diameter || (product as any).weight ? (
            <div className="border-b border-border">
              <button
                onClick={() => setOpenAccordion(openAccordion === "dimensions" ? null : "dimensions")}
                className="w-full flex items-center justify-between py-4 text-sm font-medium text-primary"
              >
                Dimensions & Weight
                <ChevronDown
                  size={16}
                  className={cn("transition-transform", openAccordion === "dimensions" && "rotate-180")}
                />
              </button>
              <div
                className={cn(
                  "overflow-hidden transition-all duration-300",
                  openAccordion === "dimensions" ? "max-h-96 pb-4" : "max-h-0"
                )}
              >
                <div className="grid grid-cols-2 gap-3">
                  {(product as any).height && (
                    <div className="flex justify-between text-sm">
                      <span className="text-secondary">Height</span>
                      <span className="font-medium">{(product as any).height} {(product as any).dimensionUnit || "cm"}</span>
                    </div>
                  )}
                  {(product as any).width && (
                    <div className="flex justify-between text-sm">
                      <span className="text-secondary">Width</span>
                      <span className="font-medium">{(product as any).width} {(product as any).dimensionUnit || "cm"}</span>
                    </div>
                  )}
                  {(product as any).length && (
                    <div className="flex justify-between text-sm">
                      <span className="text-secondary">Length</span>
                      <span className="font-medium">{(product as any).length} {(product as any).dimensionUnit || "cm"}</span>
                    </div>
                  )}
                  {(product as any).depth && (
                    <div className="flex justify-between text-sm">
                      <span className="text-secondary">Depth</span>
                      <span className="font-medium">{(product as any).depth} {(product as any).dimensionUnit || "cm"}</span>
                    </div>
                  )}
                  {(product as any).diameter && (
                    <div className="flex justify-between text-sm">
                      <span className="text-secondary">Diameter</span>
                      <span className="font-medium">{(product as any).diameter} {(product as any).dimensionUnit || "cm"}</span>
                    </div>
                  )}
                  {(product as any).weight && (
                    <div className="flex justify-between text-sm">
                      <span className="text-secondary">Weight</span>
                      <span className="font-medium">{(product as any).weight} {(product as any).weightUnit || "kg"}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {/* Material & Appearance */}
          {(product as any).material || (product as any).color || (product as any).finish || (product as any).style ? (
            <div className="border-b border-border">
              <button
                onClick={() => setOpenAccordion(openAccordion === "material" ? null : "material")}
                className="w-full flex items-center justify-between py-4 text-sm font-medium text-primary"
              >
                Material & Appearance
                <ChevronDown
                  size={16}
                  className={cn("transition-transform", openAccordion === "material" && "rotate-180")}
                />
              </button>
              <div
                className={cn(
                  "overflow-hidden transition-all duration-300",
                  openAccordion === "material" ? "max-h-96 pb-4" : "max-h-0"
                )}
              >
                <div className="grid grid-cols-2 gap-3">
                  {(product as any).material && (
                    <div className="flex justify-between text-sm">
                      <span className="text-secondary">Material</span>
                      <span className="font-medium text-right max-w-[60%]">{(product as any).material}</span>
                    </div>
                  )}
                  {(product as any).color && (
                    <div className="flex justify-between text-sm">
                      <span className="text-secondary">Color</span>
                      <span className="font-medium text-right max-w-[60%]">{(product as any).color}</span>
                    </div>
                  )}
                  {(product as any).finish && (
                    <div className="flex justify-between text-sm">
                      <span className="text-secondary">Finish</span>
                      <span className="font-medium text-right max-w-[60%]">{(product as any).finish}</span>
                    </div>
                  )}
                  {(product as any).shape && (
                    <div className="flex justify-between text-sm">
                      <span className="text-secondary">Shape</span>
                      <span className="font-medium text-right max-w-[60%]">{(product as any).shape}</span>
                    </div>
                  )}
                  {(product as any).pattern && (
                    <div className="flex justify-between text-sm">
                      <span className="text-secondary">Pattern</span>
                      <span className="font-medium text-right max-w-[60%]">{(product as any).pattern}</span>
                    </div>
                  )}
                  {(product as any).style && (
                    <div className="flex justify-between text-sm">
                      <span className="text-secondary">Style</span>
                      <span className="font-medium text-right max-w-[60%]">{(product as any).style}</span>
                    </div>
                  )}
                  {(product as any).mountingType && (
                    <div className="flex justify-between text-sm">
                      <span className="text-secondary">Mounting</span>
                      <span className="font-medium text-right max-w-[60%]">{(product as any).mountingType}</span>
                    </div>
                  )}
                  {(product as any).usageLocation && (
                    <div className="flex justify-between text-sm">
                      <span className="text-secondary">Use In</span>
                      <span className="font-medium text-right max-w-[60%]">{(product as any).usageLocation}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {/* Care Instructions */}
          {(product as any).careInstructions ? (
            <div className="border-b border-border">
              <button
                onClick={() => setOpenAccordion(openAccordion === "care" ? null : "care")}
                className="w-full flex items-center justify-between py-4 text-sm font-medium text-primary"
              >
                Care Instructions
                <ChevronDown
                  size={16}
                  className={cn("transition-transform", openAccordion === "care" && "rotate-180")}
                />
              </button>
              <div
                className={cn(
                  "overflow-hidden transition-all duration-300",
                  openAccordion === "care" ? "max-h-96 pb-4" : "max-h-0"
                )}
              >
                <p className="text-sm text-secondary leading-relaxed">{(product as any).careInstructions}</p>
              </div>
            </div>
          ) : null}

          {/* Packaging & Warranty */}
          {((product as any).packagingType || (product as any).includedItems || (product as any).warranty) ? (
            <div className="border-b border-border">
              <button
                onClick={() => setOpenAccordion(openAccordion === "packaging" ? null : "packaging")}
                className="w-full flex items-center justify-between py-4 text-sm font-medium text-primary"
              >
                What's in the Box
                <ChevronDown
                  size={16}
                  className={cn("transition-transform", openAccordion === "packaging" && "rotate-180")}
                />
              </button>
              <div
                className={cn(
                  "overflow-hidden transition-all duration-300",
                  openAccordion === "packaging" ? "max-h-96 pb-4" : "max-h-0"
                )}
              >
                {(product as any).includedItems && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1">Included</p>
                    <p className="text-sm text-secondary">{(product as any).includedItems}</p>
                  </div>
                )}
                {(product as any).packagingDimensions && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1">Package Size</p>
                    <p className="text-sm text-secondary">{(product as any).packagingDimensions}</p>
                  </div>
                )}
                {(product as any).warranty && (
                  <div>
                    <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1">Warranty</p>
                    <p className="text-sm text-secondary">{(product as any).warranty}</p>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {/* Custom Size */}
          {product.allowCustomSize ? (
            <div className="border-b border-border">
              <button
                onClick={() => setOpenAccordion(openAccordion === "customsize" ? null : "customsize")}
                className="w-full flex items-center justify-between py-4 text-sm font-medium text-primary"
              >
                Custom Size Available
                <ChevronDown
                  size={16}
                  className={cn("transition-transform", openAccordion === "customsize" && "rotate-180")}
                />
              </button>
              <div
                className={cn(
                  "overflow-hidden transition-all duration-300",
                  openAccordion === "customsize" ? "max-h-96 pb-4" : "max-h-0"
                )}
              >
                <p className="text-sm text-secondary leading-relaxed mb-2">
                  This product is available in custom sizes. Contact us on WhatsApp to discuss your requirements.
                </p>
                <a
                  href={getWhatsAppUrl(
                    whatsappNumber.replace(/[^0-9]/g, ""),
                    `Hi, I'd like to inquire about a custom size for: ${product.name}\n\nProduct URL: ${typeof window !== "undefined" ? window.location.href : ""}`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#25D366] text-white rounded-[1.35rem] text-xs font-medium"
                >
                  <MessageCircle size={14} />
                  Ask About Custom Size
                </a>
              </div>
            </div>
          ) : null}
        </div>

        {/* Trust signals */}
        <div className="grid grid-cols-3 gap-4 py-7 mt-2 border-t border-border">
          {[
            { icon: <ShieldCheck size={20} strokeWidth={1.5} />, label: "Premium Quality" },
            { icon: <Truck size={20} strokeWidth={1.5} />, label: "Reliable Delivery" },
            { icon: <Headphones size={20} strokeWidth={1.5} />, label: "Dedicated Support" },
          ].map((item) => (
            <div key={item.label} className="flex flex-col items-center gap-2.5 text-center">
              <div className="text-foreground/70">{item.icon}</div>
              <span className="text-[11px] font-medium text-text-secondary tracking-wide">{item.label}</span>
            </div>
          ))}
        </div>

        {/* Lifestyle Images */}
        {product.images && product.images.filter((img: any) => img.imageType === "LIFESTYLE").length > 0 && (
          <div className="mt-6 border-t border-border pt-6 pb-4">
            <h2 className="text-lg font-semibold text-primary mb-4">See It In Your Home</h2>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
              {product.images
                .filter((img: any) => img.imageType === "LIFESTYLE")
                .map((img) => (
                  <div key={img.id} className="flex-shrink-0 w-[280px] rounded-[1.35rem] overflow-hidden bg-surface-muted">
                    <div className="relative aspect-[4/3]">
                      <Image
                        src={img.url}
                        alt={img.alt || product.name}
                        fill
                        className="object-cover"
                        sizes="280px"
                      />
                    </div>
                    {img.alt && (
                      <div className="px-3 py-2">
                        <p className="text-xs text-secondary truncate">{img.alt}</p>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}


        {/* Reviews Section */}
        <div className="mt-6 border-t border-border pt-6 pb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-primary">Customer Reviews</h2>
            {isLoggedIn && (
              <button
                onClick={() => setShowReviewForm(!showReviewForm)}
                className="text-sm text-accent font-medium hover:underline"
              >
                {showReviewForm ? 'Cancel' : 'Write a Review'}
              </button>
            )}
          </div>

          {/* Review Form */}
          {showReviewForm && (
            <div className="bg-surface border border-border rounded-2xl p-4 mb-5">
              <p className="text-sm font-medium text-primary mb-3">Your Rating</p>
              <div className="flex items-center gap-1 mb-3">
                {[1,2,3,4,5].map((s) => (
                  <button key={s} onClick={() => setReviewRating(s)} className="p-0.5">
                    <Star
                      size={24}
                      className={s <= reviewRating ? 'text-amber-400 fill-amber-400' : 'text-stone-200'}
                    />
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="Review title (optional)"
                value={reviewTitle}
                onChange={(e) => setReviewTitle(e.target.value)}
                className="w-full px-3 py-2.5 bg-surface border border-border rounded-lg text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
              <textarea
                placeholder="Share your experience with this product..."
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                rows={3}
                className="w-full px-3 py-2.5 bg-surface border border-border rounded-lg text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
              />
              {reviewMessage && (
                <p className="text-sm mb-3 text-green-600">{reviewMessage}</p>
              )}
              <button
                onClick={async () => {
                  setSubmittingReview(true);
                  setReviewMessage('');
                  try {
                    const res = await fetch('/api/reviews', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        productId: product.id,
                        rating: reviewRating,
                        title: reviewTitle || undefined,
                        comment: reviewComment || undefined,
                      }),
                    });
                    const data = await res.json();
                    if (res.ok) {
                      setReviewMessage(data.message || 'Review submitted!');
                      setShowReviewForm(false);
                      setReviewTitle('');
                      setReviewComment('');
                      setReviewRating(5);
                    } else {
                      setReviewMessage(data.error || 'Failed to submit');
                    }
                  } catch {
                    setReviewMessage('Failed to submit review');
                  } finally {
                    setSubmittingReview(false);
                  }
                }}
                disabled={submittingReview}
                className="w-full py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-hover transition-colors disabled:opacity-50"
              >
                {submittingReview ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          )}

          {!isLoggedIn && (
            <p className="text-sm text-secondary mb-4">
              <a href="/login" className="text-accent hover:underline font-medium">Sign in</a> to leave a review.
            </p>
          )}

          {/* Reviews List */}
          {reviews.length > 0 ? (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="border-b border-border pb-4 last:border-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} size={12} className={i < review.rating ? 'text-amber-400 fill-amber-400' : 'text-stone-200'} />
                      ))}
                    </div>
                    <span className="text-sm font-medium text-primary">{review.user?.name || 'Customer'}</span>
                  </div>
                  {review.title && <p className="text-sm font-semibold text-primary mb-1">{review.title}</p>}
                  {review.comment && <p className="text-sm text-secondary leading-relaxed">{review.comment}</p>}
                  <p className="text-xs text-text-muted mt-1.5">
                    {new Date(review.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-secondary">No reviews yet. Be the first to review this product!</p>
          )}
        </div>

        {/* Related Products */}
        {initialRelated.length > 0 && (
          <div className="mt-6 border-t border-border pt-6 pb-4">
            <h2 className="text-lg font-semibold text-primary mb-4">You May Also Like</h2>
            <div className="grid grid-cols-2 gap-3">
              {initialRelated.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Size Guide Modal */}
      {showSizeGuide && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm" style={{ animation: "filterBackdropIn 250ms ease forwards" }} onClick={() => setShowSizeGuide(false)} />
          <div className="fixed inset-x-0 bottom-0 top-[12vh] z-[70] bg-[#faf8f5] rounded-t-[1.5rem] flex flex-col" style={{ animation: "filterPanelSlideUp 350ms cubic-bezier(0.32, 0.72, 0, 1) forwards" }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-black/[.06] shrink-0">
              <div className="flex items-center gap-2.5">
                <Ruler size={17} className="text-[#1a1917]" />
                <span className="text-base font-semibold text-[#1a1917]">Size Guide</span>
              </div>
              <button onClick={() => setShowSizeGuide(false)} className="w-8 h-8 flex items-center justify-center hover:bg-black/[.04] rounded-full transition-colors">
                <X size={18} className="text-[#6b6560]" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-5">
              {/* Visual diagram */}
              <div className="relative bg-white rounded-2xl border border-black/[.06] p-6 mb-5">
                <div className="relative mx-auto" style={{ width: "160px", height: "120px" }}>
                  <div className="absolute inset-0 border-2 border-[#d4a574] rounded-lg" />
                  {(product as any).width && (
                    <div className="absolute -bottom-6 left-0 right-0 flex items-center justify-center">
                      <div className="h-[1px] bg-[#d4a574] flex-1" />
                      <span className="px-2 text-[11px] font-semibold text-[#d4a574] whitespace-nowrap">{(product as any).width} {(product as any).dimensionUnit || "cm"}</span>
                      <div className="h-[1px] bg-[#d4a574] flex-1" />
                    </div>
                  )}
                  {(product as any).height && (
                    <div className="absolute -right-12 top-0 bottom-0 flex flex-col items-center justify-center">
                      <div className="w-[1px] bg-[#d4a574] flex-1" />
                      <span className="py-1 text-[11px] font-semibold text-[#d4a574] whitespace-nowrap" style={{ writingMode: "vertical-lr" }}>{(product as any).height} {(product as any).dimensionUnit || "cm"}</span>
                      <div className="w-[1px] bg-[#d4a574] flex-1" />
                    </div>
                  )}
                </div>
              </div>
              {/* Dimension list */}
              <div className="space-y-0">
                {(product as any).frameSizeWidth && (product as any).frameSizeHeight && (
                  <div className="flex items-center justify-between py-3 border-b border-black/[.04]">
                    <span className="text-sm text-secondary">Frame Size</span>
                    <span className="text-sm font-semibold text-primary">{(product as any).frameSizeWidth} × {(product as any).frameSizeHeight} cm</span>
                  </div>
                )}
                {(product as any).height && (
                  <div className="flex items-center justify-between py-3 border-b border-black/[.04]">
                    <span className="text-sm text-secondary">Height</span>
                    <span className="text-sm font-semibold text-primary">{(product as any).height} {(product as any).dimensionUnit || "cm"}</span>
                  </div>
                )}
                {(product as any).width && (
                  <div className="flex items-center justify-between py-3 border-b border-black/[.04]">
                    <span className="text-sm text-secondary">Width</span>
                    <span className="text-sm font-semibold text-primary">{(product as any).width} {(product as any).dimensionUnit || "cm"}</span>
                  </div>
                )}
                {(product as any).length && (
                  <div className="flex items-center justify-between py-3 border-b border-black/[.04]">
                    <span className="text-sm text-secondary">Length</span>
                    <span className="text-sm font-semibold text-primary">{(product as any).length} {(product as any).dimensionUnit || "cm"}</span>
                  </div>
                )}
                {(product as any).depth && (
                  <div className="flex items-center justify-between py-3 border-b border-black/[.04]">
                    <span className="text-sm text-secondary">Depth</span>
                    <span className="text-sm font-semibold text-primary">{(product as any).depth} {(product as any).dimensionUnit || "cm"}</span>
                  </div>
                )}
                {(product as any).diameter && (
                  <div className="flex items-center justify-between py-3 border-b border-black/[.04]">
                    <span className="text-sm text-secondary">Diameter</span>
                    <span className="text-sm font-semibold text-primary">{(product as any).diameter} {(product as any).dimensionUnit || "cm"}</span>
                  </div>
                )}
                {(product as any).weight && (
                  <div className="flex items-center justify-between py-3 border-b border-black/[.04]">
                    <span className="text-sm text-secondary">Weight</span>
                    <span className="text-sm font-semibold text-primary">{(product as any).weight} {(product as any).weightUnit || "kg"}</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-text-muted mt-4 leading-relaxed">
                All dimensions are approximate and measured in {(product as any).dimensionUnit || "cm"}. Actual size may vary slightly.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
