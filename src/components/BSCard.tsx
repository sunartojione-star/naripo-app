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

    // Normalisasi kode produk menjadi string agar konsisten dengan store
    // const productCode = String(
    //   product.kd_bs || product.id || product.kd_br || product.kd || "",
    // ).trim();

    const productCode = String(
    product.kd_bs || "",
).trim();

    if (!productCode) {
      console.error("Kode produk BS tidak valid:", product);
      alert("Gagal menambahkan: Kode produk BS tidak ditemukan.");
      return;
    }

    // Kirim data terstruktur murni khusus untuk keranjang BS
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
      1,
    );

    // Efek visual tombol berhasil
    setIsAdded(true);
    setTimeout(() => {
      setIsAdded(false);
    }, 800);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition p-4 flex flex-col justify-between relative group">
      <div>
        <div className="w-full h-48 bg-gray-100 rounded-md mb-4 flex items-center justify-center overflow-hidden relative">
          {product.gambar ? (
            <img
              src={`${apiUrl}/images/${product.gambar}`}
              alt={product.nama}
              className="object-cover h-full w-full"
            />
          ) : (
            <span className="text-gray-400 text-sm">Tanpa Gambar</span>
          )}

          <button
            onClick={handleFavoriteClick}
            className={`absolute top-0 right-4 z-10 px-2.5 pt-2 pb-3 shadow-md transition-all duration-200 flex items-center justify-center group rounded-b-md ${
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
              className={`w-4 h-4 transition-transform duration-200 group-hover:scale-110 ${
                isFavorite ? "fill-white" : ""
              }`}
            />
          </button>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {product.kd_bs && (
            <span className="text-xs font-mono font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
              KD: {product.kd_bs}
            </span>
          )}
          {product.merk && (
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
              {product.merk}
            </span>
          )}
        </div>

        <h3
          className="font-bold text-gray-800 mt-2 line-clamp-2 text-sm uppercase"
          title={product.nama}
        >
          {product.nama}
        </h3>
      </div>

      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">Nilai Anggota</p>
          <p className="text-base font-bold text-blue-700">
            Rp {price.toLocaleString("id-ID")}
          </p>
        </div>

        <button
          onClick={handleAddToCart}
          type="button"
          className={`px-3 py-1.5 rounded text-xs font-semibold transition flex items-center gap-1 cursor-pointer ${
            isAdded
              ? "bg-green-600 text-white"
              : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95"
          }`}
        >
          <span>{isAdded ? "✓" : "+"}</span>{" "}
          {isAdded ? "Berhasil" : "Keranjang"}
        </button>
      </div>
    </div>
  );
}
