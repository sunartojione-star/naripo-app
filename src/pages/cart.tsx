"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import Layout from "@/components/Layout";
import {
  FiArrowLeft,
  FiSave,
  FiXCircle,
  FiMinus,
  FiPlus,
  FiShoppingBag,
  FiTrash2,
  FiEdit2,
  FiCheckCircle,
  FiX,
} from "react-icons/fi";
import { useCartStore } from "@/store/cartStore";

// Ekstraksi nomor transaksi kd_tran fleksibel
function extractKdTran(res: any): string | number | null {
  if (!res) return null;
  if (typeof res === "number" || (typeof res === "string" && res.trim() !== "")) {
    return res;
  }
  if (Array.isArray(res) && res.length > 0) {
    return extractKdTran(res[0]);
  }
  if (typeof res === "object") {
    const candidateKeys = [
      "kd_tran",
      "KD_TRAN",
      "Kd_Tran",
      "no_tran",
      "NO_TRAN",
      "kd_po",
      "KD_PO",
      "no_po",
      "NO_PO",
      "nomor",
      "NOMOR",
      "id",
      "ID",
    ];
    for (const key of candidateKeys) {
      if (res[key] !== undefined && res[key] !== null && res[key] !== "") {
        return res[key];
      }
    }
    if (res.data !== undefined && res.data !== null) {
      const fromData = extractKdTran(res.data);
      if (fromData) return fromData;
    }
    if (res.result !== undefined && res.result !== null) {
      const fromResult = extractKdTran(res.result);
      if (fromResult) return fromResult;
    }
    for (const key of Object.keys(res)) {
      const lower = key.toLowerCase();
      if ((lower.includes("tran") || lower.includes("po") || lower === "id") && res[key]) {
        if (typeof res[key] === "string" || typeof res[key] === "number") {
          return res[key];
        }
      }
    }
  }
  return null;
}

export default function CartPage() {
  const router = useRouter();
  const [deliveryDate, setDeliveryDate] = useState("");
  const [loading, setLoading] = useState(false);

  // State Modal Edit / Hapus Item
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

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

  // Zustand regular cart
  const items = useCartStore((state: any) => state.items) || [];
  const removeFromCart = useCartStore((state: any) => state.removeFromCart);
  const updateQuantity = useCartStore((state: any) => state.updateQuantity);
  const clearCart = useCartStore((state: any) => state.clearCart);

  const rawApiUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://103.125.42.217:8081/api";
  const apiUrl = rawApiUrl.replace(/\/$/, "");

  const getEndpoint = (path: string) => {
    const cleanPath = path.replace(/^\//, "");
    return `${apiUrl}/${cleanPath}`;
  };

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setDeliveryDate(today);

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

  const totalItemCount = items.reduce((acc: number, item: any) => {
    const qty = item.quantity || item.qty || 1;
    return acc + qty;
  }, 0);

  const subtotal = Math.round(
    items.reduce((acc: number, item: any) => {
      const product = item.product || item;
      const price = parsePrice(product.h_anggota || product.price || product.hpp);
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
    if (updateQuantity) {
      updateQuantity(itemId, newQty);
    }
  };

  // Simpan Pesanan PO
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
    const activeKdCus = customerInfo.kd_cus || "A135";

    try {
      const today = new Date().toISOString().split("T")[0];
      const roundedTotal = Math.round(subtotal);

      // STEP 1: Simpan PO Note Header
    const headerPayload = {
        tgl: today,
        TGL: today,
        tgl_kirim: deliveryDate,
        TGL_KIRIM: deliveryDate,
        ket: deliveryDate ? `Kirim: ${deliveryDate}` : "dtg sendiri",
        KET: deliveryDate ? `Kirim: ${deliveryDate}` : "dtg sendiri",
        kd_cus: String(activeKdCus).trim(),
        KD_CUS: String(activeKdCus).trim(),
        status: "PROSES PENGAMBILAN",
        STATUS: "PROSES PENGAMBILAN",
        total: roundedTotal,
        TOTAL: roundedTotal,
        jumlah: roundedTotal,
        JUMLAH: roundedTotal,
        nilai: roundedTotal,
        NILAI: roundedTotal,
        rp_total: roundedTotal,
        RP_TOTAL: roundedTotal,
        pemesan: customerInfo.nama || customerInfo.user || "ADMIN",
        PEMESAN: customerInfo.nama || customerInfo.user || "ADMIN",
        user: customerInfo.user || "ADMIN",
        USER: customerInfo.user || "ADMIN",
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
      console.log("Response PO Note:", resultHeader);

      if (!resHeader.ok || (resultHeader.success !== undefined && !resultHeader.success)) {
        throw new Error(resultHeader.message || "Gagal membuat Header PO Note");
      }

      const createdKdTran = extractKdTran(resultHeader);
      if (!createdKdTran) {
        throw new Error(
          "Nomor transaksi (kd_tran) tidak ditemukan dari server: " + JSON.stringify(resultHeader)
        );
      }

      // STEP 2: Filter item valid
      const validItems = items.filter((item: any) => {
        const product = item.product || item;
        const kdBr = String(product.kd_br || product.kd || product.id || "").trim();
        const qty = item.quantity || item.qty || 1;
        return kdBr !== "" && qty > 0;
      });

      if (validItems.length === 0) {
        throw new Error("Tidak ada barang valid di keranjang");
      }

// STEP 3: Kirim semua barang sekaligus (menyertakan format huruf kecil & kapital)
 const bulkPayload = {
        items: validItems.map((item: any, idx: number) => {
          const product = item.product || item;
          const price = parsePrice(product.h_anggota || product.price || product.hpp);
          const qty = item.quantity || item.qty || 1;
          const kdBr = String(product.kd_br || product.kd || product.id || "").trim();
          const satuan = String(product.satuan || product.SAT || "DUS").trim();
          const namaBr = String(product.nama || product.name || product.nama_br || "").trim();
          const kd = String(product.kd || "").trim();
          const lineSubtotal = Math.round(price * qty);

          return {
            no_tran: parseInt(String(createdKdTran), 10),
            NO_URUT: idx + 1,
            KD_BR: kdBr,
            RASA: product.rasa || "-",
            QTY: Math.round(qty),
            SAT: satuan,
            harga: Math.round(price),
            subtotal: lineSubtotal,
            kd: kd,
            nama_br: namaBr,
          };
        }),
      };
      console.log(`Mengirim seluruh ${validItems.length} item ke PO ${createdKdTran}...`, bulkPayload);

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
      console.log("Hasil simpan detail:", resultDetail);

      if (!resDetail.ok || (resultDetail.success !== undefined && !resultDetail.success)) {
        throw new Error(resultDetail.message || "Gagal menyimpan rincian pesanan");
      }

      alert(`Pesanan Berhasil Disimpan!\nNo PO: ${createdKdTran}\nTotal: Rp ${roundedTotal.toLocaleString("id-ID")}`);
      if (clearCart) clearCart();
      router.push("/laporan/laporanpo");
    } catch (err: any) {
      console.error("Error order:", err);
      alert(`Gagal menyimpan: ${err.message || "Terjadi kesalahan koneksi"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <Head>
        <title>Keranjang Belanja - Naripo</title>
      </Head>

      <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 py-3 sm:py-6 min-h-screen text-xs">
        {/* MENU ATAS */}
        <div className="flex items-center justify-between border-b border-slate-300 bg-slate-200 rounded-t-xl px-3 py-2 mb-3">
          <span className="font-bold text-blue-700 text-xs sm:text-sm">
            Keranjang Belanja
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
              Keranjang belanja Anda masih kosong.
            </p>
            <Link
              href="/products"
              className="inline-flex items-center gap-1.5 bg-blue-600 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-blue-700 transition text-xs sm:text-sm shadow-sm"
            >
              <FiArrowLeft /> Mulai Belanja di Daftar Produk
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

              <div className="md:col-span-5 bg-blue-50/60 p-3 rounded-xl border border-blue-100 flex flex-col justify-center">
                <div className="flex justify-between items-center text-xs text-slate-600 mb-1">
                  <span>Total Kuantitas:</span>
                  <span className="font-bold font-mono">{totalItemCount} item</span>
                </div>
                <div className="flex justify-between items-center text-xs sm:text-sm font-extrabold text-blue-700">
                  <span>Total Akhir:</span>
                  <span className="font-mono text-sm sm:text-base">Rp {subtotal.toLocaleString("id-ID")}</span>
                </div>
              </div>
            </div>

            {/* TABEL ITEM */}
            <div className="overflow-x-auto border border-slate-300 rounded-lg">
              <table className="w-full text-left border-collapse text-[11px] sm:text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-300 font-semibold">
                    <th className="p-2 border-r border-slate-300 w-8 text-center">No</th>
                    <th className="p-2 border-r border-slate-300 min-w-[120px]">
                      Keterangan / Nama Barang & Varian (Klik untuk Edit/Hapus)
                    </th>
                    <th className="p-2 border-r border-slate-300 w-28 sm:w-36 text-center">Jumlah</th>
                    <th className="p-2 border-r border-slate-300 w-16 text-center">Satuan</th>
                    <th className="p-2 border-r border-slate-300 w-24 text-right">Harga</th>
                    <th className="p-2 w-24 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {items.map((item: any, idx: number) => {
                    const product = item.product || item;
                    const price = parsePrice(product.h_anggota || product.price || product.hpp);
                    const qty = item.quantity || item.qty || 1;
                    const itemId = product.kd_br || product.kd || product.id || idx;
                    const lineTotal = price * qty;

                    return (
                      <tr
                        key={idx}
                        className="hover:bg-blue-50/50 transition-colors cursor-pointer"
                      >
                        <td
                          onClick={() => handleOpenEditModal(item, idx)}
                          className="p-2 border-r border-slate-200 text-center text-slate-500 font-mono"
                        >
                          {idx + 1}
                        </td>

                        <td
                          onClick={() => handleOpenEditModal(item, idx)}
                          className="p-2 border-r border-slate-200 font-semibold text-blue-900"
                          title="Klik untuk Edit Qty atau Hapus"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="hover:underline">{product.nama || product.name}</span>
                            <span className="text-[10px] text-blue-500 italic">✎</span>
                          </div>
                        </td>

                        <td className="p-1 border-r border-slate-200 text-center">
                          <div className="inline-flex items-center border border-slate-300 rounded bg-white shadow-xs">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateQuantity && updateQuantity(itemId, Math.max(1, qty - 1));
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
                              className="w-10 sm:w-12 text-center font-mono font-bold text-slate-800 text-xs focus:outline-none focus:bg-blue-50"
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateQuantity && updateQuantity(itemId, Math.min(9999, qty + 1));
                              }}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                            >
                              +
                            </button>
                          </div>
                        </td>

                        <td
                          onClick={() => handleOpenEditModal(item, idx)}
                          className="p-2 border-r border-slate-200 text-center text-slate-600 uppercase"
                        >
                          {product.satuan || "DUS"}
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

            {/* TANGGAL KIRIM & RINGKASAN */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 pt-2">
              <div className="md:col-span-7 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-24 text-slate-700 font-semibold">Tgl Kirim:</span>
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="border border-slate-300 rounded-lg p-1.5 text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                  />
                </div>
              </div>

              <div className="md:col-span-5 bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between items-center text-xs text-slate-600">
                  <span>Sub Total Item:</span>
                  <span className="font-mono font-semibold">{totalItemCount} item</span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-300 pt-1 text-xs sm:text-sm font-extrabold text-blue-700">
                  <span>Total Akhir:</span>
                  <span className="font-mono text-sm sm:text-base">Rp {subtotal.toLocaleString("id-ID")}</span>
                </div>
              </div>
            </div>

            {/* TOMBOL AKSI BAWAH */}
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
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm transition flex items-center gap-1.5 disabled:bg-slate-400 text-xs sm:text-sm active:scale-95"
              >
                <FiSave /> {loading ? "Menyimpan..." : "SIMPAN PESANAN"}
              </button>
            </div>
          </div>
        )}

        {/* MODAL EDIT / HAPUS */}
        {showEditModal && selectedItem && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
              <div className="p-3.5 bg-slate-800 text-white flex items-center justify-between">
                <span className="font-bold text-sm flex items-center gap-1.5">
                  <FiEdit2 className="w-4 h-4 text-blue-400" /> Edit / Hapus Barang
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
                  <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                    <span>Satuan: {(selectedItem.product || selectedItem).satuan || "DUS"}</span>
                    <span>Harga: Rp {parsePrice((selectedItem.product || selectedItem).h_anggota || (selectedItem.product || selectedItem).price).toLocaleString("id-ID")}</span>
                  </div>
                </div>

                <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 text-center">
                  <label className="block text-xs font-bold text-blue-900 mb-2">
                    Jumlah Pesanan
                  </label>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const product = selectedItem.product || selectedItem;
                        const itemId = product.kd_br || product.kd || product.id || selectedIdx;
                        const curQty = selectedItem.quantity || selectedItem.qty || 1;
                        const nextQty = Math.max(1, curQty - 1);
                        updateQuantity && updateQuantity(itemId, nextQty);
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
                        const itemId = product.kd_br || product.kd || product.id || selectedIdx;
                        const cleaned = e.target.value.replace(/\D/g, "");
                        const nextQty = cleaned === "" ? 1 : Math.max(1, parseInt(cleaned, 10));
                        updateQuantity && updateQuantity(itemId, nextQty);
                        setSelectedItem({ ...selectedItem, qty: nextQty, quantity: nextQty });
                      }}
                      className="w-20 h-10 text-center font-mono font-extrabold text-lg text-blue-700 border-2 border-blue-500 rounded-xl focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const product = selectedItem.product || selectedItem;
                        const itemId = product.kd_br || product.kd || product.id || selectedIdx;
                        const curQty = selectedItem.quantity || selectedItem.qty || 1;
                        const nextQty = Math.min(9999, curQty + 1);
                        updateQuantity && updateQuantity(itemId, nextQty);
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
                      const itemId = product.kd_br || product.kd || product.id || selectedIdx;
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
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition"
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