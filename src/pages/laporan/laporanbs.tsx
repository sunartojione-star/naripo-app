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
} from "react-icons/fi";

export default function LaporanBSPage() {
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
        ? `${baseUrl}/BS_Cus`
        : `${baseUrl}/api/BS_Cus`;

      const res = await fetch(`${endpoint}?kd_cus=${kdCus || ""}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (!res.ok) {
        throw new Error("Gagal mengambil data laporan BS Cus");
      }

      const result = await res.json();
      let data = result?.data || result || [];

      if (Array.isArray(data) && kdCus) {
        data = data.filter(
          (item: any) => String(item.kd_cus) === String(kdCus)
        );
      }

      setReports(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error("Error fetch laporan BS:", err);
      setError(err.message || "Terjadi kesalahan saat mengambil data");
    } finally {
      setLoading(false);
    }
  };

  // --- LOGIKA FILTERING DATA ---
  const filteredReports = useMemo(() => {
    return reports.filter((item) => {
      const statusText = (item.status_cek || item.status || "").trim();

      if (selectedStatus !== "ALL" && statusText !== selectedStatus) {
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

  const getStatusBadgeStyle = (statusRaw: string) => {
    const status = (statusRaw || "").trim();

    switch (status) {
      case "Sudah DiCek":
        return "bg-blue-100 text-blue-700 border border-blue-200";
      case "Sudah DiPotong":
        return "bg-amber-100 text-amber-700 border border-amber-200";
      default:
        return "bg-gray-100 text-gray-700 border border-gray-200";
    }
  };

  // --- FUNGSI PRINT PDF / CETAK ORDERAN BS ---
  const handlePrintPDF = async (item: any) => {
    const kdTran = item.kd_tran || item.id;
    setPrintingId(kdTran);

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

    if ((!orderItems || orderItems.length === 0) && kdTran) {
      try {
        const endpoint = baseUrl.endsWith("/api")
          ? `${baseUrl}/BS_Cus/${kdTran}/details`
          : `${baseUrl}/api/BS_Cus/${kdTran}/details`;

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
        console.error("Gagal mengambil detail item BS untuk print:", e);
      }
    }

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Laporan BS Pelanggan - ${kdTran}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
            .header { border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-bottom: 20px; }
            .header h2 { margin: 0; color: #1e40af; font-size: 18px; }
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
            <h2>LAPORAN TRANSAKSI BS PELANGGAN</h2>
            <p style="margin: 5px 0 0 0; font-size: 12px; color: #666;">
              Dicetak pada: ${new Date().toLocaleString("id-ID")}
            </p>
          </div>

          <div class="info-grid">
            <div class="info-item"><span>No. Transaksi (kd_tran):</span> ${kdTran || "-"}</div>
            <div class="info-item"><span>Status Cek:</span> ${item.status_cek || item.status || "-"}</div>
            <div class="info-item"><span>Tanggal Transaksi:</span> ${item.tgl ? item.tgl.split("T")[0] : "-"}</div>
            <div class="info-item"><span>Kode Pelanggan (kd_cus):</span> ${item.kd_cus || "-"}</div>
            <div class="info-item" style="grid-column: span 2;"><span>Keterangan:</span> ${item.ket || "-"}</div>
          </div>

          <h3>Rincian Item BS</h3>
          <table>
            <thead>
              <tr>
                <th style="width: 40px;" class="text-center">No</th>
                <th>Nama BS</th>
                <th class="text-right" style="width: 60px;">Qty</th>
                <th class="text-right" style="width: 110px;">Nilai BS</th>
                <th class="text-right" style="width: 120px;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${
                Array.isArray(orderItems) && orderItems.length > 0
                  ? orderItems
                      .map((dt: any, i: number) => {
                        const namaBarang =
                          dt.bs?.nama ||
                          dt.nama_bs ||
                          dt.nama ||
                          dt.nama_br ||
                          dt.nama_brg ||
                          dt.product_name ||
                          `Barang BS (${dt.kd_bs || "-"})`;

                        return `
                        <tr>
                          <td class="text-center">${i + 1}</td>
                          <td>${namaBarang}</td>
                          <td class="text-right">${dt.qty || dt.jumlah || 1}</td>
                          <td class="text-right">Rp ${parseFloat(dt.nilai_bs || dt.harga || 0).toLocaleString("id-ID")}</td>
                          <td class="text-right">Rp ${parseFloat(
                            dt.subtotal ||
                              (dt.qty || 1) * (dt.nilai_bs || dt.harga || 0)
                          ).toLocaleString("id-ID")}</td>
                        </tr>
                      `;
                      })
                      .join("")
                  : `<tr><td colspan="5" style="text-align: center; color: #888;">Tidak ada rincian item BS.</td></tr>`
              }
              <tr class="total-row">
                <td colspan="4" class="text-right">TOTAL AKHIR:</td>
                <td class="text-right">Rp ${parseFloat(item.nilai_sementara || item.nilai_asli || 0).toLocaleString("id-ID")}</td>
              </tr>
            </tbody>
          </table>

          <div class="footer">
            <p>Terima kasih.</p>
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
        <title>Laporan BS - Naripo</title>
      </Head>

      <div className="max-w-6xl mx-auto px-2.5 sm:px-4 py-4 sm:py-8 min-h-screen">
        {/* Header Title Responsif */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <FiFileText className="w-5 h-5" />
            </div>
            <h1 className="text-lg sm:text-2xl font-bold text-gray-800">
              Laporan BS Pelanggan
            </h1>
          </div>
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-gray-600 hover:text-blue-600 transition"
          >
            <FiArrowLeft className="w-4 h-4" />
            <span>Kembali</span>
          </button>
        </div>

        {/* Panel Filter Responsif */}
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl shadow-sm border border-gray-100 mb-4 sm:mb-6">
          <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-gray-700 mb-3 pb-2 border-b border-gray-100">
            <FiFilter className="text-blue-600 w-4 h-4" />
            <span>Filter Laporan BS</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end">
            <div>
              <label className="block text-[11px] sm:text-xs font-semibold text-gray-600 mb-1">
                Tanggal Mulai :
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full text-xs sm:text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] sm:text-xs font-semibold text-gray-600 mb-1">
                Tanggal Selesai :
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full text-xs sm:text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] sm:text-xs font-semibold text-gray-600 mb-1">
                Status Cek :
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full text-xs sm:text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="ALL">Semua Status</option>
                <option value="Sudah DiCek">Sudah DiCek</option>
                <option value="Sudah DiPotong">Sudah DiPotong</option>
              </select>
            </div>

            <div>
              <button
                type="button"
                onClick={handleResetFilter}
                className="w-full flex items-center justify-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs sm:text-sm font-semibold py-2 px-3 rounded-lg transition active:scale-95"
              >
                <FiRotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filter</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content Table & List */}
        {loading ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-500 text-xs sm:text-sm">
              Memuat laporan BS Anda...
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
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
            <p className="text-gray-500 text-xs sm:text-sm mb-3">
              Tidak ada data laporan BS yang sesuai dengan filter.
            </p>
            {(startDate || endDate || selectedStatus !== "ALL") && (
              <button
                onClick={handleResetFilter}
                className="inline-flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold hover:bg-blue-700 transition"
              >
                <FiRotateCcw className="w-3.5 h-3.5" /> Reset Filter
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="space-y-3 sm:space-y-4">
              {paginatedReports.map((item: any, idx: number) => {
                const totalNilai = parseFloat(
                  item.nilai_sementara || item.nilai_asli || 0
                );
                const kdTran = item.kd_tran || item.id;
                const isPrinting = printingId === kdTran;
                const statusCek =
                  item.status_cek || item.status || "Sudah DiCek";

                return (
                  <div
                    key={kdTran || idx}
                    className="bg-white rounded-2xl p-3.5 sm:p-5 shadow-sm border border-gray-100 hover:shadow-md transition"
                  >
                    {/* Header Transaksi + Status & Print */}
                    <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-2.5 mb-2.5">
                      <div>
                        <span className="text-[10px] sm:text-xs font-mono text-gray-400 block">
                          No. Transaksi (kd_tran):
                        </span>
                        <h3 className="font-bold text-gray-800 text-sm sm:text-base leading-tight">
                          {kdTran || `-`}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full font-bold ${getStatusBadgeStyle(
                            statusCek
                          )}`}
                        >
                          {statusCek}
                        </span>

                        <button
                          type="button"
                          onClick={() => handlePrintPDF(item)}
                          disabled={isPrinting}
                          className="flex items-center gap-1 bg-red-50 text-red-600 border border-red-200 hover:bg-red-600 hover:text-white px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-bold transition disabled:opacity-50 active:scale-95 shrink-0"
                        >
                          <FiPrinter className="w-3.5 h-3.5" />
                          <span>{isPrinting ? "Mencetak..." : "PRINT PDF"}</span>
                        </button>
                      </div>
                    </div>

                    {/* Rincian Transaksi Responsif (2 Kolom di HP, 4 Kolom di PC) */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 text-xs sm:text-sm">
                      <div>
                        <p className="text-gray-400 text-[10px] sm:text-xs flex items-center gap-1">
                          <FiCalendar className="w-3 h-3 text-blue-500" /> Tanggal
                        </p>
                        <p className="font-semibold text-gray-800 mt-0.5">
                          {item.tgl ? item.tgl.split("T")[0] : "-"}
                        </p>
                      </div>

                      <div>
                        <p className="text-gray-400 text-[10px] sm:text-xs flex items-center gap-1">
                          <FiUser className="w-3 h-3 text-purple-500" /> Kode Pelanggan
                        </p>
                        <p className="font-semibold text-gray-800 mt-0.5 font-mono">
                          {item.kd_cus || "-"}
                        </p>
                      </div>

                      <div>
                        <p className="text-gray-400 text-[10px] sm:text-xs flex items-center gap-1">
                          <FiClock className="w-3 h-3 text-amber-500" /> Keterangan
                        </p>
                        <p className="font-semibold text-gray-800 mt-0.5 truncate">
                          {item.ket || "-"}
                        </p>
                      </div>

                      <div>
                        <p className="text-gray-400 text-[10px] sm:text-xs">
                          Total Nilai
                        </p>
                        <p className="font-extrabold text-blue-600 font-mono text-xs sm:text-sm mt-0.5">
                          Rp {totalNilai.toLocaleString("id-ID")}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Panel Pagination Responsif */}
            <div className="bg-white rounded-2xl p-3 sm:p-4 mt-5 shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                <span>Tampilkan:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="border border-gray-300 rounded px-2 py-1 text-xs sm:text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
                <span>
                  dari total <strong>{filteredReports.length}</strong> data
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage === 1}
                  className="p-1.5 sm:p-2 border rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-white transition"
                  title="Sebelumnya"
                >
                  <FiChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center px-2">
                  <span className="text-xs sm:text-sm font-semibold text-gray-700">
                    Halaman {currentPage} dari {totalPages}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                  className="p-1.5 sm:p-2 border rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-white transition"
                  title="Selanjutnya"
                >
                  <FiChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}