"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { useCartStoreBS } from "@/store/cartStoreBS";
import type { BarangBS } from "@/components/BSCard";
import {
  FiArrowLeft,
  FiShoppingCart,
  FiCheck,
  FiPackage,
  FiTag,
  FiLayers,
  FiAlertTriangle,
  FiX,
} from "react-icons/fi";

interface BSDetailModalProps {
  product: BarangBS | null;
  onClose: () => void;
}

export default function BSDetailModal({
  product,
  onClose,
}: BSDetailModalProps) {
  const router = useRouter();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [qtyInput, setQtyInput] = useState<string>("1");
  const [isAdded, setIsAdded] = useState<boolean>(false);
  const [showDuplicatePopup, setShowDuplicatePopup] = useState<boolean>(false);

  const addToCart = useCartStoreBS(
    (state: any) => state.addToCart || state.addItem || state.add
  );
  const cartItems = useCartStoreBS(
    (state: any) => state.cartItems || state.items || []
  );
  const totalCartCount = Array.isArray(cartItems) ? cartItems.length : 0;

  const rawApiUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://103.125.42.217:8081/api";
  const apiUrl = rawApiUrl.replace(/\/$/, "");
  const baseUrl = apiUrl.replace(/\/api$/, "");

  const getImageUrl = (gambar: string | null | undefined) => {
    if (!gambar) return null;
    if (
      gambar.startsWith("http://") ||
      gambar.startsWith("https://") ||
      gambar.startsWith("data:") ||
      gambar.startsWith("blob:")
    ) {
      return gambar;
    }
    if (gambar.startsWith("/")) {
      return `${baseUrl}${gambar}`;
    }
    return `${baseUrl}/uploads/${gambar}`;
  };

  useEffect(() => {
    if (!product) return;
    setQtyInput("1");
    setIsAdded(false);
    setShowDuplicatePopup(false);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [product]);

  useEffect(() => {
    if (!product) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [product]);

  if (!product) return null;

  const parsePrice = (val: string | number | undefined): number => {
    if (typeof val === "number") return val;
    if (typeof val === "string") {
      const clean = val.replace(/[^0-9.-]+/g, "");
      return parseFloat(clean) || 0;
    }
    return 0;
  };

  const parsedQty = Math.max(1, parseInt(qtyInput, 10) || 1);
  const hargaNum = parsePrice(product.nilai_anggota);
  const imgSrc = getImageUrl(product.gambar);

  const existingCartItem = Array.isArray(cartItems)
    ? cartItems.find((item: any) => {
        const p = item?.product || item;
        return (
          String(p?.kd_bs || item?.kd_bs || "").trim() ===
          String(product.kd_bs || "").trim()
        );
      })
    : null;

  const existingCartQty = existingCartItem
    ? existingCartItem.quantity || existingCartItem.qty || 1
    : 0;

  const commitAddToCart = () => {
    if (typeof addToCart === "function") {
      addToCart({
        ...product,
        kd_bs: product.kd_bs,
        nama: product.nama,
        nilai_anggota: product.nilai_anggota,
        merk: product.merk,
        nilai_pcs: product.nilai_pcs,
        barcode: product.barcode,
        gambar: product.gambar,
        qty: parsedQty,
        quantity: parsedQty,
      });
    }
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 1500);
  };

  const handleAddToCart = () => {
    if (existingCartItem) {
      setShowDuplicatePopup(true);
      return;
    }
    commitAddToCart();
  };

  const handleBuyNow = () => {
    if (!existingCartItem) {
      commitAddToCart();
    }
    onClose();
    router.push("/keranjangbs");
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="relative bg-white w-full sm:max-w-lg h-[88dvh] sm:h-[80vh] rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100 bg-white shrink-0">
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup detail BS"
            className="p-2 text-gray-700 hover:bg-gray-100 rounded-full transition"
          >
            <FiArrowLeft className="w-5 h-5" />
          </button>

          <h2 className="text-sm sm:text-base font-bold text-gray-900">
            Detail Barang BS
          </h2>

          <button
            type="button"
            onClick={() => {
              onClose();
              router.push("/keranjangbs");
            }}
            aria-label="Lihat Keranjang BS"
            className="relative p-2 text-gray-700 hover:bg-gray-100 rounded-full transition"
          >
            <FiShoppingCart className="w-5 h-5" />
            {totalCartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-amber-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs">
                {totalCartCount > 99 ? "99+" : totalCartCount}
              </span>
            )}
          </button>
        </div>

        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto bg-gray-50"
        >
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

          <div className="bg-white p-4 space-y-2.5 border-b border-gray-100">
            <p className="text-xl sm:text-2xl font-extrabold text-blue-600">
              Rp {hargaNum.toLocaleString("id-ID")}
            </p>

            <h3 className="text-sm sm:text-base font-bold text-gray-900 leading-snug">
              {product.nama}
            </h3>

            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-gray-100 text-gray-700 px-2.5 py-1 rounded-lg">
                <FiLayers className="w-3 h-3 text-gray-500" />
                KD BS: {product.kd_bs || "-"}
              </span>
              {product.merk && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg">
                  <FiTag className="w-3 h-3" />
                  {product.merk}
                </span>
              )}
              {product.nilai_pcs !== undefined && product.nilai_pcs !== null && (
                <span className="inline-flex items-center gap-1 text-[11px] font-mono bg-amber-50 text-amber-800 px-2.5 py-1 rounded-lg">
                  Nilai Pcs: Rp {parsePrice(product.nilai_pcs).toLocaleString("id-ID")}
                </span>
              )}
              {product.barcode && (
                <span className="inline-flex items-center gap-1 text-[11px] font-mono bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg">
                  {product.barcode}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white border-t border-gray-200 px-3 py-2.5 flex items-center gap-2 shrink-0">
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

        {showDuplicatePopup && (
          <div
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setShowDuplicatePopup(false)}
          >
            <div
              className="bg-white w-full max-w-xs sm:max-w-sm rounded-3xl overflow-hidden shadow-2xl border border-amber-200 animate-in fade-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 px-4 py-4 text-center relative">
                <button
                  type="button"
                  onClick={() => setShowDuplicatePopup(false)}
                  className="absolute top-3 right-3 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/15 transition"
                >
                  <FiX className="w-4 h-4" />
                </button>
                <div className="w-14 h-14 mx-auto rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center shadow-lg mb-2">
                  <FiAlertTriangle className="w-8 h-8 text-white animate-bounce" />
                </div>
                <h3 className="text-base sm:text-lg font-extrabold text-white tracking-wide">
                  Barang Wes Nang Keranjang!
                </h3>
              </div>

              <div className="p-4 text-center space-y-3">
                <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-3">
                  <p className="text-xs font-bold text-gray-800 line-clamp-2 leading-snug">
                    {product.nama}
                  </p>
                  <div className="mt-1.5 inline-flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-full border border-amber-200 text-[11px] font-semibold text-amber-700">
                    <FiShoppingCart className="w-3.5 h-3.5" />
                    <span>
                      Sudah ada di keranjang BS (Qty: {existingCartQty})
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-gray-500 leading-relaxed">
                  Barang ini sudah masuk keranjang BS Anda. Mau lihat keranjang
                  atau tetap tambah jumlahnya?
                </p>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDuplicatePopup(false);
                      commitAddToCart();
                    }}
                    className="py-2.5 px-3 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-50 active:scale-95 transition"
                  >
                    Tetap Tambah (+{parsedQty})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDuplicatePopup(false);
                      onClose();
                      router.push("/keranjangbs");
                    }}
                    className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md active:scale-95 transition flex items-center justify-center gap-1.5"
                  >
                    <FiShoppingCart className="w-3.5 h-3.5" />
                    Lihat Keranjang
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowDuplicatePopup(false)}
                  className="w-full py-2 text-[11px] font-semibold text-gray-400 hover:text-gray-600 transition"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}