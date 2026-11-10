"use client";

import React, { useState, useRef, useEffect } from "react";
import { useCartStore } from "@/store/cartStore";
import {
  FiHeart,
  FiShoppingCart,
  FiMinus,
  FiPlus,
  FiX,
  FiCheck,
} from "react-icons/fi";

export interface Barang {
  kd_br: string;
  nama: string;
  hpp?: string;
  satuan: string;
  h_anggota: string;
  barcode?: string;
  ket: string;
  kd: string;
  gambar: string | null;
}

interface ProductCardProps {
  product: Barang;
  isFavorite?: boolean;
  onToggleFavorite?: (product: Barang) => Promise<void>;
}

export default function ProductCard({
  product,
  isFavorite = false,
  onToggleFavorite,
}: ProductCardProps) {
  const [loadingFav, setLoadingFav] = useState<boolean>(false);
  const [showQtyModal, setShowQtyModal] = useState<boolean>(false);
  const [orderQty, setOrderQty] = useState<number>(1);
  const qtyInputRef = useRef<HTMLInputElement>(null);

  const addToCart = useCartStore(
    (state: any) => state.addToCart || state.addItem
  );

  const price = parseFloat(product.h_anggota) || 0;

  // Pembersih URL gambar aman
  const getSafeImageSrc = (img: string | null | undefined) => {
    if (!img) return null;
    if (img.includes("/uploads/")) {
      const fileName = img.split("/uploads/").pop();
      return `/uploads/${fileName}`;
    }
    if (img.includes("/images/")) {
      const fileName = img.split("/images/").pop();
      return `/images/${fileName}`;
    }
    return `/uploads/${img}`;
  };

  const imageSrc = getSafeImageSrc(product.gambar);

  // Fokus input bersih di HP tanpa memunculkan pin gelembung seleksi biru
  useEffect(() => {
    if (showQtyModal) {
      setTimeout(() => {
        if (qtyInputRef.current) {
          qtyInputRef.current.focus();
        }
      }, 150);
    }
  }, [showQtyModal]);

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (loadingFav) return;
    setLoadingFav(true);
    if (onToggleFavorite) {
      await onToggleFavorite(product);
    }
    setLoadingFav(false);
  };

  const handleOpenQtyModal = (e: React.MouseEvent) => {
    e.preventDefault();
    setOrderQty(1);
    setShowQtyModal(true);
  };

  const handleConfirmAddToCart = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const finalQty = Math.max(1, orderQty || 1);
    if (addToCart) {
      addToCart(product, finalQty);
    }
    setShowQtyModal(false);
  };

  return (
    <>
      <div className="w-full bg-white rounded-xl border border-gray-100 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between overflow-hidden p-2.5">
        {/* Gambar Produk */}
        <div className="relative w-full aspect-square bg-gray-50 rounded-lg overflow-hidden flex items-center justify-center mb-2">
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={product.nama}
              className="w-full h-full object-contain p-1"
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLElement).style.display = "none";
              }}
            />
          ) : (
            <span className="text-[11px] text-gray-400 font-medium">Tanpa Gambar</span>
          )}

          {onToggleFavorite && (
            <button
              onClick={handleFavoriteClick}
              disabled={loadingFav}
              className="absolute top-1.5 right-1.5 p-1 rounded-full bg-white/80 backdrop-blur-sm text-gray-400 hover:text-red-500 transition-colors shadow-xs"
            >
              <FiHeart
                className={`w-3.5 h-3.5 ${
                  isFavorite ? "fill-red-500 text-red-500" : ""
                }`}
              />
            </button>
          )}
        </div>

        {/* Konten Produk */}
        <div className="flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1 mb-1">
              <span className="text-[9px] font-semibold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                KD: {product.kd || "-"}
              </span>
              <span className="text-[9px] font-semibold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded uppercase">
                {product.satuan || "DUS"}
              </span>
            </div>

            <h3
              className="text-xs font-semibold text-gray-800 line-clamp-2 leading-snug mb-1"
              title={product.nama}
            >
              {product.nama}
            </h3>

            {product.ket && (
              <span
                className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded mb-1.5 ${
                  product.ket.trim().toUpperCase() === "BARU"
                    ? "text-amber-600 bg-amber-50"
                    : product.ket.trim().toUpperCase() === "NAIK"
                    ? "text-red-600 bg-red-50"
                    : "text-gray-600 bg-gray-50"
                }`}
              >
                ✨ {product.ket}
              </span>
            )}
          </div>

          {/* Baris Harga & Tombol Keranjang */}
          <div className="mt-2 pt-2 border-t border-gray-50">
            <span className="text-[10px] text-gray-400 block -mb-0.5">Harga Anggota</span>
            <div className="flex items-center justify-between gap-1 mt-0.5">
              <span className="text-xs sm:text-sm font-extrabold text-blue-700 truncate">
                Rp {price.toLocaleString("id-ID")}
              </span>

              <button
                type="button"
                onClick={handleOpenQtyModal}
                className="w-7 h-7 shrink-0 rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-95 text-white flex items-center justify-center shadow-xs transition-transform"
                title="Pesan / Input Jumlah"
              >
                <FiShoppingCart className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* POPUP MODAL INPUT QTY: RAPI, BESAR & SUPPORT TOMBOL SELESAI DI KEYBOARD HP */}
      {showQtyModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Header Modal */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 flex items-center justify-between">
              <span className="font-bold text-xs sm:text-sm flex items-center gap-1.5">
                <FiShoppingCart className="w-4 h-4" /> Masukkan Jumlah Pesanan
              </span>
              <button
                type="button"
                onClick={() => setShowQtyModal(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3.5">
              {/* Info Produk */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <p className="text-xs font-bold text-slate-800 line-clamp-2 leading-snug">
                  {product.nama}
                </p>
                <div className="flex items-center justify-between mt-1.5 text-[11px] text-slate-600">
                  <span>
                    Satuan:{" "}
                    <strong className="text-blue-700 font-bold uppercase">
                      {product.satuan || "DUS"}
                    </strong>
                  </span>
                  <span>
                    Harga:{" "}
                    <strong className="text-blue-700 font-bold">
                      Rp {price.toLocaleString("id-ID")}
                    </strong>
                  </span>
                </div>
              </div>

              {/* Form Input QTY */}
              <form onSubmit={handleConfirmAddToCart} className="space-y-3">
                <div className="text-center">
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    Mau pesan berapa {product.satuan || "item"}?
                  </label>

                  <div className="flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => setOrderQty((prev) => Math.max(1, prev - 1))}
                      className="w-11 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-base flex items-center justify-center active:scale-90 transition shadow-xs"
                    >
                      <FiMinus className="w-4 h-4" />
                    </button>

                    {/* Input Angka Bersih (Bisa Ketik di HP & Tombol Selesai Langsung Submit) */}
                    <input
                      ref={qtyInputRef}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      enterKeyHint="done"
                      maxLength={4}
                      value={orderQty === 0 ? "" : orderQty}
                      onChange={(e) => {
                        const cleaned = e.target.value.replace(/\D/g, "");
                        setOrderQty(cleaned === "" ? 0 : parseInt(cleaned, 10));
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.keyCode === 13) {
                          e.preventDefault();
                          handleConfirmAddToCart();
                        }
                      }}
                      className="w-24 h-11 text-center font-mono font-extrabold text-xl text-blue-700 bg-white border-2 border-blue-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 shadow-inner"
                      placeholder="1"
                    />

                    <button
                      type="button"
                      onClick={() => setOrderQty((prev) => Math.min(9999, prev + 1))}
                      className="w-11 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-base flex items-center justify-center active:scale-90 transition shadow-xs"
                    >
                      <FiPlus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Tombol Pintas Cepat (Memudahkan Ketik di HP) */}
                  <div className="flex items-center justify-center gap-1.5 mt-2.5">
                    {[5, 10, 20, 50].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setOrderQty(preset)}
                        className="px-2.5 py-1 text-[11px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg border border-blue-200 active:scale-95 transition"
                      >
                        +{preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Subtotal Dinamis */}
                <div className="flex items-center justify-between py-2 px-3 bg-blue-50/70 rounded-xl border border-blue-100">
                  <span className="text-xs text-slate-600 font-medium">Subtotal:</span>
                  <span className="text-sm font-extrabold text-blue-700 font-mono">
                    Rp {((orderQty || 0) * price).toLocaleString("id-ID")}
                  </span>
                </div>

                {/* Tombol Aksi Batal & Tambah */}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowQtyModal(false)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs active:scale-95 transition"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 transition"
                  >
                    <FiCheck className="w-4 h-4" /> Masukkan Keranjang
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}