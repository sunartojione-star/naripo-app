"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import Layout from "@/components/Layout";
import {
  FiSearch,
  FiPackage,
  FiLock,
  FiArrowLeft,
  FiX,
  FiRefreshCw,
  FiAlertCircle,
  FiChevronDown,
  FiCheck,
} from "react-icons/fi";

interface BarangAktif {
  kd_br?: string;
  kd?: string;
  nama: string;
  kd_sp?: string;
  satuan?: string;
  hpp?: string | number;
  hpp_beli?: string | number;
  h_anggota?: string | number;
  h_boman?: string | number;
  stok_akhir?: string | number;
  qty?: string | number;
  Qty?: string | number;
  Ket?: string;
  ket?: string;
  tgl_beli?: string;
  tgl_jual?: string;
  Barcode?: string;
  barcode?: string;
  gambar?: string | null;
  aktif?: string | number | boolean;
  is_active?: string | number | boolean;
  status?: string;
}

const BATCH_SIZE = 20;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 menit
const PAGE_JUMP_STEP = 8;

function formatRupiah(val: string | number | undefined | null): string {
  const num = Number(val ?? 0);
  if (!Number.isFinite(num)) return "Rp 0";
  return `Rp ${Math.round(num).toLocaleString("id-ID")}`;
}

function formatDateDDMMYYYY(val: string | undefined | null): string {
  if (!val) return "-";
  const str = String(val).trim();
  if (!str) return "-";
  const datePart = str.split(" ")[0].split("T")[0];
  const parts = datePart.split("-");
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return str;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function extractList(json: any): BarangAktif[] {
  if (Array.isArray(json)) return json;
  if (Array.isArray(json?.data)) return json.data;
  if (Array.isArray(json?.data?.data)) return json.data.data;
  if (Array.isArray(json?.items)) return json.items;
  return [];
}

function extractLastPage(json: any): number {
  const direct =
    json?.last_page ??
    json?.lastPage ??
    json?.total_pages ??
    json?.totalPages ??
    json?.meta?.last_page ??
    json?.meta?.lastPage ??
    json?.meta?.total_pages ??
    json?.pagination?.last_page ??
    json?.pagination?.total_pages ??
    json?.data?.last_page ??
    json?.data?.total_pages;

  if (Number(direct) > 0) return Number(direct);

  const total = Number(
    json?.total ??
      json?.meta?.total ??
      json?.pagination?.total ??
      json?.data?.total ??
      0
  );
  const perPage = Number(
    json?.per_page ??
      json?.perPage ??
      json?.limit ??
      json?.meta?.per_page ??
      json?.pagination?.per_page ??
      json?.data?.per_page ??
      0
  );

  if (total > 0 && perPage > 0) {
    return Math.ceil(total / perPage);
  }

  return 1;
}

function extractNextUrl(json: any): string | null {
  return (
    json?.next_page_url ??
    json?.links?.next ??
    json?.meta?.next_page_url ??
    json?.pagination?.next_page_url ??
    json?.data?.next_page_url ??
    null
  );
}

function getItemKey(item: BarangAktif): string {
  return `${item.kd_br ?? item.kd ?? ""}|${item.Barcode ?? item.barcode ?? ""}|${item.nama ?? ""}`;
}

function isRecordActive(item: {
  aktif?: string | number | boolean;
  is_active?: string | number | boolean;
  status?: string;
}): boolean {
  if (item.aktif !== undefined && item.aktif !== null) {
    const val = String(item.aktif).trim().toLowerCase();
    if (
      val === "0" ||
      val === "false" ||
      val === "n" ||
      val === "tidak" ||
      val === "nonaktif"
    ) {
      return false;
    }
  }
  if (item.is_active !== undefined && item.is_active !== null) {
    const val = String(item.is_active).trim().toLowerCase();
    if (val === "0" || val === "false") {
      return false;
    }
  }
  if (item.status !== undefined && item.status !== null) {
    const val = String(item.status).trim().toLowerCase();
    if (val === "nonaktif" || val === "inactive" || val === "tidak aktif") {
      return false;
    }
  }
  return true;
}

export default function DetailBarangPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [items, setItems] = useState<BarangAktif[]>([]);
  const [supplierNames, setSupplierNames] = useState<Record<string, string>>(
    {}
  );
  const [loading, setLoading] = useState(true);
  const [syncingMore, setSyncingMore] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [supplierQuery, setSupplierQuery] = useState("");
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [supplierHighlight, setSupplierHighlight] = useState(0);

  const [filterMode, setFilterMode] = useState<
    "ALL" | "STOK_ADA" | "STOK_MENIPIS" | "STOK_HABIS" | "NAIK"
  >("ALL");
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const [selectedItem, setSelectedItem] = useState<BarangAktif | null>(null);

  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const supplierBoxRef = useRef<HTMLDivElement | null>(null);
  const supplierOptionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const rawApiUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://103.125.42.217:8081/api";
  const apiUrl = rawApiUrl.replace(/\/$/, "");
  const baseHost = apiUrl.replace(/\/api$/, "");
  const cacheKey = `naripo_detail_barang_aktif_${apiUrl}`;

  const getImageUrl = (gambar: string | null | undefined): string | null => {
    if (!gambar) return null;
    const clean = String(gambar).trim();
    if (!clean || clean === "default.png" || clean === "-") return null;
    if (
      clean.startsWith("http://") ||
      clean.startsWith("https://") ||
      clean.startsWith("data:")
    ) {
      return clean;
    }
    if (clean.startsWith("/")) return `${baseHost}${clean}`;
    return `${baseHost}/uploads/${encodeURIComponent(clean)}`;
  };

  const getSupplierNameOnly = (kdSp?: string): string => {
    const code = String(kdSp ?? "").trim().toUpperCase();
    if (!code || code === "-") return "-";
    return supplierNames[code] || code;
  };

  const saveCache = (
    data: BarangAktif[],
    supMap: Record<string, string>
  ) => {
    try {
      sessionStorage.setItem(
        cacheKey,
        JSON.stringify({ ts: Date.now(), items: data, supplierNames: supMap })
      );
    } catch {
      // Abaikan jika ukuran melebihi kuota sessionStorage
    }
  };

  const fetchSupplierMap = async (
    token: string,
    signal: AbortSignal
  ): Promise<Record<string, string>> => {
    try {
      const res = await fetch(`${apiUrl}/lap-hutang`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        signal,
      });
      if (!res.ok) return {};
      const json = await res.json().catch(() => null);
      const list = json?.data ?? json;
      if (!Array.isArray(list)) return {};

      const map: Record<string, string> = {};
      for (const row of list) {
        if (!isRecordActive(row || {})) continue;
        const kd = String(row?.kd_sp ?? "").trim().toUpperCase();
        const nm = String(row?.nama ?? "").trim();
        if (kd && nm) {
          map[kd] = nm;
        }
      }
      return map;
    } catch {
      return {};
    }
  };

  const fetchBarangAktif = async (token: string, forceRefresh = false) => {
    if (!forceRefresh) {
      try {
        const rawCache = sessionStorage.getItem(cacheKey);
        if (rawCache) {
          const parsed = JSON.parse(rawCache);
          if (
            Array.isArray(parsed?.items) &&
            Date.now() - Number(parsed?.ts ?? 0) < CACHE_TTL_MS
          ) {
            setItems(parsed.items);
            const cachedMap =
              parsed?.supplierNames && typeof parsed.supplierNames === "object"
                ? parsed.supplierNames
                : {};
            setSupplierNames(cachedMap);
            setVisibleCount(BATCH_SIZE);
            setLoading(false);
            setSyncingMore(false);

            if (Object.keys(cachedMap).length === 0) {
              const controller = new AbortController();
              abortRef.current = controller;
              void fetchSupplierMap(token, controller.signal).then((map) => {
                if (!controller.signal.aborted && Object.keys(map).length > 0) {
                  setSupplierNames(map);
                  saveCache(parsed.items, map);
                }
              });
            }
            return;
          }
        }
      } catch {
        // Lanjut fetch ke server jika cache rusak
      }
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setSyncingMore(false);
    setErrorMsg(null);

    const supplierMapPromise = fetchSupplierMap(token, controller.signal);

    try {
      const headers = {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      };

      const [firstRes, initialSupMap] = await Promise.all([
        fetch(
          `${apiUrl}/barangs/aktif?limit=10000&per_page=10000&all=1&page=1`,
          { method: "GET", headers, signal: controller.signal }
        ),
        supplierMapPromise,
      ]);

      if (!controller.signal.aborted && Object.keys(initialSupMap).length > 0) {
        setSupplierNames(initialSupMap);
      }

      if (firstRes.status === 401) {
        router.replace("/login");
        return;
      }
      if (firstRes.status === 403) {
        setIsAdmin(false);
        setErrorMsg("Akses ditolak. Halaman ini khusus Admin & Pengurus.");
        return;
      }

      const firstJson = await firstRes.json();
      if (
        !firstRes.ok ||
        (firstJson.success !== undefined && !firstJson.success)
      ) {
        throw new Error(
          firstJson.message || "Gagal memuat data detail barang."
        );
      }

      const allItems = extractList(firstJson).filter(isRecordActive);
      const seenKeys = new Set(allItems.map(getItemKey));

      setItems([...allItems]);
      setVisibleCount(BATCH_SIZE);
      setLoading(false);

      const lastPage = extractLastPage(firstJson);

      if (lastPage > 1) {
        setSyncingMore(true);
        const batchSize = 10;
        for (let start = 2; start <= lastPage; start += batchSize) {
          if (controller.signal.aborted) return;
          const end = Math.min(lastPage, start + batchSize - 1);
          const pagePromises = [];
          for (let p = start; p <= end; p++) {
            pagePromises.push(
              fetch(
                `${apiUrl}/barangs/aktif?limit=10000&per_page=10000&page=${p}`,
                { method: "GET", headers, signal: controller.signal }
              ).then((r) => (r.ok ? r.json() : null))
            );
          }
          const pageResults = await Promise.all(pagePromises);
          let batchAdded = 0;
          for (const pageJson of pageResults) {
            if (pageJson) {
              for (const item of extractList(pageJson)) {
                if (!isRecordActive(item)) continue;
                const key = getItemKey(item);
                if (!seenKeys.has(key)) {
                  seenKeys.add(key);
                  allItems.push(item);
                  batchAdded++;
                }
              }
            }
          }
          if (batchAdded > 0) {
            setItems([...allItems]);
          }
        }
      } else if (
        allItems.length > 0 &&
        (extractNextUrl(firstJson) || allItems.length <= 100)
      ) {
        setSyncingMore(true);
        let page = 2;
        const maxPages = 500;
        const parallelStep = 5;

        while (page <= maxPages) {
          if (controller.signal.aborted) return;
          const pagePromises = [];
          for (let i = 0; i < parallelStep && page + i <= maxPages; i++) {
            const p = page + i;
            pagePromises.push(
              fetch(
                `${apiUrl}/barangs/aktif?limit=10000&per_page=10000&page=${p}`,
                { method: "GET", headers, signal: controller.signal }
              ).then((r) => (r.ok ? r.json() : null))
            );
          }

          const pageResults = await Promise.all(pagePromises);
          let addedInBatch = 0;
          let shouldStop = false;

          for (const pageJson of pageResults) {
            if (!pageJson) {
              shouldStop = true;
              break;
            }
            const pageItems = extractList(pageJson);
            if (pageItems.length === 0) {
              shouldStop = true;
              break;
            }
            let addedInPage = 0;
            for (const item of pageItems) {
              if (!isRecordActive(item)) continue;
              const key = getItemKey(item);
              if (!seenKeys.has(key)) {
                seenKeys.add(key);
                allItems.push(item);
                addedInPage++;
                addedInBatch++;
              }
            }
            if (addedInPage === 0) {
              shouldStop = true;
              break;
            }
            if (extractNextUrl(firstJson) && !extractNextUrl(pageJson)) {
              shouldStop = true;
              break;
            }
          }

          if (addedInBatch > 0) {
            setItems([...allItems]);
          }
          if (shouldStop || addedInBatch === 0) break;

          page += parallelStep;
        }
      }

      if (!controller.signal.aborted) {
        saveCache(allItems, initialSupMap);
      }
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      console.error("Error fetch barangs/aktif:", err);
      setErrorMsg(
        err.message || "Terjadi kesalahan saat mengambil data barang."
      );
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        setSyncingMore(false);
      }
    }
  };

  useEffect(() => {
    const token =
      localStorage.getItem("token") || localStorage.getItem("auth_token");
    if (!token) {
      router.replace("/login");
      return;
    }

    let adminAllowed = false;
    try {
      const savedUserStr = localStorage.getItem("user");
      if (savedUserStr) {
        const savedUser = JSON.parse(savedUserStr);
        const roleRaw = String(
          savedUser?.role || savedUser?.Hak || savedUser?.level_user || ""
        )
          .trim()
          .toLowerCase();

        if (roleRaw === "karyawan") {
          router.replace("/opname");
          return;
        }

        adminAllowed =
          roleRaw === "admin" ||
          roleRaw === "pengurus" ||
          roleRaw === "super admin" ||
          roleRaw === "superadmin" ||
          roleRaw === "kasir" ||
          Number(savedUser?.level_user) === 1 ||
          savedUser?.is_admin === true ||
          savedUser?.is_admin === 1;
      }
    } catch (err) {
      console.error("Gagal membaca data user:", err);
    }

    setIsAdmin(adminAllowed);
    setAuthChecked(true);

    if (adminAllowed) {
      void fetchBarangAktif(token);
    } else {
      setLoading(false);
    }

    return () => {
      abortRef.current?.abort();
    };
  }, [apiUrl, router]);

  // Tutup dropdown supplier saat klik di luar
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        supplierBoxRef.current &&
        !supplierBoxRef.current.contains(e.target as Node)
      ) {
        setSupplierOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const supplierOptions = useMemo(() => {
    const hasActiveSupplierMap = Object.keys(supplierNames).length > 0;
    const counts = new Map<string, number>();

    for (const item of items) {
      const sup = String(item.kd_sp ?? "").trim().toUpperCase();
      if (!sup || sup === "-") continue;
      if (hasActiveSupplierMap && !supplierNames[sup]) continue;
      counts.set(sup, (counts.get(sup) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([code, count]) => ({
        code,
        name: supplierNames[code] || code,
        count,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [items, supplierNames]);

  const comboboxSuppliers = useMemo(() => {
    const q = supplierQuery.trim().toUpperCase();
    const matched = supplierOptions
      .filter(
        ({ code, name }) =>
          !q || code.includes(q) || name.toUpperCase().includes(q)
      )
      .map(({ code, name, count }) => ({
        value: code,
        label: name,
        count,
      }));

    if (!q) {
      return [
        {
          value: "",
          label: `Semua Supplier (${supplierOptions.length})`,
          count: items.length,
        },
        ...matched,
      ];
    }

    return matched;
  }, [supplierOptions, supplierQuery, items.length]);

  useEffect(() => {
    setSupplierHighlight(0);
  }, [supplierQuery, supplierOpen]);

  useEffect(() => {
    if (!supplierOpen) return;
    const el = supplierOptionRefs.current[supplierHighlight];
    if (el) {
      el.scrollIntoView({ block: "nearest" });
    }
  }, [supplierHighlight, supplierOpen]);

  const handleSelectSupplier = (supValue: string) => {
    setSelectedSupplier(supValue);
    if (!supValue) {
      setSupplierQuery("");
    } else {
      setSupplierQuery(supplierNames[supValue] || supValue);
    }
    setSupplierOpen(false);
  };

  const handleClearSupplier = () => {
    setSelectedSupplier("");
    setSupplierQuery("");
    setSupplierOpen(false);
  };

  const handleSupplierKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!supplierOpen) {
      if (
        e.key === "ArrowDown" ||
        e.key === "ArrowUp" ||
        e.key === "PageDown" ||
        e.key === "PageUp"
      ) {
        e.preventDefault();
        setSupplierOpen(true);
      }
      return;
    }

    const total = comboboxSuppliers.length;
    if (total === 0) {
      if (e.key === "Escape") setSupplierOpen(false);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSupplierHighlight((prev) => Math.min(total - 1, prev + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSupplierHighlight((prev) => Math.max(0, prev - 1));
    } else if (e.key === "PageDown") {
      e.preventDefault();
      setSupplierHighlight((prev) => Math.min(total - 1, prev + PAGE_JUMP_STEP));
    } else if (e.key === "PageUp") {
      e.preventDefault();
      setSupplierHighlight((prev) => Math.max(0, prev - PAGE_JUMP_STEP));
    } else if (e.key === "Home") {
      e.preventDefault();
      setSupplierHighlight(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setSupplierHighlight(total - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const chosen = comboboxSuppliers[supplierHighlight];
      if (chosen) {
        handleSelectSupplier(chosen.value);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setSupplierOpen(false);
    }
  };

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      const stok = Number(item.stok_akhir ?? 0);
      const ket = String(item.Ket ?? item.ket ?? "").toUpperCase();
      const sup = String(item.kd_sp ?? "").trim().toUpperCase();

      if (selectedSupplier && sup !== selectedSupplier) return false;
      if (filterMode === "STOK_ADA" && stok <= 0) return false;
      if (filterMode === "STOK_MENIPIS" && stok > 5) return false;
      if (filterMode === "STOK_HABIS" && stok > 0) return false;
      if (filterMode === "NAIK" && !ket.includes("NAIK")) return false;

      if (!q) return true;
      const barcode = String(item.Barcode ?? item.barcode ?? "").toLowerCase();
      const kdSp = sup.toLowerCase();
      const supName = String(supplierNames[sup] ?? "").toLowerCase();
      const kdBr = String(item.kd_br ?? item.kd ?? "").toLowerCase();
      return (
        String(item.nama || "").toLowerCase().includes(q) ||
        barcode.includes(q) ||
        kdSp.includes(q) ||
        supName.includes(q) ||
        kdBr.includes(q) ||
        ket.toLowerCase().includes(q)
      );
    });
  }, [items, search, selectedSupplier, filterMode, supplierNames]);

  useEffect(() => {
    setVisibleCount(BATCH_SIZE);
  }, [search, selectedSupplier, filterMode]);

  const visibleItems = useMemo(
    () => filteredItems.slice(0, visibleCount),
    [filteredItems, visibleCount]
  );

  const hasMore = visibleCount < filteredItems.length;

  useEffect(() => {
    if (!hasMore) return;
    const el = loadMoreRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) =>
            Math.min(prev + BATCH_SIZE, filteredItems.length)
          );
        }
      },
      { rootMargin: "300px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, filteredItems.length]);

  const handleRefresh = () => {
    const token =
      localStorage.getItem("token") || localStorage.getItem("auth_token");
    if (token && isAdmin) {
      try {
        sessionStorage.removeItem(cacheKey);
      } catch {
        // ignore
      }
      void fetchBarangAktif(token, true);
    }
  };

  if (!authChecked) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">
          Memeriksa hak akses...
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return (
      <Layout>
        <Head>
          <title>Akses Ditolak - Detail Barang</title>
        </Head>
        <div className="max-w-md mx-auto mt-16 px-4">
          <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <FiLock className="w-7 h-7" />
            </div>
            <h1 className="text-lg font-bold text-slate-800">
              Akses Khusus Admin &amp; Pengurus
            </h1>
            <p className="text-xs text-slate-600 leading-relaxed">
              Halaman Detail Barang berisi informasi HPP dan stok internal yang hanya dapat diakses oleh akun Admin atau Pengurus.
            </p>
            <Link
              href="/products"
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition"
            >
              <FiArrowLeft className="w-4 h-4" /> Kembali ke Daftar Produk
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Detail Barang (Admin) - Naripo</title>
      </Head>

      <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 py-3 sm:py-5 min-h-screen text-xs">
        {/* Sticky Header & Pencarian */}
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border border-slate-200 rounded-xl shadow-xs p-3 mb-3 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                <FiPackage className="w-4 h-4" />
              </div>
              <div>
                <h1 className="font-bold text-slate-800 text-sm sm:text-base leading-tight">
                  Detail Barang Aktif
                </h1>
                <p className="text-[11px] text-slate-500">
                  {loading
                    ? "Memuat barang pertama..."
                    : syncingMore
                    ? `Menampilkan ${visibleItems.length} dari ${filteredItems.length} barang (mengambil sisa data...)`
                    : `Menampilkan ${visibleItems.length} dari ${filteredItems.length} barang aktif`}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading || syncingMore}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-300 text-xs transition active:scale-95 disabled:opacity-50"
            >
              <FiRefreshCw
                className={`w-3.5 h-3.5 ${
                  loading || syncingMore ? "animate-spin" : ""
                }`}
              />
              <span>Muat Ulang</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            {/* Pencarian Barang */}
            <div className="relative flex-1">
              <FiSearch className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                }}
                placeholder="Cari nama barang, barcode, supplier, atau keterangan..."
                className="w-full pl-9 pr-3 py-2 text-xs text-slate-800 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Combobox Pencarian Supplier (ketik + PgUp/PgDn/Panah) */}
            <div ref={supplierBoxRef} className="relative sm:w-72">
              <div className="relative flex items-center">
                <FiSearch className="w-3.5 h-3.5 text-blue-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={supplierQuery}
                  onFocus={() => setSupplierOpen(true)}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    setSupplierQuery(val);
                    if (!val) setSelectedSupplier("");
                    setSupplierOpen(true);
                  }}
                  onKeyDown={handleSupplierKeyDown}
                  placeholder={`Pilih / ketik nama supplier (${supplierOptions.length})`}
                  aria-label="Cari Supplier"
                  className={`w-full pl-8 pr-14 py-2 text-xs rounded-lg border focus:outline-none font-semibold transition ${
                    selectedSupplier
                      ? "bg-blue-50/70 border-blue-400 text-blue-900"
                      : "bg-slate-50 border-slate-300 text-slate-800 focus:bg-white focus:border-blue-500"
                  }`}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {(supplierQuery || selectedSupplier) && (
                    <button
                      type="button"
                      onClick={handleClearSupplier}
                      title="Reset Supplier"
                      className="p-1 text-slate-400 hover:text-red-600 rounded"
                    >
                      <FiX className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSupplierOpen((prev) => !prev)}
                    title="Buka daftar supplier"
                    className="p-1 text-slate-500 hover:text-slate-800 rounded"
                  >
                    <FiChevronDown
                      className={`w-3.5 h-3.5 transition-transform ${
                        supplierOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                </div>
              </div>

              {supplierOpen && (
                <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-40 overflow-hidden">
                  <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
                    <span>{comboboxSuppliers.length} pilihan</span>
                    <span className="hidden sm:inline font-mono">
                      ↑↓ / PgUp PgDn / Enter
                    </span>
                  </div>

                  <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                    {comboboxSuppliers.length === 0 ? (
                      <div className="px-3 py-4 text-center text-slate-400 text-xs">
                        Supplier &quot;{supplierQuery}&quot; tidak ditemukan
                      </div>
                    ) : (
                      comboboxSuppliers.map((opt, idx) => {
                        const isHighlighted = idx === supplierHighlight;
                        const isSelected = selectedSupplier === opt.value;
                        return (
                          <button
                            key={opt.value || "__ALL__"}
                            ref={(el) => {
                              supplierOptionRefs.current[idx] = el;
                            }}
                            type="button"
                            onMouseEnter={() => setSupplierHighlight(idx)}
                            onClick={() => handleSelectSupplier(opt.value)}
                            className={`w-full px-3 py-2 text-left flex items-center justify-between gap-2 text-xs transition ${
                              isHighlighted
                                ? "bg-blue-600 text-white"
                                : isSelected
                                ? "bg-blue-50 text-blue-800 font-bold"
                                : "text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <FiCheck
                                className={`w-3.5 h-3.5 shrink-0 ${
                                  isSelected ? "opacity-100" : "opacity-0"
                                }`}
                              />
                              <span className="truncate font-semibold">
                                {opt.label}
                              </span>
                            </div>
                            <span
                              className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono shrink-0 ${
                                isHighlighted
                                  ? "bg-blue-500 text-white"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {opt.count}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Filter Tab Status */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            {(
              [
                { id: "ALL", label: "Semua" },
                { id: "STOK_ADA", label: "Stok > 0" },
                { id: "STOK_MENIPIS", label: "Stok ≤ 5" },
                { id: "STOK_HABIS", label: "Stok Habis" },
                { id: "NAIK", label: "Harga Naik" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setFilterMode(tab.id);
                }}
                className={`px-3 py-1.5 rounded-lg font-bold text-[11px] whitespace-nowrap border transition ${
                  filterMode === tab.id
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
                }`}
              >
                {tab.label}
              </button>
            ))}

            {selectedSupplier && (
              <button
                type="button"
                onClick={handleClearSupplier}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-bold text-[11px] whitespace-nowrap bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 max-w-[220px]"
              >
                <span className="truncate">
                  Sup: {getSupplierNameOnly(selectedSupplier)}
                </span>
                <FiX className="w-3 h-3 shrink-0" />
              </button>
            )}
          </div>
        </div>

        {errorMsg && (
          <div className="mb-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
            <FiAlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {loading && items.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-500">
            Memuat daftar detail barang aktif...
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-500">
            Tidak ada barang aktif yang cocok dengan pencarian.
          </div>
        ) : (
          <>
            {/* Tampilan Tabel untuk PC / Tablet */}
            <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-xs overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold">
                    <th className="p-2.5 w-12 text-center">Foto</th>
                    <th className="p-2.5 min-w-[200px]">
                      Nama Barang &amp; Barcode
                    </th>
                    <th className="p-2.5 min-w-[150px]">Supplier</th>
                    <th className="p-2.5 text-center">Sat</th>
                    <th className="p-2.5 text-center">Stok</th>
                    <th className="p-2.5 text-right">HPP</th>
                    <th className="p-2.5 text-right">HPP Beli</th>
                    <th className="p-2.5 text-right">H. Anggota</th>
                    <th className="p-2.5 text-right">H. Boman</th>
                    <th className="p-2.5 text-center">Ket</th>
                    <th className="p-2.5 text-center">Tgl Beli</th>
                    <th className="p-2.5 text-center">Tgl Jual</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {visibleItems.map((item, idx) => {
                    const imgUrl = getImageUrl(item.gambar);
                    const stok = Number(item.stok_akhir ?? 0);
                    const ket = String(item.Ket ?? item.ket ?? "-").trim();
                    const barcode = String(
                      item.Barcode ?? item.barcode ?? "-"
                    ).trim();
                    const supDisplay = getSupplierNameOnly(item.kd_sp);
                    return (
                      <tr
                        key={`${item.kd_br || item.nama}-${idx}`}
                        onClick={() => setSelectedItem(item)}
                        className="hover:bg-blue-50/60 cursor-pointer transition"
                      >
                        <td className="p-2 text-center">
                          {imgUrl ? (
                            <img
                              src={imgUrl}
                              alt={item.nama}
                              loading="lazy"
                              className="w-10 h-10 object-cover rounded-lg border border-slate-200 mx-auto"
                              onError={(e) => {
                                (
                                  e.currentTarget as HTMLImageElement
                                ).style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                              <FiPackage className="w-4 h-4" />
                            </div>
                          )}
                        </td>
                        <td className="p-2.5">
                          <div className="font-bold text-slate-800">
                            {item.nama}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            Barcode: {barcode || "-"}
                          </div>
                        </td>
                        <td
                          className="p-2.5 font-semibold text-slate-700 max-w-[190px] truncate"
                          title={supDisplay}
                        >
                          {supDisplay}
                        </td>
                        <td className="p-2.5 text-center uppercase text-slate-600">
                          {item.satuan || "-"}
                        </td>
                        <td className="p-2.5 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold font-mono text-[11px] ${
                              stok > 5
                                ? "bg-emerald-100 text-emerald-700"
                                : stok > 0
                                ? "bg-amber-100 text-amber-800"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {stok}
                          </span>
                        </td>
                        <td className="p-2.5 text-right font-mono text-slate-700">
                          {formatRupiah(item.hpp)}
                        </td>
                        <td className="p-2.5 text-right font-mono text-slate-600">
                          {formatRupiah(item.hpp_beli)}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-blue-700">
                          {formatRupiah(item.h_anggota)}
                        </td>
                        <td className="p-2.5 text-right font-mono text-slate-700">
                          {formatRupiah(item.h_boman)}
                        </td>
                        <td className="p-2.5 text-center">
                          {ket && ket !== "-" ? (
                            <span
                              className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                                ket.toUpperCase().includes("NAIK")
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {ket}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="p-2.5 text-center font-mono text-[11px] text-slate-600 whitespace-nowrap">
                          {formatDateDDMMYYYY(item.tgl_beli)}
                        </td>
                        <td className="p-2.5 text-center font-mono text-[11px] text-slate-600 whitespace-nowrap">
                          {formatDateDDMMYYYY(item.tgl_jual)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Tampilan Kartu Ringkas untuk HP */}
            <div className="md:hidden space-y-2">
              {visibleItems.map((item, idx) => {
                const imgUrl = getImageUrl(item.gambar);
                const stok = Number(item.stok_akhir ?? 0);
                const ket = String(item.Ket ?? item.ket ?? "").trim();
                const barcode = String(
                  item.Barcode ?? item.barcode ?? "-"
                ).trim();

                return (
                  <button
                    key={`${item.kd_br || item.nama}-m-${idx}`}
                    type="button"
                    onClick={() => setSelectedItem(item)}
                    className="w-full text-left bg-white rounded-xl border border-slate-200 p-3 shadow-xs flex items-start gap-3 active:scale-[0.99] transition"
                  >
                    {imgUrl ? (
                      <img
                        src={imgUrl}
                        alt={item.nama}
                        loading="lazy"
                        className="w-14 h-14 object-cover rounded-lg border border-slate-200 shrink-0"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display =
                            "none";
                        }}
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
                        <FiPackage className="w-6 h-6" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-slate-800 text-xs leading-snug line-clamp-2">
                          {item.nama}
                        </h3>
                        {ket && ket !== "-" && (
                          <span
                            className={`px-1.5 py-0.5 rounded font-bold text-[10px] shrink-0 ${
                              ket.toUpperCase().includes("NAIK")
                                ? "bg-amber-100 text-amber-800"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {ket}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500 font-mono">
                        <span>Sup: {getSupplierNameOnly(item.kd_sp)}</span>
                        <span>Sat: {item.satuan || "-"}</span>
                        <span>BC: {barcode || "-"}</span>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <div className="text-[11px]">
                          <span className="text-slate-500">HPP: </span>
                          <span className="font-mono font-bold text-slate-700">
                            {formatRupiah(item.hpp)}
                          </span>
                          <span className="text-slate-400 mx-1">|</span>
                          <span className="font-mono font-bold text-blue-700">
                            {formatRupiah(item.h_anggota)}
                          </span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold font-mono text-[10px] ${
                            stok > 5
                              ? "bg-emerald-100 text-emerald-700"
                              : stok > 0
                              ? "bg-amber-100 text-amber-800"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          Stok: {stok}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Sentinel Infinite Scroll */}
            <div ref={loadMoreRef} className="py-5 text-center text-[11px] text-slate-500">
              {hasMore
                ? `Scroll ke bawah untuk memuat 20 barang berikutnya... (${visibleItems.length}/${filteredItems.length})`
                : syncingMore
                ? `Mengambil sisa barang dari server... (${filteredItems.length} termuat)`
                : `Semua ${filteredItems.length} barang aktif sudah ditampilkan`}
            </div>
          </>
        )}
      </div>

      {/* Modal Detail Lengkap Saat Barang Diklik */}
      {selectedItem && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl my-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3.5 bg-gradient-to-r from-slate-800 to-slate-700 text-white flex items-center justify-between">
              <span className="font-bold text-sm truncate pr-2">
                Rincian Barang
              </span>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="text-slate-300 hover:text-white p-1"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs max-h-[80vh] overflow-y-auto">
              {/* Header Section */}
              <div className="flex items-start gap-3 pb-3 border-b border-slate-200">
                {getImageUrl(selectedItem.gambar) ? (
                  <img
                    src={getImageUrl(selectedItem.gambar) || ""}
                    alt={selectedItem.nama}
                    className="w-20 h-20 object-cover rounded-xl border border-slate-200 shrink-0"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
                    <FiPackage className="w-8 h-8" />
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h2 className="font-bold text-slate-800 text-sm leading-snug flex-1">
                      {selectedItem.nama}
                    </h2>
                    <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] shrink-0 whitespace-nowrap">
                      Aktif
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-slate-500 mb-1">
                    Barcode: {selectedItem.Barcode ?? selectedItem.barcode ?? "-"}
                  </p>
                  <p className="text-[11px] text-slate-600 font-semibold">
                    Supplier: {getSupplierNameOnly(selectedItem.kd_sp)}
                  </p>
                </div>
              </div>

              {/* Status & Stok Utama */}
              <div className="grid grid-cols-3 gap-2 p-3 bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl border border-emerald-200">
                <div>
                  <div className="text-[10px] text-emerald-700 font-semibold uppercase">
                    Stok Akhir
                  </div>
                  <div className="font-bold text-emerald-900 text-lg mt-1">
                    {selectedItem.stok_akhir ?? 0}
                  </div>
                  <div className="text-[11px] text-emerald-700 mt-0.5">
                    {selectedItem.satuan || "pcs"}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-emerald-700 font-semibold uppercase">
                    QTY
                  </div>
                  <div className="font-bold text-emerald-900 text-lg mt-1">
                    {selectedItem.qty ?? selectedItem.Qty ?? 0}
                  </div>
                  <div className="text-[11px] text-emerald-700 mt-0.5">
                    Unit
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-emerald-700 font-semibold uppercase">
                    Status
                  </div>
                  <div className="font-bold text-emerald-900 mt-1">
                    <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-200 text-emerald-900 text-[10px] font-bold">
                      Aktif
                    </span>
                  </div>
                </div>
              </div>

              {/* Harga Section */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] text-slate-500">HPP</div>
                  <div className="font-bold font-mono text-slate-800 mt-0.5">
                    {formatRupiah(selectedItem.hpp)}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] text-slate-500">HPP Beli</div>
                  <div className="font-bold font-mono text-slate-800 mt-0.5">
                    {formatRupiah(selectedItem.hpp_beli)}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200">
                  <div className="text-[11px] text-blue-700 font-semibold">
                    Harga Anggota
                  </div>
                  <div className="font-bold font-mono text-blue-800 mt-0.5 text-sm">
                    {formatRupiah(selectedItem.h_anggota)}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200">
                  <div className="text-[11px] text-blue-700 font-semibold">
                    Harga Boman
                  </div>
                  <div className="font-bold font-mono text-blue-800 mt-0.5 text-sm">
                    {formatRupiah(selectedItem.h_boman)}
                  </div>
                </div>
              </div>

              {/* Tanggal Section */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] text-slate-500">Tanggal Beli</div>
                  <div className="font-bold font-mono text-slate-800 mt-0.5">
                    {formatDateDDMMYYYY(selectedItem.tgl_beli)}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] text-slate-500">Tanggal Jual</div>
                  <div className="font-bold font-mono text-slate-800 mt-0.5">
                    {formatDateDDMMYYYY(selectedItem.tgl_jual)}
                  </div>
                </div>
              </div>

              {/* Keterangan */}
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between">
                <span className="text-amber-800 font-semibold">Keterangan</span>
                <span className="font-bold text-amber-900">
                  {selectedItem.Ket ?? selectedItem.ket ?? "-"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}