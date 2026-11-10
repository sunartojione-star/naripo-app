"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
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
  const rawApiUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://103.125.42.217:8081/api";
  const apiUrl = rawApiUrl.replace(/\/$/, "");

  useEffect(() => {
    setIsMounted(true);
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

  useEffect(() => {
    if (!isMounted) return;

    const fetchData = async () => {
      setLoadingProducts(true);
      const token = localStorage.getItem("token");

      try {
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

        let prodList: Barang[] = [];
        if (Array.isArray(resultProducts)) {
          prodList = resultProducts;
        } else if (resultProducts.success && Array.isArray(resultProducts.data)) {
          prodList = resultProducts.data;
        } else if (Array.isArray(resultProducts.data)) {
          prodList = resultProducts.data;
        }

        setNewProducts(prodList);

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
          if (result.data?.is_favorite) {
            newSet.add(product.kd_br);
          } else {
            newSet.delete(product.kd_br);
          }
          return newSet;
        });
      }
    } catch (err) {
      console.error("Error toggle favorit:", err);
    }
  };

  const handleCekOmset = () => {
    if (!localStorage.getItem("token")) return alert("Silakan login terlebih dahulu.");
    router.push("/laporan/omsetku");
  };

  const handleCekOrderanku = () => {
    if (!localStorage.getItem("token")) return alert("Silakan login terlebih dahulu.");
    router.push("/laporan/laporanpo");
  };

  const handleInputBS = () => {
    if (!localStorage.getItem("token")) return alert("Silakan login terlebih dahulu.");
    router.push("/BS/halamanBS");
  };

  const handleStokOpname = () => {
    if (!localStorage.getItem("token")) return alert("Silakan login terlebih dahulu.");
    if (userRole.toLowerCase() !== "admin") {
      return alert("Akses ditolak. Menu Stok Opname hanya khusus untuk Admin.");
    }
    router.push("/opname/halamanopname");
  };

  if (!isMounted) return null;

  return (
    <Layout>
      <div suppressHydrationWarning className="w-full">
        {/* w-full dengan px-2 di HP agar konten MELEBAR PENUH ke tepi layar */}
        <div className="w-full max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-2 sm:py-6">
          
          {/* 1. HERO BANNER PENUH */}
          <section className="w-full bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 text-white rounded-xl p-3 sm:p-6 mb-4 sm:mb-8 shadow-sm relative overflow-hidden">
            <div className="w-full flex flex-col items-center relative z-10">
              {/* Tombol Belanja Sekarang */}
              <div className="w-full sm:w-auto mb-2.5 sm:mb-4 flex justify-center">
                <Link
                  href="/products"
                  className="w-full sm:w-auto bg-white text-blue-700 px-4 py-2.5 rounded-lg font-bold hover:bg-blue-50 transition shadow-sm flex items-center justify-center gap-2 group text-xs sm:text-sm active:scale-95"
                >
                  Belanja Sekarang
                  <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

              {/* Grid Menu Aksi Cepat 2x2 */}
              <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-3">
                <button
                  type="button"
                  onClick={handleInputBS}
                  className="bg-amber-500 hover:bg-amber-600 active:scale-95 text-white px-2 py-2 rounded-lg font-bold transition shadow-xs flex items-center justify-center gap-1.5 text-[11px] sm:text-xs"
                >
                  <FiBox className="w-3.5 h-3.5 shrink-0" />
                  <span>INPUT BS</span>
                </button>

                <button
                  type="button"
                  onClick={handleStokOpname}
                  className="bg-purple-600 hover:bg-purple-700 active:scale-95 text-white px-2 py-2 rounded-lg font-bold transition shadow-xs flex items-center justify-center gap-1.5 text-[11px] sm:text-xs"
                >
                  <FiClipboard className="w-3.5 h-3.5 shrink-0" />
                  <span>STOK OPNAME</span>
                </button>

                <button
                  type="button"
                  onClick={handleCekOmset}
                  className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white px-2 py-2 rounded-lg font-bold transition shadow-xs flex items-center justify-center gap-1.5 text-[11px] sm:text-xs"
                >
                  <FiDollarSign className="w-3.5 h-3.5 shrink-0" />
                  <span>CEK OMSET</span>
                </button>

                <button
                  type="button"
                  onClick={handleCekOrderanku}
                  className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white px-2 py-2 rounded-lg font-bold transition shadow-xs flex items-center justify-center gap-1.5 text-[11px] sm:text-xs"
                >
                  <FiShoppingBag className="w-3.5 h-3.5 shrink-0" />
                  <span>CEK ORDERANKU</span>
                </button>
              </div>
            </div>
          </section>

          {/* 2. SECTION PRODUK TERBARU */}
          <section className="w-full mb-6">
            <div className="flex items-center justify-between mb-2.5 px-0.5">
              <div className="flex items-center gap-1.5">
                <FiStar className="w-4 h-4 text-blue-600" />
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-gray-900 leading-tight">
                    Produk Terbaru
                  </h2>
                  <p className="text-[10px] text-gray-500">
                    Daftar produk pilihan dengan status BARU
                  </p>
                </div>
              </div>
              <Link
                href="/products"
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition shrink-0"
              >
                Lihat Semua <FiArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {loadingProducts ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600"></div>
              </div>
            ) : errorProducts ? (
              <div className="p-3 bg-red-50 text-red-600 rounded-lg text-center text-xs">
                {errorProducts}
              </div>
            ) : newProducts.length === 0 ? (
              <div className="text-center py-8 bg-white rounded-xl border border-gray-100 shadow-xs">
                <FiBox className="mx-auto h-7 w-7 text-gray-300 mb-1" />
                <p className="text-xs text-gray-500">
                  Belum ada produk status BARU saat ini.
                </p>
              </div>
            ) : (
              /* GRID PENUH: gap-2 di HP membuat kartu melebar maksimal */
              <div className="w-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
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
        </div>
      </div>
    </Layout>
  );
}