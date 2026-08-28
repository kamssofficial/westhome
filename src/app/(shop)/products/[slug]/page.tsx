"use client";

import { useState, useEffect, use } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSettings } from "@/components/ui/SettingsContext";
import {
  Heart, Minus, Plus, Star, ChevronLeft, ChevronRight,
  MessageCircle, Share2, ChevronDown, ShieldCheck, Truck, Headphones, ShoppingBag,
} from "lucide-react";
import ProductCard from "@/components/ui/ProductCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn, formatPrice, calculateDiscount, getWhatsAppUrl, generateProductWhatsAppMessage } from "@/lib/utils";
import { useCartStore } from "@/store/cart";
import { useWishlistStore } from "@/store/wishlist";
import toast from "react-hot-toast";
import type { Product, ProductVariant } from "@/types";
import { useTrackPageView, trackEvent } from "@/hooks/useAnalytics";

export default function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { whatsappNumber } = useSettings();
  const { slug } = use(params);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewAvg, setReviewAvg] = useState<number | null>(null);
  const [realReviewCount, setRealReviewCount] = useState(0);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewMessage, setReviewMessage] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Track product page view
  useTrackPageView(product?.id, product?.category?.id, product?.subcategory?.id);

  const addToCart = useCartStore((s) => s.addItem);
  const toggleWishlist = useWishlistStore((s) => s.toggleItem);
  const isInWishlist = useWishlistStore((s) => s.isInWishlist);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await fetch(`/api/products/${slug}`);
        if (res.ok) {
          const data = await res.json();
          setProduct(data.product);
          if (data.product?.variants?.length) {
            setSelectedVariant(data.product.variants[0]);
          }
          if (data.product?.category?.slug) {
            const relRes = await fetch(`/api/products?category=${data.product.category.slug}&limit=4`);
            if (relRes.ok) {
              const relData = await relRes.json();
              setRelatedProducts((relData.products || []).filter((p: Product) => p.id !== data.product.id).slice(0, 4));
            }
          }
          // Fetch reviews
          const revRes = await fetch(`/api/reviews?productId=${data.product.id}`);
          if (revRes.ok) {
            const revData = await revRes.json();
            setReviews(revData.reviews || []);
            setReviewAvg(revData.avgRating);
            setRealReviewCount(revData.reviewCount);
          }
          // Check if logged in
          const sessRes = await fetch('/api/auth/session');
          if (sessRes.ok) {
            const sessData = await sessRes.json();
            setIsLoggedIn(!!sessData?.user?.id);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [slug]);

  if (loading) {
    return (
      <div className="container-shop py-6">
        <Skeleton className="aspect-square rounded-2xl mb-4" />
        <Skeleton className="h-4 w-24 mb-2" />
        <Skeleton className="h-8 w-3/4 mb-2" />
        <Skeleton className="h-6 w-20 mb-4" />
        <Skeleton className="h-12 w-full rounded-[1.35rem]" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container-shop py-20 text-center">
        <h2 className="text-xl font-semibold mb-2">Product not found</h2>
        <Link href="/shop" className="text-accent hover:underline text-sm">Browse all products</Link>
      </div>
    );
  }

  const images = product.images?.length ? product.images : [];
  const currentPrice = selectedVariant?.salePrice || selectedVariant?.price || product.salePrice || product.regularPrice;
  const originalPrice = product.regularPrice;
  const discount = calculateDiscount(originalPrice, currentPrice);
  const inStock = product.trackInventory ? (selectedVariant?.stockQuantity ?? product.stockQuantity) > 0 : true;
  const rating = reviewAvg !== null ? reviewAvg : (product.rating || 0);
  const totalReviews = realReviewCount;

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
      image: product.images?.[0]?.url,
      maxStock: selectedVariant?.stockQuantity ?? product.stockQuantity,
    });
    window.location.href = '/checkout';
  };

    const handleAddToCart = () => {
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
          <button className="p-1 hover:bg-surface-muted rounded-lg transition-colors">
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
      <div className="container-shop mt-4">
        <h1 className="text-xl font-semibold text-primary leading-tight">{product.name}</h1>
        <p className="text-xl font-bold text-primary mt-1">{formatPrice(currentPrice)}</p>

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
          onClick={() => { trackEvent("BUY_NOW", { productId: product?.id, categoryId: product?.category?.id }); handleBuyNow(); }}
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
          onClick={() => trackEvent("WHATSAPP_ENQUIRY", { productId: product?.id, categoryId: product?.category?.id })}
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
          
          {/* Fallback: Specifications placeholder when no spec data exists */}
          {!((product as any).height || (product as any).width || (product as any).length || (product as any).depth || (product as any).material || (product as any).color || (product as any).finish || (product as any).style || (product as any).careInstructions || (product as any).warranty || (product as any).includedItems) && (
            <div className="border-b border-border">
              <button
                onClick={() => setOpenAccordion(openAccordion === "specs" ? null : "specs")}
                className="w-full flex items-center justify-between py-4 text-sm font-medium text-primary"
              >
                Specifications
                <ChevronDown
                  size={16}
                  className={cn("transition-transform", openAccordion === "specs" && "rotate-180")}
                />
              </button>
              <div
                className={cn(
                  "overflow-hidden transition-all duration-300",
                  openAccordion === "specs" ? "max-h-96 pb-4" : "max-h-0"
                )}
              >
                <div className="text-center py-3">
                  <p className="text-sm text-secondary mb-2">Detailed specifications for this product are being finalized.</p>
                  <p className="text-xs text-text-muted mb-1">Need specific details? </p>
                  <a
                    href="https://wa.me/919895071144?text=Hi%2C%20I'd%20like%20to%20know%20the%20specifications%20for%20this%20product"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-accent font-medium hover:underline"
                  >Ask us on WhatsApp</a>
                </div>
              </div>
            </div>
          )}

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
        {relatedProducts.length > 0 && (
          <div className="mt-6 border-t border-border pt-6 pb-4">
            <h2 className="text-lg font-semibold text-primary mb-4">You May Also Like</h2>
            <div className="grid grid-cols-2 gap-3">
              {relatedProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
