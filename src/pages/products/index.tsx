"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import ProductCard, { Barang } from "@/components/ProductCard";
import {
  FiSearch,
  FiBox,
  FiFilter,
  FiGrid,
  FiCoffee,
  FiPackage,
  FiGift,
  FiTool,
  FiLayers,
  FiRefreshCw,
  FiTrendingUp,
  FiPlusCircle,
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

interface JenisProduk {
  kd: string;
  nama: string;
}

export default function ProductsPage() {
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [products, setProducts] = useState<Barang[]>([]);
  const [jenisProdukList, setJenisProdukList] = useState<JenisProduk[]>([]);
  const [favoriteKdBrs, setFavoriteKdBrs] = useState<Set<string>>(new Set());
  const [loadingProducts, setLoadingProducts] = useState<boolean>(true);
  const [errorProducts, setErrorProducts] = useState<string>("");

  // State Pencarian & Filter
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [selectedKet, setSelectedKet] = useState<string>(""); // SAMA, NAIK, TURUN, BARU
  const [selectedKd, setSelectedKd] = useState<string>(""); // Dari jenis_produk (kd)

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 30,
    total: null,
    total_pages: 1,
  });

  const router = useRouter();
  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://103.125.42.217:8081/api";

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const getJenisProdukIcon = (nama: string) => {
    const upperName = (nama || "").toUpperCase();
    if (upperName.includes("BISKUIT") || upperName.includes("MAKANAN"))
      return <FiCoffee className="w-3 h-3" />;
    if (upperName.includes("MINUMAN")) return <FiCoffee className="w-3 h-3" />;
    if (upperName.includes("PERALATAN") || upperName.includes("TOOL"))
      return <FiTool className="w-3 h-3" />;
    if (upperName.includes("HADIAH") || upperName.includes("GIFT"))
      return <FiGift className="w-3 h-3" />;
    if (
      upperName.includes("ATAS") ||
      upperName.includes("TENGAH") ||
      upperName.includes("BAWAH")
    )
      return <FiLayers className="w-3 h-3" />;
    return <FiPackage className="w-3 h-3" />;
  };

  const getKetIcon = (val: string) => {
    switch (val) {
      case "":
        return <FiGrid className="w-3 h-3" />;
      case "SAMA":
        return <FiRefreshCw className="w-3 h-3" />;
      case "NAIK":
        return <FiTrendingUp className="w-3 h-3" />;
      case "TURUN":
        return <FiTrendingUp className="w-3 h-3 rotate-180" />;
      case "BARU":
        return <FiPlusCircle className="w-3 h-3" />;
      default:
        return <FiGrid className="w-3 h-3" />;
    }
  };

  useEffect(() => {
    if (!isMounted) return;

    const fetchJenisProduk = async () => {
      const token = localStorage.getItem("token");
      try {
        const res = await fetch(`${apiUrl}/jenis-produk`, {
          headers: {
            Accept: "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
        });
        if (res.ok) {
          const result = await res.json();
          if (result.success && Array.isArray(result.data)) {
            setJenisProdukList(result.data);
          }
        }
      } catch (err) {
        console.error("Gagal mengambil jenis produk:", err);
      }
    };

    fetchJenisProduk();
  }, [isMounted, apiUrl]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (!isMounted) return;

    const fetchData = async () => {
      setLoadingProducts(true);
      const token = localStorage.getItem("token");

      try {
        const searchParam = debouncedSearch
          ? `&search=${encodeURIComponent(debouncedSearch)}`
          : "";

        const ketParam = selectedKet
          ? `&ket=${encodeURIComponent(selectedKet)}`
          : "";

        let endpoint = `${apiUrl}/barangs?status=Digunakan&page=${currentPage}&limit=30${searchParam}${ketParam}`;

        if (selectedKd) {
          endpoint = `${apiUrl}/barangs/by-kd?kd=${encodeURIComponent(
            selectedKd
          )}&page=${currentPage}&limit=30${searchParam}${ketParam}`;
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
            limit: resultProducts.meta.per_page || 30,
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
                  (favItem: { kd_br: string }) => favItem.kd_br
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
  }, [
    isMounted,
    currentPage,
    debouncedSearch,
    selectedKet,
    selectedKd,
    apiUrl,
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
          kd_br: product.kd_br,
          nama: product.nama,
          satuan: product.satuan,
          h_anggota: product.h_anggota,
          kd: product.kd,
          ket: product.ket,
          gambar: product.gambar,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setFavoriteKdBrs((prevSet) => {
          const newSet = new Set(prevSet);
          if (result.data.is_favorite) {
            newSet.add(product.kd_br);
          } else {
            newSet.delete(product.kd_br);
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

  const handleFilterKet = (ketValue: string) => {
    setSelectedKet(ketValue);
    setCurrentPage(1);
  };

  const handleFilterKd = (kdValue: string) => {
    setSelectedKd(kdValue);
    setCurrentPage(1);
  };

  // Reset semua filter
  const handleResetFilters = () => {
    setSelectedKet("");
    setSelectedKd("");
    setSearchQuery("");
    setCurrentPage(1);
  };

  if (!isMounted) return null;

  const hasActiveFilter = Boolean(selectedKet || selectedKd || searchQuery);

  return (
    <Layout>
      <main
        className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 py-3 sm:py-6"
        suppressHydrationWarning
      >
        {/* Header Title & Kotak Pencarian Ringkas */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-5 gap-2.5">
          <div className="flex items-center justify-between">
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FiBox className="text-blue-600 w-5 h-5" />
              <span>Daftar Produk</span>
            </h1>
            {/* Tombol Reset Cepat jika ada filter aktif */}
            {hasActiveFilter && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs text-red-600 hover:text-red-700 font-semibold sm:hidden flex items-center gap-1 bg-red-50 px-2.5 py-1 rounded-full border border-red-200"
              >
                <FiX className="w-3 h-3" /> Reset
              </button>
            )}
          </div>

          <div className="relative w-full sm:w-80">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
              <FiSearch className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Cari nama, barcode, harga..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-300 rounded-xl text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition shadow-sm"
            />
          </div>
        </div>

        {/* BARIS FILTER SIMPLE (SWIPE / SCROLL HORIZONTAL DI HP, RAMPING & TIDAK MAKAN TEMPAT) */}
        <div className="bg-white p-2.5 sm:p-3.5 rounded-xl shadow-sm border border-gray-100 mb-3.5 sm:mb-6 space-y-2">
          {/* 1. Baris Filter Harga (Geser Samping) */}
          <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden py-0.5">
            <span className="text-[11px] font-bold text-blue-600 shrink-0 mr-1 flex items-center gap-1">
              <FiFilter className="w-3 h-3" /> Harga:
            </span>
            {[
              { label: "Semua", value: "" },
              { label: "BARU", value: "BARU" },
              { label: "NAIK", value: "NAIK" },
              { label: "TURUN", value: "TURUN" },
              { label: "SAMA", value: "SAMA" },
            ].map((item) => {
              const isActive = selectedKet === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => handleFilterKet(item.value)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-semibold whitespace-nowrap shrink-0 transition active:scale-95 ${
                    isActive
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {getKetIcon(item.value)}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* 2. Baris Filter Gudang (Geser Samping) */}
          <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden py-0.5">
            <span className="text-[11px] font-bold text-emerald-600 shrink-0 mr-1 flex items-center gap-1">
              <FiLayers className="w-3 h-3" /> Gudang:
            </span>
            <button
              type="button"
              onClick={() => handleFilterKd("")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-semibold whitespace-nowrap shrink-0 transition active:scale-95 ${
                selectedKd === ""
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <FiGrid className="w-3 h-3" />
              <span>Semua</span>
            </button>

            {jenisProdukList.map((item) => {
              const cleanKd = item.kd.trim();
              const isSelected = selectedKd === cleanKd;
              return (
                <button
                  key={item.kd}
                  type="button"
                  onClick={() => handleFilterKd(cleanKd)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-semibold whitespace-nowrap shrink-0 transition active:scale-95 ${
                    isSelected
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {getJenisProdukIcon(item.nama)}
                  <span>{item.nama}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Informasi Status Hasil */}
        {!loadingProducts && !errorProducts && (
          <div className="flex justify-between items-center mb-2.5 sm:mb-4 text-[10px] sm:text-xs text-gray-500 font-medium px-1">
            <span>
              Halaman {pagination.page} dari {pagination.total_pages}{" "}
              {pagination.total ? `(Total ${pagination.total} produk)` : ""}
            </span>
            <span>30 Item / Hal</span>
          </div>
        )}

        {/* Konten Produk */}
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
              Produk tidak ditemukan.
            </p>
          </div>
        ) : (
          <>
            {/* GRID 2 KOLOM DI HP (grid-cols-2), 3 DI TABLET, 4 DI PC */}
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-6 mb-8">
              {products.map((product) => (
                <ProductCard
                  key={product.kd_br}
                  product={product}
                  isFavorite={favoriteKdBrs.has(product.kd_br)}
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