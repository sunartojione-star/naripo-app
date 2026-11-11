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
  FiMaximize,
  FiFolder,
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

  // State Deteksi Hak Akses Admin
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  // State Modal Edit Khusus Admin
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editBarcode, setEditBarcode] = useState<string>(product.barcode || "");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string>("");

  // State Kamera Jepret Foto Produk
  const [isPhotoCameraActive, setIsPhotoCameraActive] = useState<boolean>(false);
  const videoPhotoRef = useRef<HTMLVideoElement>(null);
  const photoStreamRef = useRef<MediaStream | null>(null);

  // State Kamera Scanner Barcode (Mendukung Barcode 1D & QR Code 2D)
  const [isBarcodeScannerActive, setIsBarcodeScannerActive] = useState<boolean>(false);
  const html5QrCodeRef = useRef<any>(null);

  // State Data Tampilan Lokal
  const [currentGambar, setCurrentGambar] = useState<string | null>(product.gambar);
  const [currentBarcode, setCurrentBarcode] = useState<string>(product.barcode || "");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const addToCart = useCartStore(
    (state: any) => state.addToCart || state.addItem
  );

  const price = parseFloat(product.h_anggota) || 0;

  const rawApiUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://103.125.42.217:8081/api";
  const apiUrl = rawApiUrl.replace(/\/$/, "");

  // Deteksi Hak Akses Admin dari LocalStorage
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

  useEffect(() => {
    setCurrentGambar(product.gambar);
    setCurrentBarcode(product.barcode || "");
    setEditBarcode(product.barcode || "");
  }, [product]);

  useEffect(() => {
    return () => {
      stopPhotoCamera();
      stopBarcodeScanner();
    };
  }, []);

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

  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(850, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch (e) {}
  };

  // 1. KAMERA JEPRET FOTO PRODUK
  const startPhotoCamera = async () => {
    stopBarcodeScanner();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1080 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      photoStreamRef.current = stream;
      setIsPhotoCameraActive(true);

      setTimeout(() => {
        if (videoPhotoRef.current) {
          videoPhotoRef.current.srcObject = stream;
          videoPhotoRef.current.play();
        }
      }, 100);
    } catch (err) {
      alert("Gagal mengakses kamera: Pastikan izin kamera telah diberikan.");
    }
  };

const capturePhoto = () => {
    if (!videoPhotoRef.current) return;
    const video = videoPhotoRef.current;
    
    // Pastikan video sudah memiliki resolusi yang valid
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 640;
    
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    
    if (ctx) {
      ctx.drawImage(video, 0, 0, width, height);
      
      // Ambil data gambar langsung dalam format DataURL
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      setPreviewImage(dataUrl);

      // Konversi DataURL menjadi File asli
      const arr = dataUrl.split(",");
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      
      const cleanKd = String(product.kd_br).replace(/[^a-zA-Z0-9_-]/g, "_");
      const capturedFile = new File([u8arr], `${cleanKd}.jpg`, {
        type: "image/jpeg",
      });
      
      setSelectedFile(capturedFile);
    }
    
    // Matikan kamera setelah foto berhasil diambil
    stopPhotoCamera();
  };

  const stopPhotoCamera = () => {
    if (photoStreamRef.current) {
      photoStreamRef.current.getTracks().forEach((track) => track.stop());
      photoStreamRef.current = null;
    }
    setIsPhotoCameraActive(false);
  };

  // 2. KAMERA SCANNER (MENDUKUNG BARCODE 1D & QR CODE 2D)
  const startBarcodeScanner = async () => {
    stopPhotoCamera();
    setIsBarcodeScannerActive(true);

    if (!(window as any).Html5Qrcode) {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js";
      script.async = true;
      script.onload = () => initScanner();
      document.body.appendChild(script);
    } else {
      setTimeout(() => initScanner(), 100);
    }
  };

  const initScanner = () => {
    const Html5Qrcode = (window as any).Html5Qrcode;
    if (!Html5Qrcode) return;

    try {
      const html5QrCode = new Html5Qrcode("barcode-scanner-box");
      html5QrCodeRef.current = html5QrCode;

      html5QrCode
        .start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 260, height: 160 },
          },
          (decodedText: string) => {
            playBeep();
            setEditBarcode(decodedText);
            stopBarcodeScanner();
          },
          () => {}
        )
        .catch(() => {
          setIsBarcodeScannerActive(false);
        });
    } catch (e) {
      setIsBarcodeScannerActive(false);
    }
  };

  const stopBarcodeScanner = () => {
    if (html5QrCodeRef.current) {
      try {
        html5QrCodeRef.current
          .stop()
          .then(() => {
            html5QrCodeRef.current?.clear();
            html5QrCodeRef.current = null;
            setIsBarcodeScannerActive(false);
          })
          .catch(() => {
            setIsBarcodeScannerActive(false);
          });
      } catch {
        setIsBarcodeScannerActive(false);
      }
    } else {
      setIsBarcodeScannerActive(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewImage(URL.createObjectURL(file));
      stopPhotoCamera();
    }
  };

  // Helper konversi File ke Base64 murni
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const res = reader.result as string;
        const base64Pure = res.replace(/^data:image\/\w+;base64,/, "");
        resolve(base64Pure);
      };
      reader.onerror = (err) => reject(err);
    });
  };

// 3. SIMPAN FOTO KE SERVER DAN UPDATE BARCODE KE DATABASE (HAPUS KD AGAR TIDAK ERROR BIGINT)
  const handleSaveAdminData = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage("");

    stopPhotoCamera();
    stopBarcodeScanner();

    const token = localStorage.getItem("token");
    const cleanKd = String(product.kd_br).replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `${cleanKd}.jpg`;

    try {
      // TAHAP 1: UPLOAD GAMBAR BASE64 JIKA ADA FOTO BARU
      if (selectedFile) {
        try {
          const base64Data = await fileToBase64(selectedFile);
          await fetch(`${apiUrl}/upload-image`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({
              filename: filename,
              gambar: base64Data,
            }),
          });
        } catch (e) {
          console.warn("Upload base64 dilewati:", e);
        }
      }

      // TAHAP 2: KIRIM FORM-DATA HANYA UNTUK BARCODE & FOTO (JANGAN KIRIM KD ATAU HPP)
      const formData = new FormData();
      formData.append("_method", "PUT");
      formData.append("barcode", editBarcode.trim());
      if (product.nama) formData.append("nama", product.nama);
      if (product.satuan) formData.append("satuan", product.satuan || "DUS");

      if (selectedFile) {
        formData.append("gambar", selectedFile);
      }

      const resUpdate = await fetch(
        `${apiUrl}/barangs/${encodeURIComponent(product.kd_br)}`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: formData,
        }
      );

      const resData = await resUpdate.json();

      if (!resUpdate.ok) {
        const errorMsg =
          resData.message ||
          (resData.errors
            ? Object.values(resData.errors).flat().join("\n")
            : "") ||
          "Gagal update data barang.";
        throw new Error(errorMsg);
      }

     const savedImageName = selectedFile ? filename : currentGambar;
setCurrentGambar(previewImage || savedImageName);
      setCurrentBarcode(editBarcode);

      if (onProductUpdated) {
        onProductUpdated({
          ...product,
          gambar: savedImageName,
          barcode: editBarcode,
        });
      }

      setSaveMessage("Tersimpan di Database!");
      setTimeout(() => {
        setIsEditModalOpen(false);
        setSaveMessage("");
        setSelectedFile(null);
      }, 800);
    } catch (err: any) {
      console.error("Gagal simpan barang:", err);
      alert(err.message || "Gagal menyimpan ke database.");
    } finally {
      setIsSaving(false);
    }
  };

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
      addToCart(
        { ...product, gambar: currentGambar, barcode: currentBarcode },
        1
      );
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
    <>
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs hover:shadow-md transition p-2 sm:p-3 flex flex-col justify-between relative group overflow-hidden w-full">
        <div>
          {/* Gambar Produk */}
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

            {/* TOMBOL EDIT KHUSUS ADMIN */}
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
                title="Khusus Admin: Jepret/Ganti Foto & Scan Barcode"
                className="absolute top-1.5 left-1.5 z-20 bg-slate-900/85 hover:bg-blue-600 text-white p-1.5 rounded-lg shadow-md transition-all active:scale-95 flex items-center gap-1 text-[10px] font-bold"
              >
                <FiCamera className="w-3.5 h-3.5 text-amber-300" />
                <span className="hidden sm:inline">Edit</span>
              </button>
            )}

            {/* Tombol Favorit */}
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

          {/* Badge & Info */}
          <div className="flex items-center gap-1 mb-1 flex-wrap">
            {product.kd && (
              <span className="text-[9px] font-mono font-semibold text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">
                KD: {product.kd}
              </span>
            )}
            <span className="text-[9px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
              {product.satuan || "DUS"}
            </span>
            {currentBarcode && (
              <span className="text-[9px] font-mono text-slate-500 bg-slate-50 px-1 py-0.5 rounded border border-slate-200 flex items-center gap-0.5">
                <FiMaximize className="w-2.5 h-2.5 text-blue-500" />
                {currentBarcode}
              </span>
            )}
          </div>

          <h3
            className="font-bold text-gray-800 text-[11px] sm:text-xs uppercase leading-tight line-clamp-2 h-7 sm:h-8"
            title={product.nama}
          >
            {product.nama}
          </h3>

          <div>{renderKetBadge(product.ket)}</div>
        </div>

        {/* Harga & Tombol Keranjang */}
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
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
            
            {/* Header Modal */}
            <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FiCamera className="text-amber-400 w-4 h-4" />
                <div>
                  <h4 className="font-bold text-xs sm:text-sm leading-tight">
                    Edit Foto & Barcode
                  </h4>
                  <span className="text-[9px] text-amber-300 font-semibold">
                    AKSES KHUSUS ADMIN
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  stopPhotoCamera();
                  stopBarcodeScanner();
                  setIsEditModalOpen(false);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Form Konten */}
            <form
              onSubmit={handleSaveAdminData}
              className="p-4 space-y-4 overflow-y-auto flex-1"
            >
              {/* Info Produk */}
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <p className="text-xs font-bold text-slate-800 line-clamp-1">
                  {product.nama}
                </p>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                  Kode: <span className="font-bold text-blue-600">{product.kd_br}</span> | Satuan: {product.satuan || "DUS"}
                </p>
              </div>

              {/* 1. BAGIAN FOTO PRODUK */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  1. Foto Produk
                </label>

                {isPhotoCameraActive ? (
                  <div className="relative rounded-xl overflow-hidden bg-black border-2 border-blue-500 flex flex-col items-center">
                    <video
                      ref={videoPhotoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-48 object-cover"
                    ></video>
                    <div className="absolute bottom-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={capturePhoto}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-full font-bold text-xs shadow-lg flex items-center gap-1.5 active:scale-95 transition"
                      >
                        <FiCamera className="w-4 h-4" /> Jepret Foto
                      </button>
                      <button
                        type="button"
                        onClick={stopPhotoCamera}
                        className="bg-slate-800/80 hover:bg-slate-900 text-white px-3 py-1.5 rounded-full text-xs"
                      >
                        Tutup
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
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

                    <div className="flex-1 space-y-1.5">
                      <button
                        type="button"
                        onClick={startPhotoCamera}
                        className="w-full py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition shadow-xs"
                      >
                        <FiCamera className="w-3.5 h-3.5" />
                        <span>Buka Kamera (Jepret)</span>
                      </button>

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
                        className="w-full py-1.5 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-200 active:scale-95 transition"
                      >
                        <FiFolder className="w-3.5 h-3.5 text-slate-500" />
                        <span>Pilih dari File / Galeri</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. BAGIAN NOMOR BARCODE */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-800">
                  2. Barcode Produk (Garis 1D / QR Code 2D)
                </label>

                {isBarcodeScannerActive && (
                  <div className="relative rounded-xl overflow-hidden bg-black border-2 border-emerald-500 p-1 mb-2">
                    <div id="barcode-scanner-box" className="w-full h-44"></div>
                    <button
                      type="button"
                      onClick={stopBarcodeScanner}
                      className="absolute top-2 right-2 bg-slate-800 text-white p-1 rounded-full text-xs"
                    >
                      <FiX className="w-4 h-4" />
                    </button>
                    <p className="text-[10px] text-emerald-400 text-center py-1">
                      Arahkan kamera ke Barcode Garis atau QR Code...
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-1.5">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <FiMaximize className="w-3.5 h-3.5" />
                    </div>
                    <input
                      ref={barcodeInputRef}
                      type="text"
                      value={editBarcode}
                      onChange={(e) => setEditBarcode(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                        }
                      }}
                      placeholder="Scan alat barcode atau ketik angka..."
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 font-mono font-bold focus:bg-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={startBarcodeScanner}
                    className="py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-xl font-bold text-xs flex items-center gap-1 shrink-0 active:scale-95 transition"
                    title="Buka Kamera Scan Barcode / QR Code"
                  >
                    <FiCamera className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Scan Kamera</span>
                  </button>
                </div>

                <p className="text-[9px] text-slate-400 italic">
                  *Bisa mendeteksi Barcode Garis (1D) maupun QR Code (2D), atau tembak dengan alat scan di PC.
                </p>
              </div>

              {/* Status Notifikasi */}
              {saveMessage && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs text-center rounded-xl font-bold">
                  {saveMessage}
                </div>
              )}

              {/* Tombol Aksi */}
              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    stopPhotoCamera();
                    stopBarcodeScanner();
                    setIsEditModalOpen(false);
                  }}
                  disabled={isSaving}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs active:scale-95 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition disabled:opacity-50"
                >
                  <FiSave className="w-3.5 h-3.5" />
                  <span>{isSaving ? "Menyimpan ke Server..." : "Simpan Data"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}