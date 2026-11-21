"use client";

import { useState, useEffect, useRef } from "react";
import Layout from "@/components/Layout";
import ProductCard, { Barang } from "@/components/ProductCard";
import ProductDetailModal from "@/components/ProductDetailModal";
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

function seededRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function shuffleWithSeed<T>(list: T[], seed: number): T[] {
  const arr = [...list];
  const rand = seededRandom(seed);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function createFreshSeed(): number {
  const now = new Date();
  const dailyPart =
    now.getFullYear() * 10000 +
    (now.getMonth() + 1) * 100 +
    now.getDate();
  const refreshPart = Math.floor(Math.random() * 10000) + 1;
  return dailyPart + refreshPart;
}

export default function ProductsPage() {
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [products, setProducts] = useState<Barang[]>([]);
  const [jenisProdukList, setJenisProdukList] = useState<JenisProduk[]>([]);
  const [favoriteKdBrs, setFavoriteKdBrs] = useState<Set<string>>(new Set());
  const [loadingProducts, setLoadingProducts] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [errorProducts, setErrorProducts] = useState<string>("");
  const [selectedProduct, setSelectedProduct] = useState<Barang | null>(null);

  // State Pencarian & Filter
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [selectedKet, setSelectedKet] = useState<string>("");
  const [selectedKd, setSelectedKd] = useState<string>("");

  // Seed & halaman awal acak otomatis setiap kali halaman dibuka / di-refresh & setiap hari
  const [freshSeed, setFreshSeed] = useState<number>(() => createFreshSeed());
  const [startPageOffset, setStartPageOffset] = useState<number>(
    () => (createFreshSeed() % 35) + 1
  );

  // State efek bayangan sticky search bar saat di-scroll
  const [isScrolled, setIsScrolled] = useState<boolean>(false);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 30,
    total: null,
    total_pages: 1,
  });

  const loadMoreRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const rawApiUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://103.125.42.217:8081/api";
  const apiUrl = rawApiUrl.replace(/\/$/, "");

  useEffect(() => {
    setIsMounted(true);
    const newSeed = createFreshSeed();
    setFreshSeed(newSeed);
    setStartPageOffset((newSeed % 35) + 1);
  }, []);

  // Tutup keyboard HP otomatis saat layar mulai di-scroll & aktifkan bayangan sticky bar
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 30);
      if (
        window.scrollY > 20 &&
        document.activeElement === searchInputRef.current
      ) {
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
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

    const fetchFavorites = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;
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
            setFavoriteKdBrs(
              new Set(
                resultFav.data.map(
                  (favItem: { kd_br: string }) => favItem.kd_br
                )
              )
            );
          }
        }
      } catch (err) {
        console.error("Gagal mengambil favorit:", err);
      }
    };

    fetchJenisProduk();
    fetchFavorites();
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
      if (currentPage === 1) {
        setLoadingProducts(true);
      } else {
        setLoadingMore(true);
      }
      setErrorProducts("");
      const token = localStorage.getItem("token");

      // Saat mencari atau memakai filter Harga/Gudang, mulai dari halaman 1 agar semua data ditemukan
      const isFiltering = Boolean(debouncedSearch || selectedKet || selectedKd);
      const effectiveStartPage = isFiltering ? 1 : startPageOffset;
      const pageToFetch = effectiveStartPage + (currentPage - 1);

      try {
        const searchParam = debouncedSearch
          ? `&search=${encodeURIComponent(debouncedSearch)}`
          : "";

        const ketParam = selectedKet
          ? `&ket=${encodeURIComponent(selectedKet)}`
          : "";

        let endpoint = `${apiUrl}/barangs?status=Digunakan&page=${pageToFetch}&limit=30${searchParam}${ketParam}`;

        if (selectedKd) {
          endpoint = `${apiUrl}/barangs/by-kd?kd=${encodeURIComponent(
            selectedKd
          )}&page=${pageToFetch}&limit=30${searchParam}${ketParam}`;
        }

        let resProducts = await fetch(endpoint, {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
        });

        if (!resProducts.ok && token) {
          resProducts = await fetch(endpoint, {
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
          });
        }

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

        // Acak urutan kartu secara otomatis saat tampilan katalog default (tidak sedang mencari)
        if (!debouncedSearch && prodList.length > 1) {
          prodList = shuffleWithSeed(prodList, freshSeed + currentPage);
        }

        if (currentPage === 1) {
          setProducts(prodList);
        } else {
          setProducts((prev) => {
            const existingIds = new Set(prev.map((item) => item.kd_br));
            const uniqueNew = prodList.filter(
              (item) => !existingIds.has(item.kd_br)
            );
            return [...prev, ...uniqueNew];
          });
        }

        const serverTotalPages =
          resultProducts.pagination?.total_pages ||
          resultProducts.meta?.last_page ||
          1;
        const remainingPages = Math.max(
          1,
          serverTotalPages - (effectiveStartPage - 1)
        );

        if (resultProducts.pagination) {
          setPagination({
            ...resultProducts.pagination,
            total_pages: remainingPages,
          });
        } else if (resultProducts.meta) {
          setPagination({
            page: currentPage,
            limit: resultProducts.meta.per_page || 30,
            total: resultProducts.meta.total || null,
            total_pages: remainingPages,
          });
        }
      } catch (err: any) {
        console.error("Gagal mengambil data produk:", err);
        setErrorProducts(err?.message || "Gagal terhubung ke server.");
      } finally {
        setLoadingProducts(false);
        setLoadingMore(false);
      }
    };

    fetchData();
  }, [
    isMounted,
    currentPage,
    debouncedSearch,
    selectedKet,
    selectedKd,
    freshSeed,
    startPageOffset,
    apiUrl,
  ]);

  // Infinite Scroll Observer
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

  const handleProductUpdated = (updatedProduct: Barang) => {
    setProducts((prev) =>
      prev.map((item) =>
        item.kd_br === updatedProduct.kd_br
          ? { ...item, ...updatedProduct }
          : item
      )
    );
  };

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

  // Tutup keyboard HP saat tombol Cari / Enter ditekan
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    searchInputRef.current?.blur();
    setDebouncedSearch(searchQuery);
    setCurrentPage(1);
  };

  const handleFilterKet = (ketValue: string) => {
    searchInputRef.current?.blur();
    setSelectedKet(ketValue);
    setCurrentPage(1);
  };

  const handleFilterKd = (kdValue: string) => {
    searchInputRef.current?.blur();
    setSelectedKd(kdValue);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    searchInputRef.current?.blur();
    const newSeed = createFreshSeed();
    setSelectedKet("");
    setSelectedKd("");
    setSearchQuery("");
    setFreshSeed(newSeed);
    setStartPageOffset((newSeed % 35) + 1);
    setCurrentPage(1);
  };

  if (!isMounted) return null;

  const hasActiveFilter = Boolean(selectedKet || selectedKd || searchQuery);

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
            <span>Daftar Produk</span>
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

        {/* 2. KOTAK PENCARIAN STICKY */}
        <div
          className={`sticky top-14 sm:top-16 z-30 -mx-2.5 px-2.5 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 py-1.5 transition-all duration-150 ${
            isScrolled
              ? "bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-200/80"
              : "bg-gray-50/90 backdrop-blur-xs"
          }`}
        >
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
              <FiSearch className="w-4 h-4" />
            </span>
            <input
              ref={searchInputRef}
              type="search"
              enterKeyHint="search"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Cari nama, barcode, harga..."
              className="w-full pl-9 pr-20 py-1.5 sm:py-2 bg-white border border-gray-300 rounded-xl text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition shadow-xs [&::-webkit-search-cancel-button]:hidden"
            />
            <div className="absolute inset-y-0 right-0 flex items-center gap-1 pr-1.5">
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    searchInputRef.current?.blur();
                  }}
                  aria-label="Hapus pencarian"
                  className="p-1 text-gray-400 hover:text-gray-600"
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
        </div>

        {/* 3. BARIS FILTER RINGKAS (Harga & Gudang saja, tanpa menu tambahan) */}
        <div className="bg-white px-2.5 py-2 sm:p-3 rounded-xl shadow-xs border border-gray-100 mt-1.5 mb-3 space-y-1.5">
          {/* Baris Filter Harga */}
          <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <span className="text-[11px] font-bold text-blue-600 shrink-0 mr-0.5 flex items-center gap-1 min-w-[54px]">
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
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {getKetIcon(item.value)}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Baris Filter Gudang */}
          <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <span className="text-[11px] font-bold text-emerald-600 shrink-0 mr-0.5 flex items-center gap-1 min-w-[54px]">
              <FiLayers className="w-3 h-3" /> Gudang:
            </span>
            <button
              type="button"
              onClick={() => handleFilterKd("")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-semibold whitespace-nowrap shrink-0 transition active:scale-95 ${
                selectedKd === ""
                  ? "bg-emerald-600 text-white shadow-xs"
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
                      ? "bg-emerald-600 text-white shadow-xs"
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

        {/* 4. KONTEN PRODUK */}
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
              Produk tidak ditemukan.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4 mb-6">
              {products.map((product) => (
                <ProductCard
                  key={product.kd_br}
                  product={product}
                  isFavorite={favoriteKdBrs.has(product.kd_br)}
                  onToggleFavorite={handleToggleFavorite}
                  onProductUpdated={handleProductUpdated}
                  onSelectProduct={setSelectedProduct}
                />
              ))}
            </div>

            {/* Sentinel Infinite Scroll */}
            <div ref={loadMoreRef} className="py-6 flex justify-center">
              {loadingMore ? (
                <div className="flex items-center gap-2 text-xs text-blue-600 font-semibold">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  <span>Memuat produk lainnya...</span>
                </div>
              ) : currentPage >= pagination.total_pages ? (
                <span className="text-xs text-gray-400">
                  Semua produk sudah ditampilkan.
                </span>
              ) : null}
            </div>
          </>
        )}
      </main>

      {/* Modal Detail Produk + Rekomendasi */}
      <ProductDetailModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onSelectProduct={setSelectedProduct}
      />
    </Layout>
  );
}