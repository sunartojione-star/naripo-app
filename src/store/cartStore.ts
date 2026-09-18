import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useCartStore = create()(
  persist(
    (set, get): any => ({
      items: [],

      // Tambah produk ke keranjang
      addToCart: (product: any, quantity = 1) => {
        const currentItems = get().items || [];
        const productId = product.kd_br || product.id;

        const existingIndex = currentItems.findIndex((item: any) => {
          const itemId =
            item.product?.kd_br || item.product?.id || item.kd_br || item.id;
          return itemId === productId;
        });

        if (existingIndex > -1) {
          const updatedItems = [...currentItems];
          const currentQty =
            updatedItems[existingIndex].quantity ||
            updatedItems[existingIndex].qty ||
            1;
          updatedItems[existingIndex] = {
            ...updatedItems[existingIndex],
            quantity: currentQty + quantity,
            qty: currentQty + quantity,
          };
          set({ items: updatedItems });
        } else {
          set({
            items: [
              ...currentItems,
              {
                product,
                quantity,
                qty: quantity,
                variant: "-", // Default varian rasa '-'
              },
            ],
          });
        }
      },

      // Update Kuantitas
      updateQuantity: (id: string | number, newQty: number) => {
        const currentItems = get().items || [];
        const updatedItems = currentItems.map((item: any) => {
          const itemId =
            item.product?.kd_br || item.product?.id || item.kd_br || item.id;
          if (itemId === id) {
            return { ...item, quantity: newQty, qty: newQty };
          }
          return item;
        });
        set({ items: updatedItems });
      },

      // Update Varian Rasa
      updateVariant: (id: string | number, variant: string) => {
        const currentItems = get().items || [];
        const updatedItems = currentItems.map((item: any) => {
          const itemId =
            item.product?.kd_br || item.product?.id || item.kd_br || item.id;
          if (itemId === id) {
            return { ...item, variant: variant };
          }
          return item;
        });
        set({ items: updatedItems });
      },

      // Hapus Produk
      removeFromCart: (id: string | number) => {
        const currentItems = get().items || [];
        const updatedItems = currentItems.filter((item: any) => {
          const itemId =
            item.product?.kd_br || item.product?.id || item.kd_br || item.id;
          return itemId !== id;
        });
        set({ items: updatedItems });
      },

      getItemCount: () => {
        const items = get().items || [];
        return items.reduce(
          (acc: number, item: any) => acc + (item.quantity || item.qty || 1),
          0,
        );
      },

      clearCart: () => set({ items: [] }),
    }),
    {
      name: "cart-storage",
    },
  ),
);
