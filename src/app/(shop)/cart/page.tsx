"use client";

import Link from "next/link";
import Image from "next/image";
import { Minus, Plus, Trash2, ArrowLeft, ShoppingBag } from "lucide-react";
import { useCartStore } from "@/store/cart";
import { formatPrice } from "@/lib/utils";

export default function CartPage() {
  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const getSubtotal = useCartStore((s) => s.getSubtotal);
  const getTotal = useCartStore((s) => s.getTotal);

  const subtotal = getSubtotal();
  const deliveryCharge = subtotal > 999 ? 0 : 149;
  const total = subtotal + deliveryCharge;

  if (items.length === 0) {
    return (
      <div className="animate-fade-in px-4 py-20 text-center">
        <ShoppingBag size={48} className="mx-auto text-text-muted/30 mb-4" />
        <h2 className="text-lg font-semibold text-primary mb-1">My Cart</h2>
        <p className="text-sm text-secondary mb-6">Your cart is empty</p>
        <Link
          href="/shop"
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-full text-sm font-medium"
        >
          Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="px-4 pt-3 pb-2 flex items-center gap-3">
        <Link href="/shop" className="p-1 hover:bg-surface-muted rounded-lg transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-semibold text-primary">My Cart</h1>
      </div>

      {/* Items count */}
      <div className="px-4 pb-3">
        <p className="text-sm text-secondary">{items.length} Items</p>
      </div>

      {/* Cart items */}
      <div className="px-4 space-y-3">
        {items.map((item) => (
          <div key={item.id} className="flex gap-3 bg-white rounded-xl p-3 shadow-sm">
            {/* Image */}
            <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-surface-muted">
              {item.image ? (
                <Image src={item.image} alt={item.name} fill className="object-cover" sizes="80px" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-text-muted text-xs">
                  {item.name.slice(0, 2)}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-primary truncate">{item.name}</h3>
              {item.variantName && (
                <p className="text-xs text-secondary mt-0.5">{item.variantName}</p>
              )}
              <p className="text-sm font-semibold text-primary mt-1">
                {formatPrice(item.salePrice || item.price)}
              </p>

              {/* Quantity controls */}
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center border border-border rounded-lg overflow-hidden">
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="w-7 h-7 flex items-center justify-center hover:bg-surface-muted transition-colors"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="w-8 text-center text-xs font-semibold">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="w-7 h-7 flex items-center justify-center hover:bg-surface-muted transition-colors"
                  >
                    <Plus size={12} />
                  </button>
                </div>
                <button
                  onClick={() => removeItem(item.id)}
                  className="p-1.5 text-text-muted hover:text-error transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Order Summary */}
      <div className="px-4 mt-6 pb-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-primary mb-3">Order Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-secondary">Subtotal ({items.length} items)</span>
              <span className="font-medium">{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary">Delivery Charges</span>
              <span className="font-medium">{deliveryCharge === 0 ? "Free" : formatPrice(deliveryCharge)}</span>
            </div>
            <div className="border-t border-border pt-2 flex justify-between">
              <span className="font-semibold text-primary">Total</span>
              <span className="font-bold text-primary">{formatPrice(total)}</span>
            </div>
          </div>
          <p className="text-[10px] text-text-muted mt-1">(Inclusive of all taxes)</p>
        </div>
      </div>

      {/* CTA */}
      <div className="px-4 pb-6">
        <Link
          href="/checkout"
          className="block w-full py-3.5 bg-primary text-white rounded-2xl text-sm font-semibold text-center hover:bg-primary-hover transition-colors"
        >
          Proceed to Checkout →
        </Link>
        <Link
          href="/shop"
          className="block w-full py-3 text-sm font-medium text-secondary text-center mt-2 hover:text-primary transition-colors"
        >
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
