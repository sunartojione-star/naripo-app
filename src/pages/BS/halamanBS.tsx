"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import ProductCard, { Barang } from "@/components/BSCard";
import {
  FiSearch,
  FiBox,
  FiFilter,
  FiGrid,
  FiTag,
  FiChevronLeft,
  FiChevronRight,
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
  const [errorProducts, setErrorProducts] = useState<string>("");

  // State Pencarian & Filter
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [selectedMerk, setSelectedMerk] = useState<string>("");

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 20,
    total: null,
    total_pages: 1,
  });

  const router = useRouter();
  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://103.125.42.217:8081/api";

  // Pastikan komponen sudah termuat di browser
  useEffect(() => {
    setIsMounted(true);
  }, []);

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
      setLoadingProducts(true);
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

        let prodList = [];
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

        setProducts(prodList);

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

        if (token) {
          const resFav = await fetch(`${apiUrl}/favorites`, {
            headers: {
              Accept: "application/json",
              Authorization: token ? `Bearer ${token}` : "",
            },
          });

          if (resFav.ok) {
            const resultFav = await resFav.json();
            if (resultFav.success && Array.isArray(resultFav.data)) {
              const favSet = new Set<string>(
                resultFav.data.map(
                  (favItem: { kd_bs: string }) => favItem.kd_bs
                )
              );
              setFavoriteKdBrs(favSet);
            }
          }
        }
      } catch (err: any) {
        console.error("Gagal mengambil data:", err);
        setErrorProducts(err?.message || "Gagal terhubung ke server.");
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchData();
  }, [isMounted, currentPage, debouncedSearch, selectedMerk, apiUrl]);

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

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.total_pages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleFilterMerk = (merkValue: string) => {
    setSelectedMerk(merkValue);
    setCurrentPage(1);
  };

  if (!isMounted) return null;

  return (
    <Layout>
      <main
        className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 py-3 sm:py-8"
        suppressHydrationWarning
      >
        {/* Header Title & Kotak Pencarian */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-6 gap-2.5 border-b border-gray-200 pb-3 sm:pb-6">
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FiBox className="text-blue-600 w-5 h-5 sm:w-6 sm:h-6" />
              <span>Daftar Data (BS)</span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              Menampilkan daftar BS dengan status Aktif.
            </p>
          </div>

          {/* Kotak Pencarian */}
          <div className="relative w-full sm:w-80">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
              <FiSearch className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Cari nama, kd_bs, atau merk..."
              className="w-full pl-9 pr-8 py-2 bg-white border border-gray-300 rounded-xl text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition shadow-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Filter Merk (Hanya jika ada data merk) */}
        {merkList.length > 0 && (
          <div className="bg-white p-2.5 sm:p-4 rounded-xl shadow-sm border border-gray-100 mb-3 sm:mb-6">
            <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden py-0.5">
              <span className="text-[11px] font-bold text-blue-600 shrink-0 mr-1 flex items-center gap-1">
                <FiFilter className="w-3 h-3" /> Merk:
              </span>
              <button
                type="button"
                onClick={() => handleFilterMerk("")}
                className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition active:scale-95 ${
                  selectedMerk === ""
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <FiGrid className="w-3.5 h-3.5" />
                <span>Semua</span>
              </button>

              {merkList.map((m, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleFilterMerk(m)}
                  className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition active:scale-95 ${
                    selectedMerk === m
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  <FiTag className="w-3.5 h-3.5" />
                  <span>{m}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Informasi Status Hasil */}
        {!loadingProducts && !errorProducts && (
          <div className="flex justify-between items-center mb-2.5 sm:mb-4 text-[10px] sm:text-xs text-gray-500 font-medium px-1">
            <span>
              Halaman {pagination.page} dari {pagination.total_pages}{" "}
              {pagination.total ? `(Total ${pagination.total} produk)` : ""}
            </span>
            <span>20 Item / Hal</span>
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
          <div className="text-center py-16 bg-white rounded-2xl shadow-sm border p-6">
            <FiBox className="mx-auto h-10 w-10 text-gray-300 mb-2" />
            <p className="text-gray-500 text-xs sm:text-sm font-medium">
              BS tidak ditemukan.
            </p>
          </div>
        ) : (
          <>
            {/* GRID 2 KOLOM DI HP (grid-cols-2), 3 DI TABLET, 4 DI PC */}
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-6 mb-8">
              {products.map((product) => (
                <ProductCard
                  key={product.kd_bs}
                  product={product}
                  isFavorite={favoriteKdBrs.has(String(product.kd_bs))}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
            </div>

            {/* Pagination Controls Responsif */}
            {pagination.total_pages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-gray-200">
                <span className="text-xs text-gray-500 order-2 sm:order-1">
                  Halaman <strong>{currentPage}</strong> dari{" "}
                  <strong>{pagination.total_pages}</strong>
                </span>

                <div className="flex items-center gap-1 order-1 sm:order-2">
                  <button
                    type="button"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-1.5 sm:p-2 text-xs font-semibold border rounded-lg bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1"
                  >
                    <FiChevronLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Sebelumnya</span>
                  </button>

                  <div className="flex gap-1">
                    {Array.from(
                      { length: pagination.total_pages },
                      (_, i) => i + 1
                    )
                      .filter(
                        (p) =>
                          p === 1 ||
                          p === pagination.total_pages ||
                          Math.abs(p - currentPage) <= 1
                      )
                      .map((p, idx, array) => {
                        const showEllipsis =
                          idx > 0 && p - array[idx - 1] > 1;
                        return (
                          <div key={p} className="flex items-center">
                            {showEllipsis && (
                              <span className="px-1 text-gray-400 text-xs">
                                ...
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handlePageChange(p)}
                              className={`w-7 h-7 sm:w-8 sm:h-8 text-xs font-bold rounded-lg border transition ${
                                currentPage === p
                                  ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                  : "bg-white text-gray-700 hover:bg-gray-50 border-gray-300"
                              }`}
                            >
                              {p}
                            </button>
                          </div>
                        );
                      })}
                  </div>

                  <button
                    type="button"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= pagination.total_pages}
                    className="p-1.5 sm:p-2 text-xs font-semibold border rounded-lg bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1"
                  >
                    <span className="hidden sm:inline">Selanjutnya</span>
                    <FiChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </Layout>
  );
}