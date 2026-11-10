"use client";

import React, { useState } from "react";
import { useCartStoreBS } from "@/store/cartStoreBS";
import { FiHeart } from "react-icons/fi";

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
}

export default function ProductCard({
  product,
  isFavorite = false,
  onToggleFavorite,
}: ProductCardProps) {
  const [loadingFav, setLoadingFav] = useState<boolean>(false);
  const [isAdded, setIsAdded] = useState<boolean>(false);

  // Ambil fungsi addToCart khusus store BS
  const addToCartBS = useCartStoreBS((state) => state.addToCart);

  const price = parseFloat(String(product.nilai_anggota)) || 0;

  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://103.125.42.217:8081/api";

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (loadingFav) return;

    setLoadingFav(true);
    if (onToggleFavorite) {
      await onToggleFavorite(product);
    }
    setLoadingFav(false);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
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
      1
    );

    // Efek visual tombol berhasil
    setIsAdded(true);
    setTimeout(() => {
      setIsAdded(false);
    }, 800);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition p-2.5 sm:p-4 flex flex-col justify-between relative group overflow-hidden">
      <div>
        {/* Gambar Produk: Kotak Proporsional di HP (aspect-square), Normal di PC */}
        <div className="w-full aspect-square sm:aspect-auto sm:h-48 bg-gray-100 rounded-lg mb-2.5 sm:mb-4 flex items-center justify-center overflow-hidden relative border border-gray-100">
          {product.gambar ? (
            <img
              src={`${apiUrl}/images/${product.gambar}`}
              alt={product.nama}
              className="object-cover h-full w-full group-hover:scale-105 transition-transform duration-200"
            />
          ) : (
            <span className="text-gray-400 text-xs sm:text-sm select-none">
              Tanpa Gambar
            </span>
          )}

          {/* Tombol Favorit Pita */}
          <button
            onClick={handleFavoriteClick}
            type="button"
            className={`absolute top-0 right-2.5 sm:right-4 z-10 px-2 sm:px-2.5 pt-1.5 pb-2.5 sm:pb-3 shadow-md transition-all duration-200 flex items-center justify-center group rounded-b-md ${
              isFavorite
                ? "bg-red-500 text-white"
                : "bg-gray-200 text-gray-500 hover:bg-gray-300"
            }`}
            style={{
              clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%)",
            }}
            aria-label="Favorit"
          >
            <FiHeart
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform duration-200 group-hover:scale-110 ${
                isFavorite ? "fill-white" : ""
              }`}
            />
          </button>
        </div>

        {/* Badge Kode BS & Merk */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
          {product.kd_bs && (
            <span className="text-[10px] sm:text-xs font-mono font-semibold text-gray-700 bg-gray-100 px-1.5 sm:px-2 py-0.5 rounded border border-gray-200">
              KD: {product.kd_bs}
            </span>
          )}
          {product.merk && (
            <span className="text-[10px] sm:text-xs font-semibold text-blue-600 bg-blue-50 px-1.5 sm:px-2 py-0.5 rounded">
              {product.merk}
            </span>
          )}
        </div>

        {/* Nama Barang BS */}
        <h3
          className="font-bold text-gray-800 mt-1.5 sm:mt-2 line-clamp-2 text-xs sm:text-sm uppercase leading-snug"
          title={product.nama}
        >
          {product.nama}
        </h3>
      </div>

      {/* Bagian Harga & Tombol + Keranjang (Tersusun Rapi, Tidak Meluber) */}
      <div className="mt-3 pt-2 sm:pt-3 border-t border-gray-100 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] sm:text-xs text-gray-400 leading-none mb-0.5">
            Nilai Anggota
          </p>
          <p className="text-xs sm:text-base font-bold text-blue-700 font-mono truncate">
            Rp {Math.round(price).toLocaleString("id-ID")}
          </p>
        </div>

        {/* Tombol + Keranjang: Full Width di HP, Pas di PC */}
        <button
          onClick={handleAddToCart}
          type="button"
          className={`w-full sm:w-auto px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1 shadow-sm shrink-0 ${
            isAdded
              ? "bg-green-600 text-white"
              : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95"
          }`}
        >
          <span className="text-sm font-bold leading-none">
            {isAdded ? "✓" : "+"}
          </span>
          <span>{isAdded ? "Berhasil" : "Keranjang"}</span>
        </button>
      </div>
    </div>
  );
}