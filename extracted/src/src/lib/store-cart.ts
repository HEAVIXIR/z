import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/**
 * HEAVIX store — client-side cart store (Zustand + localStorage).
 *
 * Persists the customer's cart items, their phone (used to look up
 * orders + wishlist server-side), and the local wishlist mirror.
 *
 * Identical behavior to the reference project; renamed to
 * `useStoreCart` and `heavix-store-cart-v2` storage key to avoid any
 * collision with future HEAVIX client carts.
 */

/** A single line-item in the cart. Prices are snapshots taken at add-time. */
export interface CartItem {
  partId: string;
  name: string;
  nameFa: string;
  sku: string;
  image: string;
  priceUsd: number;
  priceIrr: number;
  qty: number;
  stock: number;
}

interface CartState {
  items: CartItem[];
  customerPhone: string;
  wishlistPartIds: string[];
  // cart mutations
  addItem: (item: CartItem) => void;
  removeItem: (partId: string) => void;
  setQty: (partId: string, qty: number) => void;
  clear: () => void;
  // wishlist
  setWishlist: (ids: string[]) => void;
  toggleWishlist: (partId: string) => void;
  // customer
  setCustomerPhone: (phone: string) => void;
}

/**
 * One-time migration: if a cart was saved under the legacy
 * `mekanix-store-cart-v2` key (pre-rebrand), copy it into the new
 * `heavix-store-cart-v2` key so users don't lose their cart/wishlist.
 * Runs only on the client.
 */
function migrateLegacyCartKey() {
  if (typeof window === "undefined") return;
  try {
    const legacy = window.localStorage.getItem("mekanix-store-cart-v2");
    const current = window.localStorage.getItem("heavix-store-cart-v2");
    if (legacy && !current) {
      window.localStorage.setItem("heavix-store-cart-v2", legacy);
    }
    if (legacy) {
      window.localStorage.removeItem("mekanix-store-cart-v2");
    }
  } catch {
    /* ignore — non-critical */
  }
}
migrateLegacyCartKey();

export const useStoreCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      customerPhone: "",
      wishlistPartIds: [],

      addItem: (item) => {
        const existing = get().items.find((i) => i.partId === item.partId);
        if (existing) {
          const nextQty = Math.min(existing.qty + item.qty, item.stock);
          set({
            items: get().items.map((i) =>
              i.partId === item.partId ? { ...i, qty: nextQty } : i,
            ),
          });
        } else {
          set({ items: [...get().items, { ...item, qty: Math.min(item.qty, item.stock) }] });
        }
      },

      removeItem: (partId) =>
        set({ items: get().items.filter((i) => i.partId !== partId) }),

      setQty: (partId, qty) =>
        set({
          items: get()
            .items.map((i) =>
              i.partId === partId
                ? { ...i, qty: Math.max(0, Math.min(qty, i.stock)) }
                : i,
            )
            .filter((i) => i.qty > 0),
        }),

      clear: () => set({ items: [] }),

      setWishlist: (ids) => set({ wishlistPartIds: ids }),

      toggleWishlist: (partId) => {
        const has = get().wishlistPartIds.includes(partId);
        set({
          wishlistPartIds: has
            ? get().wishlistPartIds.filter((id) => id !== partId)
            : [...get().wishlistPartIds, partId],
        });
      },

      setCustomerPhone: (phone) => set({ customerPhone: phone }),
    }),
    {
      name: "heavix-store-cart-v2",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
