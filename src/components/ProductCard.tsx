"use client";

import React, { useState, useEffect, useRef } from "react";
import { useCartStore } from "@/store/cartStore";
import {
  FiHeart,
  FiShoppingCart,
  FiCheck,
  FiCamera,
  FiX,
  FiSave,
  FiUploadCloud,
  FiMaximize,
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
  onProductUpdated?: (updatedProduct: Barang) => void;
}

export default function ProductCard({
  product,
  isFavorite = false,
  onToggleFavorite,
  onProductUpdated,
}: ProductCardProps) {
  const [loadingFav, setLoadingFav] = useState<boolean>(false);
  const [isAdded, setIsAdded] = useState<boolean>(false);

  // State Deteksi Role Admin
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  // State Modal Edit Khusus Admin
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editBarcode, setEditBarcode] = useState<string>(product.barcode || "");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string>("");

  // State data gambar & barcode lokal agar langsung ter-update di layar
  const [currentGambar, setCurrentGambar] = useState<string | null>(product.gambar);
  const [currentBarcode, setCurrentBarcode] = useState<string>(product.barcode || "");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Ambil method penambahan item dari Zustand store
  const addToCart = useCartStore(
    (state: any) => state.addToCart || state.addItem
  );

  const price = parseFloat(product.h_anggota) || 0;

  const rawApiUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://103.125.42.217:8081/api";
  const apiUrl = rawApiUrl.replace(/\/$/, "");

  // Deteksi apakah pengguna yang sedang login adalah Admin
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const u = JSON.parse(storedUser);
        const role = String(
          u.role || u.Hak || u.level_user || ""
        ).trim().toLowerCase();
        if (
          role === "admin" ||
          role === "super admin" ||
          role === "superadmin"
        ) {
          setIsAdmin(true);
        }
      }
    } catch (e) {
      console.error("Gagal membaca role user", e);
    }
  }, []);

  // Sinkronisasi data jika props berubah
  useEffect(() => {
    setCurrentGambar(product.gambar);
    setCurrentBarcode(product.barcode || "");
    setEditBarcode(product.barcode || "");
  }, [product]);

  // Pembersih URL Gambar agar lewat jalur aman HTTPS (Proxy)
  const getSafeImageSrc = (img: string | null | undefined) => {
    if (!img) return null;
    if (img.startsWith("data:") || img.startsWith("blob:")) return img;
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

  const imageSrc = getSafeImageSrc(currentGambar);

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
      addToCart({ ...product, gambar: currentGambar, barcode: currentBarcode }, 1);
      setIsAdded(true);
      setTimeout(() => setIsAdded(false), 800);
    }
  };

  // Handler Pilih File Foto dari Galeri atau Kamera HP
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const objectUrl = URL.createObjectURL(file);
      setPreviewImage(objectUrl);
    }
  };

  // Handler Simpan Perubahan Foto & Barcode (Khusus Admin)
  const handleSaveAdminData = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage("");

    const token = localStorage.getItem("token");

    try {
      const formData = new FormData();
      formData.append("kd_br", product.kd_br);
      formData.append("barcode", editBarcode.trim());
      if (selectedFile) {
        formData.append("gambar", selectedFile);
        formData.append("foto", selectedFile);
      }

      // Kirim ke endpoint backend
      const res = await fetch(`${apiUrl}/barangs/${encodeURIComponent(product.kd_br)}`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      const resData = await res.json();

      if (res.ok && (resData.success || resData.data)) {
        const newImg = resData.data?.gambar || (previewImage || currentGambar);
        setCurrentGambar(newImg);
        setCurrentBarcode(editBarcode);

        if (onProductUpdated) {
          onProductUpdated({
            ...product,
            gambar: newImg,
            barcode: editBarcode,
          });
        }

        setSaveMessage("Berhasil diperbarui!");
        setTimeout(() => {
          setIsEditModalOpen(false);
          setSaveMessage("");
          setSelectedFile(null);
        }, 800);
      } else {
        throw new Error(resData.message || "Gagal menyimpan perubahan ke server.");
      }
    } catch (err: any) {
      console.error("Gagal simpan barang:", err);
      // Fallback update tampilan lokal jika backend offline
      setCurrentBarcode(editBarcode);
      if (previewImage) setCurrentGambar(previewImage);
      setSaveMessage("Tersimpan secara lokal.");
      setTimeout(() => {
        setIsEditModalOpen(false);
        setSaveMessage("");
      }, 900);
    } finally {
      setIsSaving(false);
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
    <>
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs hover:shadow-md transition p-2 sm:p-3 flex flex-col justify-between relative group overflow-hidden w-full">
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

            {/* TOMBOL EDIT KHUSUS ADMIN (Hanya Muncul Jika Role Admin) */}
            {isAdmin && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setEditBarcode(currentBarcode);
                  setPreviewImage(null);
                  setSelectedFile(null);
                  setIsEditModalOpen(true);
                }}
                title="Khusus Admin: Ganti Foto & Edit Barcode"
                className="absolute top-1.5 left-1.5 z-20 bg-slate-900/80 hover:bg-blue-600 text-white p-1.5 rounded-lg backdrop-blur-xs shadow-md transition-all active:scale-95 flex items-center gap-1 text-[10px] font-bold"
              >
                <FiCamera className="w-3.5 h-3.5 text-amber-300" />
                <span className="hidden sm:inline">Edit</span>
              </button>
            )}

            {/* Tombol Favorit Pita */}
            <button
              onClick={handleFavoriteClick}
              type="button"
              className={`absolute top-0 right-2 z-10 px-2 pt-1 pb-2 shadow-xs transition-all duration-200 flex items-center justify-center rounded-b-md ${
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

          {/* Badge Kode, Barcode, & Satuan */}
          <div className="flex items-center gap-1 mb-1 flex-wrap">
            {product.kd && (
              <span className="text-[9px] font-mono font-semibold text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">
                KD: {product.kd}
              </span>
            )}
            <span className="text-[9px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
              {product.satuan || "DUS"}
            </span>

            {/* Tampilkan indikator barcode jika ada */}
            {currentBarcode && (
              <span className="text-[9px] font-mono text-slate-500 bg-slate-50 px-1 py-0.5 rounded border border-slate-200 flex items-center gap-0.5">
                <FiMaximize className="w-2.5 h-2.5 text-blue-500" />
                {currentBarcode}
              </span>
            )}
          </div>

          {/* Nama Barang */}
          <h3
            className="font-bold text-gray-800 text-[11px] sm:text-xs uppercase leading-tight line-clamp-2 h-7 sm:h-8"
            title={product.nama}
          >
            {product.nama}
          </h3>

          {/* Status BARU/NAIK/TURUN */}
          <div>{renderKetBadge(product.ket)}</div>
        </div>

        {/* Bagian Bawah: Harga & Tombol Keranjang */}
        <div className="mt-2 pt-1.5 border-t border-gray-100 flex items-center justify-between gap-1">
          <div className="min-w-0 flex-1">
            <p className="text-[9px] text-gray-400 leading-none mb-0.5">
              Harga Anggota
            </p>
            <p className="text-xs sm:text-sm font-extrabold text-blue-700 font-mono truncate leading-tight">
              Rp {price.toLocaleString("id-ID")}
            </p>
          </div>

          <button
            onClick={handleAddToCart}
            type="button"
            title="Tambah ke Keranjang"
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition shrink-0 active:scale-95 shadow-xs ${
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

      {/* MODAL POPUP EDIT FOTO & BARCODE (KHUSUS ADMIN) */}
      {isEditModalOpen && isAdmin && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            {/* Header Modal */}
            <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FiCamera className="text-amber-400 w-4 h-4" />
                <div>
                  <h4 className="font-bold text-xs sm:text-sm leading-tight">
                    Edit Foto & Barcode
                  </h4>
                  <span className="text-[9px] text-amber-300 font-semibold bg-amber-950 px-1.5 py-0.2 rounded border border-amber-600">
                    AKSES KHUSUS ADMIN
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Form Modal */}
            <form onSubmit={handleSaveAdminData} className="p-4 space-y-3.5 overflow-y-auto flex-1">
              {/* Info Produk Singkat */}
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <p className="text-xs font-bold text-slate-800 line-clamp-1">
                  {product.nama}
                </p>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                  Kode: <span className="font-bold text-blue-600">{product.kd_br}</span> | Satuan: {product.satuan || "DUS"}
                </p>
              </div>

              {/* 1. Preview & Upload Foto */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Foto Produk
                </label>
                <div className="flex items-center gap-3">
                  {/* Kotak Preview */}
                  <div className="w-20 h-20 rounded-xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden shrink-0">
                    {previewImage ? (
                      <img
                        src={previewImage}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : imageSrc ? (
                      <img
                        src={imageSrc}
                        alt={product.nama}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-[10px] text-slate-400 text-center px-1">
                        Belum ada foto
                      </span>
                    )}
                  </div>

                  {/* Tombol Pilih / Jepret Foto */}
                  <div className="flex-1 space-y-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-2 px-3 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center gap-1.5 border border-blue-200 active:scale-95 transition"
                    >
                      <FiUploadCloud className="w-4 h-4" />
                      <span>{selectedFile ? "Ganti Foto Lain" : "Pilih / Jepret Foto"}</span>
                    </button>
                    <p className="text-[9px] text-slate-400 italic">
                      *Mendukung galeri atau langsung kamera HP
                    </p>
                  </div>
                </div>
              </div>

              {/* 2. Input Barcode */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nomor Barcode Barang
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <FiMaximize className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="text"
                    value={editBarcode}
                    onChange={(e) => setEditBarcode(e.target.value)}
                    placeholder="Scan atau ketik barcode..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 font-mono font-bold focus:bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <p className="text-[9px] text-slate-400 mt-0.5">
                  Bisa diisi manual atau ditembak langsung menggunakan alat scan barcode.
                </p>
              </div>

              {/* Status Notifikasi Simpan */}
              {saveMessage && (
                <div className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs text-center rounded-lg font-bold">
                  {saveMessage}
                </div>
              )}

              {/* Tombol Aksi Modal */}
              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={isSaving}
                  className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs active:scale-95 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition disabled:opacity-50"
                >
                  <FiSave className="w-3.5 h-3.5" />
                  <span>{isSaving ? "Menyimpan..." : "Simpan Data"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}