"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Head from "next/head";
import Link from "next/link";
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
} from "react-icons/fi";

export default function LaporanPOPage() {
  const router = useRouter();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [printingId, setPrintingId] = useState<string | number | null>(null);

  // --- STATE FILTER ---
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
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
    let kdCus = localStorage.getItem("kd_cus");

    if (!token) {
      alert("Anda belum login. Silakan login terlebih dahulu.");
      router.push("/login");
      return;
    }

    if (!kdCus) {
      const savedUserStr = localStorage.getItem("user");
      if (savedUserStr) {
        try {
          const savedUser = JSON.parse(savedUserStr);
          kdCus = savedUser?.kd_cus || null;
        } catch (e) {
          console.error("Error parse user storage:", e);
        }
      }
    }

    const baseUrl = (
      process.env.NEXT_PUBLIC_API_URL || "http://103.125.42.217:8081/api"
    ).replace(/\/$/, "");

    try {
      const endpoint = baseUrl.endsWith("/api")
        ? `${baseUrl}/po-note`
        : `${baseUrl}/api/po-note`;

      const res = await fetch(`${endpoint}?kd_cus=${kdCus || ""}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (!res.ok) {
        throw new Error("Gagal mengambil data laporan PO Note");
      }

      const result = await res.json();
      let data = result?.data || result || [];

      // Filter berdasarkan user / kd_cus yang login
      if (Array.isArray(data) && kdCus) {
        data = data.filter(
          (item: any) => String(item.kd_cus) === String(kdCus),
        );
      }

      setReports(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error("Error fetch laporan:", err);
      setError(err.message || "Terjadi kesalahan saat mengambil data");
    } finally {
      setLoading(false);
    }
  };

  // --- LOGIKA FILTERING DATA ---
  const filteredReports = useMemo(() => {
    return reports.filter((item) => {
      const statusText = (item.status || "PROSES ORDER").trim().toUpperCase();

      // Filter Status
      if (
        selectedStatus !== "ALL" &&
        statusText !== selectedStatus.toUpperCase()
      ) {
        return false;
      }

      // Filter Tanggal (Format tgl: YYYY-MM-DD atau ISO string)
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

  // Helper untuk menentukan gaya warna badge status
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
  // --- FUNGSI PRINT PDF / CETAK ORDERAN ---
  const handlePrintPDF = async (item: any) => {
    const noTran = item.no_tran || item.id;
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

    // Jika detail barang belum ada di object item, fetch menggunakan endpoint /po-note/{id}/details
    if ((!orderItems || orderItems.length === 0) && noTran) {
      try {
        const endpoint = baseUrl.endsWith("/api")
          ? `${baseUrl}/po-note/${noTran}/details`
          : `${baseUrl}/api/po-note/${noTran}/details`;

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

    // Format HTML Dokumen Cetak / PDF
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>PO Note - ${noTran}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              color: #333;
            }
            .header {
              border-bottom: 2px solid #2563eb;
              padding-bottom: 10px;
              margin-bottom: 20px;
            }
            .header h2 {
              margin: 0;
              color: #1e40af;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px;
              margin-bottom: 20px;
              font-size: 14px;
            }
            .info-item span {
              font-weight: bold;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 15px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 8px 10px;
              text-align: left;
              font-size: 13px;
            }
            th {
              background-color: #f3f4f6;
              font-weight: bold;
            }
            .text-right {
              text-align: right;
            }
            .text-center {
              text-align: center;
            }
            .total-row {
              font-weight: bold;
              background-color: #f9fafb;
            }
            .footer {
              margin-top: 30px;
              font-size: 12px;
              color: #666;
              text-align: center;
            }
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
            <div class="info-item"><span>Tanggal PO:</span> ${item.tgl ? item.tgl.split("T")[0] : "-"}</div>
            <div class="info-item"><span>Tgl Kirim / Ket:</span> ${item.ket || item.jam || "-"}</div>
            <div class="info-item"><span>Pemesan / Admin:</span> ${item.nama_adm || item.kpb || "-"}</div>
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
                              (dt.QTY || dt.qty || 1) * (dt.harga || 0),
                          ).toLocaleString("id-ID")}</td>
                        </tr>
                      `,
                      )
                      .join("")
                  : `<tr><td colspan="6" style="text-align: center; color: #888;">Tidak ada rincian item barang.</td></tr>`
              }
              <tr class="total-row">
                <td colspan="5" class="text-right">GRAND TOTAL:</td>
                <td class="text-right">Rp ${parseFloat(item.total_po || 0).toLocaleString("id-ID")}</td>
              </tr>
            </tbody>
          </table>

          <div class="footer">
            <p>Terima kasih telah melakukan pemesanan.</p>
          </div>
        </body>
      </html>
    `;

    // Buat iframe tersembunyi untuk proses print
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
    <>
      <Head>
        <title>Laporan PO Note - Naripo</title>
      </Head>

      <div className="max-w-6xl mx-auto px-4 py-8 min-h-screen">
        {/* Header Title */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FiFileText className="text-blue-600" /> Laporan PO Note
          </h1>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-blue-600 transition"
          >
            <FiArrowLeft /> Kembali
          </button>
        </div>

        {/* Panel Filter */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="flex items-center gap-2 font-semibold text-gray-700 mb-4 pb-2 border-b">
            <FiFilter className="text-blue-600" /> Filter Laporan
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            {/* Tanggal Mulai */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Tanggal Mulai
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Tanggal Selesai */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Tanggal Selesai
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Status Pesanan
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="ALL">Semua Status</option>
                <option value="PROSES ORDER">PROSES ORDER</option>
                <option value="PROSES PENGAMBILAN">PROSES PENGAMBILAN</option>
                <option value="PROSES INPUT">PROSES INPUT</option>
                <option value="PROSES KIRIM">PROSES KIRIM</option>
              </select>
            </div>

            {/* Tombol Reset */}
            <div>
              <button
                onClick={handleResetFilter}
                className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-700 text-sm font-semibold py-2 px-4 rounded-lg hover:bg-gray-200 transition"
              >
                <FiRotateCcw /> Reset Filter
              </button>
            </div>
          </div>
        </div>

        {/* Content Table & List */}
        {loading ? (
          <div className="bg-white rounded-xl p-8 text-center shadow-sm border border-gray-100">
            <p className="text-gray-500 animate-pulse">
              Memuat laporan PO Note Anda...
            </p>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-600 rounded-xl p-6 text-center border border-red-100">
            <p>{error}</p>
            <button
              onClick={fetchLaporan}
              className="mt-3 px-4 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition"
            >
              Coba Lagi
            </button>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center shadow-sm border border-gray-100">
            <p className="text-gray-500 mb-4">
              Tidak ada data PO Note yang sesuai dengan filter.
            </p>
            {(startDate || endDate || selectedStatus !== "ALL") && (
              <button
                onClick={handleResetFilter}
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
              >
                <FiRotateCcw /> Reset Filter
              </button>
            )}
          </div>
        ) : (
          <>
            {/* List Data Laporan */}
            <div className="space-y-4">
              {paginatedReports.map((item: any, idx: number) => {
                const totalPo = parseFloat(item.total_po || 0);
                const noTran = item.no_tran || item.id;
                const isPrinting = printingId === noTran;

                return (
                  <div
                    key={noTran || idx}
                    className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition"
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-3 mb-3">
                      <div>
                        <span className="text-xs font-mono text-gray-400">
                          No. Transaksi:
                        </span>
                        <h3 className="font-bold text-gray-800 text-base">
                          {noTran || `-`}
                        </h3>
                      </div>

                      {/* Status & Tombol Print PDF */}
                      <div className="flex flex-col items-end gap-2">
                        <span
                          className={`text-xs px-3 py-1 rounded-full font-semibold ${getStatusBadgeStyle(
                            item.status,
                          )}`}
                        >
                          {item.status || "PROSES ORDER"}
                        </span>

                        <button
                          onClick={() => handlePrintPDF(item)}
                          disabled={isPrinting}
                          className="flex items-center gap-1.5 bg-red-50 text-red-600 border border-red-200 hover:bg-red-600 hover:text-white px-3 py-1 rounded-md text-xs font-semibold transition disabled:opacity-50"
                        >
                          <FiPrinter />
                          {isPrinting ? "Mencetak..." : "PRINT PDF"}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500 text-xs flex items-center gap-1">
                          <FiCalendar /> Tanggal PO
                        </p>
                        <p className="font-medium text-gray-800 mt-0.5">
                          {item.tgl ? item.tgl.split("T")[0] : "-"}
                        </p>
                      </div>

                      <div>
                        <p className="text-gray-500 text-xs flex items-center gap-1">
                          <FiClock /> Tgl Kirim / Ket
                        </p>
                        <p className="font-medium text-gray-800 mt-0.5">
                          {item.ket || item.jam || "-"}
                        </p>
                      </div>

                      <div>
                        <p className="text-gray-500 text-xs flex items-center gap-1">
                          <FiUser /> Admin / Pemesan
                        </p>
                        <p className="font-medium text-gray-800 mt-0.5">
                          {item.nama_adm || item.kpb || "-"}
                        </p>
                      </div>

                      <div>
                        <p className="text-gray-500 text-xs">Total PO</p>
                        <p className="font-bold text-blue-600 mt-0.5">
                          Rp {totalPo.toLocaleString("id-ID")}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Panel Pagination & Metadata */}
            <div className="bg-white rounded-xl p-4 mt-6 shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
              {/* Opsi Jumlah Data Per Halaman */}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>Tampilkan:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="border border-gray-300 rounded px-2 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
                <span>
                  data dari Total <strong>{filteredReports.length}</strong> data
                </span>
              </div>

              {/* Tombol Halaman (Prev/Next/Numbers) */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage === 1}
                  className="p-2 border rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-white transition"
                  title="Sebelumnya"
                >
                  <FiChevronLeft />
                </button>

                <div className="flex items-center px-2">
                  <span className="text-sm font-semibold text-gray-700">
                    Halaman {currentPage} dari {totalPages}
                  </span>
                </div>

                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                  className="p-2 border rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-white transition"
                  title="Selanjutnya"
                >
                  <FiChevronRight />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
