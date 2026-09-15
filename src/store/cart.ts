import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, CustomSize } from "@/types";
import { trackEvent } from "@/components/ui/AnalyticsTracker";
import toast from "react-hot-toast";

interface CartStore {
  items: CartItem[];
  couponCode: string | null;
  discount: number;
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  applyCoupon: (code: string, discount: number) => void;
  removeCoupon: () => void;
  getSubtotal: () => number;
  getDiscount: () => number;
  getTotal: () => number;
  getItemCount: () => number;
  getItem: (productId: string, variantId?: string, customSize?: CustomSize) => CartItem | undefined;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      couponCode: null,
      discount: 0,

      addItem: (item) => {
        // Stock 0 is never cartable.
        if ((item.maxStock ?? 0) <= 0) {
          toast.error("This item is out of stock");
          return;
        }
        trackEvent("ADD_TO_CART", { productId: item.productId, productName: item.name });
        const { items } = get();
        const existingIndex = items.findIndex(
          (i) =>
            i.productId === item.productId &&
            i.variantId === item.variantId &&
            JSON.stringify(i.customSize) === JSON.stringify(item.customSize)
        );

        if (existingIndex >= 0) {
          const updated = [...items];
          const newQty = Math.min(
            updated[existingIndex].quantity + item.quantity,
            updated[existingIndex].maxStock
          );
          updated[existingIndex].quantity = newQty;
          set({ items: updated });
        } else {
          set({ items: [...items, item] });
        }
      },

      removeItem: (id) => {
        set({ items: get().items.filter((i) => i.id !== id) });
      },

      updateQuantity: (id, quantity) => {
        if (quantity <= 0) {
          get().removeItem(id);
          return;
        }
        const updated = get().items.map((i) =>
          i.id === id ? { ...i, quantity: Math.min(quantity, i.maxStock) } : i
        );
        set({ items: updated });
      },

      clearCart: () => set({ items: [], couponCode: null, discount: 0 }),

      applyCoupon: (code, discountAmount) => set({ couponCode: code, discount: discountAmount }),

      removeCoupon: () => set({ couponCode: null, discount: 0 }),

      getSubtotal: () => {
        return get().items.reduce((sum, item) => {
          const price = item.salePrice != null && item.salePrice > 0 ? item.salePrice : item.price;
          return sum + price * item.quantity;
        }, 0);
      },

      getDiscount: () => {
        return (get() as any).discount || 0;
      },

      getTotal: () => {
        return get().getSubtotal() - get().getDiscount();
      },

      getItemCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },

      getItem: (productId, variantId, customSize) => {
        return get().items.find(
          (i) =>
            i.productId === productId &&
            i.variantId === variantId &&
            JSON.stringify(i.customSize) === JSON.stringify(customSize)
        );
      },
    }),
    {
      name: "westhome-cart",
    }
  )
);
