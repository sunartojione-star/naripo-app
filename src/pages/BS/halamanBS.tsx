"use client";

import { useState, useEffect, useRef } from "react";
import Layout from "@/components/Layout";
import BSCard, { Barang } from "@/components/BSCard";
import {
  FiSearch,
  FiBox,
  FiFilter,
  FiGrid,
  FiTag,
  FiX,
} from "react-icons/fi";

interface PaginationMeta {
  page: number;
  limit: number;
  total: number | null;
  total_pages: number;
}

export default function HalamanBS() {
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [products, setProducts] = useState<Barang[]>([]);
  const [merkList] = useState<string[]>([]);
  const [favoriteKdBrs, setFavoriteKdBrs] = useState<Set<string>>(new Set());
  const [loadingProducts, setLoadingProducts] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [errorProducts, setErrorProducts] = useState<string>("");

  // State Pencarian & Filter
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [selectedMerk, setSelectedMerk] = useState<string>("");

  // State efek bayangan sticky search bar saat di-scroll
  const [isScrolled, setIsScrolled] = useState<boolean>(false);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 20,
    total: null,
    total_pages: 1,
  });

  const loadMoreRef = useRef<HTMLDivElement>(null);

  const rawApiUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://103.125.42.217:8081/api";
  const apiUrl = rawApiUrl.replace(/\/$/, "");

  // Pastikan komponen sudah termuat di browser
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Deteksi scroll untuk bayangan halus pada sticky search bar
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 30);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Ambil daftar favorit sekali di awal
  useEffect(() => {
    if (!isMounted) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    const fetchFavorites = async () => {
      try {
        const resFav = await fetch(`${apiUrl}/favorites`, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (resFav.ok) {
          const resultFav = await resFav.json();
          if (resultFav.success && Array.isArray(resultFav.data)) {
            const favSet = new Set<string>(
              resultFav.data.map((favItem: { kd_bs: string }) =>
                String(favItem.kd_bs)
              )
            );
            setFavoriteKdBrs(favSet);
          }
        }
      } catch (err) {
        console.error("Gagal mengambil favorit BS:", err);
      }
    };

    fetchFavorites();
  }, [isMounted, apiUrl]);

  // Debounce pencarian
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch daftar BS dari backend
  useEffect(() => {
    if (!isMounted) return;

    const fetchData = async () => {
      if (currentPage === 1) {
        setLoadingProducts(true);
      } else {
        setLoadingMore(true);
      }
      setErrorProducts("");
      const token = localStorage.getItem("token");

      try {
        const searchParam = debouncedSearch
          ? `&search=${encodeURIComponent(debouncedSearch)}`
          : "";

        const merkParam = selectedMerk
          ? `&merk=${encodeURIComponent(selectedMerk)}`
          : "";

        let endpoint = `${apiUrl}/bsss?page=${currentPage}&limit=20${searchParam}${merkParam}`;

        if (selectedMerk) {
          endpoint = `${apiUrl}/bss/by-kd?merk=${encodeURIComponent(
            selectedMerk
          )}&page=${currentPage}&limit=20${searchParam}`;
        }

        const resProducts = await fetch(endpoint, {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
        });

        if (!resProducts.ok) {
          throw new Error(`Server Error (${resProducts.status})`);
        }

        const resultProducts = await resProducts.json();

        let prodList: Barang[] = [];
        if (Array.isArray(resultProducts)) {
          prodList = resultProducts;
        } else if (
          resultProducts.success &&
          Array.isArray(resultProducts.data)
        ) {
          prodList = resultProducts.data;
        } else if (Array.isArray(resultProducts.data)) {
          prodList = resultProducts.data;
        }

        if (currentPage === 1) {
          setProducts(prodList);
        } else {
          setProducts((prev) => {
            const existingIds = new Set(prev.map((item) => String(item.kd_bs)));
            const uniqueNew = prodList.filter(
              (item) => !existingIds.has(String(item.kd_bs))
            );
            return [...prev, ...uniqueNew];
          });
        }

        if (resultProducts.pagination) {
          setPagination(resultProducts.pagination);
        } else if (resultProducts.meta) {
          setPagination({
            page: resultProducts.meta.current_page || currentPage,
            limit: resultProducts.meta.per_page || 20,
            total: resultProducts.meta.total || null,
            total_pages: resultProducts.meta.last_page || 1,
          });
        }
      } catch (err: any) {
        console.error("Gagal mengambil data:", err);
        setErrorProducts(err?.message || "Gagal terhubung ke server.");
      } finally {
        setLoadingProducts(false);
        setLoadingMore(false);
      }
    };

    fetchData();
  }, [isMounted, currentPage, debouncedSearch, selectedMerk, apiUrl]);

  // Infinite Scroll Observer (otomatis muat halaman berikutnya saat mendekati bawah)
  useEffect(() => {
    if (!isMounted || loadingProducts || loadingMore) return;
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
  }, [
    isMounted,
    loadingProducts,
    loadingMore,
    currentPage,
    pagination.total_pages,
  ]);

  const handleToggleFavorite = async (product: Barang) => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Silakan login terlebih dahulu untuk menambah ke favorit.");
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/favorites/toggle`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          kd_bs: product.kd_bs,
          nama: product.nama,
          nilai_anggota: product.nilai_anggota,
          merk: product.merk,
          gambar: product.gambar,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setFavoriteKdBrs((prevSet) => {
          const newSet = new Set(prevSet);
          if (result.data.is_favorite) {
            newSet.add(String(product.kd_bs));
          } else {
            newSet.delete(String(product.kd_bs));
          }
          return newSet;
        });
      } else {
        alert(result.message || "Gagal memperbarui favorit.");
      }
    } catch (err) {
      console.error("Error toggle favorit:", err);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleFilterMerk = (merkValue: string) => {
    setSelectedMerk(merkValue);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSelectedMerk("");
    setSearchQuery("");
    setCurrentPage(1);
  };

  if (!isMounted) return null;

  const hasActiveFilter = Boolean(selectedMerk || searchQuery);

  return (
    <Layout>
      <main
        className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 pt-2 pb-16 sm:py-4"
        suppressHydrationWarning
      >
        {/* 1. HEADER RINGKAS: Judul + Jumlah Produk + Reset dalam 1 baris */}
        <div className="flex items-center justify-between mb-1.5">
          <h1 className="text-base sm:text-xl font-bold text-gray-900 flex items-center gap-1.5">
            <FiBox className="text-blue-600 w-4 h-4 sm:w-5 sm:h-5" />
            <span>Daftar Data (BS)</span>
          </h1>

          <div className="flex items-center gap-1.5">
            {!loadingProducts && !errorProducts && (
              <span className="text-[10px] sm:text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                {products.length}
                {pagination.total
                  ? ` / ${pagination.total.toLocaleString("id-ID")}`
                  : " produk"}
              </span>
            )}
            {hasActiveFilter && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-[10px] sm:text-xs text-red-600 hover:text-red-700 font-semibold flex items-center gap-0.5 bg-red-50 px-2 py-0.5 rounded-full border border-red-200 transition active:scale-95"
              >
                <FiX className="w-3 h-3" /> Reset
              </button>
            )}
          </div>
        </div>

        {/* 2. KOTAK PENCARIAN STICKY (Berhenti di bawah navbar saat di-scroll ke bawah) */}
        <div
          className={`sticky top-14 sm:top-16 z-30 -mx-2.5 px-2.5 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 py-1.5 mb-2 transition-all duration-150 ${
            isScrolled
              ? "bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-200/80"
              : "bg-gray-50/90 backdrop-blur-xs"
          }`}
        >
          <div className="relative w-full">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
              <FiSearch className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Cari nama, kd_bs, atau merk..."
              className="w-full pl-9 pr-9 py-1.5 sm:py-2 bg-white border border-gray-300 rounded-xl text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition shadow-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Hapus pencarian"
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Filter Merk (Hanya jika ada data merk) */}
        {merkList.length > 0 && (
          <div className="bg-white px-2.5 py-2 sm:p-3 rounded-xl shadow-xs border border-gray-100 mb-3">
            <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <span className="text-[11px] font-bold text-blue-600 shrink-0 mr-1 flex items-center gap-1">
                <FiFilter className="w-3 h-3" /> Merk:
              </span>
              <button
                type="button"
                onClick={() => handleFilterMerk("")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-semibold whitespace-nowrap shrink-0 transition active:scale-95 ${
                  selectedMerk === ""
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <FiGrid className="w-3 h-3" />
                <span>Semua</span>
              </button>

              {merkList.map((m, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleFilterMerk(m)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-semibold whitespace-nowrap shrink-0 transition active:scale-95 ${
                    selectedMerk === m
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  <FiTag className="w-3 h-3" />
                  <span>{m}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Konten Produk BS */}
        {loadingProducts ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-b-2 border-blue-600"></div>
          </div>
        ) : errorProducts ? (
          <div className="p-4 bg-red-50 text-red-600 rounded-xl text-center text-xs sm:text-sm">
            {errorProducts}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-xs border p-6">
            <FiBox className="mx-auto h-10 w-10 text-gray-300 mb-2" />
            <p className="text-gray-500 text-xs sm:text-sm font-medium">
              BS tidak ditemukan.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4 mb-6">
              {products.map((product) => (
                <BSCard
                  key={product.kd_bs}
                  product={product}
                  isFavorite={favoriteKdBrs.has(String(product.kd_bs))}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
            </div>

            {/* Sentinel Infinite Scroll */}
            <div ref={loadMoreRef} className="py-6 flex justify-center">
              {loadingMore ? (
                <div className="flex items-center gap-2 text-xs text-blue-600 font-semibold">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  <span>Memuat data BS lainnya...</span>
                </div>
              ) : currentPage >= pagination.total_pages ? (
                <span className="text-xs text-gray-400">
                  Semua data BS sudah ditampilkan.
                </span>
              ) : null}
            </div>
          </>
        )}
      </main>
    </Layout>
  );
}