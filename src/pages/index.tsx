"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Layout from "@/components/Layout";
import ProductCard, { Barang } from "@/components/ProductCard";
import {
  FiBox,
  FiArrowRight,
  FiStar,
  FiDollarSign,
  FiShoppingBag,
  FiClipboard,
} from "react-icons/fi";

export default function Home() {
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [newProducts, setNewProducts] = useState<Barang[]>([]);
  const [favoriteKdBrs, setFavoriteKdBrs] = useState<Set<string>>(new Set());
  const [loadingProducts, setLoadingProducts] = useState<boolean>(true);
  const [errorProducts, setErrorProducts] = useState<string>("");
  const [userRole, setUserRole] = useState<string>("");

  const router = useRouter();
  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://103.125.42.217:8081/api";

  // Pastikan komponen sudah termuat di browser (Mencegah Hydration Error)
  useEffect(() => {
    setIsMounted(true);
    // Ambil data user role dari localStorage jika ada
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUserRole(
          parsedUser.role || parsedUser.Hak || parsedUser.level_user || ""
        );
      } catch (e) {
        console.error("Gagal parsing data user", e);
      }
    }
  }, []);

  // Fetch produk terbaru (ket: 'BARU') dan daftar favorit user
  useEffect(() => {
    if (!isMounted) return;

    const fetchData = async () => {
      setLoadingProducts(true);
      const token = localStorage.getItem("token");

      try {
        // 1. Get Produk dengan ket: 'BARU' untuk Home
        const resProducts = await fetch(
          `${apiUrl}/barangs?status=Digunakan&ket=BARU&limit=8`,
          {
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              Authorization: token ? `Bearer ${token}` : "",
            },
          }
        );

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

        setNewProducts(prodList);

        // 2. Get Favorit User (jika sudah login)
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
  }, [isMounted, apiUrl]);

  // Handler toggle favorit -> panggil POST /api/favorites/toggle
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

  // Handler Tombol Cek Omset & Cek Orderanku
  const handleCekOmset = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Silakan login terlebih dahulu.");
      return;
    }
    router.push("/laporan/omsetku");
  };

  const handleCekOrderanku = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Silakan login terlebih dahulu.");
      return;
    }
    router.push("/laporan/laporanpo");
  };

  // Handler Tombol Input BS
  const handleInputBS = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Silakan login terlebih dahulu.");
      return;
    }
    router.push("/BS/halamanBS");
  };

  // Handler Tombol Stok Opname (Validasi khusus Admin)
  const handleStokOpname = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Silakan login terlebih dahulu.");
      return;
    }

    if (userRole.toLowerCase() !== "admin") {
      alert("Akses ditolak. Menu Stok Opname hanya khusus untuk Admin.");
      return;
    }

    router.push("/opname/halamanopname");
  };

  if (!isMounted) return null;

  return (
    <Layout>
      <div suppressHydrationWarning>
        <main className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 py-3 sm:py-6">
          {/* 1. HERO SECTION (BANNER MENU RAPI & RESPONSIF) */}
          <section className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 text-white rounded-2xl p-4 sm:p-8 mb-6 sm:mb-10 shadow-xl relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 w-48 sm:w-64 h-48 sm:h-64 bg-blue-500 rounded-full opacity-20 blur-2xl pointer-events-none"></div>

            <div className="max-w-4xl mx-auto relative z-10 flex flex-col items-center">
              {/* Tombol Utama: Belanja Sekarang */}
              <div className="w-full sm:w-auto mb-3 sm:mb-5 flex justify-center">
                <Link
                  href="/products"
                  className="w-full sm:w-auto bg-white text-blue-700 px-6 py-3 sm:py-3.5 rounded-xl font-bold hover:bg-blue-50 transition shadow-lg flex items-center justify-center gap-2 group text-sm sm:text-base active:scale-95"
                >
                  Belanja Sekarang
                  <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

              {/* Grid Menu Aksi Cepat (Di HP tampil 2 Kolom, di PC tampil sejajar) */}
              <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3.5">
                {/* INPUT BS */}
                <button
                  type="button"
                  onClick={handleInputBS}
                  className="bg-amber-500 hover:bg-amber-600 active:scale-95 text-white px-3 py-2.5 sm:py-3 rounded-xl font-bold transition shadow-md flex items-center justify-center gap-2 text-xs sm:text-sm"
                >
                  <FiBox className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                  <span>INPUT BS</span>
                </button>

                {/* STOK OPNAME */}
                <button
                  type="button"
                  onClick={handleStokOpname}
                  className="bg-purple-600 hover:bg-purple-700 active:scale-95 text-white px-3 py-2.5 sm:py-3 rounded-xl font-bold transition shadow-md flex items-center justify-center gap-2 text-xs sm:text-sm"
                >
                  <FiClipboard className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                  <span>STOK OPNAME</span>
                </button>

                {/* CEK OMSET */}
                <button
                  type="button"
                  onClick={handleCekOmset}
                  className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white px-3 py-2.5 sm:py-3 rounded-xl font-bold transition shadow-md flex items-center justify-center gap-2 text-xs sm:text-sm"
                >
                  <FiDollarSign className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                  <span>CEK OMSET</span>
                </button>

                {/* CEK ORDERANKU */}
                <button
                  type="button"
                  onClick={handleCekOrderanku}
                  className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white px-3 py-2.5 sm:py-3 rounded-xl font-bold transition shadow-md flex items-center justify-center gap-2 text-xs sm:text-sm"
                >
                  <FiShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                  <span>CEK ORDERANKU</span>
                </button>
              </div>
            </div>
          </section>

          {/* 2. SECTION PRODUK TERBARU (DI HP TAMPIL 2 KOLOM) */}
          <section className="mb-8 sm:mb-12">
            <div className="flex items-center justify-between mb-3.5 sm:mb-6">
              <div className="flex items-center gap-2 sm:gap-2.5">
                <div className="p-1.5 sm:p-2 bg-blue-100 text-blue-600 rounded-lg shrink-0">
                  <FiStar className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-2xl font-bold text-gray-900 leading-tight">
                    Produk Terbaru
                  </h2>
                  <p className="text-[10px] sm:text-sm text-gray-500">
                    Daftar produk pilihan dengan status BARU
                  </p>
                </div>
              </div>
              <Link
                href="/products"
                className="text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition shrink-0"
              >
                Lihat Semua <FiArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </Link>
            </div>

            {loadingProducts ? (
              <div className="flex justify-center items-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-b-2 border-blue-600"></div>
              </div>
            ) : errorProducts ? (
              <div className="p-4 bg-red-50 text-red-600 rounded-md text-center text-xs sm:text-sm">
                {errorProducts}
              </div>
            ) : newProducts.length === 0 ? (
              <div className="text-center py-10 bg-white rounded-xl border border-gray-100 shadow-sm">
                <FiBox className="mx-auto h-8 w-8 sm:h-10 sm:w-10 text-gray-300 mb-2" />
                <p className="text-xs sm:text-sm text-gray-500">
                  Belum ada produk dengan kategori BARU saat ini.
                </p>
              </div>
            ) : (
              /* GRID 2 KOLOM DI HP (grid-cols-2), 3 DI TABLET, 4 DI PC */
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-6">
                {newProducts.map((product) => (
                  <ProductCard
                    key={product.kd_br}
                    product={product}
                    isFavorite={favoriteKdBrs.has(product.kd_br)}
                    onToggleFavorite={handleToggleFavorite}
                  />
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </Layout>
  );
}