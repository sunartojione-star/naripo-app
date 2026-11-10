"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import Layout from "@/components/Layout";
import { FiTrash2, FiArrowLeft, FiSave, FiXCircle } from "react-icons/fi";

// Import Zustand Store
import { useCartStore } from "@/store/cartStore";

export default function CartPage() {
  const router = useRouter();
  const [deliveryDate, setDeliveryDate] = useState("");
  const [loading, setLoading] = useState(false);

  // State Informasi User / Pelanggan
  const [customerInfo, setCustomerInfo] = useState({
    nama: "CUSTOMER",
    alamat: "-",
    kota: "-",
    telepon: "-",
    kontak: "-",
    dept: "UTM",
    user: "ADMIN",
    kd_cus: "",
  });

  // Ambil state & fungsi dari Zustand
  const items = useCartStore((state: any) => state.items) || [];
  const removeFromCart = useCartStore((state: any) => state.removeFromCart);
  const updateQuantity = useCartStore((state: any) => state.updateQuantity);
  const updateVariant = useCartStore((state: any) => state.updateVariant);
  const clearCart = useCartStore((state: any) => state.clearCart);

  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://103.125.42.217:8081/api";

  // Helper pembuat Endpoint URL yang benar (Anti-Double /api/)
  const getEndpoint = (path: string) => {
    const cleanPath = path.replace(/^\//, "");
    const cleanApi = apiUrl.replace(/\/$/, "");
    return `${cleanApi}/${cleanPath}`;
  };

  // Set default tanggal hari ini & load data user saat komponen dimuat
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setDeliveryDate(today);

    try {
      const savedUserStr = localStorage.getItem("user");
      const localKdCus =
        localStorage.getItem("kd_cus") ||
        localStorage.getItem("kdCus") ||
        localStorage.getItem("customer_code") ||
        "";

      if (savedUserStr) {
        const savedUser = JSON.parse(savedUserStr);
        setCustomerInfo({
          nama: savedUser?.name || savedUser?.nama || "CUSTOMER",
          alamat: savedUser?.alamat || "JL. Cemara 34",
          kota: savedUser?.kota || "MATARAM",
          telepon: savedUser?.telepon || savedUser?.hp || "-",
          kontak: savedUser?.kontak || "-",
          dept: savedUser?.dept || "UTM",
          user: savedUser?.username || "ADMIN",
          kd_cus:
            savedUser?.kd_cus ||
            savedUser?.kdCus ||
            localKdCus ||
            savedUser?.username ||
            "A135",
        });
      } else if (localKdCus) {
        setCustomerInfo((prev) => ({ ...prev, kd_cus: localKdCus }));
      }
    } catch (err) {
      console.error("Gagal parse user data:", err);
    }
  }, []);

  const parsePrice = (price: any): number => {
    if (typeof price === "number") return price;
    if (typeof price === "string") {
      const clean = price.replace(/[^0-9.-]+/g, "");
      return parseFloat(clean) || 0;
    }
    return 0;
  };

  const totalItemCount = items.reduce((acc: number, item: any) => {
    const qty = item.quantity || item.qty || 1;
    return acc + qty;
  }, 0);

  const totalItemBaru = items.filter((item: any) => {
    const product = item.product || item;
    const ket = item.ket || product.ket || "";
    return String(ket).trim().toUpperCase() === "BARU";
  }).length;

  const subtotal = Math.round(
    items.reduce((acc: number, item: any) => {
      const product = item.product || item;
      const price = parsePrice(
        product.h_anggota || product.price || product.hpp
      );
      const qty = item.quantity || item.qty || 1;
      return acc + price * qty;
    }, 0)
  );

  // Fungsi Proses Pesanan (Simpan)
  const handleOrder = async () => {
    if (!deliveryDate) {
      alert("Pilih tanggal kirim terlebih dahulu");
      return;
    }

    const token =
      localStorage.getItem("token") || localStorage.getItem("auth_token");

    if (!token) {
      alert("Anda belum login. Silakan login terlebih dahulu.");
      router.push("/login");
      return;
    }

    if (items.length === 0) {
      alert("Keranjang masih kosong.");
      return;
    }

    setLoading(true);

    let activeKdCus =
      customerInfo.kd_cus ||
      localStorage.getItem("kd_cus") ||
      localStorage.getItem("kdCus") ||
      localStorage.getItem("customer_code");

    // Jika kd_cus kosong, fetch dari /me
    if (!activeKdCus) {
      try {
        const resMe = await fetch(getEndpoint("me"), {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });
        const dataMe = await resMe.json();
        const userData = dataMe?.data || dataMe?.user || dataMe;
        if (userData?.kd_cus) {
          activeKdCus = userData.kd_cus;
          localStorage.setItem("kd_cus", activeKdCus || "");
        }
      } catch (err) {
        console.error("Gagal mengambil data user /me:", err);
      }
    }

    if (!activeKdCus) {
      activeKdCus = "A135"; // Fallback aman
    }

    try {
      // STEP 1: Simpan Header PO Note (Jalur Bersih Anti-Double API)
      const headerPayload = {
        tgl: new Date().toISOString().split("T")[0],
        kd_cus: activeKdCus,
        total_po: subtotal,
        jam: new Date().toTimeString().split(" ")[0],
        nama_adm: customerInfo.user,
        kpb: customerInfo.nama,
        ket: deliveryDate,
        status: "PROSES ORDER",
        jenis: "Anggota",
      };

      const resHeader = await fetch(getEndpoint("po-note"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(headerPayload),
      });

      const resultHeader = await resHeader.json();

      if (!resHeader.ok || (!resultHeader.data && !resultHeader.no_tran)) {
        throw new Error(resultHeader.message || "Gagal membuat Header PO");
      }

      const noTran =
        resultHeader.data?.no_tran ||
        resultHeader.data?.id ||
        resultHeader.no_tran;

      // STEP 2: Simpan Detail Items secara Bulk
      const bulkPayload = {
        items: items.map((item: any, index: number) => {
          const product = item.product || item;
          const price = parsePrice(
            product.h_anggota || product.price || product.hpp
          );
          const qty = item.quantity || item.qty || 1;
          const kdBr = String(product.kd_br || product.kd || product.id || "");

          return {
            no_tran: noTran,
            NO_URUT: index + 1,
            KD_BR: kdBr,
            RASA: item.variant || "-",
            QTY: qty,
            SAT: product.satuan || product.sat || "PCS",
            harga: price,
            subtotal: price * qty,
            kd: product.kd,
            nama_br: product.nama || product.name || "",
          };
        }),
      };

      const resDetail = await fetch(getEndpoint("detail-po-plg/bulk"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(bulkPayload),
      });

      const resultDetail = await resDetail.json();

      if (!resDetail.ok) {
        throw new Error(
          resultDetail.message || "Gagal menyimpan detail items pesanan"
        );
      }

      alert(`Pesanan Berhasil Disimpan!\nNo. Transaksi: ${noTran}`);
      if (clearCart) clearCart();
      router.push("/laporan/laporanpo");
    } catch (error: any) {
      console.error("Error proses order:", error);
      alert(`Terjadi kesalahan: ${error.message || "Gagal memproses pesanan"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <Head>
        <title>Keranjang Belanja - Naripo</title>
      </Head>

      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-3 sm:py-6 min-h-screen text-xs font-sans">
        {/* Tab Header */}
        <div className="flex border-b border-slate-300 bg-slate-200 rounded-t-xl overflow-hidden mb-3">
          <div className="px-4 sm:px-5 py-2.5 bg-white text-blue-700 font-bold border-t-2 border-blue-600 shadow-sm text-xs sm:text-sm">
            Keranjang Belanja
          </div>
        </div>

        {items.length === 0 ? (
          <div className="bg-white rounded-b-xl p-8 sm:p-12 text-center shadow-sm border border-slate-200">
            <p className="text-slate-500 text-xs sm:text-sm mb-4">
              Keranjang belanja kosong, belum ada item yang dimasukkan.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition text-xs sm:text-sm"
            >
              <FiArrowLeft /> Kembali Belanja
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-b-xl shadow-sm border border-slate-200 p-3 sm:p-5 space-y-4">
            {/* TOP SECTION */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 pb-4 border-b border-slate-200">
              <div className="md:col-span-7 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-24 sm:w-28 text-slate-600 font-semibold text-[11px] sm:text-xs">
                    No Transaksi:
                  </span>
                  <input
                    type="text"
                    disabled
                    value="Auto (Sistem)"
                    className="bg-slate-100 border border-slate-300 rounded px-2.5 py-1 text-slate-500 font-mono text-[11px] sm:text-xs w-40 sm:w-48"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-24 sm:w-28 text-slate-600 font-semibold text-[11px] sm:text-xs">
                    Tanggal:
                  </span>
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="border border-slate-300 rounded px-2.5 py-1 text-slate-800 bg-white text-[11px] sm:text-xs w-40 sm:w-48"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-24 sm:w-28 text-slate-600 font-semibold text-[11px] sm:text-xs">
                    Pelanggan:
                  </span>
                  <input
                    type="text"
                    disabled
                    value={customerInfo.nama}
                    className="bg-slate-100 border border-slate-300 rounded px-2.5 py-1 font-semibold text-slate-700 text-[11px] sm:text-xs w-40 sm:w-48 truncate"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-24 sm:w-28 text-slate-600 font-semibold text-[11px] sm:text-xs">
                    Jenis:
                  </span>
                  <input
                    type="text"
                    disabled
                    value="Penjualan (Anggota)"
                    className="bg-slate-100 border border-slate-300 rounded px-2.5 py-1 text-slate-600 text-[11px] sm:text-xs w-40 sm:w-48"
                  />
                </div>
              </div>

              {/* KOTAK TOTAL ATAS */}
              <div className="md:col-span-5 bg-slate-50 p-3 sm:p-4 rounded-xl border border-slate-200 flex flex-col justify-center space-y-2 text-slate-700">
                <div className="flex justify-between items-center border-b border-slate-200 pb-1.5">
                  <span className="font-semibold text-slate-600 text-xs">
                    Total Item :
                  </span>
                  <span className="font-mono font-bold text-slate-800 text-xs sm:text-sm">
                    {totalItemCount.toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="font-bold text-blue-700 text-xs sm:text-sm">
                    Total Akhir :
                  </span>
                  <span className="font-mono font-extrabold text-blue-700 text-sm sm:text-base">
                    Rp {subtotal.toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-slate-200 text-[10px] sm:text-[11px] text-slate-500">
                  <span>
                    Item Baru: <strong>{totalItemBaru}</strong>
                  </span>
                  <span>
                    Item Urut: <strong>{items.length}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* TABEL ITEM BARANG (RESPONSIF) */}
            <div className="overflow-x-auto border border-slate-300 rounded-lg">
              <table className="w-full text-left border-collapse text-[11px] sm:text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-300 font-semibold">
                    <th className="p-2 border-r border-slate-300 w-8 text-center">
                      No
                    </th>
                    <th className="p-2 border-r border-slate-300 min-w-[120px]">
                      Keterangan / Nama Barang & Varian
                    </th>
                    <th className="p-2 border-r border-slate-300 w-28 sm:w-36 text-center">
                      Jumlah
                    </th>
                    <th className="p-2 border-r border-slate-300 w-16 text-center">
                      Satuan
                    </th>
                    <th className="p-2 border-r border-slate-300 w-24 sm:w-32 text-right">
                      Harga
                    </th>
                    <th className="p-2 border-r border-slate-300 w-24 sm:w-32 text-right">
                      Total
                    </th>
                    <th className="p-2 w-10 text-center">#</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {items.map((item: any, idx: number) => {
                    const product = item.product || item;
                    const price = parsePrice(
                      product.h_anggota || product.price || product.hpp
                    );
                    const qty = item.quantity || item.qty || 1;
                    const itemId =
                      product.kd_br || product.kd || product.id || idx;
                    const lineTotal = price * qty;

                    return (
                      <tr
                        key={idx}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="p-2 border-r border-slate-200 text-center text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="p-2 border-r border-slate-200">
                          <div className="font-semibold text-slate-800">
                            {product.nama || product.name}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[10px] text-slate-500">
                              Varian/Rasa:
                            </span>
                            <input
                              type="text"
                              value={item.variant || "-"}
                              onChange={(e) =>
                                updateVariant &&
                                updateVariant(itemId, e.target.value)
                              }
                              className="border border-slate-300 rounded px-1.5 py-0.5 text-[10px] w-32 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              placeholder="Isi varian..."
                            />
                          </div>
                        </td>
                        <td className="p-1 sm:p-2 border-r border-slate-200 text-center">
                          <div className="inline-flex items-center border border-slate-300 rounded bg-white shadow-sm">
                            <button
                              type="button"
                              onClick={() =>
                                updateQuantity &&
                                updateQuantity(itemId, Math.max(1, qty - 1))
                              }
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs"
                            >
                              -
                            </button>
                            <span className="w-8 sm:w-10 text-center font-mono font-bold text-slate-800 text-xs">
                              {qty}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                updateQuantity &&
                                updateQuantity(itemId, Math.min(9999, qty + 1))
                              }
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="p-2 border-r border-slate-200 text-center text-slate-600 font-medium">
                          {product.satuan || product.sat || "PCS"}
                        </td>
                        <td className="p-2 border-r border-slate-200 text-right font-mono text-slate-700">
                          {price.toLocaleString("id-ID")}
                        </td>
                        <td className="p-2 border-r border-slate-200 text-right font-mono font-bold text-slate-800">
                          {lineTotal.toLocaleString("id-ID")}
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              if (
                                window.confirm("Hapus item ini dari keranjang?")
                              ) {
                                removeFromCart && removeFromCart(itemId);
                              }
                            }}
                            className="text-red-500 hover:text-red-700 p-1"
                            title="Hapus Item"
                          >
                            <FiTrash2 className="w-3.5 h-3.5 mx-auto" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* BOTTOM SECTION */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 pt-2">
              <div className="md:col-span-7 space-y-2">
                <div className="flex items-center gap-2">
                  <label className="w-20 font-medium text-slate-700 text-xs">
                    Tgl Kirim :
                  </label>
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="border border-slate-300 rounded px-2.5 py-1 text-slate-800 bg-white text-xs w-40"
                  />
                </div>
              </div>

              <div className="md:col-span-5 bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex justify-between items-center text-xs text-slate-600">
                  <span>Sub Total Item:</span>
                  <span className="font-mono font-semibold">
                    {totalItemCount} item
                  </span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-300 pt-1 text-xs sm:text-sm font-extrabold text-blue-700">
                  <span>Total Akhir:</span>
                  <span className="font-mono text-sm sm:text-base">
                    Rp {subtotal.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
            </div>

            {/* ACTION BUTTONS BAR */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200 gap-2">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg border border-slate-300 transition flex items-center gap-1.5 text-xs sm:text-sm active:scale-95"
              >
                <FiXCircle /> Batal
              </button>

              <button
                type="button"
                onClick={handleOrder}
                disabled={loading}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-md transition flex items-center gap-1.5 disabled:bg-slate-400 text-xs sm:text-sm active:scale-95"
              >
                <FiSave /> {loading ? "MEMPROSES..." : "SIMPAN"}
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}