import { create } from "zustand";
import { persist } from "zustand/middleware";
import { trackEvent } from "@/components/ui/AnalyticsTracker";

interface WishlistItem {
  id: string;
  productId: string;
  name: string;
  slug: string;
  price: number;
  salePrice?: number;
  image?: string;
  addedAt: string;
}

interface WishlistStore {
  items: WishlistItem[];
  addItem: (item: Omit<WishlistItem, "addedAt">) => void;
  removeItem: (productId: string) => void;
  toggleItem: (item: Omit<WishlistItem, "addedAt">) => void;
  isInWishlist: (productId: string) => boolean;
  clearWishlist: () => void;
  getItemCount: () => number;
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        const { items } = get();
        if (items.some((i) => i.productId === item.productId)) return;
        set({ items: [...items, { ...item, addedAt: new Date().toISOString() }] });
      },

      removeItem: (productId) => {
        set({ items: get().items.filter((i) => i.productId !== productId) });
      },

      toggleItem: (item) => {
        const { items } = get();
        const exists = items.some((i) => i.productId === item.productId);
        if (exists) {
          trackEvent("WISHLIST_REMOVE", { productId: item.productId });
          set({ items: items.filter((i) => i.productId !== item.productId) });
        } else {
          trackEvent("WISHLIST_ADD", { productId: item.productId, productName: item.name });
          set({ items: [...items, { ...item, addedAt: new Date().toISOString() }] });
        }
      },

      isInWishlist: (productId) => {
        return get().items.some((i) => i.productId === productId);
      },

      clearWishlist: () => set({ items: [] }),

      getItemCount: () => get().items.length,
    }),
    {
      // See cart.ts — same hydration-mismatch mechanism, same fix.
      name: "westhome-wishlist",
      skipHydration: true,
    }
  )
);
