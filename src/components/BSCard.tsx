"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { useCartStoreBS } from "@/store/cartStoreBS";
import BSDetailModal from "@/components/BSDetailModal";
import {
  FiHeart,
  FiShoppingCart,
  FiCheck,
  FiCamera,
  FiX,
  FiSave,
  FiMaximize,
  FiFolder,
  FiAlertTriangle,
  FiAlertCircle,
} from "react-icons/fi";

export interface BarangBS {
  kd_bs: string | number;
  nama: string;
  nilai_anggota: string | number;
  merk: string;
  nilai_pcs?: string | number;
  barcode?: string;
  gambar?: string | null;
}

export type Barang = BarangBS;

interface BSCardProps {
  product: BarangBS;
  isFavorite?: boolean;
  onToggleFavorite?: (product: BarangBS) => Promise<void>;
  onProductUpdated?: (updatedProduct: BarangBS) => void;
  onSelectProduct?: (product: BarangBS) => void;
}

const isPlaceholderBarcode = (val: string | null | undefined): boolean => {
  const clean = String(val || "").trim();
  return clean === "" || clean === "0" || clean === "-";
};

export default function BSCard({
  product,
  isFavorite = false,
  onToggleFavorite,
  onProductUpdated,
  onSelectProduct,
}: BSCardProps) {
  const router = useRouter();
  const [loadingFav, setLoadingFav] = useState<boolean>(false);
  const [isAdded, setIsAdded] = useState<boolean>(false);

  // Fallback detail modal jika halaman induk belum mengoper onSelectProduct
  const [internalSelectedProduct, setInternalSelectedProduct] =
    useState<BarangBS | null>(null);

  // State Modal Input Qty & Popup Duplikat
  const [showQtyModal, setShowQtyModal] = useState<boolean>(false);
  const [showDuplicatePopup, setShowDuplicatePopup] = useState<boolean>(false);
  const [qtyInput, setQtyInput] = useState<string>("1");

  // State Deteksi Hak Akses Admin
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  const initialCleanBarcode = isPlaceholderBarcode(product.barcode)
    ? ""
    : String(product.barcode).trim();

  // State Modal Edit Khusus Admin
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editBarcode, setEditBarcode] = useState<string>(initialCleanBarcode);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  // State Kamera Jepret Foto
  const [isPhotoCameraActive, setIsPhotoCameraActive] = useState<boolean>(false);
  const videoPhotoRef = useRef<HTMLVideoElement>(null);
  const photoStreamRef = useRef<MediaStream | null>(null);

  // State Kamera Scanner Barcode (1D & QR Code 2D)
  const [isBarcodeScannerActive, setIsBarcodeScannerActive] =
    useState<boolean>(false);
  const html5QrCodeRef = useRef<any>(null);

  // State Data Tampilan Lokal
  const [currentGambar, setCurrentGambar] = useState<string | null>(
    product.gambar || null
  );
  const [currentBarcode, setCurrentBarcode] =
    useState<string>(initialCleanBarcode);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const addToCart = useCartStoreBS(
    (state: any) => state.addToCart || state.addItem
  );
  const cartItems = useCartStoreBS(
    (state: any) => state.cartItems || state.items || []
  );

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

  const parsePrice = (val: string | number | undefined): number => {
    if (typeof val === "number") return val;
    if (typeof val === "string") {
      const clean = val.replace(/[^0-9.-]+/g, "");
      return parseFloat(clean) || 0;
    }
    return 0;
  };

  const price = parsePrice(product.nilai_anggota);
  const parsedPreviewQty = Math.max(1, parseInt(qtyInput, 10) || 1);

  const rawApiUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://103.125.42.217:8081/api";
  const apiUrl = rawApiUrl.replace(/\/$/, "");

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const u = JSON.parse(storedUser);
        const role = String(u.role || u.Hak || u.level_user || "")
          .trim()
          .toLowerCase();
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
    const clean = isPlaceholderBarcode(product.barcode)
      ? ""
      : String(product.barcode).trim();
    setCurrentGambar(product.gambar || null);
    setCurrentBarcode(clean);
    setEditBarcode(clean);
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
    } catch {}
  };

  const startPhotoCamera = async () => {
    stopBarcodeScanner();
    setErrorMessage("");
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
    } catch {
      setErrorMessage(
        "Gagal mengakses kamera. Pastikan izin kamera pada browser sudah diaktifkan."
      );
    }
  };

  const capturePhoto = () => {
    if (!videoPhotoRef.current) return;
    const video = videoPhotoRef.current;

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 640;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    if (ctx) {
      ctx.drawImage(video, 0, 0, width, height);

      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      setPreviewImage(dataUrl);

      const arr = dataUrl.split(",");
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }

      const cleanKd = String(product.kd_bs).replace(/[^a-zA-Z0-9_-]/g, "_");
      const capturedFile = new File([u8arr], `bs_${cleanKd}.jpg`, {
        type: "image/jpeg",
      });

      setSelectedFile(capturedFile);
    }

    stopPhotoCamera();
  };

  const stopPhotoCamera = () => {
    if (photoStreamRef.current) {
      photoStreamRef.current.getTracks().forEach((track) => track.stop());
      photoStreamRef.current = null;
    }
    setIsPhotoCameraActive(false);
  };

  const startBarcodeScanner = async () => {
    stopPhotoCamera();
    setErrorMessage("");
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
      const html5QrCode = new Html5Qrcode("bs-barcode-scanner-box");
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
          setErrorMessage("Gagal membuka kamera scanner barcode.");
        });
    } catch {
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
    setErrorMessage("");
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewImage(URL.createObjectURL(file));
      stopPhotoCamera();
    }
  };

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

  const handleSaveAdminData = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage("");
    setErrorMessage("");

    stopPhotoCamera();
    stopBarcodeScanner();

    const token =
      localStorage.getItem("token") || localStorage.getItem("auth_token");
    const cleanKd = String(product.kd_bs).replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `bs_${cleanKd}.jpg`;

    const trimmedBarcode = editBarcode.trim();
    const isBarcodeEmpty = isPlaceholderBarcode(trimmedBarcode);

    try {
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
              filename,
              gambar: base64Data,
            }),
          });
        } catch (err) {
          console.warn("Upload base64 dilewati:", err);
        }
      }

      const formData = new FormData();
      formData.append("_method", "PUT");

      // Hanya kirim barcode jika valid dan benar-benar berubah (hindari kirim "0" atau "" yang duplikat)
      if (!isBarcodeEmpty && trimmedBarcode !== currentBarcode) {
        formData.append("barcode", trimmedBarcode);
      }

      if (product.nama) formData.append("nama", product.nama);
      if (selectedFile) {
        formData.append("gambar", selectedFile);
      }

      // Catatan: pastikan route PUT /api/bsss/{kd_bs} atau /api/bs/{kd_bs} sesuai dengan routes/api.php Laravel
      const resUpdate = await fetch(
        `${apiUrl}/bsss/${encodeURIComponent(String(product.kd_bs))}`,
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
        const msg =
          resData.message ||
          (resData.errors
            ? Object.values(resData.errors).flat().join("\n")
            : "") ||
          "Gagal update data BS.";
        throw new Error(msg);
      }

      const savedImageName = selectedFile ? filename : currentGambar;
      const finalBarcode = isBarcodeEmpty ? "" : trimmedBarcode;
      setCurrentGambar(previewImage || savedImageName);
      setCurrentBarcode(finalBarcode);

      if (onProductUpdated) {
        onProductUpdated({
          ...product,
          gambar: savedImageName,
          barcode: finalBarcode,
        });
      }

      setSaveMessage("Tersimpan di Database!");
      setTimeout(() => {
        setIsEditModalOpen(false);
        setSaveMessage("");
        setSelectedFile(null);
      }, 800);
    } catch (err: any) {
      console.error("Gagal simpan BS:", err);
      setErrorMessage(err.message || "Gagal menyimpan ke database.");
    } finally {
      setIsSaving(false);
    }
  };

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

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setQtyInput("1");
    if (existingCartItem) {
      setShowDuplicatePopup(true);
      return;
    }
    setShowQtyModal(true);
  };

  const handleConfirmAddToCart = (e: React.FormEvent | React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const parsedQty = Math.max(1, parseInt(qtyInput, 10) || 1);
    if (addToCart) {
      addToCart(
        {
          ...product,
          gambar: currentGambar,
          barcode: currentBarcode,
          qty: parsedQty,
          quantity: parsedQty,
        },
        parsedQty
      );
      setIsAdded(true);
      setTimeout(() => setIsAdded(false), 800);
    }
    setShowQtyModal(false);
  };

  const handleOpenDetail = () => {
    const payload: BarangBS = {
      ...product,
      gambar: currentGambar,
      barcode: currentBarcode,
    };
    if (onSelectProduct) {
      onSelectProduct(payload);
    } else {
      setInternalSelectedProduct(payload);
    }
  };

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs hover:shadow-md transition p-2 sm:p-3 flex flex-col justify-between relative group overflow-hidden w-full">
        <div>
          <div
            onClick={handleOpenDetail}
            className="w-full aspect-square bg-gray-100 rounded-lg mb-2 flex items-center justify-center overflow-hidden relative border border-gray-100 cursor-pointer"
          >
            {imageSrc ? (
              <img
                src={imageSrc}
                alt={product.nama}
                loading="lazy"
                decoding="async"
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

            {isAdmin && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setEditBarcode(currentBarcode);
                  setPreviewImage(null);
                  setSelectedFile(null);
                  setErrorMessage("");
                  setSaveMessage("");
                  setIsEditModalOpen(true);
                }}
                title="Khusus Admin: Jepret/Ganti Foto & Scan Barcode"
                className="absolute top-1.5 left-1.5 z-20 bg-slate-900/85 hover:bg-blue-600 text-white p-1.5 rounded-lg shadow-md transition-all active:scale-95 flex items-center gap-1 text-[10px] font-bold"
              >
                <FiCamera className="w-3.5 h-3.5 text-amber-300" />
                <span className="hidden sm:inline">Edit</span>
              </button>
            )}

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
                className={`w-3.5 h-3.5 ${isFavorite ? "fill-white" : ""}`}
              />
            </button>
          </div>

          <div className="flex items-center gap-1 mb-1 flex-wrap">
            {product.kd_bs && (
              <span className="text-[9px] font-mono font-semibold text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">
                KD: {product.kd_bs}
              </span>
            )}
            {product.merk && (
              <span className="text-[9px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded truncate max-w-[140px]">
                {product.merk}
              </span>
            )}
            {currentBarcode && (
              <span className="text-[9px] font-mono text-slate-500 bg-slate-50 px-1 py-0.5 rounded border border-slate-200 flex items-center gap-0.5">
                <FiMaximize className="w-2.5 h-2.5 text-blue-500" />
                {currentBarcode}
              </span>
            )}
          </div>

          <h3
            onClick={handleOpenDetail}
            className="font-bold text-gray-800 text-[11px] sm:text-xs uppercase leading-tight line-clamp-2 h-7 sm:h-8 cursor-pointer hover:text-blue-700"
            title={product.nama}
          >
            {product.nama}
          </h3>
        </div>

        <div className="mt-2 pt-1.5 border-t border-gray-100 flex items-center justify-between gap-1">
          <div className="min-w-0 flex-1">
            <p className="text-[9px] text-gray-400 leading-none mb-0.5">
              Nilai Anggota
            </p>
            <p className="text-xs sm:text-sm font-extrabold text-blue-700 font-mono truncate leading-tight">
              Rp {price.toLocaleString("id-ID")}
            </p>
          </div>

          <button
            onClick={handleAddToCart}
            type="button"
            title="Tambah ke Keranjang BS"
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

      {!onSelectProduct && internalSelectedProduct && (
        <BSDetailModal
          product={internalSelectedProduct}
          onClose={() => setInternalSelectedProduct(null)}
        />
      )}

      {showDuplicatePopup && (
        <div
          className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowDuplicatePopup(false);
          }}
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
                  <span>Sudah ada di keranjang BS (Qty: {existingCartQty})</span>
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
                    setShowQtyModal(true);
                  }}
                  className="py-2.5 px-3 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-50 active:scale-95 transition"
                >
                  Tetap Tambah
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDuplicatePopup(false);
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

      {showQtyModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowQtyModal(false);
          }}
        >
          <form
            onSubmit={handleConfirmAddToCart}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl w-full max-w-xs p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h4 className="font-bold text-gray-800 text-sm leading-snug line-clamp-2">
                  {product.nama}
                </h4>
                <p className="text-xs text-blue-600 font-semibold mt-1">
                  Rp {price.toLocaleString("id-ID")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowQtyModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg shrink-0"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() =>
                  setQtyInput((prev) =>
                    String(Math.max(1, (parseInt(prev, 10) || 1) - 1))
                  )
                }
                className="w-10 h-10 rounded-xl border border-gray-300 bg-gray-50 hover:bg-gray-100 text-lg font-bold text-gray-700 active:scale-95 transition"
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
                className="w-20 h-10 rounded-xl border border-gray-300 text-center text-base font-bold text-gray-800 focus:border-blue-500 focus:outline-none"
              />

              <button
                type="button"
                onClick={() =>
                  setQtyInput((prev) =>
                    String((parseInt(prev, 10) || 0) + 1)
                  )
                }
                className="w-10 h-10 rounded-xl border border-gray-300 bg-gray-50 hover:bg-gray-100 text-lg font-bold text-gray-700 active:scale-95 transition"
              >
                +
              </button>
            </div>

            <div className="bg-blue-50 rounded-xl px-3 py-2 flex items-center justify-between text-xs">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-extrabold text-blue-700 font-mono">
                Rp {(price * parsedPreviewQty).toLocaleString("id-ID")}
              </span>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowQtyModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs active:scale-95 transition"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition"
              >
                <FiShoppingCart className="w-3.5 h-3.5" />
                <span>Masukkan</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {isEditModalOpen && isAdmin && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
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

            <form
              onSubmit={handleSaveAdminData}
              className="p-4 space-y-4 overflow-y-auto flex-1"
            >
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <p className="text-xs font-bold text-slate-800 line-clamp-1">
                  {product.nama}
                </p>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                  KD BS:{" "}
                  <span className="font-bold text-blue-600">
                    {product.kd_bs}
                  </span>{" "}
                  | Merk: {product.merk || "-"}
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  1. Foto Barang BS
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

              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-800">
                  2. Barcode Produk (Opsional — Garis 1D / QR Code 2D)
                </label>

                {isBarcodeScannerActive && (
                  <div className="relative rounded-xl overflow-hidden bg-black border-2 border-emerald-500 p-1 mb-2">
                    <div id="bs-barcode-scanner-box" className="w-full h-44"></div>
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
                      placeholder="Boleh kosong, atau scan/ketik barcode..."
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
                  *Bisa dikosongkan jika hanya ingin menyimpan foto, atau scan
                  Barcode 1D / QR Code 2D.
                </p>
              </div>

              {errorMessage && (
                <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-1.5">
                  <FiAlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {saveMessage && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs text-center rounded-xl font-bold">
                  {saveMessage}
                </div>
              )}

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
                  <span>
                    {isSaving ? "Menyimpan ke Server..." : "Simpan Data"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}