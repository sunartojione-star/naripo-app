"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import Layout from "@/components/Layout";
import {
  FiArrowLeft,
  FiSave,
  FiMinus,
  FiPlus,
  FiShoppingBag,
  FiTrash2,
  FiEdit2,
  FiCheckCircle,
  FiX,
} from "react-icons/fi";
import { useCartStoreBS } from "@/store/cartStoreBS";

export default function KeranjangBSPage() {
  const router = useRouter();
  const [keterangan, setKeterangan] = useState("");
  const [loading, setLoading] = useState(false);

  // State Modal Popup Edit / Hapus
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

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

  const items = useCartStoreBS((state) => state.cartItems) || [];
  const removeFromCart = useCartStoreBS((state) => state.removeFromCart);
  const updateQty = useCartStoreBS((state) => state.updateQty);
  const clearCart = useCartStoreBS((state) => state.clearCart);

  const rawApiUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://103.125.42.217:8081/api";
  const apiUrl = rawApiUrl.replace(/\/$/, "");

  const getEndpoint = (path: string) => {
    const cleanPath = path.replace(/^\//, "");
    return `${apiUrl}/${cleanPath}`;
  };

  useEffect(() => {
    try {
      const savedUserStr = localStorage.getItem("user");
      const localKdCus =
        localStorage.getItem("kd_cus") ||
        localStorage.getItem("kdCus") ||
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
          kd_cus: savedUser?.kd_cus || localKdCus || savedUser?.username || "A135",
        });
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

  const handleOpenEditModal = (item: any, index: number) => {
    setSelectedItem(item);
    setSelectedIdx(index);
    setShowEditModal(true);
  };

  const handleDirectQtyChange = (itemId: any, val: string) => {
    const cleaned = val.replace(/\D/g, "");
    const newQty = cleaned === "" ? 1 : Math.max(1, parseInt(cleaned, 10));
    if (updateQty) updateQty(itemId, newQty);
  };

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
    let activeKdCus = customerInfo.kd_cus || "A135";
    let createdKdTran: number | null = null;

    try {
      const today = new Date().toISOString().split("T")[0];
      const roundedTotal = Math.round(subtotal);

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
        throw new Error(resultDetail.message || "Gagal menyimpan rincian pesanan BS");
      }

      alert(`Pesanan BS Berhasil Disimpan!\nNo. Transaksi: ${createdKdTran}\nTotal: Rp ${roundedTotal.toLocaleString("id-ID")}`);
      if (clearCart) clearCart();
      router.push("/BS/halamanBS");
    } catch (err: any) {
      alert(`Gagal menyimpan: ${err.message || "Terjadi kesalahan koneksi"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <Head>
        <title>Keranjang BS - Naripo</title>
      </Head>

      <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 py-3 sm:py-6 min-h-screen text-xs">
        {/* TAB ATAS & TOMBOL KEMBALI KE DAFTAR PRODUK */}
        <div className="flex items-center justify-between border-b border-slate-300 bg-slate-200 rounded-t-xl px-3 py-2 mb-3">
          <span className="font-bold text-amber-700 text-xs sm:text-sm">
            Keranjang BS (Barang Sisa)
          </span>

          <Link
            href="/products"
            className="inline-flex items-center gap-1.5 bg-white text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-lg font-bold border border-blue-200 shadow-xs text-xs active:scale-95 transition"
          >
            <FiShoppingBag className="w-3.5 h-3.5" />
            <span>+ Belanja Lagi (Daftar Produk)</span>
          </Link>
        </div>

        {items.length === 0 ? (
          <div className="bg-white rounded-b-xl p-8 sm:p-12 text-center shadow-xs border border-slate-200">
            <p className="text-slate-500 text-xs sm:text-sm mb-4">
              Keranjang BS kosong, belum ada item.
            </p>
            <Link
              href="/BS/halamanBS"
              className="inline-flex items-center gap-1.5 bg-blue-600 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-blue-700 transition text-xs sm:text-sm shadow-sm"
            >
              <FiArrowLeft /> Kembali ke Halaman BS
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-b-xl shadow-xs border border-slate-200 p-3 sm:p-5 space-y-4">
            {/* INFO PELANGGAN */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 pb-3 border-b border-slate-200">
              <div className="md:col-span-7 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-24 text-slate-500 font-medium">Pelanggan:</span>
                  <span className="font-bold text-slate-800">{customerInfo.nama}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-24 text-slate-500 font-medium">Kode Cus:</span>
                  <span className="font-mono font-bold text-blue-600">{customerInfo.kd_cus || "A135"}</span>
                </div>
              </div>

              <div className="md:col-span-5 bg-amber-50/60 p-3 rounded-xl border border-amber-100 flex flex-col justify-center">
                <div className="flex justify-between items-center text-xs text-slate-600 mb-1">
                  <span>Total Kuantitas:</span>
                  <span className="font-bold font-mono">{totalItemCount} item</span>
                </div>
                <div className="flex justify-between items-center text-xs sm:text-sm font-extrabold text-amber-800">
                  <span>Total Akhir:</span>
                  <span className="font-mono text-sm sm:text-base">Rp {subtotal.toLocaleString("id-ID")}</span>
                </div>
              </div>
            </div>

            {/* TABEL ITEM (TANPA KOLOM HAPUS, KLIK BARIS UNTUK POPUP EDIT/HAPUS) */}
            <div className="overflow-x-auto border border-slate-300 rounded-lg">
              <table className="w-full text-left border-collapse text-[11px] sm:text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-300 font-semibold">
                    <th className="p-2 border-r border-slate-300 w-8 text-center">No</th>
                    <th className="p-2 border-r border-slate-300 min-w-[120px]">
                      Keterangan / Nama BS (Klik untuk Edit/Hapus)
                    </th>
                    <th className="p-2 border-r border-slate-300 w-28 sm:w-36 text-center">Jumlah</th>
                    <th className="p-2 border-r border-slate-300 w-24 text-right">Harga</th>
                    <th className="p-2 w-24 text-right">Total</th>
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
                        className="hover:bg-amber-50/50 transition-colors cursor-pointer"
                      >
                        <td
                          onClick={() => handleOpenEditModal(item, idx)}
                          className="p-2 border-r border-slate-200 text-center text-slate-500 font-mono"
                        >
                          {idx + 1}
                        </td>

                        <td
                          onClick={() => handleOpenEditModal(item, idx)}
                          className="p-2 border-r border-slate-200 font-semibold text-slate-800"
                          title="Klik untuk Edit Qty atau Hapus"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="hover:underline">{product.nama || product.name}</span>
                            <span className="text-[10px] text-amber-600 italic">✎</span>
                          </div>
                        </td>

                        <td className="p-1 border-r border-slate-200 text-center">
                          <div className="inline-flex items-center border border-slate-300 rounded bg-white shadow-xs">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateQty && updateQty(itemId, Math.max(1, qty - 1));
                              }}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                            >
                              -
                            </button>
                            <input
                              type="text"
                              inputMode="numeric"
                              maxLength={4}
                              value={qty}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => handleDirectQtyChange(itemId, e.target.value)}
                              className="w-10 sm:w-12 text-center font-mono font-bold text-slate-800 text-xs focus:outline-none focus:bg-amber-50"
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateQty && updateQty(itemId, Math.min(9999, qty + 1));
                              }}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                            >
                              +
                            </button>
                          </div>
                        </td>

                        <td
                          onClick={() => handleOpenEditModal(item, idx)}
                          className="p-2 border-r border-slate-200 text-right font-mono text-slate-700"
                        >
                          {price.toLocaleString("id-ID")}
                        </td>

                        <td
                          onClick={() => handleOpenEditModal(item, idx)}
                          className="p-2 text-right font-mono font-bold text-slate-900"
                        >
                          {lineTotal.toLocaleString("id-ID")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* CATATAN & TOMBOL AKSI */}
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
                  className="border border-slate-300 rounded-lg p-2 w-full text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs"
                />
              </div>

              <div className="md:col-span-5 bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between items-center text-xs text-slate-600">
                  <span>Sub Total Item:</span>
                  <span className="font-mono font-semibold">{totalItemCount} item</span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-300 pt-1 text-xs sm:text-sm font-extrabold text-amber-700">
                  <span>Total Akhir:</span>
                  <span className="font-mono text-sm sm:text-base">Rp {subtotal.toLocaleString("id-ID")}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-200 gap-2">
              <button
                type="button"
                onClick={() => router.push("/products")}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg border border-slate-300 transition flex items-center gap-1.5 text-xs sm:text-sm active:scale-95"
              >
                <FiArrowLeft /> Lanjut Belanja
              </button>

              <button
                type="button"
                onClick={handleOrder}
                disabled={loading}
                className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shadow-sm transition flex items-center gap-1.5 disabled:bg-slate-400 text-xs sm:text-sm active:scale-95"
              >
                <FiSave /> {loading ? "Menyimpan..." : "SIMPAN PESANAN BS"}
              </button>
            </div>
          </div>
        )}

        {/* POPUP MODAL: EDIT QTY & HAPUS ITEM BS */}
        {showEditModal && selectedItem && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
              <div className="p-3.5 bg-slate-800 text-white flex items-center justify-between">
                <span className="font-bold text-sm flex items-center gap-1.5">
                  <FiEdit2 className="w-4 h-4 text-amber-400" /> Edit / Hapus Barang BS
                </span>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="text-slate-300 hover:text-white p-1"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <h4 className="font-bold text-slate-800 text-xs sm:text-sm mb-1">
                    {(selectedItem.product || selectedItem).nama || (selectedItem.product || selectedItem).name}
                  </h4>
                  <div className="text-[11px] text-slate-500 font-mono">
                    Harga: Rp {getValidPrice(selectedItem, selectedItem.product || selectedItem).toLocaleString("id-ID")}
                  </div>
                </div>

                <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100 text-center">
                  <label className="block text-xs font-bold text-amber-900 mb-2">
                    Jumlah Pesanan
                  </label>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const product = selectedItem.product || selectedItem;
                        const itemId = product.kd_bs || product.kd_br || product.kd || product.id || selectedIdx;
                        const curQty = selectedItem.quantity || selectedItem.qty || 1;
                        const nextQty = Math.max(1, curQty - 1);
                        updateQty && updateQty(itemId, nextQty);
                        setSelectedItem({ ...selectedItem, qty: nextQty, quantity: nextQty });
                      }}
                      className="w-10 h-10 rounded-xl bg-white border border-slate-300 font-bold text-slate-700 flex items-center justify-center active:scale-95 shadow-xs"
                    >
                      <FiMinus className="w-4 h-4" />
                    </button>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      value={selectedItem.quantity || selectedItem.qty || 1}
                      onChange={(e) => {
                        const product = selectedItem.product || selectedItem;
                        const itemId = product.kd_bs || product.kd_br || product.kd || product.id || selectedIdx;
                        const cleaned = e.target.value.replace(/\D/g, "");
                        const nextQty = cleaned === "" ? 1 : Math.max(1, parseInt(cleaned, 10));
                        updateQty && updateQty(itemId, nextQty);
                        setSelectedItem({ ...selectedItem, qty: nextQty, quantity: nextQty });
                      }}
                      className="w-20 h-10 text-center font-mono font-extrabold text-lg text-amber-700 border-2 border-amber-500 rounded-xl focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const product = selectedItem.product || selectedItem;
                        const itemId = product.kd_bs || product.kd_br || product.kd || product.id || selectedIdx;
                        const curQty = selectedItem.quantity || selectedItem.qty || 1;
                        const nextQty = Math.min(9999, curQty + 1);
                        updateQty && updateQty(itemId, nextQty);
                        setSelectedItem({ ...selectedItem, qty: nextQty, quantity: nextQty });
                      }}
                      className="w-10 h-10 rounded-xl bg-white border border-slate-300 font-bold text-slate-700 flex items-center justify-center active:scale-95 shadow-xs"
                    >
                      <FiPlus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const product = selectedItem.product || selectedItem;
                      const itemId = product.kd_bs || product.kd_br || product.kd || product.id || selectedIdx;
                      if (removeFromCart) removeFromCart(itemId);
                      setShowEditModal(false);
                      setSelectedItem(null);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-red-50 hover:bg-red-600 border border-red-200 text-red-600 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
                  >
                    <FiTrash2 className="w-4 h-4" /> Hapus Barang
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition"
                  >
                    <FiCheckCircle className="w-4 h-4" /> Selesai
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}