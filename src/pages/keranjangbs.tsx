"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Head from "next/head";
import Link from "next/link";
import { FiTrash2, FiArrowLeft, FiSave, FiXCircle } from "react-icons/fi";
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

  // Ambil state & fungsi dari Zustand BS secara lengkap
  const items = useCartStoreBS((state) => state.cartItems) || [];
  const removeFromCart = useCartStoreBS((state) => state.removeFromCart);
  const updateQty = useCartStoreBS((state) => state.updateQty);
  const clearCart = useCartStoreBS((state) => state.clearCart);

  // Load data user saat komponen dimuat (termasuk pengecekan multi-key localStorage)
  useEffect(() => {
    try {
      const savedUserStr = localStorage.getItem("user");
      // Cek berbagai kemungkinan key localStorage untuk kd_cus
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
          kd_cus: savedUser?.kd_cus || savedUser?.kdCus || localKdCus,
        });
      } else if (localKdCus) {
        setCustomerInfo((prev) => ({ ...prev, kd_cus: localKdCus }));
      }
    } catch (err) {
      console.error("Gagal parse user data:", err);
    }
  }, []);

  // Helper parser harga universal
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

  // Hitung total kuantitas item
  const totalItemCount = items.reduce((acc: number, item: any) => {
    const qty = item.quantity || item.qty || 1;
    return acc + qty;
  }, 0);

  // Hitung subtotal & total akhir
  const subtotal = Math.round(
    items.reduce((acc: number, item: any) => {
      const product = item.product || item;
      const price = getValidPrice(item, product);
      const qty = item.quantity || item.qty || 1;
      return acc + price * qty;
    }, 0),
  );

  // Fungsi Proses Pesanan (Simpan Header & Bulk Detail)
  const handleOrder = async () => {
    const token =
      localStorage.getItem("token") || localStorage.getItem("auth_token");

    if (!token) {
      alert("Anda belum login. Silakan login terlebih dahulu.");
      router.push("/login");
      return;
    }

    setLoading(true);

    const baseUrl = (
      process.env.NEXT_PUBLIC_API_URL || "http://103.125.42.217:8081/api"
    ).replace(/\/$/, "");

    // Ambil kd_cus dari state, atau fallback ke berbagai variasi key di localStorage
    let activeKdCus =
      customerInfo.kd_cus ||
      localStorage.getItem("kd_cus") ||
      localStorage.getItem("kdCus") ||
      localStorage.getItem("customer_code");

    // Jika kd_cus masih kosong, wajib fetch dari endpoint /me backend
    if (!activeKdCus) {
      try {
        const endpointMe = baseUrl.endsWith("/api")
          ? `${baseUrl}/me`
          : `${baseUrl}/api/me`;

        const resMe = await fetch(endpointMe, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });

        if (resMe.ok) {
          const dataMe = await resMe.json();
          const userData = dataMe?.data || dataMe?.user || dataMe;
          activeKdCus =
            userData?.kd_cus || userData?.kdCus || userData?.customer_code;

          if (activeKdCus) {
            localStorage.setItem("kd_cus", activeKdCus);
          }
        }
      } catch (err) {
        console.error("Gagal mengambil data user /me:", err);
      }
    }

    // Validasi akhir keberadaan kd_cus
    if (!activeKdCus) {
      alert(
        "Kode Customer (kd_cus) tidak ditemukan pada akun Anda. Pastikan Anda login dengan akun customer yang valid.",
      );
      setLoading(false);
      return;
    }

    let createdKdTran: number | null = null;

    try {
      const today = new Date().toISOString().split("T")[0];

      const finalTotal = items.reduce((acc: number, item: any) => {
        const product = item.product || item;
        const p = getValidPrice(item, product);
        const q = item.quantity || item.qty || 1;
        return acc + p * q;
      }, 0);

      const roundedTotal = Math.round(finalTotal);

      if (roundedTotal <= 0) {
        throw new Error("Total nilai transaksi tidak boleh 0 atau kosong.");
      }

      // STEP 1: Simpan Header BsCus dengan kd_cus yang valid dari user login
      const headerPayload = {
        tgl: today,
        kd_cus: String(activeKdCus).trim(),
        ket: keterangan ? keterangan : "Pesanan Barang Sisa (BS)",
        status_cek: "Sudah DiCek",
        nilai_sementara: roundedTotal,
        nilai_asli: roundedTotal,
      };

      console.log("Payload Header yang dikirim:", headerPayload);

      const endpointHeader = baseUrl.endsWith("/api")
        ? `${baseUrl}/BS_Cus`
        : `${baseUrl}/api/BS_Cus`;

      const resHeader = await fetch(endpointHeader, {
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
          "Primary key transaksi (kd_tran) tidak ditemukan dari response server.",
        );
      }

      // STEP 2: Simpan Detail Items secara Bulk
      const bulkPayload = {
        items: items.map((item: any, index: number) => {
          const product = item.product || item;
          const price = getValidPrice(item, product);
          const qty = item.quantity || item.qty || 1;
          const kdBs = String(
            product.kd_bs || product.kd_br || product.kd || product.id || "",
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

      const endpointDetail = baseUrl.endsWith("/api")
        ? `${baseUrl}/detail-bs-cus/bulk`
        : `${baseUrl}/api/detail-bs-cus/bulk`;

      const resDetail = await fetch(endpointDetail, {
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
          resultDetail.message || "Gagal menyimpan detail items pesanan BS",
        );
      }

      alert(
        `Pesanan BS Berhasil Disimpan!\nNo. Transaksi (kd_tran): ${createdKdTran}\nPelanggan (kd_cus): ${activeKdCus}\nTotal: Rp ${roundedTotal.toLocaleString("id-ID")}`,
      );
      if (clearCart) clearCart();
      router.push("/");
    } catch (error: any) {
      console.error("Error proses order:", error);

      if (createdKdTran) {
        try {
          const endpointAbort = baseUrl.endsWith("/api")
            ? `${baseUrl}/BS_Cus/${createdKdTran}/abort`
            : `${baseUrl}/api/BS_Cus/${createdKdTran}/abort`;

          await fetch(endpointAbort, {
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

      alert(`Terjadi kesalahan: ${error.message || "Gagal memproses pesanan"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Keranjang BS - Naripo</title>
      </Head>

      <div className="max-w-7xl mx-auto px-4 py-6 min-h-screen bg-slate-100 text-xs font-sans">
        <div className="flex border-b border-slate-300 bg-slate-200 rounded-t-lg overflow-hidden mb-4">
          <div className="px-5 py-2 bg-white text-blue-700 font-bold border-t-2 border-blue-600 shadow-sm">
            Keranjang BS
          </div>
        </div>

        {items.length === 0 ? (
          <div className="bg-white rounded-b-lg p-12 text-center shadow-sm border border-slate-200">
            <p className="text-slate-500 text-sm mb-4">
              Keranjang BS kosong, belum ada item yang dimasukkan.
            </p>
            <Link
              href="/BS/halamanBS"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded font-semibold hover:bg-blue-700 transition"
            >
              <FiArrowLeft /> Kembali Data BS
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-b-lg shadow-sm border border-slate-200 p-4 space-y-4">
            {/* TOP SECTION */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pb-4 border-b border-slate-200">
              <div className="md:col-span-7 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-28 text-slate-600 font-medium">
                    No Transaksi :
                  </span>
                  <input
                    type="text"
                    disabled
                    value="Auto (Sistem)"
                    className="bg-slate-100 border border-slate-300 rounded px-2 py-1 w-48 text-slate-500 font-mono"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-28 text-slate-600 font-medium">
                    Pelanggan :
                  </span>
                  <input
                    type="text"
                    disabled
                    value={customerInfo.nama}
                    className="bg-slate-100 border border-slate-300 rounded px-2 py-1 w-48 font-semibold text-slate-700"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-28 text-slate-600 font-medium">
                    Kode Cus :
                  </span>
                  <input
                    type="text"
                    disabled
                    value={customerInfo.kd_cus || "-"}
                    className="bg-slate-100 border border-slate-300 rounded px-2 py-1 w-48 text-slate-600 font-mono font-bold"
                  />
                </div>
              </div>

              {/* KOTAK KANAN ATAS */}
              <div className="md:col-span-5 bg-slate-50 p-4 rounded border border-slate-200 flex flex-col justify-center space-y-3 text-slate-700">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <span className="font-semibold text-slate-600">
                    Total Item :
                  </span>
                  <span className="font-mono font-bold text-slate-800 text-sm">
                    {totalItemCount.toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="font-bold text-blue-700 text-sm">
                    Total Akhir :
                  </span>
                  <span className="font-mono font-extrabold text-blue-700 text-sm">
                    Rp {subtotal.toLocaleString("id-ID")},00
                  </span>
                </div>
              </div>
            </div>

            {/* MIDDLE SECTION: Tabel Item */}
            <div className="overflow-x-auto border border-slate-300 rounded">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-200 text-slate-700 border-b border-slate-300 font-semibold">
                    <th className="p-2 border-r border-slate-300 w-12 text-center">
                      No
                    </th>
                    <th className="p-2 border-r border-slate-300">
                      Keterangan / Nama BS
                    </th>
                    <th className="p-2 border-r border-slate-300 w-36 text-center">
                      Jumlah
                    </th>
                    <th className="p-2 border-r border-slate-300 w-32 text-right">
                      Harga
                    </th>
                    <th className="p-2 border-r border-slate-300 w-32 text-right">
                      Total
                    </th>
                    <th className="p-2 w-16 text-center">Aksi</th>
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
                        <td className="p-2 border-r border-slate-200">
                          <div className="font-semibold text-slate-800">
                            {product.nama || product.name}
                          </div>
                        </td>
                        <td className="p-2 border-r border-slate-200 text-center">
                          <div className="inline-flex items-center border border-slate-300 rounded bg-white shadow-sm">
                            <button
                              type="button"
                              onClick={() =>
                                updateQty &&
                                updateQty(itemId, Math.max(1, qty - 1))
                              }
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold"
                            >
                              -
                            </button>
                            <input
                              type="text"
                              maxLength={4}
                              value={qty}
                              onChange={(e) => {
                                const val = e.target.value.replace(
                                  /[^0-9]/g,
                                  "",
                                );
                                if (val === "") {
                                  updateQty && updateQty(itemId, 1);
                                } else {
                                  const num = parseInt(val, 10);
                                  if (num <= 9999) {
                                    updateQty && updateQty(itemId, num);
                                  }
                                }
                              }}
                              className="w-12 text-center py-1 text-slate-800 font-semibold focus:outline-none bg-transparent"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                updateQty &&
                                updateQty(itemId, Math.min(9999, qty + 1))
                              }
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold"
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
                              const isConfirmed = window.confirm(
                                "Apakah anda yakin menghapus item bs ini?",
                              );
                              if (isConfirmed && removeFromCart) {
                                removeFromCart(itemId);
                              }
                            }}
                            className="text-red-500 hover:text-red-700 p-1 transition"
                            title="Hapus Item"
                          >
                            <FiTrash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* BOTTOM SECTION */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-2">
              <div className="md:col-span-7 space-y-3">
                <div className="flex items-start gap-3">
                  <label className="w-24 font-medium text-slate-700 pt-1">
                    Keterangan :
                  </label>
                  <textarea
                    rows={3}
                    value={keterangan}
                    onChange={(e) => setKeterangan(e.target.value)}
                    placeholder="Masukkan keterangan manual di sini..."
                    className="border border-slate-300 rounded px-2 py-1.5 w-full max-w-md text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="md:col-span-5 bg-slate-50 p-3 rounded border border-slate-200 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-medium">
                    Sub Total Item :
                  </span>
                  <span className="font-mono font-semibold">
                    {totalItemCount.toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-200 pt-1">
                  <span className="text-slate-700 font-bold">Sub Total :</span>
                  <span className="font-mono font-bold text-slate-800">
                    Rp {subtotal.toLocaleString("id-ID")},00
                  </span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-300 pt-1 text-sm font-extrabold text-blue-700">
                  <span>Total Akhir :</span>
                  <span className="font-mono">
                    Rp {subtotal.toLocaleString("id-ID")},00
                  </span>
                </div>
              </div>
            </div>

            {/* ACTION BUTTONS BAR */}
            <div className="flex flex-wrap items-center justify-between pt-4 border-t border-slate-200 gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded border border-slate-300 transition flex items-center gap-1.5"
                >
                  <FiXCircle /> Batal
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOrder}
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded shadow-sm transition flex items-center gap-1.5 disabled:bg-slate-400"
                >
                  <FiSave /> {loading ? "MEMPROSES..." : "SIMPAN"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
