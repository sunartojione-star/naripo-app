// src/pages/order-kasir.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import Layout from "@/components/Layout";
import {
  FiSearch,
  FiCamera,
  FiSave,
  FiTrash2,
  FiMinus,
  FiPlus,
  FiX,
  FiCheckCircle,
  FiMessageCircle,
  FiAlertCircle,
  FiArrowLeft,
  FiShoppingBag,
} from "react-icons/fi";
import {
  buildWhatsAppUrl,
  fetchAdminWA,
  getLocalAdminWA,
  getLocalDateYYYYMMDD,
  formatDateDDMMYYYY,
} from "@/utils/waHelper";

const KASIR_DRAFT_KEY = "naripo_order_kasir_draft";

interface KasirPOItem {
  kd_br: string;
  kd: string;
  nama: string;
  satuan: string;
  harga: number;
  qty: number;
  rasa: string;
}

function extractKdTran(res: any): string | number | null {
  if (!res) return null;
  if (typeof res === "number" || (typeof res === "string" && res.trim() !== "")) {
    return res;
  }
  if (Array.isArray(res) && res.length > 0) {
    return extractKdTran(res[0]);
  }
  if (typeof res === "object") {
    const candidateKeys = [
      "kd_tran",
      "KD_TRAN",
      "Kd_Tran",
      "no_tran",
      "NO_TRAN",
      "kd_po",
      "KD_PO",
      "no_po",
      "NO_PO",
      "nomor",
      "NOMOR",
      "id",
      "ID",
    ];
    for (const key of candidateKeys) {
      if (res[key] !== undefined && res[key] !== null && res[key] !== "") {
        return res[key];
      }
    }
    if (res.data) return extractKdTran(res.data);
    if (res.result) return extractKdTran(res.result);
  }
  return null;
}

export default function OrderKasirPage() {
  const router = useRouter();

  const [searchInput, setSearchInput] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [searching, setSearching] = useState(false);
  const [items, setItems] = useState<KasirPOItem[]>([]);

  const [deliveryDate, setDeliveryDate] = useState("");
  const [catatan, setCatatan] = useState("");
  const [loading, setLoading] = useState(false);
  const [adminWA, setAdminWA] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const [successInfo, setSuccessInfo] = useState<{
    kdTran: string | number;
    total: number;
    waUrl: string;
  } | null>(null);

  const [isScannerActive, setIsScannerActive] = useState(false);
  const html5QrCodeRef = useRef<any>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const resultRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const qtyInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const hasLoadedDraft = useRef(false);

  const [customerInfo, setCustomerInfo] = useState({
    nama: "CUSTOMER",
    user: "ADMIN",
    kd_cus: "",
    jenis: "ADMIN",
  });

  const rawApiUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://103.125.42.217:8081/api";
  const apiUrl = rawApiUrl.replace(/\/$/, "");

  // Muat draft tersimpan, nomor WA admin dari database, & info user saat halaman dibuka
  useEffect(() => {
    setDeliveryDate(getLocalDateYYYYMMDD());
    setAdminWA(getLocalAdminWA());

    const token =
      localStorage.getItem("token") || localStorage.getItem("auth_token");
    fetchAdminWA(apiUrl, token).then((wa) => {
      if (wa) setAdminWA(wa);
    });

    try {
      const savedDraft = localStorage.getItem(KASIR_DRAFT_KEY);
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (Array.isArray(parsed.items)) {
          setItems(parsed.items);
        }
        if (typeof parsed.catatan === "string") {
          setCatatan(parsed.catatan);
        }
      }
    } catch {}
    hasLoadedDraft.current = true;

    try {
      const savedUserStr = localStorage.getItem("user");
      const localKdCus =
        localStorage.getItem("kd_cus") || localStorage.getItem("kdCus") || "";
      if (savedUserStr) {
        const u = JSON.parse(savedUserStr);
        const roleRaw = String(
          u?.role || u?.Hak || u?.level_user || ""
        )
          .trim()
          .toUpperCase();
        const jenisDetected =
          roleRaw === "KASIR"
            ? "KASIR"
            : roleRaw.includes("ADMIN")
            ? "ADMIN"
            : "ADMIN";

        setCustomerInfo({
          nama: u?.name || u?.nama || "CUSTOMER",
          user: u?.username || u?.nama || "ADMIN",
          kd_cus: String(
            u?.kd_cus || localKdCus || u?.username || ""
          ).trim(),
          jenis: jenisDetected,
        });
      }
    } catch {}

    return () => {
      stopScanner();
    };
  }, [apiUrl]);

  // Tutup keyboard HP otomatis saat layar mulai di-scroll
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.scrollY > 20 &&
        document.activeElement === searchInputRef.current
      ) {
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Simpan otomatis ke localStorage setiap kali daftar barang / catatan berubah
  useEffect(() => {
    if (!hasLoadedDraft.current) return;
    try {
      localStorage.setItem(
        KASIR_DRAFT_KEY,
        JSON.stringify({ items, catatan })
      );
    } catch {}
  }, [items, catatan]);

  useEffect(() => {
    const q = searchInput.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setHighlightedIndex(-1);
      return;
    }

    const timer = setTimeout(() => {
      searchBarang(q, false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (highlightedIndex >= 0 && resultRefs.current[highlightedIndex]) {
      resultRefs.current[highlightedIndex]?.scrollIntoView({
        block: "nearest",
      });
    }
  }, [highlightedIndex]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2200);
  };

  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } catch {}
  };

  const parsePrice = (val: any): number => {
    if (typeof val === "number") return val;
    if (typeof val === "string") {
      return parseFloat(val.replace(/[^0-9.-]+/g, "")) || 0;
    }
    return 0;
  };

  const addProductToKasir = (prod: any) => {
    const kdBr = String(prod.kd_br || prod.kd || prod.id || "").trim();
    if (!kdBr) return;

    const harga = Math.round(
      parsePrice(prod.h_anggota || prod.price || prod.hpp)
    );

    setItems((prev) => {
      const existingIdx = prev.findIndex((i) => i.kd_br === kdBr);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          qty: updated[existingIdx].qty + 1,
        };
        return updated;
      }
      return [
        {
          kd_br: kdBr,
          kd: String(prod.kd || "").trim(),
          nama: String(prod.nama || prod.name || "-").trim(),
          satuan: String(prod.satuan || "DUS").trim(),
          harga,
          qty: 1,
          rasa: "",
        },
        ...prev,
      ];
    });

    playBeep();
    showToast(`+ ${prod.nama || kdBr}`);
    setSearchInput("");
    setSearchResults([]);
    setHighlightedIndex(-1);

    // Di desktop fokus ke kolom qty; di layar sentuh HP/tablet biarkan keyboard tertutup rapi
    const isTouchDevice =
      typeof window !== "undefined" &&
      ("ontouchstart" in window || navigator.maxTouchPoints > 0);
    if (isTouchDevice) {
      searchInputRef.current?.blur();
    } else {
      setTimeout(() => {
        const qtyEl = qtyInputRefs.current[kdBr];
        if (qtyEl) {
          qtyEl.focus();
          qtyEl.select();
        }
      }, 50);
    }
  };

  const searchBarang = async (query: string, autoPickExact: boolean) => {
    setSearching(true);
    setErrorMsg(null);
    const token =
      localStorage.getItem("token") || localStorage.getItem("auth_token");

    try {
      const res = await fetch(
        `${apiUrl}/barangs?search=${encodeURIComponent(query)}&limit=15`,
        {
          headers: {
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );

      if (!res.ok) throw new Error("Gagal mencari barang.");
      const json = await res.json();
      const list: any[] = Array.isArray(json)
        ? json
        : Array.isArray(json?.data)
        ? json.data
        : [];

      if (autoPickExact) {
        const qLower = query.trim().toLowerCase();
        const exact = list.find(
          (p) =>
            String(p.barcode || "").trim().toLowerCase() === qLower ||
            String(p.kd_br || "").trim().toLowerCase() === qLower ||
            String(p.kd || "").trim().toLowerCase() === qLower
        );
        if (exact) {
          addProductToKasir(exact);
          return;
        }
        if (list.length === 1) {
          addProductToKasir(list[0]);
          return;
        }
        if (list.length === 0) {
          setErrorMsg(`Barang "${query}" tidak ditemukan.`);
        }
      }

      setSearchResults(list);
      setHighlightedIndex(list.length > 0 ? 0 : -1);
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal mengambil data barang.");
    } finally {
      setSearching(false);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "PageDown") {
      if (searchResults.length > 0) {
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < searchResults.length - 1 ? prev + 1 : 0
        );
      }
      return;
    }

    if (e.key === "ArrowUp" || e.key === "PageUp") {
      if (searchResults.length > 0) {
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : searchResults.length - 1
        );
      }
      return;
    }

    if (e.key === "Escape") {
      setSearchResults([]);
      setHighlightedIndex(-1);
      searchInputRef.current?.blur();
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      searchInputRef.current?.blur();
      if (searchResults.length > 0 && highlightedIndex >= 0) {
        const chosen = searchResults[highlightedIndex];
        if (chosen) {
          addProductToKasir(chosen);
          return;
        }
      }
      if (searchInput.trim()) {
        searchBarang(searchInput.trim(), true);
      }
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    searchInputRef.current?.blur();
    if (searchResults.length > 0 && highlightedIndex >= 0) {
      const chosen = searchResults[highlightedIndex];
      if (chosen) {
        addProductToKasir(chosen);
        return;
      }
    }
    if (searchInput.trim()) {
      searchBarang(searchInput.trim(), true);
    }
  };

  const startScanner = async () => {
    searchInputRef.current?.blur();
    setErrorMsg(null);
    setIsScannerActive(true);

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
      const html5QrCode = new Html5Qrcode("kasir-po-scanner-box");
      html5QrCodeRef.current = html5QrCode;

      html5QrCode
        .start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 260, height: 150 } },
          (decodedText: string) => {
            stopScanner();
            searchBarang(decodedText, true);
          },
          () => {}
        )
        .catch(() => {
          setIsScannerActive(false);
          setErrorMsg("Gagal membuka kamera scanner.");
        });
    } catch {
      setIsScannerActive(false);
    }
  };

  const stopScanner = () => {
    if (html5QrCodeRef.current) {
      try {
        html5QrCodeRef.current
          .stop()
          .then(() => {
            html5QrCodeRef.current?.clear();
            html5QrCodeRef.current = null;
            setIsScannerActive(false);
          })
          .catch(() => setIsScannerActive(false));
      } catch {
        setIsScannerActive(false);
      }
    } else {
      setIsScannerActive(false);
    }
  };

  const updateItemQty = (kdBr: string, nextQty: number) => {
    const safeQty = Math.max(1, Math.min(9999, nextQty));
    setItems((prev) =>
      prev.map((item) =>
        item.kd_br === kdBr ? { ...item, qty: safeQty } : item
      )
    );
  };

  const updateItemRasa = (kdBr: string, rasa: string) => {
    setItems((prev) =>
      prev.map((item) => (item.kd_br === kdBr ? { ...item, rasa } : item))
    );
  };

  const removeItem = (kdBr: string) => {
    setItems((prev) => prev.filter((item) => item.kd_br !== kdBr));
  };

  const totalItemCount = items.length;
  const totalQtyCount = items.reduce((acc, item) => acc + item.qty, 0);
  const grandTotal = Math.round(
    items.reduce((acc, item) => acc + item.harga * item.qty, 0)
  );

  const handleSimpanPO = async () => {
    setErrorMsg(null);

    if (!deliveryDate) {
      setErrorMsg("Pilih tanggal kirim terlebih dahulu.");
      return;
    }

    const token =
      localStorage.getItem("token") || localStorage.getItem("auth_token");
    if (!token) {
      router.push("/login");
      return;
    }

    if (items.length === 0) {
      setErrorMsg("Belum ada barang yang di-scan atau dipilih.");
      return;
    }

    const activeKdCus = String(customerInfo.kd_cus || "").trim();
    if (!activeKdCus) {
      setErrorMsg("Kode pelanggan (kd_cus) tidak ditemukan. Silakan login ulang.");
      return;
    }

    setLoading(true);

    try {
      const now = new Date();
      const today = getLocalDateYYYYMMDD(now);
      const jamSekarang = now.toLocaleTimeString("id-ID", { hour12: false });
      const namaUserLogin = customerInfo.nama || customerInfo.user || "ADMIN";
      const jenisOrder = customerInfo.jenis || "ADMIN";
      const ketFinal = catatan.trim()
        ? `Kirim: ${deliveryDate} | ${catatan.trim()}`
        : `Kirim: ${deliveryDate}`;

      const headerPayload = {
        tgl: today,
        TGL: today,
        jam: jamSekarang,
        JAM: jamSekarang,
        tgl_kirim: deliveryDate,
        TGL_KIRIM: deliveryDate,
        ket: ketFinal,
        KET: ketFinal,
        kd_cus: activeKdCus,
        KD_CUS: activeKdCus,
        nama_pelanggan: customerInfo.nama,
        NAMA_PELANGGAN: customerInfo.nama,
        status: "PROSES ORDER",
        STATUS: "PROSES ORDER",
        total: grandTotal,
        TOTAL: grandTotal,
        jumlah: grandTotal,
        JUMLAH: grandTotal,
        nilai: grandTotal,
        NILAI: grandTotal,
        rp_total: grandTotal,
        RP_TOTAL: grandTotal,
        nilai_po: grandTotal,
        NILAI_PO: grandTotal,
        nama_admin: namaUserLogin,
        NAMA_ADMIN: namaUserLogin,
        nama_adm: namaUserLogin,
        NAMA_ADM: namaUserLogin,
        admin: namaUserLogin,
        ADMIN: namaUserLogin,
        pemesan: namaUserLogin,
        PEMESAN: namaUserLogin,
        user: namaUserLogin,
        USER: namaUserLogin,
        kpb: namaUserLogin,
        KPB: namaUserLogin,
        jenis: jenisOrder,
        JENIS: jenisOrder,
      };

      const resHeader = await fetch(`${apiUrl}/po-note`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(headerPayload),
      });

      const resultHeader = await resHeader.json();
      if (
        !resHeader.ok ||
        (resultHeader.success !== undefined && !resultHeader.success)
      ) {
        throw new Error(resultHeader.message || "Gagal membuat Header PO Note");
      }

      const createdKdTran = extractKdTran(resultHeader);
      if (!createdKdTran) {
        throw new Error("Nomor transaksi (kd_tran) tidak ditemukan dari server.");
      }

      const bulkPayload = {
        items: items.map((item, idx) => ({
          no_tran: parseInt(String(createdKdTran), 10),
          NO_URUT: idx + 1,
          KD_BR: item.kd_br,
          RASA: item.rasa.trim() || "-",
          QTY: Math.round(item.qty),
          SAT: item.satuan || "DUS",
          harga: Math.round(item.harga),
          subtotal: Math.round(item.harga * item.qty),
          kd: item.kd,
          nama_br: item.nama,
        })),
      };

      const resDetail = await fetch(`${apiUrl}/detail-po-plg/bulk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(bulkPayload),
      });

      const resultDetail = await resDetail.json();
      if (
        !resDetail.ok ||
        (resultDetail.success !== undefined && !resultDetail.success)
      ) {
        throw new Error(
          resultDetail.message || "Gagal menyimpan rincian pesanan PO"
        );
      }

      const waMessage = [
        "*INFO PESANAN BARU (PO)*",
        `No PO: *${createdKdTran}*`,
        `Pelanggan: ${customerInfo.nama} (${activeKdCus})`,
        `Tgl Kirim: ${formatDateDDMMYYYY(deliveryDate)}`,
        "",
        `Total Item: ${totalQtyCount} item`,
        `*Total Akhir: Rp ${grandTotal.toLocaleString("id-ID")}*`,
        "",
        "*Segera Proses*",
      ].join("\n");

      const latestAdminWA = await fetchAdminWA(apiUrl, token);
      const targetWA = latestAdminWA || adminWA || getLocalAdminWA();
      if (latestAdminWA) setAdminWA(latestAdminWA);
      const waUrl = buildWhatsAppUrl(targetWA, waMessage);

      // Hapus draft tersimpan setelah sukses simpan PO
      localStorage.removeItem(KASIR_DRAFT_KEY);
      setItems([]);
      setCatatan("");
      setSuccessInfo({
        kdTran: createdKdTran,
        total: grandTotal,
        waUrl,
      });

      window.open(waUrl, "_blank", "noopener,noreferrer");
    } catch (err: any) {
      setErrorMsg(
        err.message || "Terjadi kesalahan koneksi saat menyimpan pesanan."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <Head>
        <title>Order Kasir PO - Naripo</title>
      </Head>

      <div className="w-full max-w-5xl mx-auto px-2.5 sm:px-4 py-3 sm:py-5 min-h-screen text-xs space-y-3 pb-24">
        <div className="flex items-center justify-between bg-slate-900 text-white rounded-2xl px-3.5 py-2.5 shadow-sm">
          <div className="flex items-center gap-2">
            <FiShoppingBag className="w-4 h-4 text-amber-400" />
            <div>
              <h1 className="font-bold text-sm sm:text-base leading-tight">
                Order Kasir (PO)
              </h1>
              <p className="text-[10px] text-slate-300">
                {customerInfo.nama} ({customerInfo.kd_cus || "-"})
              </p>
            </div>
          </div>

          <Link
            href="/cart"
            className="inline-flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-xl text-[11px] font-semibold border border-slate-700"
          >
            <FiArrowLeft className="w-3.5 h-3.5" /> Keranjang Biasa
          </Link>
        </div>

        {toastMsg && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-4 py-2 rounded-full shadow-lg text-xs font-bold">
            {toastMsg}
          </div>
        )}

        {/* STICKY SCAN BARCODE & CARI BARANG */}
        <div className="sticky top-14 sm:top-16 z-30 bg-white rounded-2xl border-2 border-blue-500 p-2.5 shadow-sm space-y-2">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <div className="relative flex-1">
              <FiSearch className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="search"
                enterKeyHint="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Scan Barcode atau ketik nama / kode..."
                className="w-full pl-9 pr-20 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500 [&::-webkit-search-cancel-button]:hidden"
              />
              <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput("");
                      setSearchResults([]);
                      setHighlightedIndex(-1);
                      searchInputRef.current?.blur();
                    }}
                    className="p-1 text-slate-400 hover:text-slate-600"
                  >
                    <FiX className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="submit"
                  className="px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold active:scale-95 transition"
                >
                  Cari
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={isScannerActive ? stopScanner : startScanner}
              className="px-3.5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold flex items-center gap-1.5 shadow-xs active:scale-95 transition shrink-0"
              title="Scan Barcode Kamera"
            >
              <FiCamera className="w-4 h-4" />
              <span className="hidden sm:inline">
                {isScannerActive ? "Tutup" : "Scan"}
              </span>
            </button>
          </form>

          {isScannerActive && (
            <div className="relative rounded-xl overflow-hidden bg-black border border-emerald-500 p-1">
              <div id="kasir-po-scanner-box" className="w-full h-44"></div>
            </div>
          )}

          {(searching || searchResults.length > 0) && (
            <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white">
              {searching ? (
                <p className="p-3 text-center text-slate-400 text-xs">
                  Mencari barang...
                </p>
              ) : (
                searchResults.map((prod, idx) => {
                  const isHighlighted = idx === highlightedIndex;
                  return (
                    <button
                      key={prod.kd_br}
                      ref={(el) => {
                        resultRefs.current[idx] = el;
                      }}
                      type="button"
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      onClick={() => addProductToKasir(prod)}
                      className={`w-full text-left px-3 py-2 flex items-center justify-between gap-2 transition ${
                        isHighlighted
                          ? "bg-blue-100 border-l-4 border-l-blue-600"
                          : "hover:bg-blue-50"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 text-xs truncate">
                          {prod.nama}
                        </p>
                        <p className="text-[10px] text-slate-500 font-mono">
                          KD: {prod.kd_br} • {prod.satuan || "DUS"}
                          {prod.barcode && prod.barcode !== "0"
                            ? ` • ${prod.barcode}`
                            : ""}
                        </p>
                      </div>
                      <span className="font-mono font-bold text-blue-700 text-xs shrink-0">
                        Rp{" "}
                        {parsePrice(
                          prod.h_anggota || prod.price || prod.hpp
                        ).toLocaleString("id-ID")}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FiAlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMsg(null)}
              className="text-red-500"
            >
              <FiX className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* DAFTAR BARANG KASIR */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          {items.length === 0 ? (
            <div className="py-10 px-4 text-center text-slate-400 text-xs">
              Belum ada barang. Scan barcode atau ketik nama/kode barang di atas.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[11px] sm:text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-semibold">
                    <th className="p-2 w-8 text-center">No</th>
                    <th className="p-2 min-w-[140px]">Nama Barang</th>
                    <th className="p-2 w-28 sm:w-36">Varian / Rasa</th>
                    <th className="p-2 w-28 text-center">Qty</th>
                    <th className="p-2 w-20 text-right">Harga</th>
                    <th className="p-2 w-24 text-right">Subtotal</th>
                    <th className="p-2 w-9 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, idx) => (
                    <tr key={item.kd_br} className="hover:bg-blue-50/40">
                      <td className="p-2 text-center font-mono text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="p-2">
                        <p className="font-bold text-slate-800 leading-snug">
                          {item.nama}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {item.kd_br} • {item.satuan}
                        </p>
                      </td>
                      <td className="p-1.5">
                        <input
                          type="text"
                          maxLength={60}
                          value={item.rasa}
                          onChange={(e) =>
                            updateItemRasa(item.kd_br, e.target.value)
                          }
                          placeholder="Varian..."
                          className="w-full px-2 py-1 text-[11px] bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:border-blue-500 focus:outline-none"
                        />
                      </td>
                      <td className="p-1 text-center">
                        <div className="inline-flex items-center border border-slate-300 rounded-lg bg-white overflow-hidden">
                          <button
                            type="button"
                            onClick={() =>
                              updateItemQty(item.kd_br, item.qty - 1)
                            }
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 font-bold"
                          >
                            <FiMinus className="w-3 h-3" />
                          </button>
                          <input
                            ref={(el) => {
                              qtyInputRefs.current[item.kd_br] = el;
                            }}
                            type="text"
                            inputMode="numeric"
                            maxLength={4}
                            value={item.qty}
                            onFocus={(e) => e.target.select()}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                e.currentTarget.blur();
                              }
                            }}
                            onChange={(e) => {
                              const n = parseInt(
                                e.target.value.replace(/\D/g, ""),
                                10
                              );
                              updateItemQty(item.kd_br, isNaN(n) ? 1 : n);
                            }}
                            className="w-10 text-center font-mono font-bold text-slate-800 focus:bg-blue-50 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              updateItemQty(item.kd_br, item.qty + 1)
                            }
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 font-bold"
                          >
                            <FiPlus className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                      <td className="p-2 text-right font-mono text-slate-600">
                        {item.harga.toLocaleString("id-ID")}
                      </td>
                      <td className="p-2 text-right font-mono font-bold text-slate-900">
                        {(item.harga * item.qty).toLocaleString("id-ID")}
                      </td>
                      <td className="p-1.5 text-center">
                        <button
                          type="button"
                          onClick={() => removeItem(item.kd_br)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                          title="Hapus"
                        >
                          <FiTrash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* TGL KIRIM, CATATAN & GRAND TOTAL */}
        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 space-y-3 shadow-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block font-bold text-slate-700 text-xs">
                Tgl Kirim :
              </label>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-slate-800 bg-white focus:outline-none focus:border-blue-500 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="block font-bold text-slate-700 text-xs">
                Catatan :
              </label>
              <input
                type="text"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Catatan pesanan (opsional)..."
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-slate-800 bg-white focus:outline-none focus:border-blue-500 text-xs"
              />
            </div>
          </div>

          <div className="bg-slate-900 text-white rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <span className="text-[11px] font-bold tracking-wide text-slate-300 uppercase">
              {totalItemCount} ITEM ({totalQtyCount} QTY) • GRAND TOTAL (Rp) :
            </span>
            <span className="text-xl sm:text-2xl font-extrabold font-mono text-pink-400">
              {grandTotal.toLocaleString("id-ID")}
            </span>
          </div>

          <button
            type="button"
            onClick={handleSimpanPO}
            disabled={loading || items.length === 0}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm active:scale-[0.99] transition"
          >
            <FiSave className="w-4 h-4" />
            <span>{loading ? "Menyimpan PO..." : "Simpan Pesanan PO"}</span>
          </button>
        </div>

        {/* MODAL SUKSES + KIRIM WA ADMIN */}
        {successInfo && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-5 space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <FiCheckCircle className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-slate-800 text-base">
                  Pesanan PO Berhasil Disimpan
                </h3>
                <p className="text-xs text-slate-600">
                  No PO:{" "}
                  <span className="font-mono font-bold text-blue-700">
                    {successInfo.kdTran}
                  </span>
                </p>
                <p className="text-sm font-extrabold text-slate-900 font-mono">
                  Rp {successInfo.total.toLocaleString("id-ID")}
                </p>
              </div>

              <div className="space-y-2 pt-1">
                <a
                  href={successInfo.waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm active:scale-95 transition"
                >
                  <FiMessageCircle className="w-4 h-4" /> Kirim Info ke WA Admin
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setSuccessInfo(null);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs transition"
                >
                  Buat Order Kasir Baru
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/laporan/laporanpo")}
                  className="w-full py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
                >
                  Lihat Laporan PO
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}