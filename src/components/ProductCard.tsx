import React, { useState } from "react";
import { useCartStore } from "@/store/cartStore";
import { FiHeart } from "react-icons/fi";

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

  // Ambil method penambahan item dari Zustand store
  const addToCart = useCartStore(
    (state: any) => state.addToCart || state.addItem,
  );

  const price = parseFloat(product.h_anggota) || 0;

  // Konfigurasi URL Gambar dari Backend Laravel
  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://103.125.42.217:8081/api";
  const baseUrl = apiUrl.replace("/api", "");

  // Click Handler Tombol Favorit
  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (loadingFav) return;

    setLoadingFav(true);
    if (onToggleFavorite) {
      await onToggleFavorite(product);
    }
    setLoadingFav(false);
  };

  // Click Handler Tambah ke Keranjang (Zustand)
  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    if (addToCart) {
      addToCart(product, 1);
    }
  };

  const renderKetBadge = (ketValue: string) => {
    const ketClean = (ketValue || "").trim().toUpperCase();

    if (ketClean === "BARU") {
      return (
        <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-semibold mt-1">
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
            />
          </svg>
          {ketValue}
        </span>
      );
    }

    if (ketClean === "NAIK") {
      return (
        <span className="inline-flex items-center gap-1 text-xs text-red-600 font-medium mt-1">
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
            />
          </svg>
          {ketValue}
        </span>
      );
    }

    if (ketClean === "TURUN") {
      return (
        <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium mt-1">
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6"
            />
          </svg>
          {ketValue}
        </span>
      );
    }

    if (ketClean === "SAMA") {
      return (
        <span className="inline-flex items-center gap-1 text-xs text-gray-500 font-medium mt-1">
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M5 12h14"
            />
          </svg>
          {ketValue}
        </span>
      );
    }

    return <p className="text-xs text-gray-500 mt-1">{ketValue || "-"}</p>;
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

          {/* Tombol Favorit */}
          {/* <button
            onClick={handleFavoriteClick}
            disabled={loadingFav}
            type="button"
            aria-label="Tambah ke Favorit"
            // className="absolute top-2 right-2 p-2 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white text-gray-600 hover:text-red-500 transition shadow-sm disabled:opacity-50"
            // className="absolute top-3 right-3 z-10 p-2.5 rounded-full bg-white/90 backdrop-blur-sm shadow-md hover:bg-white transition-all duration-200 border border-gray-100 flex items-center justify-center group"
            className="absolute top-3 right-3 z-10 p-2.5 rounded-full bg-white shadow-lg hover:bg-gray-100 transition-all duration-200 border border-gray-200 flex items-center justify-center group"
            aria-label="Favorit"
          >
            <svg
              className={`w-5 h-5 transition-all duration-200 ${
                isFavorite
                  ? "fill-red-500 text-red-500 scale-110"
                  : "fill-none stroke-currentColor hover:scale-105"
              }`}
              viewBox="0 0 24 24"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </button> */}

          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite?.(product); // Perbaikan: tanda tanya sebelum titik ( . )
            }}
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

        {/* Badge Kode Barang (KD) & Satuan */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {product.kd && (
            <span className="text-xs font-mono font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
              KD: {product.kd}
            </span>
          )}
          <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
            {product.satuan}
          </span>
        </div>

        <h3
          className="font-bold text-gray-800 mt-2 line-clamp-2 text-sm uppercase"
          title={product.nama}
        >
          {product.nama}
        </h3>

        <div>{renderKetBadge(product.ket)}</div>
      </div>

      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">Harga Anggota</p>
          <p className="text-base font-bold text-blue-700">
            Rp {price.toLocaleString("id-ID")}
          </p>
        </div>

        {/* Tombol + Keranjang */}
        <button
          onClick={handleAddToCart}
          type="button"
          className="bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-semibold hover:bg-blue-700 active:scale-95 transition flex items-center gap-1"
        >
          <span>+</span> Keranjang
        </button>
      </div>
    </div>
  );
}
