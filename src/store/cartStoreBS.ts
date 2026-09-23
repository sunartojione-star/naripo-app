import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItemBS {
  kd_bs: string;
  nama: string;
  nilai_anggota: number;
  merk: string;
  nilai_pcs?: number;
  gambar?: string | null;
  qty: number;
  [key: string]: any;
}

interface CartStoreBSState {
  cartItems: CartItemBS[];
  totalItems: number;
  addToCart: (product: any, quantity?: number) => void;
  removeFromCart: (kd_bs: string) => void;
  updateQty: (kd_bs: string, qty: number) => void;
  clearCart: () => void;
}

export const useCartStoreBS = create<CartStoreBSState>()(
  persist(
    (set, get) => ({
      cartItems: [],
      totalItems: 0,

      addToCart: (product, quantity = 1) => {
        const currentItems = get().cartItems;

        // Ambil kd_bs dari berbagai kemungkinan properti data produk
        const kd_bs = String(
          product.kd_bs || product.id || product.kd_br || product.kd || "",
        );

        if (!kd_bs) {
          console.error("Kode BS (kd_bs) tidak ditemukan:", product);
          return;
        }

        const existingIndex = currentItems.findIndex(
          (item) => item.kd_bs === kd_bs,
        );

        let updatedItems: CartItemBS[];

        if (existingIndex > -1) {
          updatedItems = currentItems.map((item, index) =>
            index === existingIndex
              ? { ...item, qty: item.qty + quantity }
              : item,
          );
        } else {
          const normalizedItem: CartItemBS = {
            ...product,
            kd_bs: kd_bs,
            nama:
              product.nama ||
              product.name ||
              product.keterangan ||
              "Tanpa Nama",
            nilai_anggota: Number(
              product.nilai_anggota ||
                product.h_anggota ||
                product.price ||
                product.hpp ||
                0,
            ),
            merk: product.merk || product.brand || "-",
            qty: quantity,
          };

          updatedItems = [...currentItems, normalizedItem];
        }

        const totalItems = updatedItems.reduce(
          (sum, item) => sum + item.qty,
          0,
        );

        set({ cartItems: updatedItems, totalItems });
      },

      removeFromCart: (kd_bs) => {
        const updatedItems = get().cartItems.filter(
          (item) => item.kd_bs !== kd_bs,
        );
        const totalItems = updatedItems.reduce(
          (sum, item) => sum + item.qty,
          0,
        );
        set({ cartItems: updatedItems, totalItems });
      },

      updateQty: (kd_bs, qty) => {
        if (qty <= 0) {
          get().removeFromCart(kd_bs);
          return;
        }

        const updatedItems = get().cartItems.map((item) =>
          item.kd_bs === kd_bs ? { ...item, qty } : item,
        );

        const totalItems = updatedItems.reduce(
          (sum, item) => sum + item.qty,
          0,
        );
        set({ cartItems: updatedItems, totalItems });
      },

      clearCart: () => {
        set({ cartItems: [], totalItems: 0 });
      },
    }),
    {
      name: "cart-bs-storage",
    },
  ),
);
