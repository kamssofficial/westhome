"use client";

import Link from "next/link";
import Image from "next/image";
import { Trash2, ShoppingBag, Heart } from "lucide-react";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import { useWishlistStore } from "@/store/wishlist";
import { useCartStore } from "@/store/cart";
import { formatPrice } from "@/lib/utils";
import toast from "react-hot-toast";

export default function WishlistPage() {
  const { items, removeItem } = useWishlistStore();
  const addToCart = useCartStore((s) => s.addItem);

  const handleMoveToCart = (item: typeof items[0]) => {
    addToCart({
      id: item.productId,
      productId: item.productId,
      name: item.name,
      price: item.salePrice || item.price,
      quantity: 1,
      image: item.image,
      maxStock: 100,
    });
    removeItem(item.productId);
    toast.success("Moved to cart");
  };

  if (items.length === 0) {
    return (
      <div className="container-shop py-8 md:py-16">
        <h1 className="text-xl md:text-2xl font-serif mb-6">My Wishlist</h1>
        <EmptyState
          icon="wishlist"
          title="Your wishlist is empty"
          description="Save products you love to your wishlist. Review them anytime and easily move them to your cart."
          action={{ label: "Discover Products", href: "/shop" }}
        />
      </div>
    );
  }

  return (
    <div className="container-shop py-4 md:py-8 animate-fade-in">
      <h1 className="text-xl md:text-2xl font-serif mb-6">My Wishlist ({items.length})</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        {items.map((item) => (
          <div key={item.id} className="bg-white rounded-xl border border-border-light overflow-hidden">
            <Link href={`/products/${item.slug}`} className="block">
              <div className="relative aspect-product bg-surface-muted">
                {item.image && (
                  <Image src={item.image} alt={item.name} fill sizes="(max-width: 640px) 50vw, 25vw" className="object-cover" />
                )}
              </div>
            </Link>
            <div className="p-3">
              <Link href={`/products/${item.slug}`}>
                <h3 className="text-sm font-medium line-clamp-2 mb-2 hover:text-accent transition-colors">{item.name}</h3>
              </Link>
              <p className="text-sm font-semibold mb-3">
                {formatPrice(item.salePrice || item.price)}
              </p>
              <div className="flex gap-2">
                <Button variant="primary" size="sm" className="flex-1" onClick={() => handleMoveToCart(item)}>
                  <ShoppingBag size={14} /> Move to Cart
                </Button>
                <button onClick={() => { removeItem(item.productId); toast.success("Removed from wishlist"); }} className="p-2 text-text-muted hover:text-error border border-border rounded-lg transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
