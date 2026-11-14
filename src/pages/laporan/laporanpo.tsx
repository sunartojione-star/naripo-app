"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Layout from "@/components/Layout";
import {
  FiFileText,
  FiCalendar,
  FiUser,
  FiArrowLeft,
  FiClock,
  FiFilter,
  FiRotateCcw,
  FiChevronLeft,
  FiChevronRight,
  FiPrinter,
  FiEye,
  FiX,
} from "react-icons/fi";

const formatLocalYMD = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDDMMYYYY = (ymd: string) => {
  if (!ymd) return "Semua Tanggal";
  const [y, m, d] = ymd.split("-");
  if (!y || !m || !d) return ymd;
  return `${d}/${m}/${y}`;
};

export default function LaporanPOPage() {
  const router = useRouter();
  const [reports, setReports] = useState<any[]>([]);
  const [activeKdCus, setActiveKdCus] = useState<string>("");
  const [activeCustomerName, setActiveCustomerName] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [printingId, setPrintingId] = useState<string | number | null>(null);

  // --- STATE POPUP MODAL DETAIL BARANG ---
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [selectedPo, setSelectedPo] = useState<any>(null);
  const [detailItems, setDetailItems] = useState<any[]>([]);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);

  // --- STATE FILTER (Default tgl 1 bulan berjalan s/d hari ini) ---
  const [startDate, setStartDate] = useState<string>(() => {
    const now = new Date();
    return formatLocalYMD(new Date(now.getFullYear(), now.getMonth(), 1));
  });
  const [endDate, setEndDate] = useState<string>(() =>
    formatLocalYMD(new Date())
  );
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");

  // --- STATE PAGINATION ---
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  useEffect(() => {
    fetchLaporan();
  }, []);

  // Reset ke halaman 1 setiap kali filter berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [startDate, endDate, selectedStatus, itemsPerPage]);

  const fetchLaporan = async () => {
    setLoading(true);
    setError(null);

    const token =
      localStorage.getItem("token") || localStorage.getItem("auth_token");

    if (!token) {
      alert("Anda belum login. Silakan login terlebih dahulu.");
      router.push("/login");
      return;
    }

    let kdCus =
      localStorage.getItem("kd_cus") || localStorage.getItem("kdCus") || "";

    const savedUserStr = localStorage.getItem("user");
    if (savedUserStr) {
      try {
        const savedUser = JSON.parse(savedUserStr);
        setActiveCustomerName(
          String(savedUser?.name || savedUser?.nama || "").trim()
        );
        if (!kdCus) {
          kdCus =
            savedUser?.kd_cus ||
            savedUser?.KD_CUS ||
            savedUser?.kode ||
            savedUser?.username ||
            "";
        }
      } catch (e) {
        console.error("Error parse user storage:", e);
      }
    }

    const cleanKdCus = String(kdCus).trim().toUpperCase();
    setActiveKdCus(cleanKdCus);

    // Jika kode pelanggan tidak ditemukan, jangan tampilkan data pelanggan lain
    if (!cleanKdCus) {
      setReports([]);
      setError("Kode pelanggan tidak ditemukan. Silakan login ulang.");
      setLoading(false);
      return;
    }

    const baseUrl = (
      process.env.NEXT_PUBLIC_API_URL || "http://103.125.42.217:8081/api"
    ).replace(/\/$/, "");

    try {
      const endpoint = `${baseUrl}/po-note`;
      const res = await fetch(
        `${endpoint}?kd_cus=${encodeURIComponent(cleanKdCus)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      if (!res.ok) {
        throw new Error("Gagal mengambil data laporan PO Note");
      }

      const result = await res.json();
      let data = result?.data || result || [];

      if (Array.isArray(data)) {
        data = data.filter((item: any) => {
          const itemKd = String(item.kd_cus || item.KD_CUS || "")
            .trim()
            .toUpperCase();
          return itemKd === cleanKdCus;
        });
      }

      setReports(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error("Error fetch laporan:", err);
      setError(err.message || "Terjadi kesalahan saat mengambil data");
    } finally {
      setLoading(false);
    }
  };

  // --- FUNGSI BUKA POPUP RINCIAN BARANG ---
  const handleOpenDetailModal = async (po: any) => {
    setSelectedPo(po);
    setShowDetailModal(true);
    setLoadingDetail(true);
    setDetailItems([]);

    const noTran = po.no_tran || po.kd_tran || po.id;
    const token =
      localStorage.getItem("token") || localStorage.getItem("auth_token");
    const baseUrl = (
      process.env.NEXT_PUBLIC_API_URL || "http://103.125.42.217:8081/api"
    ).replace(/\/$/, "");

    try {
      const endpoint = `${baseUrl}/detail-po-plg?no_tran=${noTran}`;
      const res = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (res.ok) {
        const detailResult = await res.json();
        const data = detailResult?.data || detailResult || [];
        setDetailItems(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Gagal mengambil detail barang:", err);
    } finally {
      setLoadingDetail(false);
    }
  };

  // --- LOGIKA FILTERING DATA ---
  const filteredReports = useMemo(() => {
    return reports.filter((item) => {
      const statusText = (item.status || "PROSES ORDER").trim().toUpperCase();

      if (
        selectedStatus !== "ALL" &&
        statusText !== selectedStatus.toUpperCase()
      ) {
        return false;
      }

      if (startDate || endDate) {
        const itemDateStr = item.tgl ? item.tgl.split("T")[0] : "";
        if (!itemDateStr) return false;

        if (startDate && itemDateStr < startDate) {
          return false;
        }
        if (endDate && itemDateStr > endDate) {
          return false;
        }
      }

      return true;
    });
  }, [reports, selectedStatus, startDate, endDate]);

  // --- LOGIKA PAGINATION ---
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage) || 1;

  const paginatedReports = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredReports.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredReports, currentPage, itemsPerPage]);

  const handleResetFilter = () => {
    setStartDate("");
    setEndDate("");
    setSelectedStatus("ALL");
    setCurrentPage(1);
  };

  // Helper Warna Status Badge
  const getStatusBadgeStyle = (statusRaw: string) => {
    const status = (statusRaw || "").trim().toUpperCase();

    switch (status) {
      case "PROSES ORDER":
        return "bg-blue-100 text-blue-700 border border-blue-200";
      case "PROSES PENGAMBILAN":
        return "bg-amber-100 text-amber-700 border border-amber-200";
      case "PROSES INPUT":
        return "bg-purple-100 text-purple-700 border border-purple-200";
      case "PROSES KIRIM":
        return "bg-emerald-100 text-emerald-700 border border-emerald-200";
      default:
        return "bg-gray-100 text-gray-700 border border-gray-200";
    }
  };

  // --- FUNGSI PRINT PDF / CETAK ORDERAN ---
  const handlePrintPDF = async (item: any) => {
    const noTran = item.no_tran || item.kd_tran || item.id;
    setPrintingId(noTran);

    const token =
      localStorage.getItem("token") || localStorage.getItem("auth_token");
    const baseUrl = (
      process.env.NEXT_PUBLIC_API_URL || "http://103.125.42.217:8081/api"
    ).replace(/\/$/, "");

    let orderItems =
      item.items ||
      item.details ||
      item.barang ||
      item.products ||
      item.list ||
      [];

    if ((!orderItems || orderItems.length === 0) && noTran) {
      try {
        const endpoint = `${baseUrl}/detail-po-plg?no_tran=${noTran}`;
        const res = await fetch(endpoint, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });

        if (res.ok) {
          const detailResult = await res.json();
          const detailData = detailResult?.data || detailResult;

          orderItems = Array.isArray(detailData)
            ? detailData
            : detailData?.items ||
              detailData?.details ||
              detailData?.barang ||
              detailData?.list ||
              [];
        }
      } catch (e) {
        console.error("Gagal mengambil detail item untuk print:", e);
      }
    }

    const grandTotalCalculated =
      Array.isArray(orderItems) && orderItems.length > 0
        ? orderItems.reduce((acc: number, it: any) => {
            const sub = parseFloat(
              it.subtotal ||
                it.total ||
                (it.QTY || it.qty || 1) * (it.harga || 0)
            );
            return acc + (isNaN(sub) ? 0 : sub);
          }, 0)
        : parseFloat(item.total_po || item.total || item.TOTAL || 0);

    const namaPelangganPrint =
      item.nama_pelanggan ||
      item.NAMA_PELANGGAN ||
      item.customer_name ||
      activeCustomerName ||
      "-";

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>PO Note - ${noTran}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
            .header { border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-bottom: 20px; }
            .header h2 { margin: 0; color: #1e40af; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; font-size: 14px; }
            .info-item span { font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #ddd; padding: 8px 10px; text-align: left; font-size: 13px; }
            th { background-color: #f3f4f6; font-weight: bold; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .total-row { font-weight: bold; background-color: #f9fafb; }
            .footer { margin-top: 30px; font-size: 12px; color: #666; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>CATATAN PURCHASE ORDER (PO)</h2>
            <p style="margin: 5px 0 0 0; font-size: 12px; color: #666;">
              Dicetak pada: ${new Date().toLocaleString("id-ID")}
            </p>
          </div>

          <div class="info-grid">
            <div class="info-item"><span>No. Transaksi:</span> ${noTran || "-"}</div>
            <div class="info-item"><span>Status:</span> ${(item.status || "PROSES ORDER").toUpperCase()}</div>
            <div class="info-item"><span>Pelanggan:</span> ${namaPelangganPrint} (${item.kd_cus || item.KD_CUS || activeKdCus || "-"})</div>
            <div class="info-item"><span>Tanggal PO:</span> ${item.tgl ? formatDDMMYYYY(item.tgl.split("T")[0]) : "-"} ${item.jam || item.JAM ? `(${item.jam || item.JAM})` : ""}</div>
            <div class="info-item"><span>Tgl Kirim / Ket:</span> ${item.ket || item.jam || item.tgl_kirim || "-"}</div>
            <div class="info-item"><span>Pemesan / Admin:</span> ${item.nama_admin || item.NAMA_ADMIN || item.nama_adm || item.NAMA_ADM || item.pemesan || item.user || item.kpb || "-"}</div>
          </div>

          <h3>Detail Pesanan</h3>
          <table>
            <thead>
              <tr>
                <th style="width: 35px;" class="text-center">No</th>
                <th>Nama Barang</th>
                <th class="text-right" style="width: 50px;">Qty</th>
                <th class="text-center" style="width: 65px;">Satuan</th>
                <th class="text-right" style="width: 110px;">Harga</th>
                <th class="text-right" style="width: 120px;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${
                Array.isArray(orderItems) && orderItems.length > 0
                  ? orderItems
                      .map(
                        (dt: any, i: number) => `
                        <tr>
                          <td class="text-center">${i + 1}</td>
                          <td>${dt.nama_br || dt.nama_brg || dt.nama || dt.product_name || "-"}</td>
                          <td class="text-right">${dt.QTY || dt.qty || dt.jumlah || 1}</td>
                          <td class="text-center">${dt.SAT || dt.satuan || "-"}</td>
                          <td class="text-right">Rp ${parseFloat(dt.harga || dt.price || 0).toLocaleString("id-ID")}</td>
                          <td class="text-right">Rp ${parseFloat(
                            dt.subtotal ||
                              dt.total ||
                              dt.jumlah_harga ||
                              (dt.QTY || dt.qty || 1) * (dt.harga || 0)
                          ).toLocaleString("id-ID")}</td>
                        </tr>
                      `
                      )
                      .join("")
                  : `<tr><td colspan="6" style="text-align: center; color: #888;">Tidak ada rincian item barang.</td></tr>`
              }
              <tr class="total-row">
                <td colspan="5" class="text-right">GRAND TOTAL:</td>
                <td class="text-right">Rp ${grandTotalCalculated.toLocaleString("id-ID")}</td>
              </tr>
            </tbody>
          </table>

          <div class="footer">
            <p>Terima kasih telah melakukan pemesanan.</p>
          </div>
        </body>
      </html>
    `;

    const printFrame = document.createElement("iframe");
    printFrame.style.position = "fixed";
    printFrame.style.right = "0";
    printFrame.style.bottom = "0";
    printFrame.style.width = "0";
    printFrame.style.height = "0";
    printFrame.style.border = "0";
    document.body.appendChild(printFrame);

    const frameDoc = printFrame.contentWindow?.document;
    if (frameDoc) {
      frameDoc.open();
      frameDoc.write(printContent);
      frameDoc.close();

      setTimeout(() => {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(printFrame);
          setPrintingId(null);
        }, 1000);
      }, 500);
    } else {
      setPrintingId(null);
    }
  };

  return (
    <Layout>
      <Head>
        <title>Laporan PO Note - Naripo</title>
      </Head>

      <div className="min-h-screen bg-slate-50/70 py-2.5 sm:py-6 px-2.5 sm:px-4">
        <div className="max-w-5xl mx-auto space-y-3 sm:space-y-4">
          {/* Header & Panel Filter Terpadu */}
          <div className="bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 text-white px-4 py-3.5 sm:p-5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
                  <FiFileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-base sm:text-lg font-extrabold leading-tight">
                    Laporan PO Note
                  </h1>
                  <p className="text-[11px] text-blue-100">
                    {activeCustomerName ? `${activeCustomerName} ` : ""}
                    {activeKdCus ? `(${activeKdCus})` : "Riwayat pemesanan & cetak nota PO"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => router.back()}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-100 hover:text-white bg-white/15 hover:bg-white/25 px-2.5 py-1.5 rounded-full transition shrink-0"
              >
                <FiArrowLeft className="w-3.5 h-3.5" />
                <span>Kembali</span>
              </button>
            </div>

            {/* Filter Tanggal & Status Ringkas */}
            <div className="p-3.5 sm:p-5 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <FiFilter className="text-blue-600 w-3.5 h-3.5" />
                  Filter Laporan
                </span>
                <span className="text-[11px] font-medium text-slate-400">
                  {filteredReports.length} transaksi
                </span>
              </div>

              {/* Tanggal Mulai & Selesai berdampingan (DD/MM/YYYY) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 items-end">
                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1">
                    Tanggal Mulai
                  </label>
                  <div className="relative">
                    <div className="w-full rounded-xl border border-slate-300 bg-slate-50 px-2.5 sm:px-3 py-2 text-xs sm:text-sm text-slate-800 font-semibold flex items-center justify-between">
                      <span className="truncate">{formatDDMMYYYY(startDate)}</span>
                      <FiCalendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    </div>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1">
                    Tanggal Selesai
                  </label>
                  <div className="relative">
                    <div className="w-full rounded-xl border border-slate-300 bg-slate-50 px-2.5 sm:px-3 py-2 text-xs sm:text-sm text-slate-800 font-semibold flex items-center justify-between">
                      <span className="truncate">{formatDDMMYYYY(endDate)}</span>
                      <FiCalendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    </div>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1">
                    Status Pesanan
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full text-xs sm:text-sm border border-slate-300 rounded-xl px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50 font-semibold text-slate-800"
                  >
                    <option value="ALL">Semua Status</option>
                    <option value="PROSES ORDER">PROSES ORDER</option>
                    <option value="PROSES PENGAMBILAN">PROSES PENGAMBILAN</option>
                    <option value="PROSES INPUT">PROSES INPUT</option>
                    <option value="PROSES KIRIM">PROSES KIRIM</option>
                  </select>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={handleResetFilter}
                    className="w-full flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold py-2 px-3 rounded-xl transition active:scale-95 border border-slate-200"
                  >
                    <FiRotateCcw className="w-3.5 h-3.5" />
                    <span>Tampilkan Semua</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Content List */}
          {loading ? (
            <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-slate-100">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-gray-500 text-xs sm:text-sm">
                Memuat laporan PO Note Anda...
              </p>
            </div>
          ) : error ? (
            <div className="bg-red-50 text-red-600 rounded-2xl p-6 text-center border border-red-100">
              <p className="text-xs sm:text-sm mb-3">{error}</p>
              <button
                onClick={fetchLaporan}
                className="px-4 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition"
              >
                Coba Lagi
              </button>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-slate-100">
              <p className="text-gray-500 text-xs sm:text-sm mb-3">
                Tidak ada data PO Note pada rentang tanggal ini.
              </p>
              <button
                onClick={handleResetFilter}
                className="inline-flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold hover:bg-blue-700 transition"
              >
                <FiRotateCcw className="w-3.5 h-3.5" /> Tampilkan Semua Tanggal
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-2.5 sm:space-y-3">
                {paginatedReports.map((item: any, idx: number) => {
                  const totalPo = parseFloat(
                    item.total_po ||
                      item.total ||
                      item.TOTAL ||
                      item.grand_total ||
                      item.jumlah ||
                      item.nilai ||
                      0
                  );
                  const noTran = item.no_tran || item.kd_tran || item.id;
                  const isPrinting = printingId === noTran;
                  const tglStr = item.tgl ? item.tgl.split("T")[0] : "";

                  return (
                    <div
                      key={noTran || idx}
                      onClick={() => handleOpenDetailModal(item)}
                      className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-sm border border-slate-100 hover:border-blue-300 hover:shadow-md transition cursor-pointer active:scale-[0.99] group"
                      title="Klik kartu untuk melihat rincian barang"
                    >
                      {/* Header Transaksi + Status & Print */}
                      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div>
                            <span className="text-[10px] font-mono text-slate-400 block leading-none">
                              No. Transaksi
                            </span>
                            <h3 className="font-extrabold text-slate-800 text-sm sm:text-base leading-tight group-hover:text-blue-600 transition">
                              {noTran || "-"}
                            </h3>
                          </div>
                          <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md font-semibold hidden sm:inline-flex items-center gap-1">
                            <FiEye className="w-3 h-3" /> Rincian
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={`text-[10px] sm:text-xs px-2 py-0.5 sm:py-1 rounded-full font-bold whitespace-nowrap ${getStatusBadgeStyle(
                              item.status
                            )}`}
                          >
                            {item.status || "PROSES ORDER"}
                          </span>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePrintPDF(item);
                            }}
                            disabled={isPrinting}
                            className="flex items-center gap-1 bg-red-50 text-red-600 border border-red-200 hover:bg-red-600 hover:text-white px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-bold transition disabled:opacity-50 active:scale-95"
                          >
                            <FiPrinter className="w-3.5 h-3.5" />
                            <span>{isPrinting ? "..." : "PDF"}</span>
                          </button>
                        </div>
                      </div>

                      {/* Nama & Kode Pelanggan (1 Baris Rapi) */}
                      <div className="flex items-center gap-1.5 text-[11px] sm:text-xs mb-2.5">
                        <span className="text-slate-400 font-medium">Pelanggan:</span>
                        <span className="font-bold text-slate-800 truncate">
                          {item.nama_pelanggan ||
                            item.NAMA_PELANGGAN ||
                            item.customer_name ||
                            activeCustomerName ||
                            "-"}
                        </span>
                        <span className="font-mono text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded shrink-0">
                          {item.kd_cus || item.KD_CUS || activeKdCus || "-"}
                        </span>
                      </div>

                      {/* Rincian Transaksi */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 text-xs sm:text-sm">
                        <div>
                          <p className="text-slate-400 text-[10px] sm:text-xs flex items-center gap-1">
                            <FiCalendar className="w-3 h-3 text-blue-500" /> Tanggal PO
                          </p>
                          <p className="font-semibold text-slate-800 mt-0.5">
                            {tglStr ? formatDDMMYYYY(tglStr) : "-"}
                            {(item.jam || item.JAM) && (
                              <span className="text-slate-400 text-[11px] font-mono ml-1">
                                ({item.jam || item.JAM})
                              </span>
                            )}
                          </p>
                        </div>

                        <div>
                          <p className="text-slate-400 text-[10px] sm:text-xs flex items-center gap-1">
                            <FiClock className="w-3 h-3 text-amber-500" /> Tgl Kirim / Ket
                          </p>
                          <p className="font-semibold text-slate-800 mt-0.5 truncate">
                            {item.ket || item.jam || item.tgl_kirim || "-"}
                          </p>
                        </div>

                        <div>
                          <p className="text-slate-400 text-[10px] sm:text-xs flex items-center gap-1">
                            <FiUser className="w-3 h-3 text-purple-500" /> Admin / Pemesan
                          </p>
                          <p className="font-semibold text-slate-800 mt-0.5 truncate">
                            {item.nama_admin ||
                              item.NAMA_ADMIN ||
                              item.nama_adm ||
                              item.NAMA_ADM ||
                              item.pemesan ||
                              item.user ||
                              item.kpb ||
                              "-"}
                          </p>
                        </div>

                        <div>
                          <p className="text-slate-400 text-[10px] sm:text-xs">
                            Total PO
                          </p>
                          <p className="font-extrabold text-blue-700 font-mono text-xs sm:text-sm mt-0.5">
                            Rp {totalPo.toLocaleString("id-ID")}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Panel Pagination */}
              <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm border border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3">
                <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-600">
                  <span>Tampilkan:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                    className="border border-slate-300 rounded-lg px-2 py-1 text-xs sm:text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                  <span>
                    dari <strong>{filteredReports.length}</strong> data
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(prev - 1, 1))
                    }
                    disabled={currentPage === 1}
                    className="p-1.5 sm:p-2 border rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white transition"
                    title="Sebelumnya"
                  >
                    <FiChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="flex items-center px-2">
                    <span className="text-xs sm:text-sm font-semibold text-slate-700">
                      Halaman {currentPage} dari {totalPages}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                    }
                    disabled={currentPage === totalPages}
                    className="p-1.5 sm:p-2 border rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white transition"
                    title="Selanjutnya"
                  >
                    <FiChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* POPUP MODAL RINCIAN DETAIL BARANG PO */}
        {showDetailModal && selectedPo && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-2.5 sm:p-4 backdrop-blur-xs">
            <div className="bg-white rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
              {/* Header Modal */}
              <div className="p-3.5 bg-slate-800 text-white flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
                    <span>
                      PO #{selectedPo.no_tran || selectedPo.kd_tran || selectedPo.id}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${getStatusBadgeStyle(
                        selectedPo.status
                      )}`}
                    >
                      {selectedPo.status || "PROSES ORDER"}
                    </span>
                  </h3>
                  <p className="text-[11px] font-semibold text-blue-200 mt-1">
                    Pelanggan:{" "}
                    {selectedPo.nama_pelanggan ||
                      selectedPo.NAMA_PELANGGAN ||
                      selectedPo.customer_name ||
                      activeCustomerName ||
                      "-"}{" "}
                    ({selectedPo.kd_cus || selectedPo.KD_CUS || activeKdCus || "-"})
                  </p>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Tgl PO: {selectedPo.tgl ? formatDDMMYYYY(selectedPo.tgl.split("T")[0]) : "-"}{" "}
                    {selectedPo.jam || selectedPo.JAM
                      ? `(${selectedPo.jam || selectedPo.JAM})`
                      : ""}{" "}
                    | {selectedPo.ket || `Kirim: ${selectedPo.tgl_kirim || "-"}`} | Admin:{" "}
                    {selectedPo.nama_admin ||
                      selectedPo.NAMA_ADMIN ||
                      selectedPo.nama_adm ||
                      selectedPo.pemesan ||
                      selectedPo.user ||
                      "-"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDetailModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-300 hover:text-white"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              {/* Isi Tabel Barang */}
              <div className="p-3 sm:p-4 flex-1 overflow-y-auto">
                {loadingDetail ? (
                  <div className="py-12 text-center text-slate-500 text-xs sm:text-sm">
                    <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                    Memuat rincian barang...
                  </div>
                ) : detailItems.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    Tidak ada rincian item barang pada pesanan ini.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-lg overflow-x-auto">
                    <table className="w-full text-left text-[11px] sm:text-xs border-collapse">
                      <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="p-2 text-center w-8">No</th>
                          <th className="p-2">Nama Barang</th>
                          <th className="p-2 text-center w-14">Qty</th>
                          <th className="p-2 text-center w-14">Satuan</th>
                          <th className="p-2 text-right w-20">Harga</th>
                          <th className="p-2 text-right w-24">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {detailItems.map((det: any, i: number) => {
                          const nama =
                            det.nama_br ||
                            det.nama_brg ||
                            det.nama ||
                            det.KD_BR ||
                            "-";
                          const qty = det.QTY || det.qty || det.jumlah || 1;
                          const sat = det.SAT || det.satuan || "-";
                          const hrg = parseFloat(det.harga || det.price || 0);
                          const sub = parseFloat(
                            det.subtotal || det.total || qty * hrg
                          );

                          return (
                            <tr key={i} className="hover:bg-blue-50/40">
                              <td className="p-2 text-center text-slate-400 font-mono">
                                {i + 1}
                              </td>
                              <td className="p-2 font-medium text-slate-800">
                                {nama}
                              </td>
                              <td className="p-2 text-center font-bold font-mono text-blue-700">
                                {qty}
                              </td>
                              <td className="p-2 text-center text-slate-600 uppercase">
                                {sat}
                              </td>
                              <td className="p-2 text-right font-mono text-slate-600">
                                Rp {hrg.toLocaleString("id-ID")}
                              </td>
                              <td className="p-2 text-right font-mono font-bold text-slate-900">
                                Rp {sub.toLocaleString("id-ID")}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Footer Modal Ringkasan */}
              <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs sm:text-sm">
                <span className="text-slate-500 font-medium">
                  Total: <b className="text-slate-800">{detailItems.length} barang</b>
                </span>
                <div className="flex items-center gap-3">
                  <span className="font-extrabold text-blue-700 font-mono text-sm sm:text-base">
                    Rp{" "}
                    {detailItems
                      .reduce(
                        (acc, it) =>
                          acc +
                          parseFloat(
                            it.subtotal ||
                              (it.QTY || it.qty || 1) * (it.harga || 0) ||
                              0
                          ),
                        0
                      )
                      .toLocaleString("id-ID")}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowDetailModal(false)}
                    className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-bold text-xs active:scale-95 transition"
                  >
                    Tutup
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