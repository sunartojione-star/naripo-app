import { useState, useEffect } from "react";

export interface BSCartItem {
  kd_bs: string;
  nama: string;
  nilai_anggota: number;
  merk: string;
  nilai_pcs: number;
  gambar?: string;
  quantity: number;
}

export const useCartBS = () => {
  const [cart, setCart] = useState<BSCartItem[]>([]);

  // Load keranjang dari localStorage saat pertama kali dimuat
  useEffect(() => {
    const savedCart = localStorage.getItem("bs_cart");
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {
        console.error("Gagal memparsing data keranjang:", e);
      }
    }
  }, []);

  // Fungsi helper untuk menyimpan dan memperbarui state + localStorage
  const saveCart = (newCart: BSCartItem[]) => {
    setCart(newCart);
    localStorage.setItem("bs_cart", JSON.stringify(newCart));
  };

  // Tambah item ke keranjang
  const addToCart = (item: Omit<BSCartItem, "quantity">, qty: number = 1) => {
    const existingIndex = cart.findIndex((i) => i.kd_bs === item.kd_bs);
    let updatedCart = [...cart];

    if (existingIndex > -1) {
      updatedCart[existingIndex].quantity += qty;
    } else {
      updatedCart.push({ ...item, quantity: qty });
    }

    saveCart(updatedCart);
  };

  // Hapus item spesifik dari keranjang
  const removeFromCart = (kd_bs: string) => {
    const updatedCart = cart.filter((i) => i.kd_bs !== kd_bs);
    saveCart(updatedCart);
  };

  // Update jumlah/quantity item
  const updateQuantity = (kd_bs: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(kd_bs);
      return;
    }
    const updatedCart = cart.map((i) =>
      i.kd_bs === kd_bs ? { ...i, quantity } : i,
    );
    saveCart(updatedCart);
  };

  // Kosongkan keranjang
  const clearCart = () => {
    saveCart([]);
  };

  // Hitung total item untuk badge ikon keranjang
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  return {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    totalItems,
  };
};
