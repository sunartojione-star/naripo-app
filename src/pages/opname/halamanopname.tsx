"use client";

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
  FiAlertTriangle,
  FiDownload,
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

interface SaveFeedbackModal {
  type: "success" | "error" | "warning";
  title: string;
  message: string;
}

const QUICK_PAGE_STEP = 5;

const getBarangHppTerakhir = (barang: Barang): number => {
  const raw =
    barang.hpp_terakhir ??
    barang.hpp_akhir ??
    barang.h_beli ??
    barang.harga_beli ??
    barang.hpp ??
    0;
  const num = typeof raw === "string" ? parseFloat(raw) : Number(raw);
  return Number.isFinite(num) ? num : 0;
};

export default function HalamanOpname() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState<boolean>(false);
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

  // Ref Tabel & Input (Pisah antara HP dan PC agar .focus() tidak salah sasaran)
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const quickInputRef = useRef<HTMLInputElement>(null);
  const mobileQtyInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const desktopQtyInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const quickOptionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const quickSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const quickAbortRef = useRef<AbortController | null>(null);

  // Input Cepat / Barcode Scanner di Atas Keranjang State
  const [quickKeyword, setQuickKeyword] = useState<string>("");
  const [quickResults, setQuickResults] = useState<Barang[]>([]);
  const [quickSearching, setQuickSearching] = useState<boolean>(false);
  const [showQuickDropdown, setShowQuickDropdown] = useState<boolean>(false);
  const [quickHighlight, setQuickHighlight] = useState<number>(0);

  // Kamera Barcode Scanner State (Khusus HP)
  const [showCameraModal, setShowCameraModal] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string>("");
  const html5QrCodeRef = useRef<any>(null);

  // Modal Popup Edit & Hapus Item saat baris diklik
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(
    null
  );
  const [showActionModal, setShowActionModal] = useState<boolean>(false);

  // Modal Konfirmasi & Hasil Simpan (In-App Popup)
  const [showSaveConfirmModal, setShowSaveConfirmModal] =
    useState<boolean>(false);
  const [saveFeedbackModal, setSaveFeedbackModal] =
    useState<SaveFeedbackModal | null>(null);

  const rawApiUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://103.125.42.217:8081/api";
  const apiUrl = rawApiUrl.replace(/\/$/, "");

  const formatAngka = (val: number | string | undefined | null) => {
    if (!val && val !== 0) return "0";
    const num = typeof val === "string" ? parseFloat(val) : val;
    if (isNaN(num)) return "0";
    return Math.round(num).toLocaleString("id-ID");
  };

  const focusQuickInput = (immediate = false) => {
    const run = () => {
      if (quickInputRef.current) {
        quickInputRef.current.focus();
        quickInputRef.current.select();
        quickInputRef.current.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    };
    if (immediate) {
      run();
    } else {
      setTimeout(run, 50);
    }
  };

  // Cek hak akses: hanya admin, pengurus, dan karyawan
  useEffect(() => {
    const token =
      localStorage.getItem("token") || localStorage.getItem("auth_token");
    if (!token) {
      router.replace("/login");
      return;
    }

    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const u = JSON.parse(storedUser);
        const role = String(u.role || u.Hak || u.level_user || "")
          .trim()
          .toLowerCase();

        const isAllowed =
          role === "admin" ||
          role === "pengurus" ||
          role === "karyawan" ||
          role === "super admin" ||
          role === "superadmin" ||
          role === "kasir" ||
          Number(u.level_user) === 1 ||
          u.is_admin === true ||
          u.is_admin === 1;

        if (!isAllowed) {
          router.replace("/");
          return;
        }
      }
    } catch (e) {
      console.error("Gagal membaca data user:", e);
    }

    setAuthChecked(true);
  }, [router]);

  // Navigasi Keyboard Page Up & Page Down untuk tabel jika dropdown pencarian tidak sedang terbuka
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        showActionModal ||
        showCameraModal ||
        showQuickDropdown ||
        showSaveConfirmModal ||
        saveFeedbackModal !== null
      ) {
        return;
      }

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
  }, [
    showActionModal,
    showCameraModal,
    showQuickDropdown,
    showSaveConfirmModal,
    saveFeedbackModal,
  ]);

  // Reset & auto-scroll highlight dropdown pencarian barang
  useEffect(() => {
    setQuickHighlight(0);
  }, [quickResults]);

  useEffect(() => {
    if (!showQuickDropdown) return;
    const el = quickOptionRefs.current[quickHighlight];
    if (el) {
      el.scrollIntoView({ block: "nearest" });
    }
  }, [quickHighlight, showQuickDropdown]);

  // Bersihkan timer, request, dan stream kamera jika komponen di-unmount
  useEffect(() => {
    return () => {
      if (quickSearchTimerRef.current) {
        clearTimeout(quickSearchTimerRef.current);
      }
      quickAbortRef.current?.abort();
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

    const token =
      localStorage.getItem("token") || localStorage.getItem("auth_token");
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
    if (quickSearchTimerRef.current) {
      clearTimeout(quickSearchTimerRef.current);
    }
    quickAbortRef.current?.abort();

    const targetIndex = items.length;
    const hpp = getBarangHppTerakhir(barang);

    const newItem: DetailItem = {
      no_urut: targetIndex + 1,
      kd_br: barang.kd_br,
      nama_br: barang.nama,
      satuan: barang.satuan,
      hpp: hpp,
      qty: 1,
      sub_total: hpp * 1,
    };

    setItems((prev) => [...prev, newItem]);
    setQuickKeyword("");
    setQuickResults([]);
    setShowQuickDropdown(false);

    setTimeout(() => {
      const isMobile =
        typeof window !== "undefined" && window.innerWidth < 768;
      const inputEl = isMobile
        ? mobileQtyInputRefs.current[targetIndex]
        : desktopQtyInputRefs.current[targetIndex];

      if (inputEl) {
        inputEl.focus();
        inputEl.select();
        try {
          inputEl.setSelectionRange(0, String(inputEl.value || "").length);
        } catch {}
        inputEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 60);
  };

  // Ambil SEMUA hasil pencarian barang (multi-halaman paralel jika dipaginasi server)
  const fetchAllMatchingBarangs = async (
    keyword: string,
    signal?: AbortSignal
  ): Promise<Barang[]> => {
    const token =
      localStorage.getItem("token") || localStorage.getItem("auth_token");
    const perPage = 200;
    const headers: Record<string, string> = {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const firstRes = await fetch(
      `${apiUrl}/barangs?search=${encodeURIComponent(
        keyword
      )}&page=1&limit=${perPage}`,
      { headers, signal }
    );

    if (firstRes.status === 401) {
      router.replace("/login");
      return [];
    }

    const firstJson = await firstRes.json();
    if (!firstRes.ok) return [];

    const firstList: Barang[] = Array.isArray(firstJson)
      ? firstJson
      : Array.isArray(firstJson?.data)
      ? firstJson.data
      : [];

    const totalPages =
      Number(
        firstJson?.pagination?.total_pages ??
          firstJson?.meta?.last_page ??
          firstJson?.last_page ??
          1
      ) || 1;

    if (totalPages <= 1) {
      return firstList;
    }

    const pageNumbers = Array.from(
      { length: totalPages - 1 },
      (_, idx) => idx + 2
    );

    const restPages = await Promise.all(
      pageNumbers.map(async (page) => {
        try {
          const res = await fetch(
            `${apiUrl}/barangs?search=${encodeURIComponent(
              keyword
            )}&page=${page}&limit=${perPage}`,
            { headers, signal }
          );
          if (!res.ok) return [];
          const json = await res.json();
          return Array.isArray(json)
            ? json
            : Array.isArray(json?.data)
            ? json.data
            : [];
        } catch {
          return [];
        }
      })
    );

    const combined = [...firstList, ...restPages.flat()];
    const seen = new Set<string>();
    return combined.filter((b) => {
      const key = String(b?.kd_br || "").trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  // Live Search & Scan dengan Alat Barcode di Laptop
  const handleQuickSearchChange = (keyword: string) => {
    setQuickKeyword(keyword);
    const trimmed = keyword.trim();

    if (quickSearchTimerRef.current) {
      clearTimeout(quickSearchTimerRef.current);
    }
    quickAbortRef.current?.abort();

    if (!trimmed) {
      setQuickResults([]);
      setShowQuickDropdown(false);
      setQuickSearching(false);
      return;
    }

    const localMatch = quickResults.find(
      (b) =>
        b.barcode?.toLowerCase() === trimmed.toLowerCase() ||
        b.kd_br.toLowerCase() === trimmed.toLowerCase()
    );

    if (localMatch) {
      addItemToKeranjang(localMatch);
      return;
    }

    setQuickSearching(true);
    setShowQuickDropdown(true);

    quickSearchTimerRef.current = setTimeout(async () => {
      const controller = new AbortController();
      quickAbortRef.current = controller;

      try {
        const list = await fetchAllMatchingBarangs(trimmed, controller.signal);
        if (controller.signal.aborted) return;

        setQuickResults(list);

        const exactMatch = list.find(
          (b) =>
            b.barcode?.toLowerCase() === trimmed.toLowerCase() ||
            b.kd_br.toLowerCase() === trimmed.toLowerCase()
        );

        if (exactMatch) {
          addItemToKeranjang(exactMatch);
        }
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          console.error("Gagal cari barang cepat:", err);
        }
      } finally {
        if (!controller.signal.aborted) {
          setQuickSearching(false);
        }
      }
    }, 150);
  };

  // Handler Keyboard (Panah, PgUp/PgDn, Home/End, Enter, Esc) pada Input Pencarian Cepat
  const handleQuickSearchKeyDown = async (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    const total = quickResults.length;

    if (showQuickDropdown && total > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setQuickHighlight((prev) => Math.min(total - 1, prev + 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setQuickHighlight((prev) => Math.max(0, prev - 1));
        return;
      }
      if (e.key === "PageDown") {
        e.preventDefault();
        setQuickHighlight((prev) =>
          Math.min(total - 1, prev + QUICK_PAGE_STEP)
        );
        return;
      }
      if (e.key === "PageUp") {
        e.preventDefault();
        setQuickHighlight((prev) => Math.max(0, prev - QUICK_PAGE_STEP));
        return;
      }
      if (e.key === "Home") {
        e.preventDefault();
        setQuickHighlight(0);
        return;
      }
      if (e.key === "End") {
        e.preventDefault();
        setQuickHighlight(total - 1);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setShowQuickDropdown(false);
        return;
      }
    }

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

      if (showQuickDropdown && quickResults[quickHighlight]) {
        addItemToKeranjang(quickResults[quickHighlight]);
        return;
      }

      try {
        const list = await fetchAllMatchingBarangs(kw);
        if (list.length > 0) {
          const matched =
            list.find(
              (b) =>
                b.barcode?.toLowerCase() === kw.toLowerCase() ||
                b.kd_br.toLowerCase() === kw.toLowerCase()
            ) || list[0];
          addItemToKeranjang(matched);
        } else {
          setSaveFeedbackModal({
            type: "warning",
            title: "Barang Tidak Ditemukan",
            message: `Barang dengan barcode/kode "${kw}" tidak ditemukan.`,
          });
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
    focusQuickInput(true);
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

  const handleDownloadPdf = () => {
    if (items.length === 0) {
      setSaveFeedbackModal({
        type: "warning",
        title: "Belum Ada Data",
        message: "Belum ada item barang untuk diunduh sebagai PDF.",
      });
      return;
    }
    const prevTitle = document.title;
    const safeNoBuku = (noBuku.trim().toUpperCase() || "DRAFT").replace(
      /\s+/g,
      "_"
    );
    document.title = `Opname_${safeNoBuku}_${tanggal}`;
    window.print();
    setTimeout(() => {
      document.title = prevTitle;
    }, 500);
  };

  // Langkah 1: Validasi lalu buka Popup Konfirmasi Simpan (Batal / OK)
  const handleRequestSimpan = () => {
    if (loading) return;

    const token =
      localStorage.getItem("token") || localStorage.getItem("auth_token");
    if (!token) {
      setSaveFeedbackModal({
        type: "error",
        title: "Belum Login",
        message: "Silakan login terlebih dahulu.",
      });
      return;
    }

    const cleanNoBuku = noBuku.trim().toUpperCase();
    if (!cleanNoBuku) {
      setSaveFeedbackModal({
        type: "warning",
        title: "Nomor Buku Kosong",
        message: "Nomor Buku wajib diisi sebelum menyimpan opname!",
      });
      return;
    }

    if (noBukuExists) {
      setSaveFeedbackModal({
        type: "error",
        title: "Nomor Buku Duplikat",
        message: `Nomor Buku "${cleanNoBuku}" sudah ada di database! Tidak bisa input nomor buku yang sama.`,
      });
      return;
    }

    if (items.length === 0) {
      setSaveFeedbackModal({
        type: "warning",
        title: "Keranjang Masih Kosong",
        message: "Belum ada item barang yang diinput pada tabel opname!",
      });
      return;
    }

    setShowSaveConfirmModal(true);
  };

  // Langkah 2: Eksekusi Simpan ke Server setelah user menekan OK
  const executeSimpan = async () => {
    if (loading) return;

    const token =
      localStorage.getItem("token") || localStorage.getItem("auth_token");
    if (!token) {
      setShowSaveConfirmModal(false);
      setSaveFeedbackModal({
        type: "error",
        title: "Belum Login",
        message: "Silakan login terlebih dahulu.",
      });
      return;
    }

    const cleanNoBuku = noBuku.trim().toUpperCase();
    if (!cleanNoBuku || items.length === 0) {
      setShowSaveConfirmModal(false);
      return;
    }

    setShowSaveConfirmModal(false);
    setLoading(true);
    try {
      const isDup = noBukuExists || (await checkDuplicateNoBuku(cleanNoBuku));
      if (isDup) {
        setSaveFeedbackModal({
          type: "error",
          title: "Nomor Buku Duplikat",
          message: `Nomor Buku "${cleanNoBuku}" sudah ada di database! Tidak bisa input nomor buku yang sama.`,
        });
        return;
      }

      const payload = {
        no_buku: cleanNoBuku,
        tanggal: tanggal,
        tgl_opname: tanggal,
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
          nilai: item.hpp,
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
        const savedItemCount = items.length;
        const savedTotalQty = totalQty;
        localStorage.removeItem("opname_draft_data");
        setItems([]);
        setNoBuku("");
        setNoBukuExists(false);
        setCatatan("-");
        setSaveFeedbackModal({
          type: "success",
          title: "Stok Opname Tersimpan",
          message: `Data opname No. Buku "${cleanNoBuku}" (${savedItemCount} item, ${formatAngka(
            savedTotalQty
          )} qty) berhasil disimpan ke server.`,
        });
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
        setSaveFeedbackModal({
          type: "error",
          title: "Gagal Menyimpan",
          message: result?.message || "Gagal menyimpan data opname.",
        });
      }
    } catch (err: any) {
      console.error("Error simpan opname:", err);
      setSaveFeedbackModal({
        type: "error",
        title: "Gagal Menyimpan",
        message: "Terjadi kesalahan koneksi ke server.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseFeedbackModal = () => {
    const wasSuccess = saveFeedbackModal?.type === "success";
    setSaveFeedbackModal(null);
    if (wasSuccess) {
      focusQuickInput();
    }
  };

  if (!isMounted || !authChecked) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">
          Memeriksa hak akses...
        </div>
      </Layout>
    );
  }

  const currentSelectedItem =
    selectedItemIndex !== null ? items[selectedItemIndex] : null;

  return (
    <Layout>
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm;
          }
          header,
          nav,
          footer,
          .no-print {
            display: none !important;
          }
          body {
            background: #ffffff !important;
            color: #000000 !important;
          }
        }
      `}</style>

      {/* TAMPILAN LAYAR NORMAL (TEMA TERANG) */}
      <div className="no-print max-w-7xl mx-auto px-2 sm:px-4 py-3 sm:py-6 pb-20 lg:pb-8 bg-slate-50 text-slate-800 rounded-2xl shadow-sm border border-slate-200">
        {/* Header Title */}
        <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 mb-2.5 sm:mb-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 sm:p-2.5 bg-gradient-to-tr from-teal-700 to-emerald-500 rounded-lg text-white shadow-sm shrink-0">
                <FiClipboard className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h1 className="text-base sm:text-xl font-bold tracking-wide text-slate-900 leading-tight">
                  Proses Stok Opname Master
                </h1>
                <p className="text-[11px] sm:text-xs text-teal-700 font-semibold tracking-wider">
                  -BARANG-
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Draft Tersimpan Otomatis
              </span>
            </div>
          </div>
        </div>

        {/* STICKY WRAPPER: FORM HEADER + SCAN BARCODE */}
        <div className="sticky top-14 sm:top-16 z-30 bg-slate-50/95 backdrop-blur-xs pt-1 pb-2 -mx-2 px-2 sm:-mx-4 sm:px-4">
          {/* Form Header */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 sm:gap-5 bg-white p-2.5 sm:p-4 rounded-xl border border-slate-200 mb-2 sm:mb-3 shadow-xs">
            <div className="space-y-1.5 sm:space-y-3">
              <div>
                <div className="flex items-center gap-2 sm:gap-4">
                  <label className="w-20 sm:w-28 font-semibold text-[11px] sm:text-sm text-slate-600 shrink-0">
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
                    disabled={loading}
                    placeholder="BK 01..."
                    className={`flex-1 uppercase bg-slate-50 border rounded-lg px-2.5 py-1.5 text-xs sm:text-sm focus:outline-none text-slate-900 font-semibold ${
                      noBukuExists
                        ? "border-red-500 focus:border-red-500 bg-red-50/50"
                        : "border-slate-300 focus:border-teal-600 focus:bg-white"
                    }`}
                  />
                </div>
                {checkingNoBuku && (
                  <p className="text-[10px] text-slate-500 mt-0.5 ml-24 sm:ml-32">
                    Mengecek nomor buku...
                  </p>
                )}
                {noBukuExists && (
                  <p className="text-[10px] text-red-600 font-semibold mt-0.5 flex items-center gap-1 ml-24 sm:ml-32">
                    <FiAlertTriangle className="w-3 h-3 shrink-0" />
                    Nomor buku &quot;{noBuku.trim().toUpperCase()}&quot; sudah terdaftar!
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 sm:gap-4">
                <label className="w-20 sm:w-28 font-semibold text-[11px] sm:text-sm text-slate-600 shrink-0">
                  Tanggal :
                </label>
                <input
                  type="date"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm focus:outline-none focus:border-teal-600 focus:bg-white text-slate-900"
                />
              </div>
              <div className="flex items-center gap-2 sm:gap-4">
                <label className="w-20 sm:w-28 font-semibold text-[11px] sm:text-sm text-slate-600 shrink-0">
                  Penulis :
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  autoCapitalize="characters"
                  value={penulis}
                  onChange={(e) => setPenulis(e.target.value)}
                  placeholder="NAMA PENULIS..."
                  className="flex-1 uppercase bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm focus:outline-none focus:border-teal-600 focus:bg-white text-slate-900 font-medium"
                />
              </div>
            </div>

            <div className="space-y-1.5 sm:space-y-3">
              <div className="flex items-center gap-2 sm:gap-4">
                <label className="w-20 sm:w-28 font-semibold text-[11px] sm:text-sm text-slate-600 shrink-0">
                  Penghitung :
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  autoCapitalize="characters"
                  value={penghitung}
                  onChange={(e) => setPenghitung(e.target.value)}
                  placeholder="NAMA PENGHITUNG..."
                  className="flex-1 uppercase bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm focus:outline-none focus:border-teal-600 focus:bg-white text-slate-900 font-medium"
                />
              </div>
              <div className="flex items-center gap-2 sm:gap-4">
                <label className="w-20 sm:w-28 font-semibold text-[11px] sm:text-sm text-slate-600 shrink-0">
                  Pengawas :
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  autoCapitalize="characters"
                  value={pengawas}
                  onChange={(e) => setPengawas(e.target.value)}
                  placeholder="NAMA PENGAWAS..."
                  className="flex-1 uppercase bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm focus:outline-none focus:border-teal-600 focus:bg-white text-slate-900 font-medium"
                />
              </div>
            </div>
          </div>

          {/* SCAN BARCODE (RINGKAS & HEMAT RUANG) */}
          <div className="relative bg-white p-2 sm:p-3 rounded-xl border border-teal-200 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <FiSearch className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={quickInputRef}
                  type="text"
                  value={quickKeyword}
                  onChange={(e) => handleQuickSearchChange(e.target.value)}
                  onKeyDown={handleQuickSearchKeyDown}
                  placeholder="Scan Barcode / Ketik Nama Barang (↑↓ / PgUp PgDn)"
                  className="w-full bg-slate-50 border-2 border-teal-500 rounded-lg pl-8 sm:pl-9 pr-8 py-1.5 sm:py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20"
                />
                {quickKeyword && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuickKeyword("");
                      setQuickResults([]);
                      setShowQuickDropdown(false);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    <FiX className="w-4 h-4" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={startCamera}
                className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white px-3 py-1.5 sm:py-2 rounded-lg font-bold flex items-center gap-1.5 shadow-xs active:scale-95 transition shrink-0 text-xs sm:text-sm"
                title="Buka Kamera Barcode Scanner (HP)"
              >
                <FiCamera className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Kamera</span>
              </button>
            </div>

            {/* Dropdown Rekomendasi Pencarian (Tampil Semua) */}
            {showQuickDropdown && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-40 max-h-[60vh] overflow-y-auto p-1.5 space-y-1">
                {quickSearching ? (
                  <div className="p-2.5 text-center text-slate-500 text-xs">
                    Mencari semua barang...
                  </div>
                ) : quickResults.length === 0 ? (
                  <div className="p-2.5 text-center text-slate-500 text-xs">
                    Barang tidak ditemukan.
                  </div>
                ) : (
                  <>
                    <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-xs px-2 py-1 text-[10px] text-teal-700 font-semibold border-b border-slate-200 flex items-center justify-between">
                      <span>Ditemukan {quickResults.length} barang</span>
                      <span className="text-slate-400">
                        ↑↓ / PgUp PgDn • Enter pilih
                      </span>
                    </div>
                    {quickResults.map((b, idx) => {
                      const isHighlighted = idx === quickHighlight;
                      return (
                        <div
                          key={b.kd_br}
                          ref={(el) => {
                            quickOptionRefs.current[idx] = el;
                          }}
                          onMouseEnter={() => setQuickHighlight(idx)}
                          onClick={() => addItemToKeranjang(b)}
                          className={`p-2 rounded-lg cursor-pointer flex justify-between items-center transition border ${
                            isHighlighted
                              ? "bg-teal-50 border-teal-500 ring-1 ring-teal-500"
                              : "bg-slate-50 hover:bg-teal-50/60 border-slate-200 hover:border-teal-300"
                          }`}
                        >
                          <div>
                            <div className="font-mono text-teal-700 text-[11px] flex items-center gap-1.5">
                              <span className="font-bold">{b.kd_br}</span>
                              {b.barcode && (
                                <span className="text-[9px] text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                  Barcode: {b.barcode}
                                </span>
                              )}
                            </div>
                            <div className="text-slate-900 font-semibold text-xs line-clamp-1">
                              {b.nama}
                            </div>
                          </div>
                          <div className="text-right shrink-0 ml-2">
                            <div className="text-[9px] text-slate-500">
                              Sat: {b.satuan}
                            </div>
                            <div className="text-cyan-700 font-mono text-[11px] font-bold">
                              {formatAngka(getBarangHppTerakhir(b))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Info Jumlah Barang Dihitung */}
        <div className="flex items-center justify-between text-[11px] sm:text-xs text-slate-600 px-1 mb-2">
          <span className="font-semibold">Daftar Barang Dihitung</span>
          <span className="font-bold text-teal-700">
            {items.length} Item ({formatAngka(totalQty)} Qty)
          </span>
        </div>

        {/* TAMPILAN HP: Daftar Kartu Opname */}
        <div className="md:hidden space-y-2 mb-4">
          {items.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-5 text-center text-xs text-slate-500">
              Belum ada barang. Scan barcode atau ketik nama/kode di atas.
            </div>
          ) : (
            items.map((item, idx) => (
              <div
                key={`m-${item.kd_br}-${idx}`}
                onClick={() => handleOpenActionModal(idx)}
                className="rounded-xl border border-slate-200 bg-white p-2.5 space-y-2 shadow-xs active:bg-slate-50"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono">
                      <span className="font-bold text-teal-700">
                        #{idx + 1}
                      </span>
                      <span className="text-blue-700 font-semibold">
                        {item.kd_br}
                      </span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600 border border-slate-200">
                        {item.satuan || "-"}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-900 leading-snug mt-0.5 break-words">
                      {item.nama_br}
                    </p>
                  </div>
                  <FiEdit2 className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                </div>

                <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-100">
                  <div className="text-[11px]">
                    <span className="text-slate-400 block text-[9px]">HPP</span>
                    <span className="font-mono font-bold text-cyan-700">
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
                      className="bg-fuchsia-50 hover:bg-fuchsia-100 text-fuchsia-700 border border-fuchsia-300 rounded w-6 h-7 flex items-center justify-center"
                    >
                      <FiMinus className="w-3 h-3" />
                    </button>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        focusQuickInput(true);
                      }}
                      className="inline-block"
                    >
                      <input
                        ref={(el) => {
                          mobileQtyInputRefs.current[idx] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        enterKeyHint="done"
                        maxLength={4}
                        value={item.qty}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => handleQtyChange(idx, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.keyCode === 13) {
                            e.preventDefault();
                            focusQuickInput(true);
                          }
                        }}
                        className="w-11 h-7 bg-white text-center text-slate-900 rounded border border-fuchsia-400 focus:outline-none focus:border-teal-600 font-mono text-xs font-bold"
                      />
                    </form>
                    <button
                      type="button"
                      onClick={() => handleQtyAdjust(idx, 1)}
                      className="bg-fuchsia-50 hover:bg-fuchsia-100 text-fuchsia-700 border border-fuchsia-300 rounded w-6 h-7 flex items-center justify-center"
                    >
                      <FiPlus className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="text-right text-[11px]">
                    <span className="text-slate-400 block text-[9px]">
                      SUB TOTAL
                    </span>
                    <span className="font-mono font-bold text-emerald-700">
                      {formatAngka(item.sub_total)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* TAMPILAN TABLET & PC: Tabel Grid Detail Opname */}
        <div
          ref={tableContainerRef}
          tabIndex={0}
          className="hidden md:block overflow-x-auto border border-slate-200 bg-white rounded-xl mb-4 max-h-[550px] overflow-y-auto focus:outline-none shadow-xs"
        >
          <table className="w-full text-left border-collapse text-xs md:text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-100 text-slate-700">
                <th className="p-2.5 border-b border-r border-slate-200 w-14 text-center">
                  NO
                </th>
                <th className="p-2.5 border-b border-r border-slate-200 w-28">
                  KODE
                </th>
                <th className="p-2.5 border-b border-r border-slate-200 min-w-[160px]">
                  NAMA BARANG
                </th>
                <th className="p-2.5 border-b border-r border-slate-200 w-16 text-center">
                  SAT
                </th>
                <th className="p-2.5 border-b border-r border-slate-200 w-28 bg-cyan-50 text-cyan-800 text-right">
                  HPP
                </th>
                <th className="p-2.5 border-b border-r border-slate-200 w-32 bg-fuchsia-50 text-fuchsia-800 text-center">
                  QTY
                </th>
                <th className="p-2.5 border-b border-slate-200 w-28 text-right">
                  SUB TOTAL
                </th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="p-6 text-center text-slate-500 text-xs md:text-sm"
                  >
                    Belum ada barang. Scan barcode atau ketik nama/kode di atas.
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => (
                  <tr
                    key={`${item.kd_br}-${idx}`}
                    onClick={() => handleOpenActionModal(idx)}
                    className="hover:bg-teal-50/50 cursor-pointer transition-colors border-b border-slate-100"
                  >
                    <td className="p-2 border-r border-slate-100 text-center bg-slate-50 text-teal-700 font-bold">
                      {idx + 1}
                    </td>
                    <td
                      className="p-2 border-r border-slate-100 text-blue-700 font-mono font-medium"
                      title="Klik untuk edit/hapus"
                    >
                      {item.kd_br}
                    </td>
                    <td
                      className="p-2 border-r border-slate-100 truncate max-w-xs text-slate-900 font-medium"
                      title={item.nama_br}
                    >
                      {item.nama_br}
                    </td>
                    <td className="p-2 border-r border-slate-100 text-center text-slate-600">
                      {item.satuan || "-"}
                    </td>
                    <td className="p-2 border-r border-slate-100 text-right bg-cyan-50/40 font-mono text-cyan-800">
                      {formatAngka(item.hpp)}
                    </td>
                    <td className="p-1.5 border-r border-slate-100 bg-fuchsia-50/40 text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQtyAdjust(idx, -1);
                          }}
                          className="bg-white hover:bg-fuchsia-100 text-fuchsia-700 border border-fuchsia-300 rounded w-6 h-7 flex items-center justify-center text-[10px] shrink-0"
                          title="Kurangi 1"
                        >
                          <FiMinus className="w-3 h-3" />
                        </button>

                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            focusQuickInput(true);
                          }}
                          className="inline-block"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            ref={(el) => {
                              desktopQtyInputRefs.current[idx] = el;
                            }}
                            type="text"
                            inputMode="numeric"
                            enterKeyHint="done"
                            maxLength={4}
                            value={item.qty}
                            onClick={(e) => e.stopPropagation()}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) =>
                              handleQtyChange(idx, e.target.value)
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.keyCode === 13) {
                                e.preventDefault();
                                focusQuickInput(true);
                              }
                            }}
                            className="w-12 bg-white text-center text-slate-900 py-0.5 rounded border border-fuchsia-400 focus:outline-none focus:border-teal-600 font-mono text-sm font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            placeholder="0"
                          />
                        </form>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQtyAdjust(idx, 1);
                          }}
                          className="bg-white hover:bg-fuchsia-100 text-fuchsia-700 border border-fuchsia-300 rounded w-6 h-7 flex items-center justify-center text-[10px] shrink-0"
                          title="Tambah 1"
                        >
                          <FiPlus className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                    <td className="p-2 text-right font-mono font-bold text-emerald-700">
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
            <label className="text-xs sm:text-sm font-semibold text-slate-600">
              Catatan :
            </label>
            <input
              type="text"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs sm:text-sm focus:outline-none focus:border-teal-600 text-slate-900"
            />
          </div>
          <div className="bg-white border-2 border-teal-200 p-2.5 sm:p-4 rounded-xl text-right shadow-xs">
            <span className="text-[10px] sm:text-xs text-slate-500 font-bold block mb-0.5">
              {items.length} ITEM ({formatAngka(totalQty)} QTY) • GRAND TOTAL (Rp) :
            </span>
            <span className="text-xl sm:text-3xl font-extrabold text-teal-700 font-mono">
              {formatAngka(grandTotal)}
            </span>
          </div>
        </div>

        {/* Tombol Simpan & Download PDF */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={handleRequestSimpan}
            disabled={loading || noBukuExists}
            className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 shadow-xs transition text-sm sm:text-base"
          >
            <FiSave className="w-4 h-4 sm:w-5 sm:h-5" />
            {loading ? "Menyimpan..." : "Simpan Opname"}
          </button>

          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={items.length === 0}
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 shadow-xs transition text-sm sm:text-base"
          >
            <FiDownload className="w-4 h-4 sm:w-5 sm:h-5" />
            Download PDF
          </button>
        </div>

        {/* MODAL KONFIRMASI SIMPAN OPNAME (BATAL / OK) */}
        {showSaveConfirmModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[70] p-4">
            <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-150">
              <div className="p-4 bg-teal-700 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FiSave className="w-5 h-5 text-emerald-300" />
                  <h3 className="font-bold text-sm sm:text-base">
                    Konfirmasi Simpan Opname
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSaveConfirmModal(false)}
                  className="text-teal-100 hover:text-white p-1 rounded-lg"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 space-y-3 text-xs sm:text-sm text-slate-700">
                <p className="font-medium text-slate-800">
                  Apakah Anda yakin ingin menyimpan data stok opname berikut?
                </p>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5 text-xs">
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">No Buku</span>
                    <span className="font-bold text-slate-900 font-mono">
                      {noBuku.trim().toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Tanggal</span>
                    <span className="font-semibold text-slate-900">
                      {tanggal}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Total Item / Qty</span>
                    <span className="font-semibold text-slate-900">
                      {items.length} Item ({formatAngka(totalQty)} Qty)
                    </span>
                  </div>
                  <div className="flex justify-between gap-2 pt-1.5 border-t border-slate-200">
                    <span className="text-slate-600 font-semibold">
                      Grand Total
                    </span>
                    <span className="font-extrabold text-teal-700 font-mono">
                      Rp {formatAngka(grandTotal)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowSaveConfirmModal(false)}
                  className="flex-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition active:scale-95"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={executeSimpan}
                  disabled={loading}
                  className="flex-1 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white py-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 text-xs sm:text-sm shadow-xs transition active:scale-95"
                >
                  <FiCheckCircle className="w-4 h-4" />
                  OK, Lanjutkan
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL NOTIFIKASI / HASIL SIMPAN (IN-APP POPUP) */}
        {saveFeedbackModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[75] p-4">
            <div className="bg-white border border-slate-200 w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-150">
              <div
                className={`p-4 flex items-center gap-2.5 text-white ${
                  saveFeedbackModal.type === "success"
                    ? "bg-emerald-600"
                    : saveFeedbackModal.type === "warning"
                    ? "bg-amber-500"
                    : "bg-red-600"
                }`}
              >
                {saveFeedbackModal.type === "success" ? (
                  <FiCheckCircle className="w-5 h-5 shrink-0" />
                ) : (
                  <FiAlertTriangle className="w-5 h-5 shrink-0" />
                )}
                <h3 className="font-bold text-sm sm:text-base">
                  {saveFeedbackModal.title}
                </h3>
              </div>

              <div className="p-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
                {saveFeedbackModal.message}
              </div>

              <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
                <button
                  type="button"
                  onClick={handleCloseFeedbackModal}
                  className={`w-full sm:w-auto px-6 py-2 rounded-xl font-bold text-xs sm:text-sm text-white transition active:scale-95 ${
                    saveFeedbackModal.type === "success"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : saveFeedbackModal.type === "warning"
                      ? "bg-amber-500 hover:bg-amber-600"
                      : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL KAMERA BARCODE SCANNER (KHUSUS HP) */}
        {showCameraModal && (
          <div className="fixed inset-0 bg-slate-900/75 flex items-center justify-center z-[60] p-4">
            <div className="bg-white border border-slate-200 w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-150">
              <div className="p-3 bg-teal-700 text-white flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <FiCamera className="text-emerald-300 w-4 h-4" />
                  <span>Arahkan Kamera ke Barcode</span>
                </div>
                <button
                  onClick={stopCamera}
                  className="text-teal-100 hover:text-white p-1"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 flex flex-col items-center">
                {cameraError ? (
                  <div className="text-red-600 text-xs text-center py-8 px-2">
                    {cameraError}
                  </div>
                ) : (
                  <div className="w-full relative rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center border-2 border-teal-500">
                    <div id="camera-reader" className="w-full h-64"></div>
                  </div>
                )}
                <p className="text-[11px] text-slate-500 text-center mt-3">
                  Pastikan barcode berada di dalam kotak pemindai dan pencahayaan cukup.
                </p>
              </div>

              <div className="p-3 bg-slate-50 border-t border-slate-200 text-center">
                <button
                  type="button"
                  onClick={stopCamera}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-5 py-1.5 rounded-lg text-xs font-semibold"
                >
                  Tutup Kamera
                </button>
              </div>
            </div>
          </div>
        )}

        {/* POPUP MODAL: EDIT & HAPUS BARANG DARI BARIS TABEL */}
        {showActionModal && currentSelectedItem && selectedItemIndex !== null && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-150">
              <div className="p-4 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FiEdit2 className="text-teal-700 w-5 h-5" />
                  <h3 className="font-bold text-base text-slate-900">
                    Edit / Hapus Barang
                  </h3>
                </div>
                <button
                  onClick={() => setShowActionModal(false)}
                  className="text-slate-500 hover:text-slate-800 p-1 rounded-lg"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between text-xs text-blue-700 font-mono mb-1">
                    <span className="font-bold">
                      KODE: {currentSelectedItem.kd_br}
                    </span>
                    <span className="text-slate-500">
                      SAT: {currentSelectedItem.satuan}
                    </span>
                  </div>
                  <h4 className="font-semibold text-slate-900 text-sm mb-2">
                    {currentSelectedItem.nama_br}
                  </h4>
                  <div className="flex items-center justify-between text-xs border-t border-slate-200 pt-2 font-mono">
                    <span className="text-slate-500">Harga Pokok (HPP):</span>
                    <span className="text-cyan-700 font-bold">
                      Rp {formatAngka(currentSelectedItem.hpp)}
                    </span>
                  </div>
                </div>

                <div className="bg-fuchsia-50/50 p-3.5 rounded-xl border border-fuchsia-200">
                  <label className="block text-xs font-bold text-fuchsia-800 mb-2 text-center uppercase tracking-wider">
                    Jumlah Qty Opname
                  </label>
                  <div className="flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleQtyAdjust(selectedItemIndex, -1)}
                      className="w-12 h-12 bg-white hover:bg-fuchsia-100 text-fuchsia-700 border border-fuchsia-300 rounded-xl flex items-center justify-center font-bold text-lg transition active:scale-95"
                    >
                      <FiMinus className="w-5 h-5" />
                    </button>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        setShowActionModal(false);
                        focusQuickInput(true);
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
                        onFocus={(e) => e.target.select()}
                        onChange={(e) =>
                          handleQtyChange(selectedItemIndex, e.target.value)
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.keyCode === 13) {
                            e.preventDefault();
                            setShowActionModal(false);
                            focusQuickInput(true);
                          }
                        }}
                        className="w-24 h-12 bg-white text-center text-slate-900 rounded-xl border-2 border-fuchsia-400 focus:outline-none focus:border-teal-600 font-mono text-xl font-bold"
                      />
                    </form>
                    <button
                      type="button"
                      onClick={() => handleQtyAdjust(selectedItemIndex, 1)}
                      className="w-12 h-12 bg-white hover:bg-fuchsia-100 text-fuchsia-700 border border-fuchsia-300 rounded-xl flex items-center justify-center font-bold text-lg transition active:scale-95"
                    >
                      <FiPlus className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="mt-3 text-center text-xs font-mono">
                    <span className="text-slate-500">Subtotal: </span>
                    <span className="text-emerald-700 font-bold text-sm">
                      Rp {formatAngka(currentSelectedItem.sub_total)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleClearCurrentRow}
                  className="flex-1 bg-red-50 hover:bg-red-600 border border-red-300 text-red-700 hover:text-white py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition text-sm active:scale-95"
                >
                  <FiTrash2 className="w-4 h-4" />
                  Hapus Baris
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowActionModal(false);
                    focusQuickInput(true);
                  }}
                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition text-sm shadow-xs active:scale-95"
                >
                  <FiCheckCircle className="w-4 h-4" />
                  Selesai
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* TAMPILAN KHUSUS DOWNLOAD PDF / CETAK A4 */}
      <div className="hidden print:block bg-white text-black p-2 text-xs">
        <div className="border-b-2 border-black pb-2 mb-3 flex justify-between items-start">
          <div>
            <h1 className="text-base font-bold uppercase tracking-wide">
              KOPERASI NIAGA ABADI RIDHOTULLAH
            </h1>
            <p className="text-xs font-semibold">
              LAPORAN STOK OPNAME MASTER BARANG
            </p>
          </div>
          <div className="text-right text-[11px]">
            <div>
              <span className="font-semibold">No Buku:</span>{" "}
              {noBuku.trim().toUpperCase() || "-"}
            </div>
            <div>
              <span className="font-semibold">Tanggal:</span> {tanggal}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3 text-[11px]">
          <div>
            <span className="font-semibold">Penulis:</span>{" "}
            {penulis.trim().toUpperCase() || "-"}
          </div>
          <div>
            <span className="font-semibold">Penghitung:</span>{" "}
            {penghitung.trim().toUpperCase() || "-"}
          </div>
          <div>
            <span className="font-semibold">Pengawas:</span>{" "}
            {pengawas.trim().toUpperCase() || "-"}
          </div>
        </div>

        <table className="w-full border-collapse border border-black text-[11px] mb-3">
          <thead>
            <tr className="bg-gray-200">
              <th className="border border-black px-1.5 py-1 text-center w-8">
                NO
              </th>
              <th className="border border-black px-1.5 py-1 text-left w-24">
                KODE
              </th>
              <th className="border border-black px-1.5 py-1 text-left">
                NAMA BARANG
              </th>
              <th className="border border-black px-1.5 py-1 text-center w-14">
                SAT
              </th>
              <th className="border border-black px-1.5 py-1 text-right w-24">
                HPP
              </th>
              <th className="border border-black px-1.5 py-1 text-center w-14">
                QTY
              </th>
              <th className="border border-black px-1.5 py-1 text-right w-28">
                SUB TOTAL
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={`print-${item.kd_br}-${idx}`}>
                <td className="border border-black px-1.5 py-1 text-center">
                  {idx + 1}
                </td>
                <td className="border border-black px-1.5 py-1 font-mono">
                  {item.kd_br}
                </td>
                <td className="border border-black px-1.5 py-1">
                  {item.nama_br}
                </td>
                <td className="border border-black px-1.5 py-1 text-center">
                  {item.satuan || "-"}
                </td>
                <td className="border border-black px-1.5 py-1 text-right font-mono">
                  {formatAngka(item.hpp)}
                </td>
                <td className="border border-black px-1.5 py-1 text-center font-mono">
                  {item.qty}
                </td>
                <td className="border border-black px-1.5 py-1 text-right font-mono font-semibold">
                  {formatAngka(item.sub_total)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100 font-bold">
              <td
                colSpan={5}
                className="border border-black px-2 py-1.5 text-right"
              >
                TOTAL ({items.length} Item)
              </td>
              <td className="border border-black px-1.5 py-1.5 text-center font-mono">
                {formatAngka(totalQty)}
              </td>
              <td className="border border-black px-1.5 py-1.5 text-right font-mono">
                Rp {formatAngka(grandTotal)}
              </td>
            </tr>
          </tfoot>
        </table>

        <div className="text-[11px] mb-6">
          <span className="font-semibold">Catatan:</span> {catatan || "-"}
        </div>

        <div className="grid grid-cols-3 gap-4 text-center text-[11px] pt-2">
          <div>
            <p className="mb-12">Penulis,</p>
            <p className="font-semibold border-t border-black pt-1 mx-4">
              {penulis.trim().toUpperCase() || "...................."}
            </p>
          </div>
          <div>
            <p className="mb-12">Penghitung,</p>
            <p className="font-semibold border-t border-black pt-1 mx-4">
              {penghitung.trim().toUpperCase() || "...................."}
            </p>
          </div>
          <div>
            <p className="mb-12">Pengawas,</p>
            <p className="font-semibold border-t border-black pt-1 mx-4">
              {pengawas.trim().toUpperCase() || "...................."}
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}