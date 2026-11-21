"use client";

import { useState, useEffect, useRef } from "react";
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
} from "react-icons/fi";

interface BarangDetail {
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
  Ket?: string;
  ket?: string;
  tgl_beli?: string;
  tgl_jual?: string;
  Barcode?: string;
  barcode?: string;
  gambar?: string | null;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number | null;
  total_pages: number;
}

function formatRupiah(val: string | number | undefined | null): string {
  if (val === undefined || val === null || val === "") return "-";
  const num = Number(val);
  if (!Number.isFinite(num)) return "-";
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

function getSafeImageSrc(img: string | null | undefined): string | null {
  if (!img) return null;
  const clean = String(img).trim();
  if (!clean || clean === "default.png" || clean === "-") return null;
  if (clean.startsWith("data:") || clean.startsWith("blob:")) return clean;
  if (clean.includes("/uploads/")) {
    const fileName = clean.split("/uploads/").pop();
    return `/uploads/${fileName}`;
  }
  if (clean.includes("/images/")) {
    const fileName = clean.split("/images/").pop();
    return `/images/${fileName}`;
  }
  return `/uploads/${clean}`;
}

export default function DetailBarangPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [items, setItems] = useState<BarangDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedKet, setSelectedKet] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 50,
    total: null,
    total_pages: 1,
  });

  const [selectedItem, setSelectedItem] = useState<BarangDetail | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const rawApiUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://103.125.42.217:8081/api";
  const apiUrl = rawApiUrl.replace(/\/$/, "");

  useEffect(() => {
    setIsMounted(true);
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
        adminAllowed =
          roleRaw === "admin" ||
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
    if (!adminAllowed) {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (!isMounted || !authChecked || !isAdmin) return;

    const fetchData = async () => {
      if (currentPage === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setErrorMsg(null);

      const token =
        localStorage.getItem("token") || localStorage.getItem("auth_token");
      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        const searchParam = debouncedSearch
          ? `&search=${encodeURIComponent(debouncedSearch)}`
          : "";
        const ketParam = selectedKet
          ? `&ket=${encodeURIComponent(selectedKet)}`
          : "";

        const endpoint = `${apiUrl}/barangs?status=Digunakan&page=${currentPage}&limit=50${searchParam}${ketParam}`;
        const res = await fetch(endpoint, {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.status === 401) {
          router.replace("/login");
          return;
        }
        if (res.status === 403) {
          setIsAdmin(false);
          setErrorMsg("Akses ditolak. Halaman ini khusus Admin.");
          return;
        }
        if (!res.ok) {
          throw new Error(`Server Error (${res.status})`);
        }

        const result = await res.json();
        let prodList: BarangDetail[] = [];
        if (Array.isArray(result)) {
          prodList = result;
        } else if (Array.isArray(result.data)) {
          prodList = result.data;
        } else if (Array.isArray(result.data?.data)) {
          prodList = result.data.data;
        }

        if (currentPage === 1) {
          setItems(prodList);
        } else {
          setItems((prev) => {
            const existingKeys = new Set(
              prev.map((item) => item.kd_br || item.nama)
            );
            const uniqueNew = prodList.filter(
              (item) => !existingKeys.has(item.kd_br || item.nama)
            );
            return [...prev, ...uniqueNew];
          });
        }

        if (result.pagination) {
          setPagination({
            page: result.pagination.page || currentPage,
            limit: result.pagination.limit || 50,
            total: result.pagination.total ?? null,
            total_pages: result.pagination.total_pages || 1,
          });
        } else if (result.meta) {
          setPagination({
            page: currentPage,
            limit: result.meta.per_page || 50,
            total: result.meta.total ?? null,
            total_pages: result.meta.last_page || 1,
          });
        } else {
          setPagination({
            page: currentPage,
            limit: 50,
            total: prodList.length,
            total_pages: 1,
          });
        }
      } catch (err: any) {
        console.error("Error fetch barangs:", err);
        setErrorMsg(
          err?.message || "Terjadi kesalahan saat mengambil data barang."
        );
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    };

    void fetchData();
  }, [
    isMounted,
    authChecked,
    isAdmin,
    currentPage,
    debouncedSearch,
    selectedKet,
    apiUrl,
    router,
  ]);

  // Infinite Scroll Observer
  useEffect(() => {
    if (!isMounted || !isAdmin || loading || loadingMore) return;
    if (currentPage >= pagination.total_pages) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setCurrentPage((prev) => prev + 1);
        }
      },
      { rootMargin: "250px" }
    );

    const el = loadMoreRef.current;
    if (el) observer.observe(el);

    return () => {
      if (el) observer.unobserve(el);
    };
  }, [isMounted, isAdmin, loading, loadingMore, currentPage, pagination.total_pages]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    searchInputRef.current?.blur();
    setDebouncedSearch(searchQuery);
    setCurrentPage(1);
  };

  const handleRefresh = () => {
    setSelectedKet("");
    setSearchQuery("");
    setDebouncedSearch("");
    setCurrentPage(1);
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
              Akses Khusus Admin
            </h1>
            <p className="text-xs text-slate-600 leading-relaxed">
              Halaman Detail Barang berisi informasi HPP dan stok internal yang hanya dapat diakses oleh akun Admin.
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

      <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 pt-3 pb-20 sm:py-5 min-h-screen text-xs">
        {/* Sticky Header & Pencarian */}
        <div className="sticky top-14 sm:top-16 z-20 bg-white/95 backdrop-blur border border-slate-200 rounded-xl shadow-xs p-3 mb-3 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                <FiPackage className="w-4 h-4" />
              </div>
              <div>
                <h1 className="font-bold text-slate-800 text-sm sm:text-base leading-tight">
                  Detail Barang
                </h1>
                <p className="text-[11px] text-slate-500">
                  {loading
                    ? "Memuat data..."
                    : `${items.length.toLocaleString("id-ID")}${
                        pagination.total
                          ? ` / ${pagination.total.toLocaleString("id-ID")}`
                          : ""
                      } barang aktif`}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-300 text-xs transition active:scale-95 disabled:opacity-50"
            >
              <FiRefreshCw
                className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
              />
              <span>Reset</span>
            </button>
          </div>

          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <FiSearch className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              ref={searchInputRef}
              type="search"
              enterKeyHint="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama barang, barcode, harga..."
              className="w-full pl-9 pr-20 py-2 text-xs text-slate-800 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-blue-500 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
            />
            <div className="absolute inset-y-0 right-0 flex items-center gap-1 pr-1.5">
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    searchInputRef.current?.blur();
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <FiX className="w-4 h-4" />
                </button>
              )}
              <button
                type="submit"
                className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold active:scale-95 transition"
              >
                Cari
              </button>
            </div>
          </form>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            {[
              { id: "", label: "Semua" },
              { id: "BARU", label: "BARU" },
              { id: "NAIK", label: "NAIK" },
              { id: "TURUN", label: "TURUN" },
              { id: "SAMA", label: "SAMA" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setSelectedKet(tab.id);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg font-bold text-[11px] whitespace-nowrap border transition ${
                  selectedKet === tab.id
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {errorMsg && (
          <div className="mb-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
            <FiAlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-500">
            Memuat daftar barang aktif...
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-500">
            Tidak ada barang yang cocok dengan pencarian.
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
                    <th className="p-2.5">Sup</th>
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
                  {items.map((item, idx) => {
                    const imgUrl = getSafeImageSrc(item.gambar);
                    const stok =
                      item.stok_akhir !== undefined && item.stok_akhir !== null
                        ? Number(item.stok_akhir)
                        : null;
                    const ket = String(item.Ket ?? item.ket ?? "-").trim();
                    const barcode = String(
                      item.Barcode ?? item.barcode ?? "-"
                    ).trim();

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
                                const target = e.currentTarget;
                                if (target.src.includes("/uploads/")) {
                                  target.src = target.src.replace(
                                    "/uploads/",
                                    "/images/"
                                  );
                                } else {
                                  target.style.display = "none";
                                }
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
                            KD: {item.kd_br || "-"} | BC: {barcode || "-"}
                          </div>
                        </td>
                        <td className="p-2.5 font-mono font-semibold text-slate-700">
                          {item.kd_sp || item.kd || "-"}
                        </td>
                        <td className="p-2.5 text-center uppercase text-slate-600">
                          {item.satuan || "-"}
                        </td>
                        <td className="p-2.5 text-center">
                          {stok !== null ? (
                            <span
                              className={`px-2 py-0.5 rounded-full font-bold font-mono text-[11px] ${
                                stok > 0
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {stok}
                            </span>
                          ) : (
                            "-"
                          )}
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
              {items.map((item, idx) => {
                const imgUrl = getSafeImageSrc(item.gambar);
                const stok =
                  item.stok_akhir !== undefined && item.stok_akhir !== null
                    ? Number(item.stok_akhir)
                    : null;
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
                          const target = e.currentTarget;
                          if (target.src.includes("/uploads/")) {
                            target.src = target.src.replace(
                              "/uploads/",
                              "/images/"
                            );
                          } else {
                            target.style.display = "none";
                          }
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
                        <span>Sup: {item.kd_sp || item.kd || "-"}</span>
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
                        {stok !== null && (
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold font-mono text-[10px] ${
                              stok > 0
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            Stok: {stok}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Sentinel Infinite Scroll */}
            <div ref={loadMoreRef} className="py-6 flex justify-center">
              {loadingMore ? (
                <div className="flex items-center gap-2 text-xs text-blue-600 font-semibold">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  <span>Memuat barang berikutnya...</span>
                </div>
              ) : currentPage >= pagination.total_pages ? (
                <span className="text-xs text-slate-400">
                  Semua barang aktif sudah ditampilkan.
                </span>
              ) : null}
            </div>
          </>
        )}
      </div>

      {/* Modal Detail Lengkap Saat Barang Diklik */}
      {selectedItem && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3.5 bg-slate-800 text-white flex items-center justify-between">
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
              <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
                {getSafeImageSrc(selectedItem.gambar) ? (
                  <img
                    src={getSafeImageSrc(selectedItem.gambar) || ""}
                    alt={selectedItem.nama}
                    className="w-16 h-16 object-cover rounded-xl border border-slate-200 shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
                    <FiPackage className="w-7 h-7" />
                  </div>
                )}
                <div>
                  <h2 className="font-bold text-slate-800 text-sm leading-snug">
                    {selectedItem.nama}
                  </h2>
                  <p className="text-[11px] font-mono text-slate-500 mt-1">
                    Kode: {selectedItem.kd_br || "-"} | Barcode:{" "}
                    {selectedItem.Barcode ?? selectedItem.barcode ?? "-"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] text-slate-500">
                    Supplier / KD
                  </div>
                  <div className="font-bold font-mono text-slate-800 mt-0.5">
                    {selectedItem.kd_sp || selectedItem.kd || "-"}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] text-slate-500">
                    Satuan &amp; Stok Akhir
                  </div>
                  <div className="font-bold font-mono text-slate-800 mt-0.5">
                    {selectedItem.stok_akhir ?? "-"} {selectedItem.satuan || ""}
                  </div>
                </div>
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
                  <div className="text-[11px] text-blue-700">Harga Anggota</div>
                  <div className="font-bold font-mono text-blue-800 mt-0.5">
                    {formatRupiah(selectedItem.h_anggota)}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200">
                  <div className="text-[11px] text-blue-700">Harga Boman</div>
                  <div className="font-bold font-mono text-blue-800 mt-0.5">
                    {formatRupiah(selectedItem.h_boman)}
                  </div>
                </div>
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