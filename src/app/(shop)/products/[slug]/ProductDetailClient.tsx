"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSettings } from "@/components/ui/SettingsContext";
import {
  Heart, Minus, Plus, Star, ChevronLeft, ChevronRight,
  MessageCircle, Share2, ChevronDown, ShieldCheck, Truck, Headphones, Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import ProductCard from "@/components/ui/ProductCard";
import { cn, formatPrice, getWhatsAppUrl, generateProductWhatsAppMessage } from "@/lib/utils";
import PriceDisplay from "@/components/ui/PriceDisplay";
import { useCartStore } from "@/store/cart";
import { trackEvent } from "@/components/ui/AnalyticsTracker";
import { reportImageError } from "@/lib/reportImageError";
import { useImageRetry } from "@/lib/useImageRetry";
import { useWishlistStore } from "@/store/wishlist";
import toast from "react-hot-toast";
import type { ProductVariant } from "@/types";
import { resolveProductImage } from "@/lib/categoryImages";
import { basketSizeChartFor } from "@/lib/basketSizeChart";

/** One gallery slide: silently retries transient proxy failures before
 *  reporting (see useImageRetry). Lives outside the map loop because hooks
 *  cannot be called inside callbacks/loops. */
function GalleryImage({
  image,
  productId,
  productName,
  priority,
}: {
  image: { url: string; alt?: string | null };
  productId: string;
  productName: string;
  priority: boolean;
}) {
  const [retrySrc, handleImgError] = useImageRetry(image.url, () =>
    reportImageError({ url: image.url, productId, productName }),
  );
  return (
    <Image
      src={retrySrc || ""}
      alt={image.alt || productName}
      fill
      className="object-cover"
      sizes="(max-width: 1024px) 100vw, 45vw"
      priority={priority}
      onError={handleImgError}
    />
  );
}


interface ProductDetailProps {
  product: any;
  reviews: any[];
  reviewAvg: number | null;
  reviewCount: number;
  relatedProducts: any[];
}
export default function ProductDetailClient({ product, reviews: initialReviews, reviewAvg: initialReviewAvg, reviewCount: initialReviewCount, relatedProducts: initialRelated }: ProductDetailProps) {
  const { whatsappNumber } = useSettings();
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    // Default to the first variant that actually has stock, so an out-of-stock
    // first variant (e.g. size S sold out, M/L available) doesn't show the
    // whole product as Sold Out on load.
    const firstVariant = product?.variants?.find((v: any) => v.stockQuantity > 0) ?? product?.variants?.[0];
    if (firstVariant) {
      firstVariant.attributes.forEach((attr: any) => {
        initial[attr.attributeName] = attr.value;
      });
    }
    return initial;
  });
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const isProgrammaticScroll = useRef(false);

  const handleScrollToImage = (index: number) => {
    setSelectedImageIndex(index);
    if (scrollRef.current) {
      isProgrammaticScroll.current = true;
      scrollRef.current.scrollTo({
        left: index * scrollRef.current.clientWidth,
        behavior: 'smooth'
      });
      setTimeout(() => { isProgrammaticScroll.current = false; }, 500);
    }
  };

  const [quantity, setQuantity] = useState(1);

  // Log a product VIEW event once per mount so "Most Viewed" analytics work.
  useEffect(() => {
    if (product?.id) trackEvent("VIEW", { productId: product.id, categoryId: product.categoryId || undefined });
  }, [product?.id, product?.categoryId]);
  // The size chart opens by default when present — buyers pick a size by its
  // dimensions, so show the table without requiring a tap.
  const [openAccordion, setOpenAccordion] = useState<string | null>(
    basketSizeChartFor(product?.slug) ? "sizechart" : null
  );
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

  const router = useRouter();
  const addToCart = useCartStore((s) => s.addItem);
  const toggleWishlist = useWishlistStore((s) => s.toggleItem);
  const isInWishlist = useWishlistStore((s) => s.isInWishlist);





  

  // Derive active variant from selected attribute values
  const activeVariant = (product?.variants?.length
    ? product.variants.find((v: any) =>
        v.attributes.length > 0 &&
        v.attributes.every((a: any) => selectedAttributes[a.attributeName] === a.value)
      ) || null
    : null) as ProductVariant | null;
  const selectedVariant = activeVariant;

  // Hoisted so the memo/callback dependencies are plain identifiers. Depending
  // on the optional-chained `product?.variants` prevented the React Compiler
  // from preserving this memoization, so it silently skipped optimizing the
  // component.
  const variants = product?.variants;

  // Compute grouped attributes for the selector UI
  const attributeGroups: Record<string, string[]> = useMemo(() => {
    const groups: Record<string, string[]> = {};
    if (variants) {
      for (const v of variants) {
        for (const attr of v.attributes) {
          if (!groups[attr.attributeName]) {
            groups[attr.attributeName] = [];
          }
          if (!groups[attr.attributeName].includes(attr.value)) {
            groups[attr.attributeName].push(attr.value);
          }
        }
      }
    }
    return groups;
  }, [variants])

  // Compute available attribute values given current selections
  const getAvailableValues = useCallback(
    (attrName: string): string[] => {
      if (!variants) return [];
      return variants
        .filter((v: any) =>
          v.attributes.every((a: any) =>
            a.attributeName === attrName || selectedAttributes[a.attributeName] === a.value
          )
        )
        .map((v: any) => {
          const attr = v.attributes.find((a: any) => a.attributeName === attrName);
          return attr?.value;
        })
        .filter((val): val is string => !!val)
        .filter((val, i, arr) => arr.indexOf(val) === i);
    },
    [variants, selectedAttributes]
  );

  const handleAttributeSelect = (attrName: string, value: string) => {
    setSelectedAttributes((prev) => ({ ...prev, [attrName]: value }));
    setQuantity(1);
  };

  if (!product) return null;

  // Use variant images if available, otherwise fall back to product images
  const variantImages = selectedVariant?.images?.length ? selectedVariant.images : [];
  const sizeChart = basketSizeChartFor(product?.slug);
  const rawImages = variantImages.length > 0 ? variantImages : (product.images?.length ? product.images : []);
  const images = rawImages.map((image: any) => ({
    ...image,
    url: resolveProductImage(product.category?.slug, image.url, product.slug) || image.url,
  }));
  const currentPrice = (selectedVariant?.salePrice != null && selectedVariant.salePrice > 0 ? selectedVariant.salePrice : selectedVariant?.price) ?? (product.salePrice != null && product.salePrice > 0 ? product.salePrice : product.regularPrice);
  const originalPrice = product.regularPrice;
  // Stock 0 is always out of stock, regardless of trackInventory. Variant
  // stock governs when a variant is selected; product stock otherwise.
  const inStock = (selectedVariant?.stockQuantity ?? product.stockQuantity) > 0;
  const rating = reviewAvg !== null ? reviewAvg : (product.rating || 0);
  const totalReviews = realReviewCount;

  const handleAddToCart = () => {
    if (!inStock) return;
    addToCart({
      id: selectedVariant?.id || product.id,
      productId: product.id,
      variantId: selectedVariant?.id,
      name: product.name,
      variantName: selectedVariant?.name,
      price: Number(currentPrice),
      salePrice: selectedVariant?.salePrice ? Number(selectedVariant.salePrice) : selectedVariant ? undefined : product.salePrice ? Number(product.salePrice) : undefined,
      quantity,
      image: images[selectedImageIndex]?.url,
      maxStock: selectedVariant?.stockQuantity ?? product.stockQuantity,
    });
    toast.success("Added to cart");
  };

  const whatsappUrl = getWhatsAppUrl(
    whatsappNumber.replace(/[^0-9]/g, ""),
    generateProductWhatsAppMessage(product.name, `${typeof window !== "undefined" ? window.location.origin : ""}/products/${product.slug}`)
  );

  return (
    <div className="animate-fade-in">
      {/* Back header */}
      <div className="container-shop pt-3 pb-1 flex items-center justify-between">
        <Link href="/shop" className="p-1 hover:bg-surface-muted rounded-lg transition-colors">
          <ChevronLeft size={22} />
        </Link>
        <div className="flex items-center gap-2">
          <button className="p-1 hover:bg-surface-muted rounded-lg transition-colors">
            <Share2 size={20} />
          </button>
          <button
            onClick={() => {
              toggleWishlist({
                id: product.id, productId: product.id, name: product.name,
                slug: product.slug, price: Number(originalPrice),
                salePrice: product.salePrice ? Number(product.salePrice) : undefined,
                image: images[0]?.url,
              });
              toast.success(isInWishlist(product.id) ? "Removed from wishlist" : "Added to wishlist");
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

      {/* Main image + product info: stacked on mobile; from lg up the gallery
          sticks on the left while details scroll on the right — previously a
          single mobile column stretched the square gallery ~1200px tall. */}
      <div className="container-shop lg:grid lg:grid-cols-[1.05fr_1fr] lg:gap-12 lg:items-start">
        <div className="lg:sticky lg:top-24">
        <div className="relative aspect-square bg-white rounded-2xl overflow-hidden group">
          {/* Scrollable track */}
          <div
            ref={scrollRef}
            className="w-full h-full flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            onScroll={(e) => {
              if (isProgrammaticScroll.current) return;
              const container = e.currentTarget;
              const index = Math.round(container.scrollLeft / container.clientWidth);
              if (index !== selectedImageIndex && index >= 0 && index < images.length) {
                setSelectedImageIndex(index);
              }
            }}
          >
            {images.map((image: any, i: number) => (
              <div key={i} className="min-w-full h-full relative snap-center shrink-0">
                <GalleryImage
                  image={image}
                  productId={product.id}
                  productName={product.name}
                  priority={i === 0}
                />
              </div>
            ))}
          </div>
          {images.length > 1 && (
            <>
              <button
                onClick={() => handleScrollToImage(selectedImageIndex > 0 ? selectedImageIndex - 1 : images.length - 1)}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 backdrop-blur-sm shadow-md rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => handleScrollToImage(selectedImageIndex < images.length - 1 ? selectedImageIndex + 1 : 0)}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 backdrop-blur-sm shadow-md rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ChevronRight size={16} />
              </button>
            </>
          )}
        </div>
        {/* Image dots (mobile) + thumbnail rail (desktop) */}
        {images.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 mt-3 lg:hidden">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => handleScrollToImage(i)}
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
        {images.length > 1 && (
          <div className="hidden lg:grid grid-cols-6 gap-2.5 mt-4">
            {images.map((image, i) => (
              <button
                key={i}
                onClick={() => handleScrollToImage(i)}
                aria-label={`View image ${i + 1}`}
                className={cn(
                  "relative aspect-square rounded-xl overflow-hidden border-2 bg-white transition-all",
                  i === selectedImageIndex
                    ? "border-primary"
                    : "border-transparent opacity-70 hover:opacity-100"
                )}
              >
                <Image src={image.url} alt="" fill className="object-cover" sizes="90px" />
              </button>
            ))}
          </div>
        )}
        </div>

      {/* Product Info */}
      <div className="mt-4 lg:mt-0">
        <h1 className="text-xl lg:text-3xl font-semibold text-primary leading-tight">{product.name}</h1>
        <PriceDisplay regularPrice={selectedVariant ? Number(selectedVariant.price) : product.regularPrice} salePrice={selectedVariant ? (selectedVariant.salePrice ? Number(selectedVariant.salePrice) : null) : product.salePrice} size="lg" className="mt-1" />

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
          <p className="text-sm text-secondary leading-relaxed mt-3">
            {product.shortDescription}
          </p>
        )}

        {/* Variant / Size Selector */}
        {Object.keys(attributeGroups).length > 0 && (
          <div className="mt-5 space-y-4">
            {Object.entries(attributeGroups).map(([attrName, values]) => (
              <div key={attrName}>
                <p className="text-sm font-medium text-primary mb-2.5">
                  {attrName}:
                  <span className="font-normal text-secondary ml-1">
                    {selectedAttributes[attrName] || values[0]}
                  </span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {(() => {
                    const availableValues = getAvailableValues(attrName);
                    return values.map((value) => {
                    const isSelected = selectedAttributes[attrName] === value;
                    const isAvailable = availableValues.includes(value);
                    return (
                      <button
                        key={value}
                        onClick={() => handleAttributeSelect(attrName, value)}
                        disabled={!isAvailable}
                        className={cn(
                          "px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all duration-200",
                          isSelected
                            ? "border-primary bg-primary text-white shadow-sm"
                            : isAvailable
                              ? "border-border bg-white text-primary hover:border-primary/50"
                              : "border-border bg-surface-muted text-text-muted cursor-not-allowed line-through"
                        )}
                      >
                        {value}
                      </button>                      );
                    });
                  })()}</div>
              </div>
            ))}
          </div>
        )}

        {/* Quantity */}
        <div className="flex items-center gap-4 mt-5">
          <div className="flex items-center border border-border rounded-[1.35rem] overflow-hidden">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-10 h-10 flex items-center justify-center hover:bg-surface-muted transition-colors"
            >
              <Minus size={16} />
            </button>
            <span className="w-12 text-center text-sm font-semibold">{quantity}</span>
            <button
              onClick={() => setQuantity((q) => Math.min(selectedVariant?.stockQuantity ?? 10, q + 1))}
              className="w-10 h-10 flex items-center justify-center hover:bg-surface-muted transition-colors"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* Add to Cart */}
        <button
          onClick={handleAddToCart}
          disabled={!inStock}
          className={cn(
            "w-full py-3.5 rounded-2xl text-sm font-semibold transition-all duration-200 mt-5",
            inStock
              ? "bg-primary text-white hover:bg-primary-hover active:scale-[0.98]"
              : "bg-surface-muted text-text-muted cursor-not-allowed"
          )}
        >
          {inStock ? `Add to Cart${selectedVariant ? ` - ${selectedVariant.name}` : ""}` : "Out of Stock"}
        </button>

        {/* Buy Now: adds to cart and jumps straight to the payment step */}
        <button
          onClick={() => {
            if (!inStock) return;
            handleAddToCart();
            trackEvent("BUY_NOW", { productId: product.id, productName: product.name });
            router.push("/checkout?express=1");
          }}
          disabled={!inStock}
          className={cn(
            "w-full py-3.5 rounded-2xl text-sm font-semibold transition-all duration-200 mt-3 flex items-center justify-center gap-2",
            inStock
              ? "bg-accent text-white hover:opacity-90 active:scale-[0.98]"
              : "bg-surface-muted text-text-muted cursor-not-allowed"
          )}
        >
          <Zap size={16} />
          {inStock ? "Buy Now" : "Out of Stock"}
        </button>

        {/*           Enquire on WhatsApp */}
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackEvent("WHATSAPP_ENQUIRY", { productId: product.id, productName: product.name })}
          className="w-full py-3.5 rounded-2xl text-sm font-semibold border-2 border-primary text-primary hover:bg-primary hover:text-white transition-all duration-200 text-center flex items-center justify-center gap-2 mt-3"
        >
          <MessageCircle size={18} />
                    Enquire on WhatsApp
        </a>

        {/* Accordion sections */}
        <div className="mt-6 border-t border-border">
          {/* Size chart: per-size dimensions from the supplier catalogue, for
              products in the woven-basket families. Opens by default so the
              buyer sees concrete H × W before choosing a size. */}
          {sizeChart && (
            <div className="border-b border-border">
              <button
                onClick={() => setOpenAccordion(openAccordion === "sizechart" ? null : "sizechart")}
                className="w-full flex items-center justify-between py-4 text-sm font-medium text-primary"
              >
                Size &amp; Dimensions
                <ChevronDown
                  size={16}
                  className={cn("transition-transform", openAccordion === "sizechart" && "rotate-180")}
                />
              </button>
              <div
                className={cn(
                  "overflow-hidden transition-all duration-300",
                  openAccordion === "sizechart" ? "max-h-96 pb-4" : "max-h-0"
                )}
              >
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-text-muted">
                      <th className="py-1.5 pr-2 font-medium">Size</th>
                      <th className="py-1.5 pr-2 font-medium">H × W (cm)</th>
                      <th className="py-1.5 font-medium text-right">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sizeChart.rows.map((row) => (
                      <tr
                        key={row.sku}
                        className={cn(
                          "border-t border-border/60",
                          selectedVariant?.name === row.size && "font-semibold text-primary"
                        )}
                      >
                        <td className="py-1.5 pr-2">{row.size}</td>
                        <td className="py-1.5 pr-2 tabular-nums">{row.dims}</td>
                        <td className="py-1.5 text-right tabular-nums">{formatPrice(row.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-2 text-xs text-text-muted">
                  Handwoven — each piece may vary by 1–2 cm.
                </p>
              </div>
            </div>
          )}
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
                What&apos;s in the Box
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
                .map((img: any) => ({
                  ...img,
                  url: resolveProductImage(product.category?.slug, img.url, product.slug) || img.url,
                }))
                .map((img: any) => (
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
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
              {initialRelated.map((p) => (
                <ProductCard key={p.id} product={p} size="compact" />
              ))}
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
