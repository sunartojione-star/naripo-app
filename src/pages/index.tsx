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
} from "react-icons/fi";

export default function Home() {
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [newProducts, setNewProducts] = useState<Barang[]>([]);
  const [favoriteKdBrs, setFavoriteKdBrs] = useState<Set<string>>(new Set());
  const [loadingProducts, setLoadingProducts] = useState<boolean>(true);
  const [errorProducts, setErrorProducts] = useState<string>("");

  const router = useRouter();
  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://103.125.42.217:8081/api";

  // Pastikan komponen sudah termuat di browser (Mencegah Hydration Error)
  useEffect(() => {
    setIsMounted(true);
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
          },
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
              Authorization: `Bearer ${token}`,
            },
          });

          if (resFav.ok) {
            const resultFav = await resFav.json();
            if (resultFav.success && Array.isArray(resultFav.data)) {
              const favSet = new Set<string>(
                resultFav.data.map(
                  (favItem: { kd_br: string }) => favItem.kd_br,
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
    router.push("/laporan/omsetku"); // Diarahkan langsung ke halaman omsetku.tsx
  };

  const handleCekOrderanku = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Silakan login terlebih dahulu.");
      return;
    }
    router.push("/laporan/laporanpo");
  };

  if (!isMounted) return null;

  return (
    <Layout>
      <div suppressHydrationWarning>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* 1. HERO SECTION */}
          <section className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 text-white rounded-2xl py-14 px-6 mb-12 shadow-xl relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-blue-500 rounded-full opacity-20 blur-2xl pointer-events-none"></div>

            <div className="max-w-4xl mx-auto text-center relative z-10">
              {/* Tombol-tombol Aksi di Hero Section */}
              <div className="flex flex-wrap justify-center items-center gap-3">
                {/* Belanja Sekarang */}
                <Link
                  href="/products"
                  className="bg-white text-blue-700 px-6 py-3.5 rounded-xl font-bold hover:bg-blue-50 transition shadow-lg flex items-center gap-2 group"
                >
                  Belanja Sekarang
                  <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
                </Link>

                {/* CEK OMSET */}
                <button
                  onClick={handleCekOmset}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3.5 rounded-xl font-bold transition shadow-lg flex items-center gap-2"
                >
                  <FiDollarSign className="w-5 h-5" />
                  CEK OMSET
                </button>

                {/* CEK ORDERANKU */}
                <button
                  onClick={handleCekOrderanku}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3.5 rounded-xl font-bold transition shadow-lg flex items-center gap-2"
                >
                  <FiShoppingBag className="w-5 h-5" />
                  CEK ORDERANKU
                </button>
              </div>
            </div>
          </section>

          {/* 2. SECTION PRODUK TERBARU (KET: BARU) */}
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                  <FiStar className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                    Produk Terbaru
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-500">
                    Daftar produk pilihan dengan kategori status BARU
                  </p>
                </div>
              </div>
              <Link
                href="/products"
                className="text-sm font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition"
              >
                Lihat Semua <FiArrowRight />
              </Link>
            </div>

            {loadingProducts ? (
              <div className="flex justify-center items-center py-16">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
              </div>
            ) : errorProducts ? (
              <div className="p-4 bg-red-50 text-red-600 rounded-md text-center">
                {errorProducts}
              </div>
            ) : newProducts.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-100 shadow-sm">
                <FiBox className="mx-auto h-10 w-10 text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">
                  Belum ada produk dengan kategori BARU saat ini.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
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
