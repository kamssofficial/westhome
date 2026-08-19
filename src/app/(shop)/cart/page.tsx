"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Minus, Plus, Trash2, ArrowRight, ShoppingBag, Tag } from "lucide-react";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import { useCartStore } from "@/store/cart";
import { formatPrice } from "@/lib/utils";
import toast from "react-hot-toast";

export default function CartPage() {
  const {
    items,
    updateQuantity,
    removeItem,
    couponCode,
    discount,
    applyCoupon,
    removeCoupon,
    getSubtotal,
    getTotal,
  } = useCartStore();

  const [couponInput, setCouponInput] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);

  const subtotal = getSubtotal();
  const deliveryCharge = subtotal >= 999 ? 0 : 49;
  const total = getTotal() + deliveryCharge;

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponLoading(true);
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponInput, subtotal }),
      });
      if (res.ok) {
        const data = await res.json();
        applyCoupon(couponInput, data.discount);
        toast.success(`Coupon applied! You save ${formatPrice(data.discount)}`);
        setCouponInput("");
      } else {
        const err = await res.json();
        toast.error(err.error || "Invalid coupon");
      }
    } catch {
      toast.error("Failed to validate coupon");
    } finally {
      setCouponLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="container-shop py-8 md:py-16">
        <EmptyState
          icon="cart"
          title="Your cart is empty"
          description="Looks like you haven't added anything to your cart yet. Start browsing our collection to find something you love."
          action={{ label: "Start Shopping", href: "/shop" }}
        />
      </div>
    );
  }

  return (
    <div className="container-shop py-4 md:py-8 animate-fade-in">
      <h1 className="text-xl md:text-2xl font-serif text-foreground mb-6">Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Cart items */}
        <div className="lg:col-span-2 space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex gap-3 md:gap-4 p-3 md:p-4 bg-white rounded-xl border border-border-light"
            >
              {/* Image */}
              <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-lg overflow-hidden bg-surface-muted flex-shrink-0">
                {item.image ? (
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-text-muted text-xs">
                    No Image
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between gap-2">
                  <div className="min-w-0">
                    <Link
                      href={`/products/${item.productId}`}
                      className="text-sm font-medium text-foreground hover:text-secondary transition-colors line-clamp-2"
                    >
                      {item.name}
                    </Link>
                    {item.variantName && (
                      <p className="text-xs text-text-muted mt-0.5">{item.variantName}</p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      removeItem(item.id);
                      toast.success("Removed from cart");
                    }}
                    className="p-1 text-text-muted hover:text-error transition-colors flex-shrink-0"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="flex items-end justify-between mt-2 md:mt-3">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center border border-border rounded-md">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-8 h-8 flex items-center justify-center hover:bg-surface-muted transition-colors"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        disabled={item.quantity >= item.maxStock}
                        className="w-8 h-8 flex items-center justify-center hover:bg-surface-muted transition-colors disabled:opacity-40"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {formatPrice((item.salePrice || item.price) * item.quantity)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Order summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-border-light p-4 md:p-5 sticky top-20">
            <h2 className="text-base font-semibold mb-4">Order Summary</h2>

            {/* Coupon */}
            <div className="mb-4">
              {couponCode ? (
                <div className="flex items-center justify-between p-2.5 bg-success/5 rounded-lg border border-success/20">
                  <div className="flex items-center gap-2">
                    <Tag size={14} className="text-success" />
                    <span className="text-sm font-medium">{couponCode}</span>
                  </div>
                  <button
                    onClick={() => {
                      removeCoupon();
                      toast.success("Coupon removed");
                    }}
                    className="text-xs text-error hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    placeholder="Coupon code"
                    className="flex-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleApplyCoupon}
                    loading={couponLoading}
                  >
                    Apply
                  </Button>
                </div>
              )}
            </div>

            {/* Summary lines */}
            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between">
                <span className="text-text-secondary">Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-success">
                  <span>Discount</span>
                  <span>-{formatPrice(discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-text-secondary">Delivery</span>
                <span>
                  {deliveryCharge === 0 ? (
                    <span className="text-success font-medium">FREE</span>
                  ) : (
                    formatPrice(deliveryCharge)
                  )}
                </span>
              </div>
              {subtotal < 999 && (
                <p className="text-xs text-text-muted">
                  Add {formatPrice(999 - subtotal)} more for free delivery
                </p>
              )}
            </div>

            <div className="border-t border-border-light pt-3 mb-4">
              <div className="flex justify-between text-base font-semibold">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>

            <Link href="/checkout">
              <Button fullWidth size="lg">
                Proceed to Checkout
                <ArrowRight size={18} />
              </Button>
            </Link>

            <Link
              href="/shop"
              className="flex items-center justify-center gap-2 mt-3 text-sm text-text-secondary hover:text-foreground transition-colors"
            >
              <ShoppingBag size={16} />
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
