import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
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
} from "react-icons/fi";

interface Barang {
  kd_br: string;
  nama: string;
  satuan: string;
  h_anggota: number;
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

export default function HalamanOpname() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  // Header State
  const [noBuku, setNoBuku] = useState<string>("");
  const [tanggal, setTanggal] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [penulis, setPenulis] = useState<string>("");
  const [penghitung, setPenghitung] = useState<string>("");
  const [pengawas, setPengawas] = useState<string>("");
  const [catatan, setCatatan] = useState<string>("-");

  // Detail / Grid Items State (700 baris)
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

  // Modal / Pencarian Barang State (Klik Baris Kosong)
  const [showSearchModal, setShowSearchModal] = useState<boolean>(false);
  const [activeRowIndex, setActiveRowIndex] = useState<number | null>(null);
  const [searchKeyword, setSearchKeyword] = useState<string>("");
  const [barangsList, setBarangsList] = useState<Barang[]>([]);
  const [searchingBarang, setSearchingBarang] = useState<boolean>(false);

  // Modal Popup Edit & Hapus Item saat baris diklik
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);
  const [showActionModal, setShowActionModal] = useState<boolean>(false);

  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://103.125.42.217:8081/api";

  // Helper Format Angka Titik Rupiah Indonesia (Contoh: 615.000)
  const formatAngka = (val: number | string | undefined | null) => {
    if (!val && val !== 0) return "0";
    const num = typeof val === "string" ? parseFloat(val) : val;
    if (isNaN(num)) return "0";
    return Math.round(num).toLocaleString("id-ID");
  };

  // Navigasi Keyboard Page Up & Page Down untuk Laptop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showActionModal || showSearchModal || showCameraModal) return;

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
  }, [showActionModal, showSearchModal, showCameraModal]);

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
        if (
          parsed.items &&
          Array.isArray(parsed.items) &&
          parsed.items.length > 0
        ) {
          setItems(parsed.items);
          return;
        }
      } catch (e) {
        console.error("Gagal parsing localStorage draft:", e);
      }
    }
    generateInitialRows();
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

  const generateInitialRows = () => {
    const initial: DetailItem[] = [];
    for (let i = 1; i <= 700; i++) {
      initial.push({
        no_urut: i,
        kd_br: "",
        nama_br: "",
        satuan: "",
        hpp: 0,
        qty: 0,
        sub_total: 0,
      });
    }
    setItems(initial);
  };

  // Suara Beep saat Kamera Berhasil Scan Barcode
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

  // Logika Tambah Barang ke Keranjang & Otomatis Fokus ke Input QTY
  const addItemToKeranjang = (barang: Barang) => {
    let targetIndex = -1;

    setItems((prev) => {
      const updated = [...prev];
      const existingIdx = updated.findIndex((it) => it.kd_br === barang.kd_br);
      const hpp = typeof barang.h_anggota === "string" ? parseFloat(barang.h_anggota) : (barang.h_anggota || 0);

      if (existingIdx !== -1) {
        targetIndex = existingIdx;
        const cur = updated[existingIdx];
        const newQty = (cur.qty || 0) + 1;
        updated[existingIdx] = {
          ...cur,
          qty: newQty,
          sub_total: cur.hpp * newQty,
        };
        return updated;
      }

      const emptyIdx = updated.findIndex((it) => !it.kd_br || it.kd_br.trim() === "");
      targetIndex = emptyIdx !== -1 ? emptyIdx : updated.length;

      const newItem: DetailItem = {
        no_urut: targetIndex + 1,
        kd_br: barang.kd_br,
        nama_br: barang.nama,
        satuan: barang.satuan,
        hpp: hpp,
        qty: 1,
        sub_total: hpp * 1,
      };

      if (emptyIdx !== -1) {
        updated[emptyIdx] = newItem;
      } else {
        updated.push(newItem);
      }
      return updated;
    });

    setQuickKeyword("");
    setQuickResults([]);
    setShowQuickDropdown(false);

    // Otomatis kursor lari ke kolom QTY
    setTimeout(() => {
      if (targetIndex !== -1 && qtyInputRefs.current[targetIndex]) {
        const inputEl = qtyInputRefs.current[targetIndex];
        inputEl?.focus();
        inputEl?.select();
        inputEl?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }, 80);
  };

  // Live Search & Scan dengan Alat Barcode di Laptop (Tanpa Tekan Enter)
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

  // Modal Pencarian Barang (Klik Baris Kosong)
  const openSearchModal = (index: number) => {
    setActiveRowIndex(index);
    setShowSearchModal(true);
    setSearchKeyword("");
    fetchBarangs("");
  };

  const fetchBarangs = async (keyword: string) => {
    setSearchingBarang(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(
        `${apiUrl}/barangs?search=${encodeURIComponent(keyword)}&limit=20`,
        {
          headers: {
            Accept: "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
        }
      );
      const json = await res.json();
      if (res.ok) {
        setBarangsList(json.data || json || []);
      }
    } catch (err) {
      console.error("Gagal ambil barang:", err);
    } finally {
      setSearchingBarang(false);
    }
  };

  const handleSelectBarangModal = (barang: Barang) => {
    if (activeRowIndex === null) return;
    const targetIdx = activeRowIndex;
    const hpp = typeof barang.h_anggota === "string" ? parseFloat(barang.h_anggota) : (barang.h_anggota || 0);

    setItems((prev) => {
      const updated = [...prev];
      const cur = updated[targetIdx];
      const qty = cur.qty || 1;

      updated[targetIdx] = {
        ...cur,
        kd_br: barang.kd_br,
        nama_br: barang.nama,
        satuan: barang.satuan,
        hpp: hpp,
        qty: qty,
        sub_total: hpp * qty,
      };
      return updated;
    });

    setShowSearchModal(false);
    setActiveRowIndex(null);

    setTimeout(() => {
      const inputEl = qtyInputRefs.current[targetIdx];
      inputEl?.focus();
      inputEl?.select();
    }, 80);
  };

  const handleOpenActionModal = (index: number) => {
    setSelectedItemIndex(index);
    setShowActionModal(true);
  };

  const handleClearCurrentRow = () => {
    if (selectedItemIndex === null) return;
    setItems((prev) => {
      const updated = [...prev];
      updated[selectedItemIndex] = {
        ...updated[selectedItemIndex],
        kd_br: "",
        nama_br: "",
        satuan: "",
        hpp: 0,
        qty: 0,
        sub_total: 0,
      };
      return updated;
    });
    setShowActionModal(false);
    setSelectedItemIndex(null);
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

  const handleSimpan = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Silakan login terlebih dahulu.");
      return;
    }

    if (!noBuku.trim()) {
      alert("Nomor Buku wajib diisi!");
      return;
    }

    const validItems = items.filter((item) => item.kd_br.trim() !== "");
    if (validItems.length === 0) {
      alert("Belum ada item barang yang diinput pada tabel opname!");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        no_buku: noBuku,
        tanggal: tanggal,
        penulis: penulis,
        penghitung: penghitung,
        pengawas: pengawas,
        ket: catatan,
        items: validItems.map((item) => ({
          no_urut: item.no_urut,
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

      const result = await res.json();

      if (res.ok && result.success) {
        alert("Stok Opname berhasil disimpan!");
        localStorage.removeItem("opname_draft_data");
        generateInitialRows();
        setNoBuku("");
        setCatatan("-");
      } else {
        alert(result.message || "Gagal menyimpan data opname.");
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
      <div className="max-w-7xl mx-auto px-1.5 sm:px-4 py-3 sm:py-6 bg-slate-900 text-white rounded-xl shadow-2xl">
        {/* Header Title Rapi */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-3 sm:p-4 mb-3 sm:mb-6 shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
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

        {/* Form Header (Uppercase Otomatis) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-6 bg-slate-800 p-3 sm:p-5 rounded-xl border border-slate-700 mb-3 sm:mb-6 shadow-md">
          <div className="space-y-2.5 sm:space-y-4">
            <div className="flex items-center gap-2 sm:gap-4">
              <label className="w-24 sm:w-28 font-semibold text-xs sm:text-sm text-slate-300 shrink-0">
                No Buku :
              </label>
              <input
                type="text"
                value={noBuku}
                onChange={(e) => setNoBuku(e.target.value.toUpperCase())}
                placeholder="BK 01..."
                className="flex-1 uppercase bg-slate-900 border border-slate-600 rounded px-2.5 py-1.5 text-xs sm:text-sm focus:outline-none focus:border-blue-500 text-white font-medium"
              />
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <label className="w-24 sm:w-28 font-semibold text-xs sm:text-sm text-slate-300 shrink-0">
                Tanggal :
              </label>
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-600 rounded px-2.5 py-1.5 text-xs sm:text-sm focus:outline-none focus:border-blue-500 text-white color-scheme-dark [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
              />
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <label className="w-24 sm:w-28 font-semibold text-xs sm:text-sm text-slate-300 shrink-0">
                Penulis :
              </label>
              <input
                type="text"
                value={penulis}
                onChange={(e) => setPenulis(e.target.value.toUpperCase())}
                placeholder="NAMA PENULIS..."
                className="flex-1 uppercase bg-slate-900 border border-slate-600 rounded px-2.5 py-1.5 text-xs sm:text-sm focus:outline-none focus:border-blue-500 text-white font-medium"
              />
            </div>
          </div>

          <div className="space-y-2.5 sm:space-y-4">
            <div className="flex items-center gap-2 sm:gap-4">
              <label className="w-24 sm:w-28 font-semibold text-xs sm:text-sm text-slate-300 shrink-0">
                Penghitung :
              </label>
              <input
                type="text"
                value={penghitung}
                onChange={(e) => setPenghitung(e.target.value.toUpperCase())}
                placeholder="NAMA PENGHITUNG..."
                className="flex-1 uppercase bg-slate-900 border border-slate-600 rounded px-2.5 py-1.5 text-xs sm:text-sm focus:outline-none focus:border-blue-500 text-white font-medium"
              />
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <label className="w-24 sm:w-28 font-semibold text-xs sm:text-sm text-slate-300 shrink-0">
                Pengawas :
              </label>
              <input
                type="text"
                value={pengawas}
                onChange={(e) => setPengawas(e.target.value.toUpperCase())}
                placeholder="NAMA PENGAWAS..."
                className="flex-1 uppercase bg-slate-900 border border-slate-600 rounded px-2.5 py-1.5 text-xs sm:text-sm focus:outline-none focus:border-blue-500 text-white font-medium"
              />
            </div>
          </div>
        </div>

        {/* SCAN BARCODE & KAMERA SCANNER HP */}
        <div className="relative mb-3 bg-slate-800 p-2.5 sm:p-4 rounded-xl border border-blue-600/50 shadow-lg">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs sm:text-sm font-bold text-blue-400 flex items-center gap-1.5">
              <FiSearch className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Scan Barcode / Input Barang Cepat:
            </span>
            <span className="text-[9px] sm:text-[10px] text-slate-400 italic">
              Laptop (alat scan) / HP (kamera)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                ref={quickInputRef}
                type="text"
                value={quickKeyword}
                onChange={(e) => handleQuickSearchChange(e.target.value)}
                onKeyDown={handleQuickSearchKeyDown}
                placeholder="Scan barcode alat di sini atau ketik nama/kode..."
                className="w-full bg-slate-950 border-2 border-blue-500/80 rounded-lg pl-3 pr-9 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
              />
              {quickKeyword && (
                <button
                  type="button"
                  onClick={() => {
                    setQuickKeyword("");
                    setShowQuickDropdown(false);
                  }}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                >
                  <FiX className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Tombol Kamera Scan Barcode Khusus HP */}
            <button
              type="button"
              onClick={startCamera}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-3 py-2 rounded-lg font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition shrink-0 text-xs sm:text-sm"
              title="Buka Kamera Barcode Scanner (HP)"
            >
              <FiCamera className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Kamera</span>
            </button>
          </div>

          {/* Dropdown Rekomendasi Pencarian */}
          {showQuickDropdown && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl z-30 max-h-64 overflow-y-auto p-1.5 space-y-1">
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
                        {formatAngka(b.h_anggota)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Tabel Grid Detail Opname (Format Titik & Pas di Layar HP) */}
        <div
          ref={tableContainerRef}
          tabIndex={0}
          className="overflow-x-auto border border-slate-700 rounded-lg mb-4 max-h-[550px] overflow-y-auto focus:outline-none"
        >
          <table className="w-full text-left border-collapse text-[10px] sm:text-xs md:text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-700 text-slate-200">
                <th className="p-1 sm:p-2 border border-slate-600 w-7 sm:w-10 md:w-14 text-center">
                  F8
                </th>
                <th className="p-1 sm:p-2 border border-slate-600 w-14 sm:w-20 md:w-28">
                  KODE
                </th>
                <th className="p-1 sm:p-2 border border-slate-600 min-w-[75px] sm:min-w-[120px]">
                  NAMA BARANG
                </th>
                <th className="p-1 sm:p-2 border border-slate-600 w-8 sm:w-12 md:w-16 text-center">
                  SAT
                </th>
                <th className="p-1 sm:p-2 border border-slate-600 w-14 sm:w-20 md:w-28 bg-cyan-900 text-cyan-200 text-right">
                  HPP
                </th>
                <th className="p-1 sm:p-2 border border-slate-600 w-16 sm:w-24 md:w-32 bg-fuchsia-900 text-fuchsia-200 text-center">
                  QTY
                </th>
                <th className="p-1 sm:p-2 border border-slate-600 w-14 sm:w-20 md:w-28 text-right">
                  SUB TOTAL
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const hasItem = Boolean(item.kd_br && item.kd_br.trim() !== "");
                return (
                  <tr
                    key={index}
                    className="hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <td
                      onClick={() =>
                        hasItem
                          ? handleOpenActionModal(index)
                          : openSearchModal(index)
                      }
                      className="p-1 sm:p-2 border border-slate-700 text-center bg-slate-800 text-blue-400 font-bold"
                    >
                      {item.no_urut}
                    </td>
                    <td
                      onClick={() =>
                        hasItem
                          ? handleOpenActionModal(index)
                          : openSearchModal(index)
                      }
                      className="p-1 sm:p-2 border border-slate-700 text-blue-300 font-mono truncate max-w-[65px] sm:max-w-none"
                      title={hasItem ? "Klik untuk edit/hapus" : "Pilih barang"}
                    >
                      {item.kd_br || (
                        <span className="text-slate-500 italic">Pilih...</span>
                      )}
                    </td>
                    <td
                      onClick={() =>
                        hasItem
                          ? handleOpenActionModal(index)
                          : openSearchModal(index)
                      }
                      className="p-1 sm:p-2 border border-slate-700 truncate max-w-[85px] sm:max-w-xs"
                      title={item.nama_br || "Klik cari barang"}
                    >
                      {item.nama_br || (
                        <span className="text-slate-500 italic">
                          - Klik cari -
                        </span>
                      )}
                    </td>
                    <td
                      onClick={() =>
                        hasItem
                          ? handleOpenActionModal(index)
                          : openSearchModal(index)
                      }
                      className="p-1 sm:p-2 border border-slate-700 text-center text-slate-300"
                    >
                      {item.satuan || "-"}
                    </td>
                    {/* HPP Berformat Titik */}
                    <td
                      onClick={() =>
                        hasItem
                          ? handleOpenActionModal(index)
                          : openSearchModal(index)
                      }
                      className="p-1 sm:p-2 border border-slate-700 text-right bg-cyan-950/40 font-mono"
                    >
                      {formatAngka(item.hpp)}
                    </td>
                    <td className="p-0.5 sm:p-1.5 border border-slate-700 bg-fuchsia-950/40 text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQtyAdjust(index, -1);
                          }}
                          className="bg-slate-800 hover:bg-slate-700 text-fuchsia-300 border border-fuchsia-700 rounded w-4 h-5 sm:w-5 sm:h-6 md:w-6 md:h-7 flex items-center justify-center text-[10px] shrink-0"
                          title="Kurangi 1"
                        >
                          <FiMinus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        </button>
                        <input
                          ref={(el) => {
                            qtyInputRefs.current[index] = el;
                          }}
                          type="text"
                          inputMode="numeric"
                          maxLength={4}
                          value={item.qty}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => handleQtyChange(index, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              quickInputRef.current?.focus();
                            }
                          }}
                          className="w-7 sm:w-10 md:w-12 bg-slate-900 text-center text-white py-0.5 rounded border border-fuchsia-700 focus:outline-none focus:border-white font-mono text-[10px] sm:text-xs md:text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          placeholder="0"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQtyAdjust(index, 1);
                          }}
                          className="bg-slate-800 hover:bg-slate-700 text-fuchsia-300 border border-fuchsia-700 rounded w-4 h-5 sm:w-5 sm:h-6 md:w-6 md:h-7 flex items-center justify-center text-[10px] shrink-0"
                          title="Tambah 1"
                        >
                          <FiPlus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        </button>
                      </div>
                    </td>
                    {/* SUB TOTAL Berformat Titik */}
                    <td
                      onClick={() =>
                        hasItem
                          ? handleOpenActionModal(index)
                          : openSearchModal(index)
                      }
                      className="p-1 sm:p-2 border border-slate-700 text-right font-mono font-semibold text-emerald-400"
                    >
                      {formatAngka(item.sub_total)}
                    </td>
                  </tr>
                );
              })}
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
              GRAND TOTAL (Rp) :
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
            disabled={loading}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white px-6 py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 shadow transition text-sm sm:text-base"
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
              {/* Header Modal */}
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

              {/* Body Modal */}
              <div className="p-4 space-y-4">
                {/* Info Barang Card */}
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

                {/* Kontrol QTY Besar Nyaman di HP */}
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
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      value={currentSelectedItem.qty}
                      onChange={(e) =>
                        handleQtyChange(selectedItemIndex, e.target.value)
                      }
                      className="w-24 h-12 bg-slate-950 text-center text-white rounded-xl border-2 border-fuchsia-600 focus:outline-none focus:border-white font-mono text-xl font-bold"
                    />
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

              {/* Footer Tombol Aksi */}
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
                  onClick={() => setShowActionModal(false)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition text-sm shadow-md active:scale-95"
                >
                  <FiCheckCircle className="w-4 h-4" />
                  Selesai
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL PENCARIAN BARANG (Ketika klik baris kosong) */}
        {showSearchModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-3 sm:p-4">
            <div className="bg-slate-800 border border-slate-700 w-full max-w-2xl rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
              <div className="p-3 sm:p-4 bg-slate-700 flex items-center justify-between">
                <h3 className="font-bold text-base sm:text-lg text-white">
                  Pilih Barang
                </h3>
                <button
                  onClick={() => setShowSearchModal(false)}
                  className="text-slate-300 hover:text-white font-bold px-2 py-1 text-base sm:text-lg"
                >
                  ✕
                </button>
              </div>
              <div className="p-3 sm:p-4 border-b border-slate-700">
                <div className="relative">
                  <FiSearch className="absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={searchKeyword}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSearchKeyword(val);
                      fetchBarangs(val);
                    }}
                    placeholder="Scan barcode, ketik kode atau nama barang..."
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg pl-10 pr-4 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-blue-500"
                    autoFocus
                  />
                </div>
              </div>
              <div
                className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2"
                style={{ minHeight: "260px" }}
              >
                {searchingBarang ? (
                  <div className="text-center py-10 text-slate-400 text-xs sm:text-sm">
                    Memuat barang...
                  </div>
                ) : barangsList.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-xs sm:text-sm">
                    Tidak ada barang ditemukan.
                  </div>
                ) : (
                  barangsList.map((b) => (
                    <div
                      key={b.kd_br}
                      onClick={() => handleSelectBarangModal(b)}
                      className="p-2.5 sm:p-3 bg-slate-900/60 hover:bg-slate-700 border border-slate-700 rounded-lg cursor-pointer flex justify-between items-center transition"
                    >
                      <div>
                        <div className="font-mono text-blue-400 text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2">
                          <span>{b.kd_br}</span>
                          {b.barcode && (
                            <span className="text-[10px] sm:text-xs text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                              Barcode: {b.barcode}
                            </span>
                          )}
                        </div>
                        <div className="text-white font-medium text-xs sm:text-sm line-clamp-1">
                          {b.nama}
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <div className="text-[10px] sm:text-xs text-slate-400">
                          Sat: {b.satuan}
                        </div>
                        <div className="text-cyan-400 font-mono text-xs sm:text-sm font-semibold">
                          Rp {formatAngka(b.h_anggota)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}