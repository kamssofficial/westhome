"use client";

import { useEffect } from "react";
import { useCartStore } from "@/store/cart";
import { useWishlistStore } from "@/store/wishlist";
import { useRecentlyViewedStore } from "@/store/recently-viewed";

/**
 * Rehydrates the persisted client stores (cart, wishlist, recently-viewed)
 * after React has finished hydrating.
 *
 * Why this exists: those zustand `persist` stores used to rehydrate at module
 * load — i.e. during hydration — so any returning shopper with a saved cart
 * rendered a different header (cart badge count) than the server-rendered
 * HTML. React 19 treats that as a root hydration mismatch and throws #418,
 * discarding the entire server-rendered tree and re-rendering it on the
 * client. With `skipHydration: true` on the stores, this component restores
 * the persisted state after first paint instead: no mismatch, and the badge
 * visibly fills in a frame later.
 */
export default function StoreHydrator() {
  useEffect(() => {
    useCartStore.persist.rehydrate();
    useWishlistStore.persist.rehydrate();
    useRecentlyViewedStore.persist.rehydrate();
  }, []);

  return null;
}
