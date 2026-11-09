"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Layout from "@/components/Layout";
import ProductCard, { Barang } from "@/components/BSCard";
import { FiSearch, FiBox, FiFilter, FiGrid, FiTag } from "react-icons/fi";

interface PaginationMeta {
  page: number;
  limit: number;
  total: number | null;
  total_pages: number;
}

export default function HalamanBS() {
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [products, setProducts] = useState<Barang[]>([]);
  // Daftar merk bisa diisi manual di sini jika Anda memilikinya, atau dibiarkan kosong jika tidak pakai filter merk
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

  // Pastikan komponen sudah termuat di browser (Mencegah Hydration Error)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Debounce pencarian agar tidak spam request ke server
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch daftar BS dari backend menggunakan endpoint bsss & bss/by-kd
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

        // Endpoint utama menggunakan /bsss (sesuai rute Laravel)
        let endpoint = `${apiUrl}/bsss?page=${currentPage}&limit=20${searchParam}${merkParam}`;

        // Jika menggunakan endpoint khusus by-kd berdasarkan merk
        if (selectedMerk) {
          endpoint = `${apiUrl}/bss/by-kd?merk=${encodeURIComponent(selectedMerk)}&page=${currentPage}&limit=20${searchParam}`;
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

        // Ambil data favorit jika token tersedia
        if (token) {
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
                resultFav.data.map(
                  (favItem: { kd_bs: string }) => favItem.kd_bs,
                ),
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
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
        suppressHydrationWarning
      >
        {/* Header Title & Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4 border-b pb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FiBox className="text-blue-600" /> Daftar Data (BS)
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Menampilkan daftar BS dengan status Aktif.
            </p>
          </div>

          <div className="relative w-full md:w-80">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
              <FiSearch className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Cari nama, kd_bs, atau merk..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition shadow-sm"
            />
          </div>
        </div>

        {/* CONTAINER KELOMPOK FILTER BERDASARKAN MERK (Hanya muncul jika merkList ada isinya) */}
        {merkList.length > 0 && (
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 mb-8 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2 text-blue-600 font-semibold min-w-[150px]">
                <FiFilter className="w-4 h-4" />
                <span className="text-sm">Filter Merk :</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleFilterMerk("")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    selectedMerk === ""
                      ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                      : "bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200"
                  }`}
                >
                  <FiGrid className="w-4 h-4" /> Semua
                </button>

                {merkList.map((m, idx) => {
                  const isSelected = selectedMerk === m;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleFilterMerk(m)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                        isSelected
                          ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                          : "bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200"
                      }`}
                    >
                      <FiTag className="w-4 h-4" />
                      <span>{m}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Informasi Jumlah Halaman / Hasil */}
        {!loadingProducts && !errorProducts && (
          <div className="flex justify-between items-center mb-6">
            <span className="text-sm text-gray-500 font-medium">
              Menampilkan Halaman {pagination.page} dari{" "}
              {pagination.total_pages}{" "}
              {pagination.total ? `(Total ${pagination.total} produk)` : ""}
            </span>
            <span className="text-sm text-gray-500 font-medium">
              20 Item per Halaman
            </span>
          </div>
        )}

        {/* Konten Produk */}
        {loadingProducts ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
        ) : errorProducts ? (
          <div className="p-4 bg-red-50 text-red-600 rounded-md text-center">
            {errorProducts}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-lg shadow-sm border p-8">
            <FiBox className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-600 font-medium">BS tidak ditemukan.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
              {products.map((product) => (
                <ProductCard
                  key={product.kd_bs}
                  product={product}
                  // isFavorite={favoriteKdBrs.has(product.kd_bs)}
                  isFavorite={favoriteKdBrs.has(String(product.kd_bs))}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
            </div>

            {/* Pagination Controls */}
            {pagination.total_pages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-6 border-t border-gray-200">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-4 py-2 text-sm font-medium border rounded-md bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  ← Sebelumnya
                </button>

                <div className="flex gap-1">
                  {Array.from(
                    { length: pagination.total_pages },
                    (_, i) => i + 1,
                  )
                    .filter(
                      (p) =>
                        p === 1 ||
                        p === pagination.total_pages ||
                        Math.abs(p - currentPage) <= 1,
                    )
                    .map((p, idx, array) => {
                      const showEllipsis = idx > 0 && p - array[idx - 1] > 1;
                      return (
                        <div key={p} className="flex items-center">
                          {showEllipsis && (
                            <span className="px-2 text-gray-400">...</span>
                          )}
                          <button
                            onClick={() => handlePageChange(p)}
                            className={`px-3.5 py-2 text-sm font-semibold rounded-md border transition ${
                              currentPage === p
                                ? "bg-blue-600 text-white border-blue-600"
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
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= pagination.total_pages}
                  className="px-4 py-2 text-sm font-medium border rounded-md bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Selanjutnya →
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </Layout>
  );
}
