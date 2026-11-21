"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import ProductCard, { Barang } from "@/components/ProductCard";
import ProductDetailModal from "@/components/ProductDetailModal";
import {
  FiBox,
  FiArrowRight,
  FiStar,
  FiDollarSign,
  FiShoppingBag,
  FiClipboard,
  FiBarChart2,
  FiUsers,
  FiCreditCard,
  FiTrendingUp,
  FiTruck,
  FiFileText,
  FiMessageCircle,
  FiMaximize,
  FiUserCheck,
  FiPackage,
} from "react-icons/fi";

export default function Home() {
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [newProducts, setNewProducts] = useState<Barang[]>([]);
  const [favoriteKdBrs, setFavoriteKdBrs] = useState<Set<string>>(new Set());
  const [loadingProducts, setLoadingProducts] = useState<boolean>(true);
  const [errorProducts, setErrorProducts] = useState<string>("");
  const [needsLogin, setNeedsLogin] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<string>("");
  const [isAdminFlag, setIsAdminFlag] = useState<boolean>(false);
  const [selectedProduct, setSelectedProduct] = useState<Barang | null>(null);

  const router = useRouter();
  const rawApiUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://103.125.42.217:8081/api";
  const apiUrl = rawApiUrl.replace(/\/$/, "");

  const isAdmin =
    isAdminFlag ||
    ["admin", "super admin", "superadmin"].includes(
      userRole.trim().toLowerCase()
    );

  useEffect(() => {
    setIsMounted(true);
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUserRole(
          String(
            parsedUser.role || parsedUser.Hak || parsedUser.level_user || ""
          )
        );
        setIsAdminFlag(
          parsedUser.is_admin === true ||
            parsedUser.is_admin === 1 ||
            Number(parsedUser.level_user) === 1
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
      setErrorProducts("");
      setNeedsLogin(false);
      const token = localStorage.getItem("token");

      if (!token) {
        setNeedsLogin(true);
        setLoadingProducts(false);
        return;
      }

      try {
        const resProducts = await fetch(
          `${apiUrl}/barangs?status=Digunakan&ket=BARU&limit=8`,
          {
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (resProducts.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setNeedsLogin(true);
          return;
        }

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
                (favItem: { kd_br: string }) => favItem.kd_br
              )
            );
            setFavoriteKdBrs(favSet);
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

  const handleOrderKasir = () => {
    if (!localStorage.getItem("token")) return alert("Silakan login terlebih dahulu.");
    router.push("/order-kasir");
  };

  const handleInputBS = () => {
    if (!localStorage.getItem("token")) return alert("Silakan login terlebih dahulu.");
    router.push("/BS/halamanBS");
  };

  const handleCekPiutang = () => {
    if (!localStorage.getItem("token")) return alert("Silakan login terlebih dahulu.");
    router.push("/laporan/hutangku");
  };

  const handleCekOmset = () => {
    if (!localStorage.getItem("token")) return alert("Silakan login terlebih dahulu.");
    router.push("/laporan/omsetku");
  };

  const handleCekOrderanku = () => {
    if (!localStorage.getItem("token")) return alert("Silakan login terlebih dahulu.");
    router.push("/laporan/laporanpo");
  };

  const handleStokOpname = () => {
    if (!localStorage.getItem("token")) return alert("Silakan login terlebih dahulu.");
    if (!isAdmin) {
      return alert("Akses ditolak. Menu Stok Opname hanya khusus untuk Admin.");
    }
    router.push("/opname/halamanopname");
  };

  if (!isMounted) return null;

  return (
    <Layout>
      <div suppressHydrationWarning className="w-full">
        <div className="w-full max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-2 sm:py-6">
          {/* 1. HERO BANNER PENUH */}
          <section className="w-full bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 text-white rounded-xl p-3 sm:p-6 mb-4 sm:mb-8 shadow-sm relative overflow-hidden">
            <div className="w-full flex flex-col items-center relative z-10">
              {/* BARIS ATAS: BELANJA SEKARANG + ORDER KASIR (SEJAJAR RAPI) */}
              <div className="w-full max-w-md mb-2 sm:mb-3 grid grid-cols-2 gap-1.5 sm:gap-3">
                <Link
                  href="/products"
                  className="bg-white text-blue-700 px-3 py-2 rounded-lg font-bold hover:bg-blue-50 transition shadow-sm flex items-center justify-center gap-1.5 group text-[11px] sm:text-xs active:scale-95"
                >
                  <span>Belanja Sekarang</span>
                  <FiArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform shrink-0" />
                </Link>

                <button
                  type="button"
                  onClick={handleOrderKasir}
                  className="bg-cyan-400 hover:bg-cyan-300 text-slate-900 px-3 py-2 rounded-lg font-extrabold transition shadow-sm flex items-center justify-center gap-1.5 text-[11px] sm:text-xs active:scale-95"
                >
                  <FiMaximize className="w-3.5 h-3.5 shrink-0" />
                  <span>Order Kasir</span>
                </button>
              </div>

              {/* MENU UMUM (SEMUA USER) */}
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
                  onClick={handleCekPiutang}
                  className="bg-pink-600 hover:bg-pink-700 active:scale-95 text-white px-2 py-2 rounded-lg font-bold transition shadow-xs flex items-center justify-center gap-1.5 text-[11px] sm:text-xs"
                >
                  <FiFileText className="w-3.5 h-3.5 shrink-0" />
                  <span>CEK PIUTANG</span>
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
                  className="bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-white px-2 py-2 rounded-lg font-bold transition shadow-xs flex items-center justify-center gap-1.5 text-[11px] sm:text-xs"
                >
                  <FiShoppingBag className="w-3.5 h-3.5 shrink-0" />
                  <span>CEK ORDERANKU</span>
                </button>
              </div>

              {/* MENU KHUSUS ADMIN */}
              {isAdmin && (
                <div className="w-full mt-2.5 sm:mt-3.5 pt-2.5 sm:pt-3.5 border-t border-white/20">
                  <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-blue-100 mb-1.5 sm:mb-2 text-center sm:text-left">
                    Menu Khusus Admin
                  </p>
                  <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2.5">
                    <button
                      type="button"
                      onClick={handleStokOpname}
                      className="bg-purple-600 hover:bg-purple-700 active:scale-95 text-white px-2 py-2 rounded-lg font-bold transition shadow-xs flex items-center justify-center gap-1.5 text-[11px] sm:text-xs"
                    >
                      <FiClipboard className="w-3.5 h-3.5 shrink-0" />
                      <span>STOK OPNAME</span>
                    </button>

                    <Link
                      href="/laporan/labarugi"
                      className="bg-teal-500 hover:bg-teal-600 active:scale-95 text-white px-2 py-2 rounded-lg font-bold transition shadow-xs flex items-center justify-center gap-1.5 text-[11px] sm:text-xs"
                    >
                      <FiBarChart2 className="w-3.5 h-3.5 shrink-0" />
                      <span>LABA RUGI</span>
                    </Link>

                    <Link
                      href="/laporan/piutangaktif"
                      className="bg-sky-500 hover:bg-sky-600 active:scale-95 text-white px-2 py-2 rounded-lg font-bold transition shadow-xs flex items-center justify-center gap-1.5 text-[11px] sm:text-xs"
                    >
                      <FiUsers className="w-3.5 h-3.5 shrink-0" />
                      <span>PIUTANG ANGGOTA</span>
                    </Link>

                    <Link
                      href="/laporan/biayaoperasional"
                      className="bg-orange-600 hover:bg-orange-700 active:scale-95 text-white px-2 py-2 rounded-lg font-bold transition shadow-xs flex items-center justify-center gap-1.5 text-[11px] sm:text-xs"
                    >
                      <FiCreditCard className="w-3.5 h-3.5 shrink-0" />
                      <span>BIAYA OPS</span>
                    </Link>

                    <Link
                      href="/laporan/pendapatanlain"
                      className="bg-lime-600 hover:bg-lime-700 active:scale-95 text-white px-2 py-2 rounded-lg font-bold transition shadow-xs flex items-center justify-center gap-1.5 text-[11px] sm:text-xs"
                    >
                      <FiTrendingUp className="w-3.5 h-3.5 shrink-0" />
                      <span>PENDAPATAN LAIN</span>
                    </Link>

                    <Link
                      href="/laporan/hutangsupplier"
                      className="bg-rose-600 hover:bg-rose-700 active:scale-95 text-white px-2 py-2 rounded-lg font-bold transition shadow-xs flex items-center justify-center gap-1.5 text-[11px] sm:text-xs"
                    >
                      <FiTruck className="w-3.5 h-3.5 shrink-0" />
                      <span>HUTANG SUPPLIER</span>
                    </Link>

                    <Link
                      href="/pengaturan-wa"
                      className="bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white px-2 py-2 rounded-lg font-bold transition shadow-xs flex items-center justify-center gap-1.5 text-[11px] sm:text-xs"
                    >
                      <FiMessageCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>NOMOR WA ADMIN</span>
                    </Link>

                    <Link
                      href="/users"
                      className="bg-violet-600 hover:bg-violet-700 active:scale-95 text-white px-2 py-2 rounded-lg font-bold transition shadow-xs flex items-center justify-center gap-1.5 text-[11px] sm:text-xs"
                    >
                      <FiUserCheck className="w-3.5 h-3.5 shrink-0" />
                      <span>DATA USERS</span>
                    </Link>

                    <Link
                      href="/detail-barang"
                      className="col-span-2 sm:col-span-1 bg-cyan-600 hover:bg-cyan-700 active:scale-95 text-white px-2 py-2 rounded-lg font-bold transition shadow-xs flex items-center justify-center gap-1.5 text-[11px] sm:text-xs"
                    >
                      <FiPackage className="w-3.5 h-3.5 shrink-0" />
                      <span>DETAIL BARANG</span>
                    </Link>
                  </div>
                </div>
              )}
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
            ) : needsLogin ? (
              <div className="text-center py-8 px-4 bg-white rounded-xl border border-gray-100 shadow-xs">
                <p className="text-xs sm:text-sm text-gray-600 mb-3">
                  Silakan login terlebih dahulu untuk melihat daftar produk terbaru.
                </p>
                <Link
                  href="/login"
                  className="inline-block bg-blue-600 text-white px-5 py-2 rounded-lg text-xs sm:text-sm font-semibold hover:bg-blue-700 transition"
                >
                  Login Sekarang
                </Link>
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
              <div className="w-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
                {newProducts.map((product) => (
                  <ProductCard
                    key={product.kd_br}
                    product={product}
                    isFavorite={favoriteKdBrs.has(product.kd_br)}
                    onToggleFavorite={handleToggleFavorite}
                    onSelectProduct={setSelectedProduct}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Modal Detail Produk + Rekomendasi */}
      <ProductDetailModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onSelectProduct={setSelectedProduct}
      />
    </Layout>
  );
}