"use client";

import React, { useState } from "react";
import { useCartStoreBS } from "@/store/cartStoreBS";
import { FiHeart, FiShoppingCart, FiCheck, FiX } from "react-icons/fi";

export interface Barang {
  kd_bs: string | number;
  nama: string;
  nilai_anggota: string | number;
  merk: string;
  nilai_pcs?: string | number;
  gambar?: string | null;
}

interface ProductCardProps {
  product: Barang;
  isFavorite?: boolean;
  onToggleFavorite?: (product: Barang) => Promise<void>;
  onSelectProduct?: (product: Barang) => void;
}

export default function BSCard({
  product,
  isFavorite = false,
  onToggleFavorite,
  onSelectProduct,
}: ProductCardProps) {
  const [loadingFav, setLoadingFav] = useState<boolean>(false);
  const [isAdded, setIsAdded] = useState<boolean>(false);

  // State Modal Pilih Qty
  const [isQtyModalOpen, setIsQtyModalOpen] = useState<boolean>(false);
  const [qtyInput, setQtyInput] = useState<string>("1");

  // Ambil fungsi addToCart khusus store BS
  const addToCartBS = useCartStoreBS((state) => state.addToCart);

  const price = parseFloat(String(product.nilai_anggota)) || 0;

  const rawApiUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://103.125.42.217:8081/api";
  const apiUrl = rawApiUrl.replace(/\/$/, "");

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (loadingFav) return;

    setLoadingFav(true);
    if (onToggleFavorite) {
      await onToggleFavorite(product);
    }
    setLoadingFav(false);
  };

  const handleOpenQtyModal = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setQtyInput("1");
    setIsQtyModalOpen(true);
  };

  const parsedQty = Math.max(1, parseInt(qtyInput, 10) || 1);

  const handleConfirmAddToCart = (e: React.FormEvent) => {
    e.preventDefault();

    const productCode = String(product.kd_bs || "").trim();

    if (!productCode) {
      console.error("Kode produk BS tidak valid:", product);
      alert("Gagal menambahkan: Kode produk BS tidak ditemukan.");
      return;
    }

    addToCartBS(
      {
        ...product,
        kd_bs: productCode,
        nama: product.nama || "Tanpa Nama",
        nilai_anggota: price,
        merk: product.merk || "-",
        nilai_pcs: parseFloat(String(product.nilai_pcs)) || 0,
        gambar: product.gambar || null,
      },
      parsedQty
    );

    setIsQtyModalOpen(false);
    setIsAdded(true);
    setTimeout(() => {
      setIsAdded(false);
    }, 1000);
  };

  const handleCardDetail = () => {
    if (onSelectProduct) {
      onSelectProduct(product);
    }
  };

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200/90 shadow-xs hover:shadow-md transition p-2.5 sm:p-3.5 flex flex-col justify-between relative group overflow-hidden">
        <div>
          {/* Gambar Produk: Kotak Proporsional (aspect-square) + Lazy Load */}
          <div
            onClick={handleCardDetail}
            className={`w-full aspect-square bg-gray-50 rounded-lg mb-2 flex items-center justify-center overflow-hidden relative border border-gray-100 ${
              onSelectProduct ? "cursor-pointer" : ""
            }`}
          >
            {product.gambar ? (
              <img
                src={`${apiUrl}/images/${product.gambar}`}
                alt={product.nama}
                loading="lazy"
                decoding="async"
                className="object-cover h-full w-full group-hover:scale-105 transition-transform duration-200"
              />
            ) : (
              <span className="text-gray-400 text-xs select-none">
                Tanpa Gambar
              </span>
            )}

            {/* Tombol Favorit Pojok Kanan Atas */}
            <button
              onClick={handleFavoriteClick}
              type="button"
              className={`absolute top-1.5 right-1.5 z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-lg shadow-xs border transition-all duration-200 flex items-center justify-center ${
                isFavorite
                  ? "bg-red-500 text-white border-red-500"
                  : "bg-white/90 text-gray-500 border-gray-200 hover:bg-gray-100"
              }`}
              aria-label="Favorit"
            >
              <FiHeart
                className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${
                  isFavorite ? "fill-white" : ""
                }`}
              />
            </button>
          </div>

          {/* Badge Kode BS & Merk */}
          <div className="flex items-center gap-1 flex-wrap">
            {product.kd_bs && (
              <span className="text-[10px] font-mono font-semibold text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                KD: {product.kd_bs}
              </span>
            )}
            {product.merk && (
              <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded truncate max-w-full">
                {product.merk}
              </span>
            )}
          </div>

          {/* Nama Barang BS */}
          <h3
            onClick={handleCardDetail}
            className={`font-bold text-gray-800 mt-1.5 line-clamp-2 text-xs sm:text-sm uppercase leading-snug ${
              onSelectProduct ? "cursor-pointer hover:text-blue-600" : ""
            }`}
            title={product.nama}
          >
            {product.nama}
          </h3>
        </div>

        {/* Bagian Harga & Tombol Ikon Keranjang Biru (Sama seperti ProductCard) */}
        <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-end justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] text-gray-400 leading-none mb-0.5">
              Nilai Anggota
            </p>
            <p className="text-xs sm:text-sm font-extrabold text-blue-600 font-mono truncate">
              Rp {Math.round(price).toLocaleString("id-ID")}
            </p>
          </div>

          <button
            onClick={handleOpenQtyModal}
            type="button"
            aria-label="Tambah ke keranjang BS"
            className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-xs shrink-0 transition active:scale-95 ${
              isAdded
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {isAdded ? (
              <FiCheck className="w-4 h-4" />
            ) : (
              <FiShoppingCart className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* MODAL INPUT QTY KERANJANG BS */}
      {isQtyModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsQtyModalOpen(false)}
        >
          <div
            className="bg-white w-full max-w-xs rounded-2xl shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h4 className="text-sm font-bold text-gray-800">
                Jumlah Belanja BS
              </h4>
              <button
                type="button"
                onClick={() => setIsQtyModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmAddToCart} className="p-4 space-y-4">
              <div>
                <p className="text-xs font-bold text-gray-800 line-clamp-2 uppercase">
                  {product.nama}
                </p>
                <p className="text-xs font-semibold text-blue-600 mt-1">
                  Rp {Math.round(price).toLocaleString("id-ID")}
                </p>
              </div>

              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setQtyInput((prev) =>
                      String(Math.max(1, (parseInt(prev, 10) || 1) - 1))
                    )
                  }
                  className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-lg"
                >
                  -
                </button>
                <input
                  type="number"
                  min={1}
                  inputMode="numeric"
                  autoFocus
                  value={qtyInput}
                  onChange={(e) => setQtyInput(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  className="w-20 h-10 text-center text-base font-bold text-gray-900 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() =>
                    setQtyInput((prev) =>
                      String((parseInt(prev, 10) || 0) + 1)
                    )
                  }
                  className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-lg"
                >
                  +
                </button>
              </div>

              <div className="flex items-center justify-between bg-blue-50/70 px-3 py-2 rounded-xl text-xs">
                <span className="text-gray-600 font-medium">Subtotal</span>
                <span className="font-extrabold text-blue-700 font-mono">
                  Rp {Math.round(price * parsedQty).toLocaleString("id-ID")}
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsQtyModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs"
                >
                  + Keranjang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}