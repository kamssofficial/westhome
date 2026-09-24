import { create } from "zustand";
import { persist } from "zustand/middleware";

interface RecentProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  salePrice?: number;
  image?: string;
}

interface RecentlyViewedStore {
  items: RecentProduct[];
  addProduct: (product: RecentProduct) => void;
  clearRecent: () => void;
  getRecent: (limit?: number) => RecentProduct[];
}

const MAX_RECENT = 20;

export const useRecentlyViewedStore = create<RecentlyViewedStore>()(
  persist(
    (set, get) => ({
      items: [],

      addProduct: (product) => {
        const { items } = get();
        // Remove if already exists
        const filtered = items.filter((i) => i.id !== product.id);
        // Add to beginning and limit
        const updated = [product, ...filtered].slice(0, MAX_RECENT);
        set({ items: updated });
      },

      clearRecent: () => set({ items: [] }),

      getRecent: (limit = 10) => {
        return get().items.slice(0, limit);
      },
    }),
    {
      // See cart.ts — same hydration-mismatch mechanism, same fix.
      name: "westhome-recently-viewed",
      skipHydration: true,
    }
  )
);
