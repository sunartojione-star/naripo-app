"use client";

import { useState, useEffect } from "react";
import { Barang } from "@/components/ProductCard";

export interface CartItem {
  product: Barang;
  qty: number;
}

export function useCart() {
  const [cart, setCart] = useState<CartItem[]>([]);

  // Load keranjang dari localStorage saat pertama kali dipasang
  useEffect(() => {
    const loadCart = () => {
      const savedCart = localStorage.getItem("cart_items");
      if (savedCart) {
        try {
          setCart(JSON.parse(savedCart));
        } catch (e) {
          console.error("Gagal parse cart dari localStorage", e);
        }
      }
    };

    loadCart();

    // Listener untuk sinkronisasi antar komponen
    const handleCartUpdate = () => loadCart();
    window.addEventListener("cartUpdated", handleCartUpdate);

    return () => {
      window.removeEventListener("cartUpdated", handleCartUpdate);
    };
  }, []);

  // Fungsi menyimpan keranjang ke localStorage & trigger event
  const saveCart = (newCart: CartItem[]) => {
    setCart(newCart);
    localStorage.setItem("cart_items", JSON.stringify(newCart));
    window.dispatchEvent(new Event("cartUpdated"));
  };

  // Tambah produk ke keranjang
  const addToCart = (product: Barang, quantity: number = 1) => {
    const existingIndex = cart.findIndex(
      (item) => item.product.kd_br === product.kd_br,
    );

    let updatedCart = [...cart];
    if (existingIndex > -1) {
      updatedCart[existingIndex].qty += quantity;
    } else {
      updatedCart.push({ product, qty: quantity });
    }

    saveCart(updatedCart);
  };

  // Hapus produk dari keranjang
  const removeFromCart = (kd_br: string) => {
    const updatedCart = cart.filter((item) => item.product.kd_br !== kd_br);
    saveCart(updatedCart);
  };

  // Ubah jumlah produk
  const updateQty = (kd_br: string, qty: number) => {
    if (qty <= 0) {
      removeFromCart(kd_br);
      return;
    }
    const updatedCart = cart.map((item) =>
      item.product.kd_br === kd_br ? { ...item, qty } : item,
    );
    saveCart(updatedCart);
  };

  // Total item di keranjang
  const totalItems = cart.reduce((acc, item) => acc + item.qty, 0);

  return {
    cart,
    addToCart,
    removeFromCart,
    updateQty,
    totalItems,
  };
}
