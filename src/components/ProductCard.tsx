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
    (state: any) => state.addToCart || state.addItem
  );

  const price = parseFloat(product.h_anggota) || 0;

  // Fungsi pembersih URL Gambar agar lewat jalur aman HTTPS (Proxy)
  const getSafeImageSrc = (img: string | null | undefined) => {
    if (!img) return null;

    // Jika gambar sudah memuat link lengkap dari backend, ambil nama filenya saja
    if (img.includes("/uploads/")) {
      const fileName = img.split("/uploads/").pop();
      return `/uploads/${fileName}`;
    }
    if (img.includes("/images/")) {
      const fileName = img.split("/images/").pop();
      return `/images/${fileName}`;
    }

    // Default jika hanya berupa nama file biasa
    return `/uploads/${img}`;
  };

  const imageSrc = getSafeImageSrc(product.gambar);

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
        <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs text-amber-600 font-semibold mt-1">
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
        <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs text-red-600 font-medium mt-1">
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
        <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs text-green-600 font-medium mt-1">
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
        <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs text-gray-500 font-medium mt-1">
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

    return (
      <p className="text-[11px] sm:text-xs text-gray-500 mt-1">
        {ketValue || "-"}
      </p>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition p-2.5 sm:p-4 flex flex-col justify-between relative group overflow-hidden">
      <div>
        {/* Gambar Produk: Menggunakan URL Aman HTTPS */}
        <div className="w-full aspect-square sm:aspect-auto sm:h-48 bg-gray-100 rounded-lg mb-2.5 sm:mb-4 flex items-center justify-center overflow-hidden relative border border-gray-100">
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={product.nama}
              onError={(e) => {
                // Cadangan otomatis jika gambar ternyata ada di folder /images/
                const target = e.currentTarget;
                if (target.src.includes("/uploads/")) {
                  target.src = target.src.replace("/uploads/", "/images/");
                }
              }}
              className="object-cover h-full w-full group-hover:scale-105 transition-transform duration-200"
            />
          ) : (
            <span className="text-gray-400 text-xs sm:text-sm select-none">
              Tanpa Gambar
            </span>
          )}

          {/* Tombol Favorit Pita */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite?.(product);
            }}
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

        {/* Badge Kode Barang (KD) & Satuan */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
          {product.kd && (
            <span className="text-[10px] sm:text-xs font-mono font-semibold text-gray-700 bg-gray-100 px-1.5 sm:px-2 py-0.5 rounded border border-gray-200">
              KD: {product.kd}
            </span>
          )}
          <span className="text-[10px] sm:text-xs font-semibold text-blue-600 bg-blue-50 px-1.5 sm:px-2 py-0.5 rounded">
            {product.satuan}
          </span>
        </div>

        {/* Nama Barang */}
        <h3
          className="font-bold text-gray-800 mt-1.5 sm:mt-2 line-clamp-2 text-xs sm:text-sm uppercase leading-snug"
          title={product.nama}
        >
          {product.nama}
        </h3>

        {/* Status Keterangan (BARU / NAIK / TURUN) */}
        <div>{renderKetBadge(product.ket)}</div>
      </div>

      {/* Bagian Harga & Tombol + Keranjang */}
      <div className="mt-3 pt-2 sm:pt-3 border-t border-gray-100 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] sm:text-xs text-gray-400 leading-none mb-0.5">
            Harga Anggota
          </p>
          <p className="text-xs sm:text-base font-bold text-blue-700 font-mono truncate">
            Rp {price.toLocaleString("id-ID")}
          </p>
        </div>

        {/* Tombol + Keranjang: Full Width di HP, Pas di PC */}
        <button
          onClick={handleAddToCart}
          type="button"
          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 active:scale-95 text-white px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1 shadow-sm shrink-0"
        >
          <span className="text-sm font-bold leading-none">+</span>
          <span>Keranjang</span>
        </button>
      </div>
    </div>
  );
}