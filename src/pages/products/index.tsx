// "use client";

// import { useState, useEffect } from "react";
// import { useRouter } from "next/navigation";
// import Layout from "@/components/Layout";
// import ProductCard, { Barang } from "@/components/ProductCard";
// import {
//   FiSearch,
//   FiBox,
//   FiFilter,
//   FiGrid,
//   FiCoffee,
//   FiPackage,
//   FiGift,
//   FiTool,
//   FiLayers,
// } from "react-icons/fi";

// interface PaginationMeta {
//   page: number;
//   limit: number;
//   total: number | null;
//   total_pages: number;
// }

// interface JenisProduk {
//   kd: string;
//   nama: string;
// }

// export default function ProductsPage() {
//   const [isMounted, setIsMounted] = useState<boolean>(false);
//   const [products, setProducts] = useState<Barang[]>([]);
//   const [jenisProdukList, setJenisProdukList] = useState<JenisProduk[]>([]);
//   const [favoriteKdBrs, setFavoriteKdBrs] = useState<Set<string>>(new Set());
//   const [loadingProducts, setLoadingProducts] = useState<boolean>(true);
//   const [errorProducts, setErrorProducts] = useState<string>("");

//   // State Pencarian & Filter
//   const [searchQuery, setSearchQuery] = useState<string>("");
//   const [debouncedSearch, setDebouncedSearch] = useState<string>("");
//   const [selectedKet, setSelectedKet] = useState<string>(""); // SAMA, NAIK, TURUN, BARU
//   const [selectedKd, setSelectedKd] = useState<string>(""); // Dari jenis_produk (kd)

//   const [currentPage, setCurrentPage] = useState<number>(1);
//   const [pagination, setPagination] = useState<PaginationMeta>({
//     page: 1,
//     limit: 30,
//     total: null,
//     total_pages: 1,
//   });

//   const router = useRouter();
//   const apiUrl =
//     process.env.NEXT_PUBLIC_API_URL || "http://103.125.42.217:8081/api";

//   // Pastikan komponen sudah termuat di browser (Mencegah Hydration Error)
//   useEffect(() => {
//     setIsMounted(true);
//   }, []);

//   // Helper untuk menentukan ikon menarik berdasarkan nama jenis produk
//   const getJenisProdukIcon = (nama: string) => {
//     const upperName = nama.toUpperCase();
//     if (upperName.includes("BISKUIT") || upperName.includes("MAKANAN"))
//       return <FiCoffee className="w-3.5 h-3.5" />;
//     if (upperName.includes("MINUMAN"))
//       return <FiCoffee className="w-3.5 h-3.5" />;
//     if (upperName.includes("PERALATAN") || upperName.includes("TOOL"))
//       return <FiTool className="w-3.5 h-3.5" />;
//     if (upperName.includes("HADIAH") || upperName.includes("GIFT"))
//       return <FiGift className="w-3.5 h-3.5" />;
//     if (
//       upperName.includes("ATAS") ||
//       upperName.includes("TENGAH") ||
//       upperName.includes("BAWAH")
//     )
//       return <FiLayers className="w-3.5 h-3.5" />;
//     return <FiPackage className="w-3.5 h-3.5" />; // Default icon
//   };

//   // Fetch daftar jenis produk untuk tombol filter dinamis
//   useEffect(() => {
//     if (!isMounted) return;

//     const fetchJenisProduk = async () => {
//       const token = localStorage.getItem("token");
//       try {
//         const res = await fetch(`${apiUrl}/jenis-produk`, {
//           headers: {
//             Accept: "application/json",
//             Authorization: token ? `Bearer ${token}` : "",
//           },
//         });
//         if (res.ok) {
//           const result = await res.json();
//           if (result.success && Array.isArray(result.data)) {
//             setJenisProdukList(result.data);
//           }
//         }
//       } catch (err) {
//         console.error("Gagal mengambil jenis produk:", err);
//       }
//     };

//     fetchJenisProduk();
//   }, [isMounted, apiUrl]);

//   // Debounce pencarian agar tidak spam request ke server
//   useEffect(() => {
//     const timer = setTimeout(() => {
//       setDebouncedSearch(searchQuery);
//       setCurrentPage(1); // Reset ke halaman 1 saat keyword pencarian berubah
//     }, 400);

//     return () => clearTimeout(timer);
//   }, [searchQuery]);

//   // Fetch daftar barang dari backend dengan parameter ket, kd, search, dan pagination
//   useEffect(() => {
//     if (!isMounted) return;

//     const fetchData = async () => {
//       setLoadingProducts(true);
//       const token = localStorage.getItem("token");

//       try {
//         const searchParam = debouncedSearch
//           ? `&search=${encodeURIComponent(debouncedSearch)}`
//           : "";

//         const ketParam = selectedKet
//           ? `&ket=${encodeURIComponent(selectedKet)}`
//           : "";

//         // Tentukan endpoint berdasarkan apakah filter kd dipilih (menggunakan /barangs/by-kd)
//         let endpoint = `${apiUrl}/barangs?status=Digunakan&page=${currentPage}&limit=30${searchParam}${ketParam}`;

//         if (selectedKd) {
//           endpoint = `${apiUrl}/barangs/by-kd?kd=${encodeURIComponent(selectedKd)}&page=${currentPage}&limit=30${searchParam}${ketParam}`;
//         }

//         const resProducts = await fetch(endpoint, {
//           headers: {
//             Accept: "application/json",
//             "Content-Type": "application/json",
//             Authorization: token ? `Bearer ${token}` : "",
//           },
//         });

//         if (!resProducts.ok) {
//           throw new Error(`Server Error (${resProducts.status})`);
//         }

//         const resultProducts = await resProducts.json();

//         let prodList = [];
//         if (Array.isArray(resultProducts)) {
//           prodList = resultProducts;
//         } else if (
//           resultProducts.success &&
//           Array.isArray(resultProducts.data)
//         ) {
//           prodList = resultProducts.data;
//         } else if (Array.isArray(resultProducts.data)) {
//           prodList = resultProducts.data;
//         }

//         setProducts(prodList);

//         // Ambil metadata pagination dari backend Laravel
//         if (resultProducts.pagination) {
//           setPagination(resultProducts.pagination);
//         } else if (resultProducts.meta) {
//           setPagination({
//             page: resultProducts.meta.current_page || currentPage,
//             limit: resultProducts.meta.per_page || 30,
//             total: resultProducts.meta.total || null,
//             total_pages: resultProducts.meta.last_page || 1,
//           });
//         }

//         // Get Favorit User (jika sudah login)
//         if (token) {
//           const resFav = await fetch(`${apiUrl}/favorites`, {
//             headers: {
//               Accept: "application/json",
//               Authorization: `Bearer ${token}`,
//             },
//           });

//           if (resFav.ok) {
//             const resultFav = await resFav.json();
//             if (resultFav.success && Array.isArray(resultFav.data)) {
//               const favSet = new Set<string>(
//                 resultFav.data.map(
//                   (favItem: { kd_br: string }) => favItem.kd_br,
//                 ),
//               );
//               setFavoriteKdBrs(favSet);
//             }
//           }
//         }
//       } catch (err: any) {
//         console.error("Gagal mengambil data:", err);
//         setErrorProducts(err?.message || "Gagal terhubung ke server.");
//       } finally {
//         setLoadingProducts(false);
//       }
//     };

//     fetchData();
//   }, [
//     isMounted,
//     currentPage,
//     debouncedSearch,
//     selectedKet,
//     selectedKd,
//     apiUrl,
//   ]);

//   // Handler toggle favorit
//   const handleToggleFavorite = async (product: Barang) => {
//     const token = localStorage.getItem("token");
//     if (!token) {
//       alert("Silakan login terlebih dahulu untuk menambah ke favorit.");
//       return;
//     }

//     try {
//       const response = await fetch(`${apiUrl}/favorites/toggle`, {
//         method: "POST",
//         headers: {
//           Accept: "application/json",
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${token}`,
//         },
//         body: JSON.stringify({
//           kd_br: product.kd_br,
//           nama: product.nama,
//           satuan: product.satuan,
//           h_anggota: product.h_anggota,
//           kd: product.kd,
//           ket: product.ket,
//           gambar: product.gambar,
//         }),
//       });

//       const result = await response.json();

//       if (response.ok && result.success) {
//         setFavoriteKdBrs((prevSet) => {
//           const newSet = new Set(prevSet);
//           if (result.data.is_favorite) {
//             newSet.add(product.kd_br);
//           } else {
//             newSet.delete(product.kd_br);
//           }
//           return newSet;
//         });
//       } else {
//         alert(result.message || "Gagal memperbarui favorit.");
//       }
//     } catch (err) {
//       console.error("Error toggle favorit:", err);
//     }
//   };

//   const handlePageChange = (newPage: number) => {
//     if (newPage >= 1 && newPage <= pagination.total_pages) {
//       setCurrentPage(newPage);
//       window.scrollTo({ top: 0, behavior: "smooth" });
//     }
//   };

//   const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     setSearchQuery(e.target.value);
//   };

//   const handleFilterKet = (ketValue: string) => {
//     setSelectedKet(ketValue);
//     setCurrentPage(1);
//   };

//   const handleFilterKd = (kdValue: string) => {
//     setSelectedKd(kdValue);
//     setCurrentPage(1);
//   };

//   if (!isMounted) return null;

//   return (
//     <Layout>
//       <main
//         className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
//         suppressHydrationWarning
//       >
//         {/* Header Title & Search Bar */}
//         <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4 border-b pb-6">
//           <div>
//             <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
//               <FiBox className="text-blue-600" /> Daftar Produk
//             </h1>
//             <p className="text-sm text-gray-500 mt-1">
//               Menampilkan produk aktif (Status: Digunakan).
//             </p>
//           </div>

//           {/* Kotak Pencarian */}
//           <div className="relative w-full md:w-80">
//             <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
//               <FiSearch className="w-4 h-4" />
//             </span>
//             <input
//               type="text"
//               value={searchQuery}
//               onChange={handleSearchChange}
//               placeholder="Cari nama, barcode, harga, ket..."
//               className="w-full pl-9 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition shadow-sm"
//             />
//           </div>
//         </div>

//         {/* Filter Kategori Keterangan (ket) */}
//         <div className="flex flex-wrap items-center gap-2 mb-4">
//           <span className="text-sm font-medium text-gray-700 flex items-center gap-1.5 mr-2">
//             <FiFilter className="w-4 h-4 text-blue-600" /> Filter Ket:
//           </span>
//           {[
//             { label: "Semua", value: "" },
//             { label: "SAMA", value: "SAMA" },
//             { label: "NAIK", value: "NAIK" },
//             { label: "TURUN", value: "TURUN" },
//             { label: "BARU", value: "BARU" },
//           ].map((item) => (
//             <button
//               key={item.value}
//               onClick={() => handleFilterKet(item.value)}
//               className={`px-4 py-1.5 text-xs font-semibold rounded-full border transition ${
//                 selectedKet === item.value
//                   ? "bg-blue-600 text-white border-blue-600 shadow-sm"
//                   : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
//               }`}
//             >
//               {item.label}
//             </button>
//           ))}
//         </div>

//         {/* Filter Berdasarkan Jenis Produk (kd) dengan Ikon Menarik */}
//         <div className="flex flex-wrap items-center gap-2 mb-6">
//           <span className="text-sm font-medium text-gray-700 flex items-center gap-1.5 mr-2">
//             <FiFilter className="w-4 h-4 text-emerald-600" /> Filter Jenis
//             Produk:
//           </span>

//           {/* Tombol "Semua" */}
//           <button
//             onClick={() => handleFilterKd("")}
//             className={`px-3.5 py-1.5 text-xs font-semibold rounded-full border transition flex items-center gap-1.5 ${
//               selectedKd === ""
//                 ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
//                 : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
//             }`}
//           >
//             <FiGrid className="w-3.5 h-3.5" /> Semua
//           </button>

//           {/* Tombol Kategori dari API dengan Ikon Pendukung */}
//           {jenisProdukList.map((item) => {
//             const cleanKd = item.kd.trim();
//             const isSelected = selectedKd === cleanKd;
//             return (
//               <button
//                 key={item.kd}
//                 onClick={() => handleFilterKd(cleanKd)}
//                 className={`px-3.5 py-1.5 text-xs font-semibold rounded-full border transition flex items-center gap-1.5 ${
//                   isSelected
//                     ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
//                     : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
//                 }`}
//               >
//                 {getJenisProdukIcon(item.nama)}
//                 <span>{item.nama}</span>
//               </button>
//             );
//           })}
//         </div>

//         {/* Informasi Jumlah Halaman / Hasil */}
//         {!loadingProducts && !errorProducts && (
//           <div className="flex justify-between items-center mb-6">
//             <span className="text-sm text-gray-500 font-medium">
//               Menampilkan Halaman {pagination.page} dari{" "}
//               {pagination.total_pages}{" "}
//               {pagination.total ? `(Total ${pagination.total} produk)` : ""}
//             </span>
//             <span className="text-sm text-gray-500 font-medium">
//               30 Item per Halaman
//             </span>
//           </div>
//         )}

//         {/* Konten Produk */}
//         {loadingProducts ? (
//           <div className="flex justify-center items-center py-20">
//             <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
//           </div>
//         ) : errorProducts ? (
//           <div className="p-4 bg-red-50 text-red-600 rounded-md text-center">
//             {errorProducts}
//           </div>
//         ) : products.length === 0 ? (
//           <div className="text-center py-20 bg-white rounded-lg shadow-sm border p-8">
//             <FiBox className="mx-auto h-12 w-12 text-gray-300 mb-3" />
//             <p className="text-gray-600 font-medium">Produk tidak ditemukan.</p>
//           </div>
//         ) : (
//           <>
//             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
//               {products.map((product) => (
//                 <ProductCard
//                   key={product.kd_br}
//                   product={product}
//                   isFavorite={favoriteKdBrs.has(product.kd_br)}
//                   onToggleFavorite={handleToggleFavorite}
//                 />
//               ))}
//             </div>

//             {/* Pagination Controls */}
//             {pagination.total_pages > 1 && (
//               <div className="flex items-center justify-center gap-2 pt-6 border-t border-gray-200">
//                 <button
//                   onClick={() => handlePageChange(currentPage - 1)}
//                   disabled={currentPage === 1}
//                   className="px-4 py-2 text-sm font-medium border rounded-md bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
//                 >
//                   ← Sebelumnya
//                 </button>

//                 <div className="flex gap-1">
//                   {Array.from(
//                     { length: pagination.total_pages },
//                     (_, i) => i + 1,
//                   )
//                     .filter(
//                       (p) =>
//                         p === 1 ||
//                         p === pagination.total_pages ||
//                         Math.abs(p - currentPage) <= 1,
//                     )
//                     .map((p, idx, array) => {
//                       const showEllipsis = idx > 0 && p - array[idx - 1] > 1;
//                       return (
//                         <div key={p} className="flex items-center">
//                           {showEllipsis && (
//                             <span className="px-2 text-gray-400">...</span>
//                           )}
//                           <button
//                             onClick={() => handlePageChange(p)}
//                             className={`px-3.5 py-2 text-sm font-semibold rounded-md border transition ${
//                               currentPage === p
//                                 ? "bg-blue-600 text-white border-blue-600"
//                                 : "bg-white text-gray-700 hover:bg-gray-50 border-gray-300"
//                             }`}
//                           >
//                             {p}
//                           </button>
//                         </div>
//                       );
//                     })}
//                 </div>

//                 <button
//                   onClick={() => handlePageChange(currentPage + 1)}
//                   disabled={currentPage >= pagination.total_pages}
//                   className="px-4 py-2 text-sm font-medium border rounded-md bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
//                 >
//                   Selanjutnya →
//                 </button>
//               </div>
//             )}
//           </>
//         )}
//       </main>
//     </Layout>
//   );
// }

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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

  // Pastikan komponen sudah termuat di browser (Mencegah Hydration Error)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Helper untuk menentukan ikon menarik berdasarkan nama jenis produk
  const getJenisProdukIcon = (nama: string) => {
    const upperName = nama.toUpperCase();
    if (upperName.includes("BISKUIT") || upperName.includes("MAKANAN"))
      return <FiCoffee className="w-4 h-4" />;
    if (upperName.includes("MINUMAN")) return <FiCoffee className="w-4 h-4" />;
    if (upperName.includes("PERALATAN") || upperName.includes("TOOL"))
      return <FiTool className="w-4 h-4" />;
    if (upperName.includes("HADIAH") || upperName.includes("GIFT"))
      return <FiGift className="w-4 h-4" />;
    if (
      upperName.includes("ATAS") ||
      upperName.includes("TENGAH") ||
      upperName.includes("BAWAH")
    )
      return <FiLayers className="w-4 h-4" />;
    return <FiPackage className="w-4 h-4" />;
  };

  // Helper untuk ikon Filter Ket
  const getKetIcon = (val: string) => {
    switch (val) {
      case "":
        return <FiGrid className="w-4 h-4" />;
      case "SAMA":
        return <FiRefreshCw className="w-4 h-4" />;
      case "NAIK":
        return <FiTrendingUp className="w-4 h-4" />;
      case "TURUN":
        return <FiTrendingUp className="w-4 h-4 rotate-180" />;
      case "BARU":
        return <FiPlusCircle className="w-4 h-4" />;
      default:
        return <FiGrid className="w-4 h-4" />;
    }
  };

  // Fetch daftar jenis produk untuk tombol filter dinamis
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

  // Debounce pencarian agar tidak spam request ke server
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch daftar barang dari backend
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
          endpoint = `${apiUrl}/barangs/by-kd?kd=${encodeURIComponent(selectedKd)}&page=${currentPage}&limit=30${searchParam}${ketParam}`;
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
              <FiBox className="text-blue-600" /> Daftar Produk
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Menampilkan produk aktif (Status: Digunakan).
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
              placeholder="Cari nama, barcode, harga, ket..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition shadow-sm"
            />
          </div>
        </div>

        {/* CONTAINER KELOMPOK FILTER (Gaya Kapsul Modern & Kontras) */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 mb-8 space-y-4">
          {/* Filter Keterangan (ket) */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2 text-blue-600 font-semibold min-w-[150px]">
              <FiFilter className="w-4 h-4" />
              <span className="text-sm">Tampil Berdasarkan Harga :</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Semua", value: "" },
                { label: "SAMA", value: "SAMA" },
                { label: "NAIK", value: "NAIK" },
                { label: "TURUN", value: "TURUN" },
                { label: "BARU", value: "BARU" },
              ].map((item) => {
                const isActive = selectedKet === item.value;
                return (
                  <button
                    key={item.value}
                    onClick={() => handleFilterKet(item.value)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                        : "bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200"
                    }`}
                  >
                    {getKetIcon(item.value)}
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Filter Berdasarkan Jenis Produk (kd) */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2 text-emerald-600 font-semibold min-w-[150px]">
              <FiFilter className="w-4 h-4" />
              <span className="text-sm">Tampil Berdasarkan Gudang :</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {/* Tombol "Semua" */}
              <button
                onClick={() => handleFilterKd("")}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  selectedKd === ""
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-200"
                    : "bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200"
                }`}
              >
                <FiGrid className="w-4 h-4" /> Semua
              </button>

              {/* Tombol Kategori dari API */}
              {jenisProdukList.map((item) => {
                const cleanKd = item.kd.trim();
                const isSelected = selectedKd === cleanKd;
                return (
                  <button
                    key={item.kd}
                    onClick={() => handleFilterKd(cleanKd)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                      isSelected
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-200"
                        : "bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200"
                    }`}
                  >
                    {getJenisProdukIcon(item.nama)}
                    <span>{item.nama}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Informasi Jumlah Halaman / Hasil */}
        {!loadingProducts && !errorProducts && (
          <div className="flex justify-between items-center mb-6">
            <span className="text-sm text-gray-500 font-medium">
              Menampilkan Halaman {pagination.page} dari{" "}
              {pagination.total_pages}{" "}
              {pagination.total ? `(Total ${pagination.total} produk)` : ""}
            </span>
            <span className="text-sm text-gray-500 font-medium">
              30 Item per Halaman
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
            <p className="text-gray-600 font-medium">Produk tidak ditemukan.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
              {products.map((product) => (
                <ProductCard
                  key={product.kd_br}
                  product={product}
                  isFavorite={favoriteKdBrs.has(product.kd_br)}
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
