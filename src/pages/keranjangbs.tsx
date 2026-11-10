"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import Layout from "@/components/Layout";
import { FiTrash2, FiArrowLeft, FiSave, FiXCircle, FiMinus, FiPlus } from "react-icons/fi";
import { useCartStoreBS } from "@/store/cartStoreBS";

export default function CartPage() {
  const router = useRouter();
  const [keterangan, setKeterangan] = useState("");
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

  // Ambil state & fungsi dari Zustand BS
  const items = useCartStoreBS((state) => state.cartItems) || [];
  const removeFromCart = useCartStoreBS((state) => state.removeFromCart);
  const updateQty = useCartStoreBS((state) => state.updateQty);
  const clearCart = useCartStoreBS((state) => state.clearCart);

  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://103.125.42.217:8081/api";

  // Helper pembuat Endpoint URL yang benar (Anti-Double /api/)
  const getEndpoint = (path: string) => {
    const cleanPath = path.replace(/^\//, "");
    const cleanApi = apiUrl.replace(/\/$/, "");
    return `${cleanApi}/${cleanPath}`;
  };

  // Load data user dari localStorage
  useEffect(() => {
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

  const getValidPrice = (item: any, product: any): number => {
    const rawPrice =
      item.nilai_bs ||
      product.nilai_bs ||
      item.nilai_anggota ||
      product.nilai_anggota ||
      item.h_anggota ||
      product.h_anggota ||
      item.harga ||
      product.harga ||
      item.h_jual ||
      product.h_jual ||
      item.price ||
      product.price ||
      item.hpp ||
      product.hpp ||
      0;

    return parsePrice(rawPrice);
  };

  const totalItemCount = items.reduce((acc: number, item: any) => {
    const qty = item.quantity || item.qty || 1;
    return acc + qty;
  }, 0);

  const subtotal = Math.round(
    items.reduce((acc: number, item: any) => {
      const product = item.product || item;
      const price = getValidPrice(item, product);
      const qty = item.quantity || item.qty || 1;
      return acc + price * qty;
    }, 0)
  );

  // Fungsi Proses Pesanan
  const handleOrder = async () => {
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

        if (resMe.ok) {
          const dataMe = await resMe.json();
          const userData = dataMe?.data || dataMe?.user || dataMe;
          activeKdCus =
            userData?.kd_cus ||
            userData?.kdCus ||
            userData?.customer_code ||
            userData?.username;

          if (activeKdCus) {
            localStorage.setItem("kd_cus", activeKdCus);
          }
        }
      } catch (err) {
        console.error("Gagal mengambil data user /me:", err);
      }
    }

    // Fallback terakhir agar tidak error
    if (!activeKdCus) {
      activeKdCus = "A135";
    }

    let createdKdTran: number | null = null;

    try {
      const today = new Date().toISOString().split("T")[0];
      const roundedTotal = Math.round(subtotal);

      if (roundedTotal <= 0) {
        throw new Error("Total nilai transaksi tidak boleh 0 atau kosong.");
      }

      // STEP 1: Simpan Header BS_Cus
      const headerPayload = {
        tgl: today,
        kd_cus: String(activeKdCus).trim(),
        ket: keterangan ? keterangan : "Pesanan Barang Sisa (BS)",
        status_cek: "Sudah DiCek",
        nilai_sementara: roundedTotal,
        nilai_asli: roundedTotal,
      };

      const resHeader = await fetch(getEndpoint("BS_Cus"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(headerPayload),
      });

      const resultHeader = await resHeader.json();

      if (!resHeader.ok || !resultHeader.success) {
        throw new Error(resultHeader.message || "Gagal membuat Header BS Cus");
      }

      createdKdTran = resultHeader.data?.kd_tran || resultHeader.data?.id;

      if (!createdKdTran) {
        throw new Error(
          "Nomor transaksi (kd_tran) tidak ditemukan dari server."
        );
      }

      // STEP 2: Simpan Detail Items secara Bulk
      const bulkPayload = {
        items: items.map((item: any, index: number) => {
          const product = item.product || item;
          const price = getValidPrice(item, product);
          const qty = item.quantity || item.qty || 1;
          const kdBs = String(
            product.kd_bs || product.kd_br || product.kd || product.id || ""
          );

          return {
            kd_tran: createdKdTran,
            no_urut: index + 1,
            kd_bs: kdBs,
            qty: qty,
            nilai_bs: Math.round(price),
            subtotal: Math.round(price * qty),
            CEK: "OK",
          };
        }),
      };

      const resDetail = await fetch(getEndpoint("detail-bs-cus/bulk"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(bulkPayload),
      });

      const resultDetail = await resDetail.json();

      if (!resDetail.ok || !resultDetail.success) {
        throw new Error(
          resultDetail.message || "Gagal menyimpan rincian barang pesanan BS"
        );
      }

      alert(
        `Pesanan BS Berhasil Disimpan!\nNo. Transaksi (kd_tran): ${createdKdTran}\nPelanggan: ${activeKdCus}\nTotal: Rp ${roundedTotal.toLocaleString(
          "id-ID"
        )}`
      );

      if (clearCart) clearCart();
      router.push("/BS/halamanBS");
    } catch (error: any) {
      console.error("Error proses order:", error);

      // Rollback jika header sempat terbuat tapi detail gagal
      if (createdKdTran) {
        try {
          await fetch(getEndpoint(`BS_Cus/${createdKdTran}/abort`), {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          });
        } catch (abortErr) {
          console.error("Gagal melakukan abort transaksi:", abortErr);
        }
      }

      alert(`Gagal menyimpan: ${error.message || "Terjadi kesalahan koneksi"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <Head>
        <title>Keranjang BS - Naripo</title>
      </Head>

      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-3 sm:py-6 min-h-screen text-xs font-sans">
        {/* Header Tab */}
        <div className="flex border-b border-slate-300 bg-slate-200 rounded-t-xl overflow-hidden mb-3">
          <div className="px-4 sm:px-5 py-2.5 bg-white text-blue-700 font-bold border-t-2 border-blue-600 shadow-sm text-xs sm:text-sm">
            Keranjang BS
          </div>
        </div>

        {items.length === 0 ? (
          <div className="bg-white rounded-b-xl p-8 sm:p-12 text-center shadow-sm border border-slate-200">
            <p className="text-slate-500 text-xs sm:text-sm mb-4">
              Keranjang BS kosong, belum ada item yang dimasukkan.
            </p>
            <Link
              href="/BS/halamanBS"
              className="inline-flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition text-xs sm:text-sm"
            >
              <FiArrowLeft /> Kembali ke Data BS
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-b-xl shadow-sm border border-slate-200 p-3 sm:p-5 space-y-4">
            {/* TOP SECTION INFO */}
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
                    Kode Cus:
                  </span>
                  <input
                    type="text"
                    disabled
                    value={customerInfo.kd_cus || "-"}
                    className="bg-slate-100 border border-slate-300 rounded px-2.5 py-1 text-blue-600 font-mono font-bold text-[11px] sm:text-xs w-40 sm:w-48"
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
              </div>
            </div>

            {/* TABEL ITEM (RESPONSIF & PAS DI HP) */}
            <div className="overflow-x-auto border border-slate-300 rounded-lg">
              <table className="w-full text-left border-collapse text-[11px] sm:text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-300 font-semibold">
                    <th className="p-2 border-r border-slate-300 w-8 text-center">
                      No
                    </th>
                    <th className="p-2 border-r border-slate-300 min-w-[120px]">
                      Keterangan / Nama BS
                    </th>
                    <th className="p-2 border-r border-slate-300 w-28 sm:w-36 text-center">
                      Jumlah
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
                    const price = getValidPrice(item, product);
                    const qty = item.quantity || item.qty || 1;
                    const itemId =
                      product.kd_bs ||
                      product.kd_br ||
                      product.kd ||
                      product.id ||
                      idx;
                    const lineTotal = price * qty;

                    return (
                      <tr
                        key={idx}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="p-2 border-r border-slate-200 text-center text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="p-2 border-r border-slate-200 font-medium text-slate-800">
                          {product.nama || product.name}
                        </td>
                        <td className="p-1 sm:p-2 border-r border-slate-200 text-center">
                          <div className="inline-flex items-center border border-slate-300 rounded bg-white shadow-sm">
                            <button
                              type="button"
                              onClick={() =>
                                updateQty &&
                                updateQty(itemId, Math.max(1, qty - 1))
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
                                updateQty &&
                                updateQty(itemId, Math.min(9999, qty + 1))
                              }
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs"
                            >
                              +
                            </button>
                          </div>
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
                <label className="block text-slate-700 font-semibold text-xs">
                  Catatan / Keterangan :
                </label>
                <textarea
                  rows={2}
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  placeholder="Catatan pesanan BS (opsional)..."
                  className="border border-slate-300 rounded-lg p-2 w-full text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                />
              </div>

              <div className="md:col-span-5 bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between items-center text-xs text-slate-600">
                  <span>Sub Total Item :</span>
                  <span className="font-mono font-semibold">
                    {totalItemCount} item
                  </span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-300 pt-1 text-xs sm:text-sm font-extrabold text-blue-700">
                  <span>Total Akhir :</span>
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
                <FiSave /> {loading ? "Menyimpan..." : "SIMPAN PESANAN"}
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}