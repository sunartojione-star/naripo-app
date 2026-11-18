import { useState, useEffect, useRef } from "react";
import Layout from "@/components/Layout";
import {
  FiPlus,
  FiSave,
  FiSearch,
  FiClipboard,
  FiMinus,
  FiTrash2,
  FiEdit2,
  FiCheckCircle,
  FiX,
  FiCamera,
  FiAlertTriangle,
} from "react-icons/fi";

interface Barang {
  kd_br: string;
  nama: string;
  satuan: string;
  hpp_terakhir?: number | string;
  hpp_akhir?: number | string;
  h_beli?: number | string;
  harga_beli?: number | string;
  hpp?: number | string;
  h_anggota?: number | string;
  barcode?: string;
}

interface DetailItem {
  no_urut: number;
  kd_br: string;
  nama_br: string;
  satuan: string;
  hpp: number;
  qty: number;
  sub_total: number;
}

const getBarangHppTerakhir = (barang: Barang): number => {
  const raw =
    barang.hpp_terakhir ??
    barang.hpp_akhir ??
    barang.h_beli ??
    barang.harga_beli ??
    barang.hpp ??
    barang.h_anggota ??
    0;
  const num = typeof raw === "string" ? parseFloat(raw) : Number(raw);
  return Number.isFinite(num) ? num : 0;
};

export default function HalamanOpname() {
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  // Header State
  const [noBuku, setNoBuku] = useState<string>("");
  const [noBukuExists, setNoBukuExists] = useState<boolean>(false);
  const [checkingNoBuku, setCheckingNoBuku] = useState<boolean>(false);
  const [tanggal, setTanggal] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [penulis, setPenulis] = useState<string>("");
  const [penghitung, setPenghitung] = useState<string>("");
  const [pengawas, setPengawas] = useState<string>("");
  const [catatan, setCatatan] = useState<string>("-");

  // Detail / Grid Items State
  const [items, setItems] = useState<DetailItem[]>([]);

  // Ref Tabel & Input
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const quickInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Input Cepat / Barcode Scanner di Atas Keranjang State
  const [quickKeyword, setQuickKeyword] = useState<string>("");
  const [quickResults, setQuickResults] = useState<Barang[]>([]);
  const [quickSearching, setQuickSearching] = useState<boolean>(false);
  const [showQuickDropdown, setShowQuickDropdown] = useState<boolean>(false);

  // Kamera Barcode Scanner State (Khusus HP)
  const [showCameraModal, setShowCameraModal] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string>("");
  const html5QrCodeRef = useRef<any>(null);

  // Modal Popup Edit & Hapus Item saat baris diklik
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);
  const [showActionModal, setShowActionModal] = useState<boolean>(false);

  const rawApiUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://103.125.42.217:8081/api";
  const apiUrl = rawApiUrl.replace(/\/$/, "");

  const formatAngka = (val: number | string | undefined | null) => {
    if (!val && val !== 0) return "0";
    const num = typeof val === "string" ? parseFloat(val) : val;
    if (isNaN(num)) return "0";
    return Math.round(num).toLocaleString("id-ID");
  };

  const focusQuickInput = () => {
    setTimeout(() => {
      if (quickInputRef.current) {
        quickInputRef.current.focus();
        quickInputRef.current.select();
        quickInputRef.current.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }, 50);
  };

  // Navigasi Keyboard Page Up & Page Down untuk Laptop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showActionModal || showCameraModal) return;

      if (e.key === "PageDown") {
        e.preventDefault();
        tableContainerRef.current?.scrollBy({ top: 350, behavior: "smooth" });
      } else if (e.key === "PageUp") {
        e.preventDefault();
        tableContainerRef.current?.scrollBy({ top: -350, behavior: "smooth" });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showActionModal, showCameraModal]);

  // Bersihkan stream kamera jika komponen di-unmount
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        try {
          html5QrCodeRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  // Load data dari localStorage saat pertama kali dimuat
  useEffect(() => {
    setIsMounted(true);
    const savedData = localStorage.getItem("opname_draft_data");
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setNoBuku(parsed.noBuku || "");
        setTanggal(parsed.tanggal || new Date().toISOString().split("T")[0]);
        setPenulis(parsed.penulis || "");
        setPenghitung(parsed.penghitung || "");
        setPengawas(parsed.pengawas || "");
        setCatatan(parsed.catatan || "-");
        if (parsed.items && Array.isArray(parsed.items)) {
          const filledOnly = parsed.items
            .filter((it: DetailItem) => it.kd_br && it.kd_br.trim() !== "")
            .map((it: DetailItem, idx: number) => ({
              ...it,
              no_urut: idx + 1,
            }));
          setItems(filledOnly);
        }
      } catch (e) {
        console.error("Gagal parsing localStorage draft:", e);
      }
    }
  }, []);

  // Simpan otomatis ke localStorage setiap ada perubahan
  useEffect(() => {
    if (!isMounted) return;
    const draftData = {
      noBuku,
      tanggal,
      penulis,
      penghitung,
      pengawas,
      catatan,
      items,
    };
    localStorage.setItem("opname_draft_data", JSON.stringify(draftData));
  }, [
    noBuku,
    tanggal,
    penulis,
    penghitung,
    pengawas,
    catatan,
    items,
    isMounted,
  ]);

  // Cek duplikat No Buku ke backend secara otomatis saat diketik
  const checkDuplicateNoBuku = async (rawVal: string): Promise<boolean> => {
    const normalized = rawVal.trim().toUpperCase();
    if (!normalized) {
      setNoBukuExists(false);
      return false;
    }

    const token = localStorage.getItem("token");
    if (!token) return false;

    setCheckingNoBuku(true);
    try {
      const res = await fetch(
        `${apiUrl}/master-opname?no_buku=${encodeURIComponent(normalized)}`,
        {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        setNoBukuExists(false);
        return false;
      }

      const json = await res.json().catch(() => null);
      const list = json?.data ?? json;

      let exists = false;
      if (typeof json?.exists === "boolean") {
        exists = json.exists;
      } else if (Array.isArray(list)) {
        exists = list.some(
          (row: any) =>
            String(row?.no_buku || "")
              .trim()
              .toUpperCase() === normalized
        );
      }

      setNoBukuExists(exists);
      return exists;
    } catch {
      return false;
    } finally {
      setCheckingNoBuku(false);
    }
  };

  useEffect(() => {
    if (!isMounted) return;
    const normalized = noBuku.trim();
    if (!normalized) {
      setNoBukuExists(false);
      return;
    }

    const timer = setTimeout(() => {
      checkDuplicateNoBuku(normalized);
    }, 450);

    return () => clearTimeout(timer);
  }, [noBuku, isMounted]);

  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch (e) {}
  };

  // Tambah Barang ke Keranjang Opname (Muncul hanya saat diketik/scan)
  const addItemToKeranjang = (barang: Barang) => {
    let targetIndex = -1;

    setItems((prev) => {
      const hpp = getBarangHppTerakhir(barang);
      targetIndex = prev.length;

      const newItem: DetailItem = {
        no_urut: targetIndex + 1,
        kd_br: barang.kd_br,
        nama_br: barang.nama,
        satuan: barang.satuan,
        hpp: hpp,
        qty: 1,
        sub_total: hpp * 1,
      };

      return [...prev, newItem];
    });

    setQuickKeyword("");
    setQuickResults([]);
    setShowQuickDropdown(false);

    setTimeout(() => {
      if (targetIndex !== -1 && qtyInputRefs.current[targetIndex]) {
        const inputEl = qtyInputRefs.current[targetIndex];
        inputEl?.focus();
        inputEl?.select();
        inputEl?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }, 80);
  };

  // Live Search & Scan dengan Alat Barcode di Laptop
  const handleQuickSearchChange = async (keyword: string) => {
    setQuickKeyword(keyword);
    const trimmed = keyword.trim();
    if (!trimmed) {
      setQuickResults([]);
      setShowQuickDropdown(false);
      return;
    }

    setQuickSearching(true);
    setShowQuickDropdown(true);

    const localMatch = quickResults.find(
      (b) =>
        b.barcode?.toLowerCase() === trimmed.toLowerCase() ||
        b.kd_br.toLowerCase() === trimmed.toLowerCase()
    );

    if (localMatch) {
      addItemToKeranjang(localMatch);
      setQuickSearching(false);
      return;
    }

    const token = localStorage.getItem("token");
    try {
      const res = await fetch(
        `${apiUrl}/barangs?search=${encodeURIComponent(trimmed)}&limit=10`,
        {
          headers: {
            Accept: "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
        }
      );
      const json = await res.json();
      if (res.ok) {
        const list: Barang[] = json.data || json || [];
        setQuickResults(list);

        const exactMatch = list.find(
          (b) =>
            b.barcode?.toLowerCase() === trimmed.toLowerCase() ||
            b.kd_br.toLowerCase() === trimmed.toLowerCase()
        );

        if (exactMatch) {
          addItemToKeranjang(exactMatch);
        }
      }
    } catch (err) {
      console.error("Gagal cari barang cepat:", err);
    } finally {
      setQuickSearching(false);
    }
  };

  // Handler ENTER untuk Alat Barcode Scanner Fisik
  const handleQuickSearchKeyDown = async (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const kw = quickKeyword.trim();
      if (!kw) return;

      const exact = quickResults.find(
        (b) =>
          b.barcode?.toLowerCase() === kw.toLowerCase() ||
          b.kd_br.toLowerCase() === kw.toLowerCase()
      );

      if (exact) {
        addItemToKeranjang(exact);
        return;
      }

      try {
        const token = localStorage.getItem("token");
        const res = await fetch(
          `${apiUrl}/barangs?search=${encodeURIComponent(kw)}&limit=5`,
          {
            headers: {
              Accept: "application/json",
              Authorization: token ? `Bearer ${token}` : "",
            },
          }
        );
        const json = await res.json();
        const list: Barang[] = json.data || json || [];
        if (list.length > 0) {
          const matched =
            list.find(
              (b) =>
                b.barcode?.toLowerCase() === kw.toLowerCase() ||
                b.kd_br.toLowerCase() === kw.toLowerCase()
            ) || list[0];
          addItemToKeranjang(matched);
        } else {
          alert(`Barang dengan barcode/kode "${kw}" tidak ditemukan.`);
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Fungsi Mulai Scan Menggunakan Kamera HP
  const startCamera = async () => {
    setCameraError("");
    setShowCameraModal(true);

    if (!(window as any).Html5Qrcode) {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js";
      script.async = true;
      script.onload = () => initScanner();
      script.onerror = () =>
        setCameraError("Gagal memuat modul kamera scanner.");
      document.body.appendChild(script);
    } else {
      setTimeout(() => initScanner(), 100);
    }
  };

  const initScanner = () => {
    const Html5Qrcode = (window as any).Html5Qrcode;
    if (!Html5Qrcode) return;

    try {
      const html5QrCode = new Html5Qrcode("camera-reader");
      html5QrCodeRef.current = html5QrCode;

      html5QrCode
        .start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 160 },
          },
          (decodedText: string) => {
            playBeep();
            stopCamera();
            handleQuickSearchChange(decodedText);
          },
          () => {}
        )
        .catch((err: any) => {
          console.error(err);
          setCameraError("Izin kamera ditolak atau kamera tidak ditemukan.");
        });
    } catch (err) {
      console.error(err);
    }
  };

  const stopCamera = () => {
    if (html5QrCodeRef.current) {
      try {
        html5QrCodeRef.current
          .stop()
          .then(() => {
            html5QrCodeRef.current?.clear();
            html5QrCodeRef.current = null;
            setShowCameraModal(false);
          })
          .catch(() => {
            setShowCameraModal(false);
          });
      } catch {
        setShowCameraModal(false);
      }
    } else {
      setShowCameraModal(false);
    }
  };

  const handleOpenActionModal = (index: number) => {
    setSelectedItemIndex(index);
    setShowActionModal(true);
  };

  const handleClearCurrentRow = () => {
    if (selectedItemIndex === null) return;
    setItems((prev) =>
      prev
        .filter((_, idx) => idx !== selectedItemIndex)
        .map((item, idx) => ({ ...item, no_urut: idx + 1 }))
    );
    setShowActionModal(false);
    setSelectedItemIndex(null);
    focusQuickInput();
  };

  const handleQtyChange = (index: number, val: string) => {
    const cleanedVal = val.replace(/\D/g, "");
    if (cleanedVal.length > 4) return;

    const qty = cleanedVal === "" ? 0 : parseInt(cleanedVal, 10);
    setItems((prev) => {
      const updated = [...prev];
      const item = updated[index];
      updated[index] = {
        ...item,
        qty: qty,
        sub_total: item.hpp * qty,
      };
      return updated;
    });
  };

  const handleQtyAdjust = (index: number, delta: number) => {
    setItems((prev) => {
      const updated = [...prev];
      const item = updated[index];
      const newQty = Math.max(0, Math.min(9999, (item.qty || 0) + delta));
      updated[index] = {
        ...item,
        qty: newQty,
        sub_total: item.hpp * newQty,
      };
      return updated;
    });
  };

  const grandTotal = items.reduce((acc, curr) => acc + curr.sub_total, 0);
  const totalQty = items.reduce((acc, item) => acc + (item.qty || 0), 0);

  const handleSimpan = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Silakan login terlebih dahulu.");
      return;
    }

    const cleanNoBuku = noBuku.trim().toUpperCase();
    if (!cleanNoBuku) {
      alert("Nomor Buku wajib diisi!");
      return;
    }

    const isDup = noBukuExists || (await checkDuplicateNoBuku(cleanNoBuku));
    if (isDup) {
      alert(
        `Nomor Buku "${cleanNoBuku}" sudah ada di database! Tidak bisa input nomor buku yang sama.`
      );
      return;
    }

    if (items.length === 0) {
      alert("Belum ada item barang yang diinput pada tabel opname!");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        no_buku: cleanNoBuku,
        tanggal: tanggal,
        penulis: penulis.trim().toUpperCase(),
        penghitung: penghitung.trim().toUpperCase(),
        pengawas: pengawas.trim().toUpperCase(),
        ket: catatan,
        items: items.map((item, idx) => ({
          no_urut: idx + 1,
          kd_br: item.kd_br,
          nama_br: item.nama_br,
          satuan: item.satuan,
          hpp: item.hpp,
          qty: item.qty,
          sub_total: item.sub_total,
        })),
      };

      const res = await fetch(`${apiUrl}/master-opname`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await res.json().catch(() => null);

      if (res.ok && result?.success) {
        alert("Stok Opname berhasil disimpan!");
        localStorage.removeItem("opname_draft_data");
        setItems([]);
        setNoBuku("");
        setNoBukuExists(false);
        setCatatan("-");
        focusQuickInput();
      } else {
        if (res.status === 409 || res.status === 422) {
          const msg = String(result?.message || "");
          if (
            msg.toLowerCase().includes("buku") ||
            msg.toLowerCase().includes("taken")
          ) {
            setNoBukuExists(true);
          }
        }
        alert(result?.message || "Gagal menyimpan data opname.");
      }
    } catch (err: any) {
      console.error("Error simpan opname:", err);
      alert("Terjadi kesalahan koneksi ke server.");
    } finally {
      setLoading(false);
    }
  };

  if (!isMounted) return null;

  const currentSelectedItem =
    selectedItemIndex !== null ? items[selectedItemIndex] : null;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-1.5 sm:px-4 py-3 sm:py-6 pb-20 lg:pb-6 bg-slate-900 text-white rounded-xl shadow-2xl">
        {/* Header Title (Ikut tergulung ke atas saat di-scroll) */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-3 sm:p-4 mb-2.5 sm:mb-4 shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 sm:p-2.5 bg-gradient-to-tr from-blue-700 to-blue-500 rounded-lg text-white shadow-lg shrink-0">
                <FiClipboard className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h1 className="text-base sm:text-xl font-bold tracking-wide text-white leading-tight">
                  Proses Stok Opname Master
                </h1>
                <p className="text-[11px] sm:text-xs text-blue-400 font-medium tracking-wider">
                  -BARANG-
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs text-emerald-400 bg-emerald-950/70 border border-emerald-800/80 px-2.5 py-1 rounded-full font-medium shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Draft Tersimpan Otomatis
              </span>
            </div>
          </div>
        </div>

        {/* STICKY WRAPPER: FORM HEADER + SCAN BARCODE (Menutup Title saat Scroll) */}
        <div className="sticky top-14 sm:top-16 z-30 bg-slate-900 pt-1 pb-2 -mx-1.5 px-1.5 sm:-mx-4 sm:px-4 shadow-lg">
          {/* Form Header */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 sm:gap-5 bg-slate-800 p-2.5 sm:p-4 rounded-xl border border-slate-700 mb-2 sm:mb-3 shadow-md">
            <div className="space-y-1.5 sm:space-y-3">
              <div>
                <div className="flex items-center gap-2 sm:gap-4">
                  <label className="w-20 sm:w-28 font-semibold text-[11px] sm:text-sm text-slate-300 shrink-0">
                    No Buku :
                  </label>
                  <input
                    type="text"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="characters"
                    value={noBuku}
                    onChange={(e) => setNoBuku(e.target.value)}
                    onBlur={() => checkDuplicateNoBuku(noBuku)}
                    placeholder="BK 01..."
                    className={`flex-1 uppercase bg-slate-900 border rounded px-2.5 py-1 text-xs sm:text-sm focus:outline-none text-white font-medium ${
                      noBukuExists
                        ? "border-red-500 focus:border-red-400"
                        : "border-slate-600 focus:border-blue-500"
                    }`}
                  />
                </div>
                {checkingNoBuku && (
                  <p className="text-[10px] text-slate-400 mt-0.5 ml-22 sm:ml-32">
                    Mengecek nomor buku...
                  </p>
                )}
                {noBukuExists && (
                  <p className="text-[10px] text-red-400 font-semibold mt-0.5 flex items-center gap-1 ml-22 sm:ml-32">
                    <FiAlertTriangle className="w-3 h-3 shrink-0" />
                    Nomor buku &quot;{noBuku.trim().toUpperCase()}&quot; sudah terdaftar!
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 sm:gap-4">
                <label className="w-20 sm:w-28 font-semibold text-[11px] sm:text-sm text-slate-300 shrink-0">
                  Tanggal :
                </label>
                <input
                  type="date"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-600 rounded px-2.5 py-1 text-xs sm:text-sm focus:outline-none focus:border-blue-500 text-white color-scheme-dark [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
                />
              </div>
              <div className="flex items-center gap-2 sm:gap-4">
                <label className="w-20 sm:w-28 font-semibold text-[11px] sm:text-sm text-slate-300 shrink-0">
                  Penulis :
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  autoCapitalize="characters"
                  value={penulis}
                  onChange={(e) => setPenulis(e.target.value)}
                  placeholder="NAMA PENULIS..."
                  className="flex-1 uppercase bg-slate-900 border border-slate-600 rounded px-2.5 py-1 text-xs sm:text-sm focus:outline-none focus:border-blue-500 text-white font-medium"
                />
              </div>
            </div>

            <div className="space-y-1.5 sm:space-y-3">
              <div className="flex items-center gap-2 sm:gap-4">
                <label className="w-20 sm:w-28 font-semibold text-[11px] sm:text-sm text-slate-300 shrink-0">
                  Penghitung :
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  autoCapitalize="characters"
                  value={penghitung}
                  onChange={(e) => setPenghitung(e.target.value)}
                  placeholder="NAMA PENGHITUNG..."
                  className="flex-1 uppercase bg-slate-900 border border-slate-600 rounded px-2.5 py-1 text-xs sm:text-sm focus:outline-none focus:border-blue-500 text-white font-medium"
                />
              </div>
              <div className="flex items-center gap-2 sm:gap-4">
                <label className="w-20 sm:w-28 font-semibold text-[11px] sm:text-sm text-slate-300 shrink-0">
                  Pengawas :
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  autoCapitalize="characters"
                  value={pengawas}
                  onChange={(e) => setPengawas(e.target.value)}
                  placeholder="NAMA PENGAWAS..."
                  className="flex-1 uppercase bg-slate-900 border border-slate-600 rounded px-2.5 py-1 text-xs sm:text-sm focus:outline-none focus:border-blue-500 text-white font-medium"
                />
              </div>
            </div>
          </div>

          {/* SCAN BARCODE (RINGKAS & HEMAT RUANG) */}
          <div className="relative bg-slate-800 p-2 sm:p-3 rounded-xl border border-blue-600/50 shadow-lg">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <FiSearch className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={quickInputRef}
                  type="text"
                  value={quickKeyword}
                  onChange={(e) => handleQuickSearchChange(e.target.value)}
                  onKeyDown={handleQuickSearchKeyDown}
                  placeholder="Scan Barcode"
                  className="w-full bg-slate-950 border-2 border-blue-500/80 rounded-lg pl-8 sm:pl-9 pr-8 py-1.5 sm:py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                />
                {quickKeyword && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuickKeyword("");
                      setShowQuickDropdown(false);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <FiX className="w-4 h-4" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={startCamera}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-3 py-1.5 sm:py-2 rounded-lg font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition shrink-0 text-xs sm:text-sm"
                title="Buka Kamera Barcode Scanner (HP)"
              >
                <FiCamera className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Kamera</span>
              </button>
            </div>

            {/* Dropdown Rekomendasi Pencarian */}
            {showQuickDropdown && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl z-40 max-h-64 overflow-y-auto p-1.5 space-y-1">
                {quickSearching ? (
                  <div className="p-2.5 text-center text-slate-400 text-xs">
                    Mencari barang...
                  </div>
                ) : quickResults.length === 0 ? (
                  <div className="p-2.5 text-center text-slate-400 text-xs">
                    Barang tidak ditemukan.
                  </div>
                ) : (
                  quickResults.map((b) => (
                    <div
                      key={b.kd_br}
                      onClick={() => addItemToKeranjang(b)}
                      className="p-2 bg-slate-900/90 hover:bg-blue-900/40 border border-slate-700 hover:border-blue-500 rounded-lg cursor-pointer flex justify-between items-center transition"
                    >
                      <div>
                        <div className="font-mono text-blue-400 text-[11px] flex items-center gap-1.5">
                          <span className="font-bold">{b.kd_br}</span>
                          {b.barcode && (
                            <span className="text-[9px] text-slate-300 bg-slate-800 px-1 py-0.5 rounded border border-slate-700">
                              Barcode: {b.barcode}
                            </span>
                          )}
                        </div>
                        <div className="text-white font-medium text-xs line-clamp-1">
                          {b.nama}
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <div className="text-[9px] text-slate-400">
                          Sat: {b.satuan}
                        </div>
                        <div className="text-cyan-400 font-mono text-[11px] font-bold">
                          {formatAngka(getBarangHppTerakhir(b))}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Info Jumlah Barang Dihitung (HP, Tablet, & PC) */}
        <div className="flex items-center justify-between text-[11px] sm:text-xs text-slate-300 px-1 mb-2">
          <span>Daftar Barang Dihitung</span>
          <span className="font-bold text-blue-400">
            {items.length} Item ({formatAngka(totalQty)} Qty)
          </span>
        </div>

        {/* TAMPILAN HP: Daftar Kartu Opname Pas Layar HP */}
        <div className="md:hidden space-y-2 mb-4">
          {items.length === 0 ? (
            <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-5 text-center text-xs text-slate-400">
              Belum ada barang. Scan barcode atau ketik nama/kode di atas.
            </div>
          ) : (
            items.map((item, idx) => (
              <div
                key={`m-${item.kd_br}-${idx}`}
                onClick={() => handleOpenActionModal(idx)}
                className="rounded-xl border border-slate-700 bg-slate-800/90 p-2.5 space-y-2 active:bg-slate-800"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono">
                      <span className="font-bold text-blue-400">
                        #{idx + 1}
                      </span>
                      <span className="text-blue-300 font-semibold">
                        {item.kd_br}
                      </span>
                      <span className="rounded bg-slate-700 px-1.5 py-0.5 text-slate-300">
                        {item.satuan || "-"}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-white leading-snug mt-0.5 break-words">
                      {item.nama_br}
                    </p>
                  </div>
                  <FiEdit2 className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                </div>

                <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-700/80">
                  <div className="text-[11px]">
                    <span className="text-slate-400 block text-[9px]">HPP</span>
                    <span className="font-mono font-bold text-cyan-300">
                      {formatAngka(item.hpp)}
                    </span>
                  </div>

                  <div
                    className="flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => handleQtyAdjust(idx, -1)}
                      className="bg-slate-900 hover:bg-slate-700 text-fuchsia-300 border border-fuchsia-700 rounded w-6 h-7 flex items-center justify-center"
                    >
                      <FiMinus className="w-3 h-3" />
                    </button>
                    <input
                      ref={(el) => {
                        qtyInputRefs.current[idx] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      enterKeyHint="done"
                      maxLength={4}
                      value={item.qty}
                      onChange={(e) => handleQtyChange(idx, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.keyCode === 13) {
                          e.preventDefault();
                          focusQuickInput();
                        }
                      }}
                      className="w-11 h-7 bg-slate-950 text-center text-white rounded border border-fuchsia-700 focus:outline-none focus:border-white font-mono text-xs font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => handleQtyAdjust(idx, 1)}
                      className="bg-slate-900 hover:bg-slate-700 text-fuchsia-300 border border-fuchsia-700 rounded w-6 h-7 flex items-center justify-center"
                    >
                      <FiPlus className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="text-right text-[11px]">
                    <span className="text-slate-400 block text-[9px]">
                      SUB TOTAL
                    </span>
                    <span className="font-mono font-bold text-emerald-400">
                      {formatAngka(item.sub_total)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* TAMPILAN TABLET & PC: Tabel Grid Detail Opname (Hanya Muncul Barang yang Diinput) */}
        <div
          ref={tableContainerRef}
          tabIndex={0}
          className="hidden md:block overflow-x-auto border border-slate-700 rounded-lg mb-4 max-h-[550px] overflow-y-auto focus:outline-none"
        >
          <table className="w-full text-left border-collapse text-xs md:text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-700 text-slate-200">
                <th className="p-2 border border-slate-600 w-14 text-center">
                  NO
                </th>
                <th className="p-2 border border-slate-600 w-28">KODE</th>
                <th className="p-2 border border-slate-600 min-w-[160px]">
                  NAMA BARANG
                </th>
                <th className="p-2 border border-slate-600 w-16 text-center">
                  SAT
                </th>
                <th className="p-2 border border-slate-600 w-28 bg-cyan-900 text-cyan-200 text-right">
                  HPP
                </th>
                <th className="p-2 border border-slate-600 w-32 bg-fuchsia-900 text-fuchsia-200 text-center">
                  QTY
                </th>
                <th className="p-2 border border-slate-600 w-28 text-right">
                  SUB TOTAL
                </th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="p-6 text-center text-slate-400 text-xs md:text-sm"
                  >
                    Belum ada barang. Scan barcode atau ketik nama/kode di atas.
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => (
                  <tr
                    key={`${item.kd_br}-${idx}`}
                    onClick={() => handleOpenActionModal(idx)}
                    className="hover:bg-slate-800 cursor-pointer transition-colors"
                  >
                    <td className="p-2 border border-slate-700 text-center bg-slate-800 text-blue-400 font-bold">
                      {idx + 1}
                    </td>
                    <td
                      className="p-2 border border-slate-700 text-blue-300 font-mono"
                      title="Klik untuk edit/hapus"
                    >
                      {item.kd_br}
                    </td>
                    <td
                      className="p-2 border border-slate-700 truncate max-w-xs"
                      title={item.nama_br}
                    >
                      {item.nama_br}
                    </td>
                    <td className="p-2 border border-slate-700 text-center text-slate-300">
                      {item.satuan || "-"}
                    </td>
                    <td className="p-2 border border-slate-700 text-right bg-cyan-950/40 font-mono">
                      {formatAngka(item.hpp)}
                    </td>
                    <td className="p-1.5 border border-slate-700 bg-fuchsia-950/40 text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQtyAdjust(idx, -1);
                          }}
                          className="bg-slate-800 hover:bg-slate-700 text-fuchsia-300 border border-fuchsia-700 rounded w-6 h-7 flex items-center justify-center text-[10px] shrink-0"
                          title="Kurangi 1"
                        >
                          <FiMinus className="w-3 h-3" />
                        </button>

                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            focusQuickInput();
                          }}
                          className="inline-block"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            ref={(el) => {
                              qtyInputRefs.current[idx] = el;
                            }}
                            type="text"
                            inputMode="numeric"
                            enterKeyHint="done"
                            maxLength={4}
                            value={item.qty}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) =>
                              handleQtyChange(idx, e.target.value)
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.keyCode === 13) {
                                e.preventDefault();
                                focusQuickInput();
                              }
                            }}
                            className="w-12 bg-slate-900 text-center text-white py-0.5 rounded border border-fuchsia-700 focus:outline-none focus:border-white font-mono text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            placeholder="0"
                          />
                        </form>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQtyAdjust(idx, 1);
                          }}
                          className="bg-slate-800 hover:bg-slate-700 text-fuchsia-300 border border-fuchsia-700 rounded w-6 h-7 flex items-center justify-center text-[10px] shrink-0"
                          title="Tambah 1"
                        >
                          <FiPlus className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                    <td className="p-2 border border-slate-700 text-right font-mono font-semibold text-emerald-400">
                      {formatAngka(item.sub_total)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Catatan & Grand Total */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-6 items-center mb-5">
          <div className="lg:col-span-2 space-y-1">
            <label className="text-xs sm:text-sm font-semibold text-slate-300">
              Catatan :
            </label>
            <input
              type="text"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-1.5 text-xs sm:text-sm focus:outline-none focus:border-blue-500 text-white"
            />
          </div>
          <div className="bg-black border border-slate-700 p-2.5 sm:p-4 rounded-xl text-right">
            <span className="text-[10px] sm:text-xs text-slate-400 font-bold block mb-0.5">
              {items.length} ITEM ({formatAngka(totalQty)} QTY) • GRAND TOTAL (Rp) :
            </span>
            <span className="text-xl sm:text-3xl font-extrabold text-fuchsia-400 font-mono">
              {formatAngka(grandTotal)}
            </span>
          </div>
        </div>

        {/* Tombol Simpan */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleSimpan}
            disabled={loading || noBukuExists}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 shadow transition text-sm sm:text-base"
          >
            <FiSave className="w-4 h-4 sm:w-5 sm:h-5" />
            {loading ? "Menyimpan..." : "Simpan Opname"}
          </button>
        </div>

        {/* MODAL KAMERA BARCODE SCANNER (KHUSUS HP) */}
        {showCameraModal && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 border border-slate-700 w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-150">
              <div className="p-3 bg-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <FiCamera className="text-emerald-400 w-4 h-4" />
                  <span>Arahkan Kamera ke Barcode</span>
                </div>
                <button
                  onClick={stopCamera}
                  className="text-slate-300 hover:text-white p-1"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 flex flex-col items-center">
                {cameraError ? (
                  <div className="text-red-400 text-xs text-center py-8">
                    {cameraError}
                  </div>
                ) : (
                  <div className="w-full relative rounded-xl overflow-hidden bg-black flex items-center justify-center border-2 border-emerald-500/50">
                    <div id="camera-reader" className="w-full h-64"></div>
                  </div>
                )}
                <p className="text-[11px] text-slate-400 text-center mt-3">
                  Pastikan barcode berada di dalam kotak pemindai dan pencahayaan cukup.
                </p>
              </div>

              <div className="p-3 bg-slate-700/40 border-t border-slate-700 text-center">
                <button
                  type="button"
                  onClick={stopCamera}
                  className="bg-slate-700 hover:bg-slate-600 text-white px-5 py-1.5 rounded-lg text-xs font-semibold"
                >
                  Tutup Kamera
                </button>
              </div>
            </div>
          </div>
        )}

        {/* POPUP MODAL: EDIT & HAPUS BARANG DARI BARIS TABEL */}
        {showActionModal && currentSelectedItem && selectedItemIndex !== null && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 border border-slate-600 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-150">
              <div className="p-4 bg-slate-700/80 border-b border-slate-600 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FiEdit2 className="text-blue-400 w-5 h-5" />
                  <h3 className="font-bold text-base text-white">
                    Edit / Hapus Barang
                  </h3>
                </div>
                <button
                  onClick={() => setShowActionModal(false)}
                  className="text-slate-300 hover:text-white p-1 rounded-lg"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-700">
                  <div className="flex items-center justify-between text-xs text-blue-400 font-mono mb-1">
                    <span>KODE: {currentSelectedItem.kd_br}</span>
                    <span className="text-slate-400">
                      SAT: {currentSelectedItem.satuan}
                    </span>
                  </div>
                  <h4 className="font-semibold text-white text-sm mb-2">
                    {currentSelectedItem.nama_br}
                  </h4>
                  <div className="flex items-center justify-between text-xs border-t border-slate-800 pt-2 font-mono">
                    <span className="text-slate-400">Harga Pokok (HPP):</span>
                    <span className="text-cyan-400 font-bold">
                      Rp {formatAngka(currentSelectedItem.hpp)}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-900/60 p-3.5 rounded-xl border border-fuchsia-900/40">
                  <label className="block text-xs font-bold text-fuchsia-300 mb-2 text-center uppercase tracking-wider">
                    Jumlah Qty Opname
                  </label>
                  <div className="flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleQtyAdjust(selectedItemIndex, -1)}
                      className="w-12 h-12 bg-slate-800 hover:bg-slate-700 text-fuchsia-300 border border-fuchsia-700 rounded-xl flex items-center justify-center font-bold text-lg transition active:scale-95"
                    >
                      <FiMinus className="w-5 h-5" />
                    </button>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        setShowActionModal(false);
                        focusQuickInput();
                      }}
                      className="inline-block"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="text"
                        inputMode="numeric"
                        enterKeyHint="done"
                        maxLength={4}
                        value={currentSelectedItem.qty}
                        onChange={(e) =>
                          handleQtyChange(selectedItemIndex, e.target.value)
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.keyCode === 13) {
                            e.preventDefault();
                            setShowActionModal(false);
                            focusQuickInput();
                          }
                        }}
                        className="w-24 h-12 bg-slate-950 text-center text-white rounded-xl border-2 border-fuchsia-600 focus:outline-none focus:border-white font-mono text-xl font-bold"
                      />
                    </form>
                    <button
                      type="button"
                      onClick={() => handleQtyAdjust(selectedItemIndex, 1)}
                      className="w-12 h-12 bg-slate-800 hover:bg-slate-700 text-fuchsia-300 border border-fuchsia-700 rounded-xl flex items-center justify-center font-bold text-lg transition active:scale-95"
                    >
                      <FiPlus className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="mt-3 text-center text-xs font-mono">
                    <span className="text-slate-400">Subtotal: </span>
                    <span className="text-emerald-400 font-bold text-sm">
                      Rp {formatAngka(currentSelectedItem.sub_total)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-700/40 border-t border-slate-700 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleClearCurrentRow}
                  className="flex-1 bg-red-600/20 hover:bg-red-600 border border-red-500 text-red-200 hover:text-white py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition text-sm active:scale-95"
                >
                  <FiTrash2 className="w-4 h-4" />
                  Hapus Baris
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowActionModal(false);
                    focusQuickInput();
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition text-sm shadow-md active:scale-95"
                >
                  <FiCheckCircle className="w-4 h-4" />
                  Selesai
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}