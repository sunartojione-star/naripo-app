"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Layout from "@/components/Layout";
import {
  FiArrowLeft,
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
  FiFileText,
  FiFilter,
  FiBarChart2,
} from "react-icons/fi";

// Import Chart.js components untuk Line Chart
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const rekapColumns = [
  { key: "saldo_awal", label: "Penjualan" },
  { key: "omset", label: "Omset Cash" },
  { key: "setor_kasir", label: "Keuntungan" },
  { key: "biaya_lain2", label: "Biaya Operasional" },
  { key: "pendt_lain2", label: "Pendapatan Lain2" },
  { key: "saldo_akhir", label: "Gross Profit" },
  { key: "pembelian", label: "Pembelian" },
  { key: "stok_brg", label: "Stok Barang" },
  { key: "stok_bs", label: "Stok BS" },
  { key: "stok_kupon", label: "Stok Kupon" },
  { key: "piutang", label: "Saldo Piutang" },
  { key: "saldo_hutang", label: "Saldo Hutang" },
  { key: "uang_masuk", label: "HPP * TERJUAL" },
  { key: "bs_plg_dari", label: "BS Pelanggan Dari" },
  { key: "bs_plg_pot", label: "BS Pelanggan Pot" },
  { key: "kupon_plg_dari", label: "Kupon Pelanggan Dari" },
  { key: "kupon_plg_pot", label: "Kupon Pelanggan Pot" },
  { key: "selisih", label: "Selisih" },
  { key: "bs_sup_dari", label: "BS Supplier Dari" },
  { key: "bs_sup_pot_real", label: "BS Supplier Pot Real" },
  { key: "kupon_sup_dari", label: "Kupon Supplier Dari" },
  { key: "kupon_sup_pot_real", label: "Kupon Supplier Pot Real" },
  { key: "selisih_omset", label: "Selisih Omset" },
];

const formatLocalYMD = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDDMMYYYY = (dateValue: string) => {
  if (!dateValue) return "Semua Tanggal";
  const [year, month, day] = dateValue.slice(0, 10).split("-");
  if (!year || !month || !day) return dateValue;
  return `${day}/${month}/${year}`;
};

const formatAmount = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "-";
  const amount = Number(value);
  return Number.isFinite(amount)
    ? `Rp ${amount.toLocaleString("id-ID")}`
    : String(value);
};

export default function LaporanLabaRugiPage() {
  const router = useRouter();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [startDate, setStartDate] = useState<string>(() => {
    const now = new Date();
    return formatLocalYMD(new Date(now.getFullYear(), now.getMonth(), 1));
  });
  const [endDate, setEndDate] = useState<string>(() =>
    formatLocalYMD(new Date())
  );
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(40);

  useEffect(() => {
    fetchLaporan();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [startDate, endDate, itemsPerPage]);

  const fetchLaporan = async () => {
    setLoading(true);
    setError(null);

    const token =
      localStorage.getItem("token") || localStorage.getItem("auth_token");
    if (!token) {
      alert("Anda belum login. Silakan login terlebih dahulu.");
      router.push("/login");
      setLoading(false);
      return;
    }

    const baseUrl = (
      process.env.NEXT_PUBLIC_API_URL || "http://103.125.42.217:8081/api"
    ).replace(/\/$/, "");
    const params = new URLSearchParams({
      dari: startDate,
      sampai: endDate,
    });

    try {
      const res = await fetch(
        `${baseUrl}/rekap-penjualan?${params.toString()}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      const result = await res.json().catch(() => null);
      if (!res.ok || result?.success === false) {
        throw new Error(
          result?.message || "Gagal memproses rekap penjualan"
        );
      }

      const data = result?.data ?? result;
      if (!Array.isArray(data)) {
        throw new Error("Format data rekap penjualan tidak sesuai");
      }

      setReports(data);
    } catch (err) {
      console.error("Error memproses rekap penjualan:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat memproses rekap penjualan"
      );
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = useMemo(() => {
    return reports.filter((item) => {
      const itemDate = String(item.tgl || "").slice(0, 10);
      if (!itemDate) return false;
      if (startDate && itemDate < startDate) return false;
      if (endDate && itemDate > endDate) return false;
      return true;
    });
  }, [reports, startDate, endDate]);

  const grandTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    rekapColumns.forEach((col) => {
      totals[col.key] = filteredReports.reduce((sum, item) => {
        const val = Number(item[col.key]);
        return sum + (Number.isFinite(val) ? val : 0);
      }, 0);
    });
    return totals;
  }, [filteredReports]);

  const totalPages = Math.ceil(filteredReports.length / itemsPerPage) || 1;
  const paginatedReports = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredReports.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredReports, currentPage, itemsPerPage]);

  // Konfigurasi Line Chart sesuai gaya gambar referensi Anda
  const chartData = useMemo(() => {
    const labels = filteredReports.map((item) => formatDDMMYYYY(String(item.tgl || "")));
    const penjualanData = filteredReports.map((item) => Number(item.saldo_awal) || 0);
    const omsetData = filteredReports.map((item) => Number(item.omset) || 0);
    const keuntunganData = filteredReports.map((item) => Number(item.setor_kasir) || 0);

    return {
      labels,
      datasets: [
        {
          label: "Penjualan",
          data: penjualanData,
          borderColor: "#06b6d4", // Cyan terang sesuai gambar
          backgroundColor: "#06b6d4",
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0, // Garis bersudut tajam/lurus seperti contoh
        },
        {
          label: "Omset Cash",
          data: omsetData,
          borderColor: "#10b981", // Hijau
          backgroundColor: "#10b981",
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0,
        },
        {
          label: "Keuntungan",
          data: keuntunganData,
          borderColor: "#f59e0b", // Amber/Kuning
          backgroundColor: "#f59e0b",
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0,
        },
      ],
    };
  }, [filteredReports]);

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: "Grafik Tren Penjualan, Omset Cash, dan Keuntungan",
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function (value: any) {
            return "Rp " + Number(value).toLocaleString("id-ID");
          },
        },
      },
    },
  };

  return (
    <Layout>
      <Head>
        <title>Rekap Penjualan - Naripo</title>
      </Head>

      <div className="min-h-screen bg-slate-50/70 px-2.5 py-2.5 sm:px-4 sm:py-6">
        <div className="mx-auto max-w-7xl space-y-3 sm:space-y-4">
          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-md">
            <div className="flex items-center justify-between gap-2 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 px-4 py-3.5 text-white sm:p-5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/15 sm:h-10 sm:w-10">
                  <FiFileText className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-base font-extrabold leading-tight sm:text-lg">
                    Rekap Penjualan
                  </h1>
                  <p className="text-[11px] text-blue-100">
                    Rekap harian berdasarkan rentang tanggal
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => router.back()}
                className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/15 px-2.5 py-1.5 text-[11px] font-semibold text-blue-100 transition hover:bg-white/25 hover:text-white"
              >
                <FiArrowLeft className="h-3.5 w-3.5" />
                <span>Kembali</span>
              </button>
            </div>

            <div className="space-y-3 p-3.5 sm:p-5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <FiFilter className="h-3.5 w-3.5 text-blue-600" />
                  Filter Laporan
                </span>
                <span className="text-[11px] font-medium text-slate-400">
                  {filteredReports.length} hari
                </span>
              </div>

              <div className="grid grid-cols-2 items-end gap-2.5 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-[11px] font-bold text-slate-700 sm:text-xs">
                    Tanggal Mulai
                  </label>
                  <div className="relative">
                    <div className="flex w-full items-center justify-between rounded-xl border border-slate-300 bg-slate-50 px-2.5 py-2 text-xs font-semibold text-slate-800 sm:px-3 sm:text-sm">
                      <span className="truncate">
                        {formatDDMMYYYY(startDate)}
                      </span>
                      <FiCalendar className="h-3.5 w-3.5 shrink-0 text-blue-600" />
                    </div>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(event) => setStartDate(event.target.value)}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-bold text-slate-700 sm:text-xs">
                    Tanggal Selesai
                  </label>
                  <div className="relative">
                    <div className="flex w-full items-center justify-between rounded-xl border border-slate-300 bg-slate-50 px-2.5 py-2 text-xs font-semibold text-slate-800 sm:px-3 sm:text-sm">
                      <span className="truncate">
                        {formatDDMMYYYY(endDate)}
                      </span>
                      <FiCalendar className="h-3.5 w-3.5 shrink-0 text-blue-600" />
                    </div>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(event) => setEndDate(event.target.value)}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    />
                  </div>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={fetchLaporan}
                    disabled={loading}
                    className="w-full rounded-xl border border-blue-600 bg-blue-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
                  >
                    {loading ? "MEMPROSES..." : "PROSES"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center shadow-sm">
              <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
              <p className="text-xs text-gray-500 sm:text-sm">
                Memproses rekap penjualan...
              </p>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center text-red-600">
              <p className="mb-3 text-xs sm:text-sm">{error}</p>
              <button
                type="button"
                onClick={fetchLaporan}
                className="rounded-lg bg-red-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700"
              >
                Coba Lagi
              </button>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center shadow-sm">
              <p className="text-xs text-gray-500 sm:text-sm">
                Tidak ada data rekap penjualan pada rentang tanggal ini.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="min-w-max w-full border-collapse text-xs">
                    <thead className="border-b border-slate-200 bg-slate-100 text-slate-700">
                      <tr>
                        <th className="sticky left-0 z-10 bg-slate-100 px-3 py-3 text-left font-bold">
                          Tanggal
                        </th>
                        {rekapColumns.map((column) => (
                          <th
                            key={column.key}
                            className="whitespace-nowrap px-3 py-3 text-right font-bold"
                          >
                            {column.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedReports.map((item, index) => (
                        <tr
                          key={`${item.tgl || "rekap"}-${index}`}
                          className="hover:bg-blue-50/50"
                        >
                          <td className="sticky left-0 whitespace-nowrap bg-white px-3 py-3 font-semibold text-slate-800">
                            {formatDDMMYYYY(String(item.tgl || ""))}
                          </td>
                          {rekapColumns.map((column) => (
                            <td
                              key={column.key}
                              className="whitespace-nowrap px-3 py-3 text-right font-mono text-slate-700"
                            >
                              {formatAmount(item[column.key])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t-2 border-slate-300 bg-slate-50 font-bold text-slate-900">
                      <tr>
                        <td className="sticky left-0 whitespace-nowrap bg-slate-50 px-3 py-3 text-left">
                          GRAND TOTAL
                        </td>
                        {rekapColumns.map((column) => (
                          <td
                            key={column.key}
                            className="whitespace-nowrap px-3 py-3 text-right font-mono"
                          >
                            {formatAmount(grandTotals[column.key])}
                          </td>
                        ))}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* LINE CHART (GRAFIK GARIS) */}
              <div className="rounded-2xl border border-slate-100 bg-white p-4 sm:p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <FiBarChart2 className="w-5 h-5 text-cyan-600" />
                  <h2 className="text-sm sm:text-base font-bold text-slate-800">
                    Grafik Tren Penjualan, Omset Cash, & Keuntungan
                  </h2>
                </div>
                <div className="w-full h-[350px] sm:h-[420px]">
                  <Line data={chartData} options={chartOptions} />
                </div>
              </div>

              <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm sm:flex-row sm:p-4">
                <div className="flex items-center gap-2 text-xs text-slate-600 sm:text-sm">
                  <span>Tampilkan:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(event) =>
                      setItemsPerPage(Number(event.target.value))
                    }
                    className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={40}>40</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span>
                    dari <strong>{filteredReports.length}</strong> hari
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((page) => Math.max(page - 1, 1))
                    }
                    disabled={currentPage === 1}
                    className="rounded-lg border p-1.5 text-slate-600 transition hover:bg-slate-100 disabled:opacity-40 sm:p-2"
                    title="Sebelumnya"
                  >
                    <FiChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="px-2 text-xs font-semibold text-slate-700 sm:text-sm">
                    Halaman {currentPage} dari {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((page) => Math.min(page + 1, totalPages))
                    }
                    disabled={currentPage === totalPages}
                    className="rounded-lg border p-1.5 text-slate-600 transition hover:bg-slate-100 disabled:opacity-40 sm:p-2"
                    title="Selanjutnya"
                  >
                    <FiChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}