"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Heart, ShoppingCart } from "lucide-react";
import { useWishlistStore } from "@/store/wishlist";
import { useCartStore } from "@/store/cart";
import { formatPrice } from "@/lib/utils";
import toast from "react-hot-toast";

export default function WishlistPage() {
  const items = useWishlistStore((s) => s.items);
  const removeItem = useWishlistStore((s) => s.removeItem);
  const addToCart = useCartStore((s) => s.addItem);

  const handleMoveAllToCart = () => {
    items.forEach((item) => {
      addToCart({
        id: item.productId,
        productId: item.productId,
        name: item.name,
        price: item.salePrice || item.price,
        quantity: 1,
        image: item.image,
        maxStock: 10,
      });
    });
    toast.success(`${items.length} items added to cart`);
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="px-4 pt-3 pb-2 flex items-center gap-3">
        <Link href="/account" className="p-1 hover:bg-surface-muted rounded-lg transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-semibold text-primary">My Wishlist</h1>
      </div>

      {items.length === 0 ? (
        <div className="px-4 py-20 text-center">
          <Heart size={40} className="mx-auto text-text-muted/30 mb-3" />
          <p className="text-sm text-secondary mb-4">Your wishlist is empty</p>
          <Link href="/shop" className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-full text-sm font-medium">
            Browse Products
          </Link>
        </div>
      ) : (
        <>
          {/* Move All to Cart */}
          <div className="px-4 pb-3">
            <button onClick={handleMoveAllToCart} className="text-xs text-accent font-medium">Move All to Cart</button>
          </div>

          {/* Wishlist items */}
          <div className="px-4 space-y-3 pb-8">
            {items.map((item) => (
              <div key={item.id} className="flex gap-3 bg-white rounded-xl p-3 shadow-sm">
                <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-surface-muted">
                  {item.image ? (
                    <Image src={item.image} alt={item.name} fill className="object-cover" sizes="80px" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-text-muted text-xs">
                      {item.name.slice(0, 2)}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-primary truncate">{item.name}</h3>
                  <p className="text-sm font-semibold text-primary mt-1">
                    {formatPrice(item.salePrice || item.price)}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => {
                        addToCart({
                          id: item.productId,
                          productId: item.productId,
                          name: item.name,
                          price: item.salePrice || item.price,
                          quantity: 1,
                          image: item.image,
                          maxStock: 10,
                        });
                        toast.success("Added to cart");
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-border rounded-lg hover:bg-surface-muted transition-colors"
                    >
                      <ShoppingCart size={12} /> Add to Cart
                    </button>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-1.5 text-text-muted hover:text-error transition-colors"
                    >
                      <Heart size={14} fill="currentColor" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
