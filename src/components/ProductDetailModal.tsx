"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { useCartStore } from "@/store/cartStore";
import { Barang } from "@/components/ProductCard";
import {
  FiArrowLeft,
  FiShoppingCart,
  FiCheck,
  FiPackage,
  FiTag,
  FiLayers,
  FiRefreshCw,
} from "react-icons/fi";

interface ProductDetailModalProps {
  product: Barang | null;
  onClose: () => void;
  onSelectProduct: (product: Barang) => void;
}

export default function ProductDetailModal({
  product,
  onClose,
  onSelectProduct,
}: ProductDetailModalProps) {
  const router = useRouter();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [qtyInput, setQtyInput] = useState<string>("1");
  const [isAdded, setIsAdded] = useState<boolean>(false);
  const [recommendations, setRecommendations] = useState<Barang[]>([]);
  const [loadingRecs, setLoadingRecs] = useState<boolean>(false);

  const addToCart = useCartStore(
    (state: any) => state.addToCart || state.addItem || state.add
  );
  const cartItems = useCartStore(
    (state: any) => state.items || state.cart || state.cartItems || []
  );
  const totalCartCount = Array.isArray(cartItems) ? cartItems.length : 0;

  const rawApiUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://103.125.42.217:8081/api";
  const apiUrl = rawApiUrl.replace(/\/$/, "");
  const baseUrl = apiUrl.replace(/\/api$/, "");

  const getImageUrl = (gambar: string | null) => {
    if (!gambar) return null;
    if (gambar.startsWith("http://") || gambar.startsWith("https://")) {
      return gambar;
    }
    if (gambar.startsWith("/")) {
      return `${baseUrl}${gambar}`;
    }
    return `${baseUrl}/uploads/${gambar}`;
  };

  // Reset qty & scroll ke atas setiap kali produk yang dipilih berubah
  useEffect(() => {
    if (!product) return;
    setQtyInput("1");
    setIsAdded(false);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [product]);

  // Ambil rekomendasi produk sejenis (berdasarkan kd gudang/kategori)
  useEffect(() => {
    if (!product) return;

    const fetchRecommendations = async () => {
      setLoadingRecs(true);
      const token = localStorage.getItem("token");
      try {
        const kdClean = (product.kd || "").trim();
        const endpoint = kdClean
          ? `${apiUrl}/barangs/by-kd?kd=${encodeURIComponent(
              kdClean
            )}&page=1&limit=10`
          : `${apiUrl}/barangs?status=Digunakan&page=1&limit=10`;

        const res = await fetch(endpoint, {
          headers: {
            Accept: "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
        });

        if (res.ok) {
          const json = await res.json();
          const list: Barang[] = Array.isArray(json)
            ? json
            : Array.isArray(json.data)
            ? json.data
            : [];
          setRecommendations(
            list.filter((item) => item.kd_br !== product.kd_br).slice(0, 8)
          );
        } else {
          setRecommendations([]);
        }
      } catch (err) {
        console.error("Gagal memuat rekomendasi:", err);
        setRecommendations([]);
      } finally {
        setLoadingRecs(false);
      }
    };

    fetchRecommendations();
  }, [product, apiUrl]);

  // Kunci scroll halaman utama saat modal terbuka
  useEffect(() => {
    if (!product) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [product]);

  if (!product) return null;

  const parsedQty = Math.max(1, parseInt(qtyInput, 10) || 1);
  const hargaNum = Number(product.h_anggota) || 0;
  const imgSrc = getImageUrl(product.gambar);

  const handleAddToCart = () => {
    if (typeof addToCart === "function") {
      addToCart({
        ...product,
        kd_br: product.kd_br,
        nama: product.nama,
        harga: hargaNum,
        h_anggota: product.h_anggota,
        satuan: product.satuan,
        gambar: product.gambar,
        qty: parsedQty,
        quantity: parsedQty,
      });
    }
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 1500);
  };

  const handleBuyNow = () => {
    handleAddToCart();
    onClose();
    router.push("/cart");
  };

  const getKetBadgeStyle = (ket: string) => {
    switch ((ket || "").toUpperCase()) {
      case "BARU":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "NAIK":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "TURUN":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      default:
        return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-lg h-[92dvh] sm:h-[85vh] rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER MODAL + ICON KERANJANG DENGAN BADGE ANGKA */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100 bg-white shrink-0">
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup detail produk"
            className="p-2 text-gray-700 hover:bg-gray-100 rounded-full transition"
          >
            <FiArrowLeft className="w-5 h-5" />
          </button>

          <h2 className="text-sm sm:text-base font-bold text-gray-900">
            Detail Produk
          </h2>

          <button
            type="button"
            onClick={() => {
              onClose();
              router.push("/cart");
            }}
            aria-label="Lihat Keranjang"
            className="relative p-2 text-gray-700 hover:bg-gray-100 rounded-full transition"
          >
            <FiShoppingCart className="w-5 h-5" />
            {totalCartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs">
                {totalCartCount > 99 ? "99+" : totalCartCount}
              </span>
            )}
          </button>
        </div>

        {/* KONTEN SCROLLABLE */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto bg-gray-50"
        >
          {/* Gambar Produk Besar */}
          <div className="bg-white p-4 flex items-center justify-center border-b border-gray-100">
            <div className="w-full max-w-[280px] aspect-square rounded-xl bg-gray-50 flex items-center justify-center overflow-hidden border border-gray-100">
              {imgSrc ? (
                <img
                  src={imgSrc}
                  alt={product.nama}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="flex flex-col items-center text-gray-300">
                  <FiPackage className="w-12 h-12 mb-1" />
                  <span className="text-xs">Belum ada foto</span>
                </div>
              )}
            </div>
          </div>

          {/* Info Utama Produk */}
          <div className="bg-white p-4 space-y-2.5 border-b border-gray-100">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-xl sm:text-2xl font-extrabold text-blue-600">
                Rp {hargaNum.toLocaleString("id-ID")}
              </p>
              {product.ket && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getKetBadgeStyle(
                    product.ket
                  )}`}
                >
                  {product.ket}
                </span>
              )}
            </div>

            <h3 className="text-sm sm:text-base font-bold text-gray-900 leading-snug">
              {product.nama}
            </h3>

            {/* Metadata Badge */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-gray-100 text-gray-700 px-2.5 py-1 rounded-lg">
                <FiLayers className="w-3 h-3 text-gray-500" />
                KD: {product.kd || "-"}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg">
                <FiTag className="w-3 h-3" />
                {product.satuan || "-"}
              </span>
              {product.barcode && (
                <span className="inline-flex items-center gap-1 text-[11px] font-mono bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg">
                  {product.barcode}
                </span>
              )}
            </div>
          </div>

          {/* Rekomendasi Produk Lainnya */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs sm:text-sm font-bold text-gray-800">
                Rekomendasi Produk Lainnya
              </h4>
              <span className="text-[11px] text-gray-400">
                Kategori {product.kd || "-"}
              </span>
            </div>

            {loadingRecs ? (
              <div className="flex justify-center py-6">
                <FiRefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
              </div>
            ) : recommendations.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">
                Belum ada rekomendasi produk lain.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                {recommendations.map((rec) => {
                  const recImg = getImageUrl(rec.gambar);
                  return (
                    <button
                      key={rec.kd_br}
                      type="button"
                      onClick={() => onSelectProduct(rec)}
                      className="bg-white border border-gray-200/80 rounded-xl p-2 text-left hover:border-blue-400 transition active:scale-[0.98] flex flex-col"
                    >
                      <div className="w-full aspect-square bg-gray-50 rounded-lg overflow-hidden mb-2 flex items-center justify-center">
                        {recImg ? (
                          <img
                            src={recImg}
                            alt={rec.nama}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <FiPackage className="w-6 h-6 text-gray-300" />
                        )}
                      </div>
                      <p className="text-[11px] font-semibold text-gray-800 line-clamp-2 leading-tight mb-1 flex-1">
                        {rec.nama}
                      </p>
                      <p className="text-xs font-extrabold text-blue-600">
                        Rp {(Number(rec.h_anggota) || 0).toLocaleString("id-ID")}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* BAR AKSI STICKY DI BAWAH */}
        <div className="bg-white border-t border-gray-200 px-3 py-2.5 flex items-center gap-2 shrink-0">
          {/* Input Qty */}
          <div className="flex items-center border border-gray-300 rounded-xl overflow-hidden shrink-0">
            <button
              type="button"
              onClick={() =>
                setQtyInput((prev) =>
                  String(Math.max(1, (parseInt(prev, 10) || 1) - 1))
                )
              }
              className="w-8 h-9 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold text-sm"
            >
              -
            </button>
            <input
              type="number"
              min={1}
              inputMode="numeric"
              value={qtyInput}
              onChange={(e) => setQtyInput(e.target.value)}
              onFocus={(e) => e.target.select()}
              className="w-11 h-9 text-center text-xs font-bold text-gray-800 focus:outline-none"
            />
            <button
              type="button"
              onClick={() =>
                setQtyInput((prev) => String((parseInt(prev, 10) || 0) + 1))
              }
              className="w-8 h-9 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold text-sm"
            >
              +
            </button>
          </div>

          <button
            type="button"
            onClick={handleBuyNow}
            className="flex-1 py-2.5 rounded-xl border border-blue-600 text-blue-600 font-bold text-xs sm:text-sm hover:bg-blue-50 transition active:scale-[0.98]"
          >
            Beli Langsung
          </button>

          <button
            type="button"
            onClick={handleAddToCart}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white flex items-center justify-center gap-1 transition active:scale-[0.98] ${
              isAdded
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {isAdded ? (
              <>
                <FiCheck className="w-4 h-4" />
                <span>Ditambahkan</span>
              </>
            ) : (
              <>
                <FiShoppingCart className="w-4 h-4" />
                <span>+ Keranjang</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}