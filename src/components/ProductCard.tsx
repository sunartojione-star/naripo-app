import React, { useState } from "react";
import { useCartStore } from "@/store/cartStore";
import { FiHeart, FiShoppingCart, FiCheck } from "react-icons/fi";

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
  const [isAdded, setIsAdded] = useState<boolean>(false);

  // Ambil method penambahan item dari Zustand store
  const addToCart = useCartStore(
    (state: any) => state.addToCart || state.addItem
  );

  const price = parseFloat(product.h_anggota) || 0;

  // Fungsi pembersih URL Gambar agar lewat jalur aman HTTPS (Proxy)
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
    if (addToCart) {
      addToCart(product, 1);
      setIsAdded(true);
      setTimeout(() => setIsAdded(false), 800);
    }
  };

  const renderKetBadge = (ketValue: string) => {
    const ketClean = (ketValue || "").trim().toUpperCase();

    if (ketClean === "BARU") {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 font-semibold mt-0.5">
          <span>✨</span> {ketValue}
        </span>
      );
    }
    if (ketClean === "NAIK") {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] text-red-600 font-semibold mt-0.5">
          <span>↗</span> {ketValue}
        </span>
      );
    }
    if (ketClean === "TURUN") {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] text-green-600 font-semibold mt-0.5">
          <span>↘</span> {ketValue}
        </span>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition p-2 sm:p-3 flex flex-col justify-between relative group overflow-hidden w-full">
      <div>
        {/* Gambar Produk Kotak Proporsional */}
        <div className="w-full aspect-square bg-gray-100 rounded-lg mb-2 flex items-center justify-center overflow-hidden relative border border-gray-100">
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={product.nama}
              onError={(e) => {
                const target = e.currentTarget;
                if (target.src.includes("/uploads/")) {
                  target.src = target.src.replace("/uploads/", "/images/");
                }
              }}
              className="object-cover h-full w-full group-hover:scale-105 transition-transform duration-200"
            />
          ) : (
            <span className="text-gray-400 text-[11px] sm:text-xs select-none">
              Tanpa Gambar
            </span>
          )}

          {/* Tombol Favorit Pita */}
          <button
            onClick={handleFavoriteClick}
            type="button"
            className={`absolute top-0 right-2 z-10 px-2 pt-1 pb-2 shadow-sm transition-all duration-200 flex items-center justify-center rounded-b-md ${
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
              className={`w-3.5 h-3.5 ${
                isFavorite ? "fill-white" : ""
              }`}
            />
          </button>
        </div>

        {/* Badge Kode & Satuan */}
        <div className="flex items-center gap-1 mb-1 flex-wrap">
          {product.kd && (
            <span className="text-[9px] font-mono font-semibold text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">
              KD: {product.kd}
            </span>
          )}
          <span className="text-[9px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
            {product.satuan || "DUS"}
          </span>
        </div>

        {/* Nama Barang (Tinggi Seragam, Maksimal 2 Baris) */}
        <h3
          className="font-bold text-gray-800 text-[11px] sm:text-xs uppercase leading-tight line-clamp-2 h-7 sm:h-8"
          title={product.nama}
        >
          {product.nama}
        </h3>

        {/* Status BARU/NAIK/TURUN */}
        <div>{renderKetBadge(product.ket)}</div>
      </div>

      {/* Bagian Bawah: Harga & Tombol Keranjang Rapi (Anti-Meluber ala Shopee) */}
      <div className="mt-2 pt-1.5 border-t border-gray-100 flex items-center justify-between gap-1">
        <div className="min-w-0 flex-1">
          <p className="text-[9px] text-gray-400 leading-none mb-0.5">
            Harga Anggota
          </p>
          <p className="text-xs sm:text-sm font-extrabold text-blue-700 font-mono truncate leading-tight">
            Rp {price.toLocaleString("id-ID")}
          </p>
        </div>

        {/* Tombol Keranjang Kotak Ringkas (w-7 h-7) */}
        <button
          onClick={handleAddToCart}
          type="button"
          title="Tambah ke Keranjang"
          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition shrink-0 active:scale-95 shadow-sm ${
            isAdded
              ? "bg-emerald-600 text-white"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          {isAdded ? (
            <FiCheck className="w-3.5 h-3.5" />
          ) : (
            <FiShoppingCart className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}