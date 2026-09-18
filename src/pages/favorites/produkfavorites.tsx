"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "../../components/Layout/Header";
import ProductCard, { Barang } from "../../components/ProductCard";
import { FiHeart, FiChevronLeft, FiChevronRight } from "react-icons/fi";

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<Barang[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // State untuk Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 12;

  const router = useRouter();
  const API_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://103.125.42.217:8081/api";

  const fetchFavorites = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/favorites`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (res.ok) {
        const result = await res.json();
        let dataList = [];

        if (Array.isArray(result)) {
          dataList = result;
        } else if (result && Array.isArray(result.data)) {
          dataList = result.data;
        } else if (result && Array.isArray(result.favorites)) {
          dataList = result.favorites;
        }

        // Mapping data agar properti 'gambar' dan atribut lainnya terbaca dengan benar
        const mappedData = dataList.map((item: any) => {
          const productObj = item.barang || item.product || item.item || item;

          return {
            ...productObj,
            gambar:
              productObj.gambar ||
              productObj.foto ||
              productObj.image ||
              productObj.photo ||
              item.gambar ||
              item.foto ||
              item.image ||
              null,
            nama:
              productObj.nama ||
              productObj.nama_br ||
              productObj.name ||
              item.nama ||
              item.nama_br ||
              "",
            h_anggota:
              productObj.h_anggota ||
              productObj.harga ||
              item.h_anggota ||
              item.harga ||
              "0",
          };
        });

        setFavorites(mappedData);
      } else {
        console.error("Gagal memuat data favorite");
      }
    } catch (error) {
      console.error("Terjadi kesalahan:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, [API_URL, router]);

  // Handler untuk menghapus produk favorit menggunakan Request Body (sesuai destroy controller Laravel)
  const handleToggleFavorite = async (product: Barang) => {
    const token = localStorage.getItem("token");
    const kdBr = product.kd_br;

    try {
      const res = await fetch(`${API_URL}/favorites`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ kd_br: kdBr }),
      });

      if (res.ok) {
        setFavorites((prev) => {
          const updated = prev.filter((item) => item.kd_br !== kdBr);
          const totalPages = Math.ceil(updated.length / itemsPerPage) || 1;
          if (currentPage > totalPages) {
            setCurrentPage(totalPages);
          }
          return updated;
        });
      } else {
        console.error("Gagal menghapus favorite dari server");
      }
    } catch (error) {
      console.error("Terjadi kesalahan:", error);
    }
  };

  // Logika Pemotongan Data untuk Pagination
  const totalPages = Math.ceil(favorites.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentFavorites = favorites.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4 border-b pb-4">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FiHeart className="text-red-500 fill-red-500" /> Produk Favorit
            Saya
          </h1>
          {!loading && favorites.length > 0 && (
            <span className="text-sm text-gray-500 font-medium">
              Halaman {currentPage} dari {totalPages} ({favorites.length} total
              produk)
            </span>
          )}
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-500">
            Memuat produk favorit...
          </div>
        ) : favorites.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-lg shadow-sm border p-8">
            <FiHeart className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-600 font-medium">
              Belum ada produk favorit.
            </p>
          </div>
        ) : (
          <>
            {/* Grid menggunakan komponen ProductCard yang seragam dengan Home */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {currentFavorites.map((product) => (
                <ProductCard
                  key={product.kd_br}
                  product={product}
                  isFavorite={true} // Karena di halaman favorit, otomatis statusnya true (merah)
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center mt-10 gap-2">
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage === 1}
                  className="flex items-center gap-1 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
                >
                  <FiChevronLeft className="w-4 h-4" /> Sebelumnya
                </button>

                <div className="flex items-center gap-1 px-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (pageNumber) => {
                      if (
                        totalPages <= 5 ||
                        pageNumber === 1 ||
                        pageNumber === totalPages ||
                        (pageNumber >= currentPage - 1 &&
                          pageNumber <= currentPage + 1)
                      ) {
                        return (
                          <button
                            key={pageNumber}
                            onClick={() => setCurrentPage(pageNumber)}
                            className={`w-9 h-9 rounded-lg text-sm font-medium transition ${
                              currentPage === pageNumber
                                ? "bg-blue-600 text-white shadow-sm"
                                : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                            }`}
                          >
                            {pageNumber}
                          </button>
                        );
                      } else if (
                        pageNumber === currentPage - 2 ||
                        pageNumber === currentPage + 2
                      ) {
                        return (
                          <span key={pageNumber} className="px-1 text-gray-400">
                            ...
                          </span>
                        );
                      }
                      return null;
                    },
                  )}
                </div>

                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
                >
                  Berikutnya <FiChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
