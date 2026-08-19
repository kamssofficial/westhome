"use client";

import { useState, useEffect, use } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Heart, ShoppingBag, Minus, Plus, Share2, MessageCircle,
  ChevronLeft, ChevronRight, Star, Truck, Shield, RotateCcw,
  Copy, ExternalLink, Check,
} from "lucide-react";
import Button from "@/components/ui/Button";
import ProductCard from "@/components/ui/ProductCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn, formatPrice, calculateDiscount, getWhatsAppUrl, generateProductWhatsAppMessage } from "@/lib/utils";
import { useCartStore } from "@/store/cart";
import { useWishlistStore } from "@/store/wishlist";
import { useRecentlyViewedStore } from "@/store/recently-viewed";
import toast from "react-hot-toast";
import type { Product, ProductVariant, ProductImage } from "@/types";

export default function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [customWidth, setCustomWidth] = useState("");
  const [customLength, setCustomLength] = useState("");
  const [activeTab, setActiveTab] = useState<"description" | "specifications" | "reviews">("description");
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [imageZoomed, setImageZoomed] = useState(false);

  const addToCart = useCartStore((s) => s.addItem);
  const cartItem = useCartStore((s) => s.getItem);
  const toggleWishlist = useWishlistStore((s) => s.toggleItem);
  const isInWishlist = useWishlistStore((s) => s.isInWishlist);
  const addRecentlyViewed = useRecentlyViewedStore((s) => s.addProduct);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await fetch(`/api/products/${slug}`);
        if (res.ok) {
          const data = await res.json();
          setProduct(data.product);
          if (data.product) {
            addRecentlyViewed({
              id: data.product.id,
              name: data.product.name,
              slug: data.product.slug,
              price: Number(data.product.regularPrice),
              salePrice: data.product.salePrice ? Number(data.product.salePrice) : undefined,
              image: data.product.images?.[0]?.url,
            });
          }
        }
      } catch (err) {
        console.error("Failed to fetch product:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [slug]);

  useEffect(() => {
    if (product && product.variants?.length > 0 && !selectedVariant) {
      setSelectedVariant(product.variants[0]);
    }
  }, [product, selectedVariant]);

  if (loading) {
    return (
      <div className="container-shop py-6 md:py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
          <Skeleton className="aspect-square rounded-xl" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container-shop py-20 text-center">
        <h2 className="text-xl font-semibold mb-2">Product not found</h2>
        <p className="text-text-secondary mb-4">This product may have been removed or is no longer available.</p>
        <Link href="/shop">
          <Button>Browse Shop</Button>
        </Link>
      </div>
    );
  }

  const images = selectedVariant?.images?.length
    ? selectedVariant.images
    : product.images;

  const currentPrice = selectedVariant
    ? Number(selectedVariant.salePrice || selectedVariant.price)
    : Number(product.salePrice || product.regularPrice);
  const originalPrice = selectedVariant
    ? Number(selectedVariant.price)
    : Number(product.regularPrice);
  const discount = calculateDiscount(originalPrice, currentPrice);
  const inStock = product.trackInventory
    ? (selectedVariant ? selectedVariant.stockQuantity > 0 : product.stockQuantity > 0)
    : true;
  const maxStock = selectedVariant ? selectedVariant.stockQuantity : product.stockQuantity;

  const handleAddToCart = () => {
    const variantId = selectedVariant?.id;
    const existingItem = cartItem(product.id, variantId);

    addToCart({
      id: existingItem?.id || `${product.id}-${variantId || "default"}`,
      productId: product.id,
      variantId,
      name: product.name,
      variantName: selectedVariant?.name,
      price: currentPrice,
      salePrice: product.salePrice ? Number(product.salePrice) : undefined,
      quantity,
      image: images?.[0]?.url,
      maxStock,
    });
    toast.success("Added to cart");
  };

  const handleBuyNow = () => {
    handleAddToCart();
    router.push("/cart");
  };

  const handleWhatsApp = () => {
    const url = window.location.href;
    const customSizeText =
      product.allowCustomSize && customWidth && customLength
        ? `${customWidth} × ${customLength} ${product.customSizeUnit || "cm"}`
        : undefined;

    const message = generateProductWhatsAppMessage(
      product.name,
      url,
      selectedVariant?.name,
      undefined,
      customSizeText
    );

    const whatsappUrl = getWhatsAppUrl(
      process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "+919895071144",
      message
    );
    window.open(whatsappUrl, "_blank");
  };

  const handleShare = async (method: "copy" | "whatsapp") => {
    if (method === "copy") {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied!");
    } else if (method === "whatsapp") {
      const message = `Check out this product: ${product.name} - ${window.location.href}`;
      window.open(getWhatsAppUrl(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "+919895071144", message), "_blank");
    }
    setShareMenuOpen(false);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: product.name, url: window.location.href });
    }
  };

  return (
    <div className="container-shop py-4 md:py-8 animate-fade-in">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-text-muted mb-4 md:mb-6 overflow-x-auto scrollbar-hide">
        <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
        <ChevronRight size={12} />
        <Link href="/shop" className="hover:text-foreground transition-colors">Shop</Link>
        <ChevronRight size={12} />
        <Link
          href={`/collections/${product.category?.slug}`}
          className="hover:text-foreground transition-colors whitespace-nowrap"
        >
          {product.category?.name}
        </Link>
        <ChevronRight size={12} />
        <span className="text-foreground truncate">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
        {/* Image Gallery */}
        <div className="space-y-3">
          {/* Main image */}
          <div
            className="relative aspect-product bg-surface-muted rounded-xl overflow-hidden cursor-zoom-in"
            onClick={() => setImageZoomed(!imageZoomed)}
          >
            {images?.[selectedImageIndex] ? (
              <Image
                src={images[selectedImageIndex].url}
                alt={images[selectedImageIndex].alt || product.name}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className={cn(
                  "object-cover transition-transform duration-300",
                  imageZoomed && "scale-150"
                )}
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-text-muted">
                No Image
              </div>
            )}
            {discount > 0 && (
              <span className="absolute top-3 left-3 px-2.5 py-1 bg-error text-white text-xs font-semibold rounded">
                -{discount}%
              </span>
            )}
          </div>

          {/* Thumbnails */}
          {images && images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {images.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => { setSelectedImageIndex(i); setImageZoomed(false); }}
                  className={cn(
                    "flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden border-2 transition-colors",
                    i === selectedImageIndex ? "border-foreground" : "border-transparent hover:border-border"
                  )}
                >
                  <Image src={img.url} alt={img.alt || ""} width={80} height={80} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-4 md:space-y-5">
          {/* Category badge */}
          <p className="text-xs text-text-muted uppercase tracking-wider">
            {product.category?.name}
          </p>

          {/* Name */}
          <h1 className="text-xl md:text-2xl lg:text-3xl font-serif text-foreground leading-tight">
            {product.name}
          </h1>

          {/* Rating placeholder */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} size={14} className="text-accent fill-accent" />
              ))}
            </div>
            <span className="text-xs text-text-muted">(0 reviews)</span>
          </div>

          {/* Price */}
          <div className="flex items-center gap-3">
            <span className="text-2xl md:text-3xl font-semibold text-foreground">
              {formatPrice(currentPrice)}
            </span>
            {discount > 0 && (
              <span className="text-lg text-text-muted line-through">
                {formatPrice(originalPrice)}
              </span>
            )}
          </div>

          {/* Availability */}
          <div className="flex items-center gap-2">
            <div className={cn("w-2 h-2 rounded-full", inStock ? "bg-success" : "bg-error")} />
            <span className={cn("text-sm font-medium", inStock ? "text-success" : "text-error")}>
              {inStock ? "In Stock" : "Out of Stock"}
            </span>
            {!inStock && product.allowBackorder && (
              <span className="text-sm text-text-muted">— Available for backorder</span>
            )}
          </div>

          {/* Variant selectors */}
          {product.variants && product.variants.length > 0 && (
            <div className="space-y-4">
              {/* Group variants by attribute */}
              {(() => {
                const attributes = product.variants.reduce<Record<string, string[]>>((acc, v) => {
                  v.attributes?.forEach((attr) => {
                    if (!acc[attr.attributeName]) acc[attr.attributeName] = [];
                    if (!acc[attr.attributeName].includes(attr.value)) {
                      acc[attr.attributeName].push(attr.value);
                    }
                  });
                  return acc;
                }, {});

                return Object.entries(attributes).map(([attrName, values]) => (
                  <div key={attrName}>
                    <p className="text-sm font-medium mb-2">
                      {attrName}: <span className="text-text-secondary">{selectedVariant?.attributes?.find(a => a.attributeName === attrName)?.value || "Select"}</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {values.map((val) => {
                        const isActive = selectedVariant?.attributes?.some(
                          (a) => a.attributeName === attrName && a.value === val
                        );
                        const matchingVariant = product.variants.find((v) =>
                          v.attributes?.some((a) => a.attributeName === attrName && a.value === val)
                        );
                        const variantInStock = matchingVariant
                          ? !product.trackInventory || matchingVariant.stockQuantity > 0
                          : true;

                        return (
                          <button
                            key={val}
                            onClick={() => {
                              if (matchingVariant) {
                                setSelectedVariant(matchingVariant);
                                setSelectedImageIndex(0);
                              }
                            }}
                            disabled={!variantInStock}
                            className={cn(
                              "px-4 py-2 rounded-lg border text-sm font-medium transition-all",
                              isActive
                                ? "border-foreground bg-foreground text-white"
                                : variantInStock
                                  ? "border-border hover:border-foreground"
                                  : "border-border text-text-muted line-through cursor-not-allowed"
                            )}
                          >
                            {val}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}

          {/* Custom size */}
          {product.allowCustomSize && (
            <div className="p-4 bg-surface-muted rounded-xl">
              <p className="text-sm font-medium mb-3">Custom Size ({product.customSizeUnit || "cm"})</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-text-muted mb-1 block">Width</label>
                  <input
                    type="number"
                    value={customWidth}
                    onChange={(e) => setCustomWidth(e.target.value)}
                    placeholder={`Min: ${product.customSizeMinWidth || 0}`}
                    className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>
                <div>
                  <label className="text-xs text-text-muted mb-1 block">Length</label>
                  <input
                    type="number"
                    value={customLength}
                    onChange={(e) => setCustomLength(e.target.value)}
                    placeholder={`Max: ${product.customSizeMaxLength || 999}`}
                    className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>
              </div>
              {product.customSizeRequiresApproval && (
                <p className="text-xs text-text-muted mt-2">
                  Custom sizes require approval. We&apos;ll confirm availability via WhatsApp.
                </p>
              )}
            </div>
          )}

          {/* Quantity */}
          <div>
            <p className="text-sm font-medium mb-2">Quantity</p>
            <div className="flex items-center gap-3">
              <div className="flex items-center border border-border rounded-lg">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-10 h-10 flex items-center justify-center hover:bg-surface-muted transition-colors rounded-l-lg"
                >
                  <Minus size={16} />
                </button>
                <span className="w-12 text-center text-sm font-medium">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => Math.min(maxStock, q + 1))}
                  className="w-10 h-10 flex items-center justify-center hover:bg-surface-muted transition-colors rounded-r-lg"
                >
                  <Plus size={16} />
                </button>
              </div>
              {maxStock <= 10 && inStock && (
                <span className="text-xs text-warning">Only {maxStock} left</span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-3">
            {(product.purchaseMethod === "BUY_ONLINE" || product.purchaseMethod === "BOTH") && inStock && (
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  size="lg"
                  onClick={handleAddToCart}
                  disabled={!inStock}
                >
                  <ShoppingBag size={18} />
                  Add to Cart
                </Button>
                <Button
                  variant="accent"
                  className="flex-1"
                  size="lg"
                  onClick={handleBuyNow}
                  disabled={!inStock}
                >
                  Buy Now
                </Button>
              </div>
            )}

            {(product.purchaseMethod === "WHATSAPP" || product.purchaseMethod === "BOTH") && (
              <Button
                variant="outline"
                fullWidth
                size="lg"
                onClick={handleWhatsApp}
                className="border-[#25D366] text-[#25D366] hover:bg-[#25D366]/10"
              >
                <MessageCircle size={18} />
                Enquire on WhatsApp
              </Button>
            )}

            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="md"
                onClick={() => {
                  toggleWishlist({
                    id: product.id,
                    productId: product.id,
                    name: product.name,
                    slug: product.slug,
                    price: Number(product.regularPrice),
                    salePrice: product.salePrice ? Number(product.salePrice) : undefined,
                    image: images?.[0]?.url,
                  });
                  toast.success(isInWishlist(product.id) ? "Removed from wishlist" : "Added to wishlist");
                }}
              >
                <Heart
                  size={16}
                  fill={isInWishlist(product.id) ? "currentColor" : "none"}
                  className={isInWishlist(product.id) ? "text-error" : ""}
                />
                {isInWishlist(product.id) ? "In Wishlist" : "Wishlist"}
              </Button>

              {/* Share */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="md"
                  onClick={() => {
                    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
                      handleNativeShare();
                    } else {
                      setShareMenuOpen(!shareMenuOpen);
                    }
                  }}
                >
                  <Share2 size={16} />
                  Share
                </Button>
                {shareMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShareMenuOpen(false)} />
                    <div className="absolute bottom-full mb-2 left-0 bg-white border border-border rounded-lg shadow-dropdown z-20 py-1 min-w-[160px]">
                      <button
                        onClick={() => handleShare("copy")}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-surface-muted transition-colors"
                      >
                        <Copy size={14} />
                        Copy Link
                      </button>
                      <button
                        onClick={() => handleShare("whatsapp")}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-surface-muted transition-colors"
                      >
                        <MessageCircle size={14} />
                        WhatsApp
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Trust signals */}
          <div className="flex items-center gap-4 pt-3 border-t border-border-light">
            <div className="flex items-center gap-1.5 text-xs text-text-muted">
              <Truck size={14} />
              <span>Fast Delivery</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-text-muted">
              <Shield size={14} />
              <span>Quality Assured</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-text-muted">
              <RotateCcw size={14} />
              <span>Easy Returns</span>
            </div>
          </div>
        </div>
      </div>

      {/* Product Details Tabs */}
      <div className="mt-10 md:mt-14">
        <div className="flex border-b border-border-light">
          {(["description", "specifications", "reviews"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 md:px-6 py-3 text-sm font-medium capitalize transition-colors relative",
                activeTab === tab
                  ? "text-foreground"
                  : "text-text-muted hover:text-foreground"
              )}
            >
              {tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground" />
              )}
            </button>
          ))}
        </div>

        <div className="py-6">
          {activeTab === "description" && (
            <div className="prose prose-sm max-w-none text-text-secondary leading-relaxed">
              {product.description ? (
                <div dangerouslySetInnerHTML={{ __html: product.description }} />
              ) : (
                <p>{product.shortDescription || "No description available for this product."}</p>
              )}
            </div>
          )}

          {activeTab === "specifications" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {product.sku && (
                <div className="flex justify-between py-2 border-b border-border-light text-sm">
                  <span className="text-text-muted">SKU</span>
                  <span className="font-medium">{product.sku}</span>
                </div>
              )}
              {product.category && (
                <div className="flex justify-between py-2 border-b border-border-light text-sm">
                  <span className="text-text-muted">Category</span>
                  <span className="font-medium">{product.category.name}</span>
                </div>
              )}
              {product.subcategory && (
                <div className="flex justify-between py-2 border-b border-border-light text-sm">
                  <span className="text-text-muted">Subcategory</span>
                  <span className="font-medium">{product.subcategory.name}</span>
                </div>
              )}
            </div>
          )}

          {activeTab === "reviews" && (
            <div className="text-center py-8">
              <p className="text-text-muted text-sm">
                No reviews yet. Be the first to review this product.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div className="mt-10 md:mt-14">
          <h2 className="text-xl font-serif mb-6">You May Also Like</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {relatedProducts.slice(0, 4).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
