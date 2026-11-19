"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Layout from "@/components/Layout";
import {
  FiArrowLeft,
  FiChevronLeft,
  FiChevronRight,
  FiFileText,
  FiMapPin,
  FiCalendar,
  FiSearch,
  FiUsers,
  FiDollarSign,
  FiX,
  FiRefreshCw,
} from "react-icons/fi";

const formatAmount = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "-";
  const amount = Number(value);
  return Number.isFinite(amount)
    ? `Rp ${amount.toLocaleString("id-ID")}`
    : String(value);
};

const toLocalYYYYMMDD = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const formatDateDDMMYYYY = (raw: unknown): string => {
  const s = String(raw || "").slice(0, 10);
  const parts = s.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return s || "-";
};

export default function PiutangAktifPage() {
  const router = useRouter();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(40);

  // State Popup Detail Piutang Anggota
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [dariDate, setDariDate] = useState<string>("");
  const [sampaiDate, setSampaiDate] = useState<string>("");
  const [saldoTerakhir, setSaldoTerakhir] = useState<number | null>(null);
  const [historyRows, setHistoryRows] = useState<any[]>([]);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const baseUrl = (
    process.env.NEXT_PUBLIC_API_URL || "http://103.125.42.217:8081/api"
  ).replace(/\/$/, "");

  useEffect(() => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    setDariDate(toLocalYYYYMMDD(firstDayOfMonth));
    setSampaiDate(toLocalYYYYMMDD(today));

    fetchPiutangAktif();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, itemsPerPage]);

  const fetchPiutangAktif = async () => {
    setLoading(true);
    setError(null);

    const token =
      localStorage.getItem("token") || localStorage.getItem("auth_token");
    if (!token) {
      router.push("/login");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${baseUrl}/lap-piutang`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      const result = await res.json().catch(() => null);
      if (!res.ok || result?.success === false) {
        throw new Error(
          result?.message || "Gagal memproses data piutang aktif"
        );
      }

      const data = result?.data ?? result;
      if (!Array.isArray(data)) {
        throw new Error("Format data piutang tidak sesuai");
      }

      setReports(data);
    } catch (err) {
      console.error("Error memproses piutang aktif:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat memproses data piutang"
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerDetail = async (
    kdCus: string,
    dari: string,
    sampai: string
  ) => {
    const token =
      localStorage.getItem("token") || localStorage.getItem("auth_token");
    if (!token) return;

    setLoadingDetail(true);
    setDetailError(null);

    try {
      const [resSaldo, resHistory] = await Promise.all([
        fetch(
          `${baseUrl}/piutang/saldo?kd_cus=${encodeURIComponent(kdCus.trim())}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          }
        ),
        fetch(
          `${baseUrl}/piutang/history?kd_cus=${encodeURIComponent(
            kdCus.trim()
          )}&dari=${encodeURIComponent(dari)}&sampai=${encodeURIComponent(
            sampai
          )}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          }
        ),
      ]);

      if (resSaldo.ok) {
        const jsonSaldo = await resSaldo.json().catch(() => null);
        const sVal =
          jsonSaldo?.data?.saldo_piutang_terakhir ??
          jsonSaldo?.data?.saldo_piutang ??
          jsonSaldo?.saldo_piutang_terakhir;
        if (sVal !== undefined && sVal !== null) {
          setSaldoTerakhir(Number(sVal));
        }
      }

      const jsonHistory = await resHistory.json().catch(() => null);
      if (!resHistory.ok || jsonHistory?.success === false) {
        throw new Error(
          jsonHistory?.message ||
            `Gagal memuat riwayat piutang (${resHistory.status})`
        );
      }

      const rows = Array.isArray(jsonHistory?.data)
        ? jsonHistory.data
        : Array.isArray(jsonHistory)
        ? jsonHistory
        : [];
      setHistoryRows(rows);
    } catch (err: any) {
      setDetailError(
        err?.message || "Gagal mengambil detail riwayat piutang pelanggan."
      );
      setHistoryRows([]);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleOpenCustomerDetail = (item: any) => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const defaultDari = toLocalYYYYMMDD(firstDayOfMonth);
    const defaultSampai = toLocalYYYYMMDD(today);

    setDariDate(defaultDari);
    setSampaiDate(defaultSampai);
    setSelectedCustomer(item);
    setSaldoTerakhir(
      item.saldo_piutang !== undefined ? Number(item.saldo_piutang) : null
    );
    setHistoryRows([]);
    setDetailError(null);
    if (item.kd_cus) {
      fetchCustomerDetail(String(item.kd_cus), defaultDari, defaultSampai);
    }
  };

  const filteredReports = useMemo(() => {
    return reports.filter((item) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      const nama = String(item.nama || "").toLowerCase();
      const kdCus = String(item.kd_cus || "").toLowerCase();
      const alamat = String(item.alamat || "").toLowerCase();
      return (
        nama.includes(query) || kdCus.includes(query) || alamat.includes(query)
      );
    });
  }, [reports, searchQuery]);

  const grandTotalPiutang = useMemo(() => {
    return filteredReports.reduce((sum, item) => {
      const val = Number(item.saldo_piutang);
      return sum + (Number.isFinite(val) ? val : 0);
    }, 0);
  }, [filteredReports]);

  const totalPages = Math.ceil(filteredReports.length / itemsPerPage) || 1;
  const paginatedReports = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredReports.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredReports, currentPage, itemsPerPage]);

  return (
    <Layout>
      <Head>
        <title>Piutang Anggota - Naripo</title>
      </Head>

      <div className="min-h-screen bg-slate-50/70 px-2.5 pt-2.5 pb-20 sm:px-4 sm:py-6">
        <div className="mx-auto max-w-7xl space-y-3 sm:space-y-4">
          {/* Header & Ringkasan Total */}
          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-md">
            <div className="flex items-start justify-between gap-2 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 px-3.5 py-3.5 text-white sm:items-center sm:p-5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/15 sm:h-10 sm:w-10">
                  <FiFileText className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-sm font-extrabold leading-tight sm:text-lg">
                    Piutang Anggota / Customer Aktif
                  </h1>
                  <p className="text-[11px] text-blue-100 leading-snug">
                    Klik nama anggota untuk melihat detail riwayat hutang
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

            <div className="p-3 sm:p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                <div className="flex items-center justify-between sm:justify-start gap-2.5 rounded-xl border border-blue-100 bg-blue-50/60 px-3.5 py-2.5 sm:px-4 sm:py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 sm:h-9 sm:w-9">
                      <FiUsers className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-600 sm:hidden">
                      Total Pelanggan
                    </p>
                  </div>
                  <div className="text-right sm:text-left">
                    <p className="hidden sm:block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Total Pelanggan
                    </p>
                    <p className="text-sm font-extrabold text-slate-800 sm:text-lg">
                      {filteredReports.length}{" "}
                      <span className="text-[11px] font-medium text-slate-500">
                        customer
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-start gap-2.5 rounded-xl border border-rose-100 bg-rose-50/70 px-3.5 py-2.5 sm:px-4 sm:py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-600 sm:h-9 sm:w-9">
                      <FiDollarSign className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-600 sm:hidden">
                      Total Hutang Pelanggan
                    </p>
                  </div>
                  <div className="text-right sm:text-left">
                    <p className="hidden sm:block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Total Hutang Pelanggan
                    </p>
                    <p className="font-mono text-sm font-extrabold text-rose-600 sm:text-lg">
                      {formatAmount(grandTotalPiutang)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pencarian Sticky */}
          <div className="sticky top-14 sm:top-16 z-20 rounded-2xl border border-slate-200/80 bg-white/95 backdrop-blur-sm p-2.5 sm:p-3 shadow-sm">
            <div className="relative w-full">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                <FiSearch className="h-4 w-4" />
              </span>
              <input
                type="text"
                placeholder="Cari nama, kode cus, atau alamat..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-9 pr-8 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-xs font-bold text-slate-400 hover:text-slate-600"
                  title="Hapus pencarian"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center shadow-sm">
              <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
              <p className="text-xs text-gray-500 sm:text-sm">
                Memproses data piutang...
              </p>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center text-red-600">
              <p className="mb-3 text-xs sm:text-sm">{error}</p>
              <button
                type="button"
                onClick={fetchPiutangAktif}
                className="rounded-lg bg-red-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700"
              >
                Coba Lagi
              </button>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center shadow-sm">
              <p className="text-xs text-gray-500 sm:text-sm">
                Tidak ada data piutang aktif yang ditemukan.
              </p>
            </div>
          ) : (
            <>
              {/* TAMPILAN HP: Daftar Kartu Kompak */}
              <div className="space-y-2 md:hidden">
                {paginatedReports.map((item, index) => {
                  const absoluteIndex =
                    (currentPage - 1) * itemsPerPage + index + 1;
                  return (
                    <div
                      key={`${item.kd_cus}-${index}`}
                      onClick={() => handleOpenCustomerDetail(item)}
                      className="rounded-xl border border-slate-100 bg-white p-3 shadow-xs space-y-1.5 cursor-pointer hover:border-blue-300 active:scale-[0.99] transition"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-1.5 min-w-0">
                          <span className="shrink-0 text-[11px] font-bold text-slate-400 mt-0.5">
                            {absoluteIndex}.
                          </span>
                          <h3 className="text-xs font-bold text-blue-800 leading-snug break-words">
                            {item.nama || "-"}
                          </h3>
                        </div>
                        {item.status_2 && (
                          <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
                            {item.status_2}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                        <div className="min-w-0 space-y-0.5 text-[11px] text-slate-500">
                          <div className="flex items-center gap-1">
                            <FiCalendar className="h-3 w-3 shrink-0 text-slate-400" />
                            <span className="font-mono">
                              {formatDateDDMMYYYY(item.tgl_akhir)}
                            </span>
                          </div>
                          {item.alamat && (
                            <div className="flex items-start gap-1">
                              <FiMapPin className="h-3 w-3 shrink-0 text-slate-400 mt-0.5" />
                              <span className="line-clamp-1">{item.alamat}</span>
                            </div>
                          )}
                        </div>

                        <div className="shrink-0 text-right">
                          <div className="text-[10px] text-slate-400">
                            Saldo Piutang ›
                          </div>
                          <div className="font-mono text-xs font-extrabold text-rose-600">
                            {formatAmount(item.saldo_piutang)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-3 font-bold text-slate-900">
                  <span className="text-xs">GRAND TOTAL PIUTANG</span>
                  <span className="font-mono text-sm text-rose-600">
                    {formatAmount(grandTotalPiutang)}
                  </span>
                </div>
              </div>

              {/* TAMPILAN PC: Tabel Lengkap */}
              <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-xs sm:text-sm">
                    <thead className="border-b border-slate-200 bg-slate-100 text-slate-700">
                      <tr>
                        <th className="px-3 py-3 text-left font-bold w-12">No</th>
                        <th className="px-3 py-3 text-left font-bold">
                          Nama Pelanggan (Klik untuk Detail)
                        </th>
                        <th className="px-3 py-3 text-right font-bold">
                          Saldo Piutang
                        </th>
                        <th className="px-3 py-3 text-center font-bold">
                          Tgl Belanja
                        </th>
                        <th className="px-3 py-3 text-center font-bold">
                          Status
                        </th>
                        <th className="px-3 py-3 text-left font-bold">Alamat</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedReports.map((item, index) => {
                        const absoluteIndex =
                          (currentPage - 1) * itemsPerPage + index + 1;
                        return (
                          <tr
                            key={`${item.kd_cus}-${index}`}
                            onClick={() => handleOpenCustomerDetail(item)}
                            className="hover:bg-blue-50/70 cursor-pointer transition-colors"
                          >
                            <td className="px-3 py-3 text-slate-500">
                              {absoluteIndex}
                            </td>
                            <td
                              className="max-w-[240px] px-3 py-3 font-semibold text-blue-700 hover:underline truncate"
                              title={item.nama}
                            >
                              {item.nama}
                            </td>
                            <td className="px-3 py-3 text-right font-mono font-bold text-rose-600 whitespace-nowrap">
                              {formatAmount(item.saldo_piutang)}
                            </td>
                            <td className="px-3 py-3 text-center text-slate-600 font-mono whitespace-nowrap">
                              {formatDateDDMMYYYY(item.tgl_akhir)}
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                {item.status_2}
                              </span>
                            </td>
                            <td
                              className="max-w-[240px] px-3 py-3 text-slate-600 truncate"
                              title={item.alamat}
                            >
                              {item.alamat || "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="border-t-2 border-slate-300 bg-slate-50 font-bold text-slate-900">
                      <tr>
                        <td colSpan={2} className="px-3 py-3 text-left">
                          GRAND TOTAL PIUTANG
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-rose-600 whitespace-nowrap">
                          {formatAmount(grandTotalPiutang)}
                        </td>
                        <td colSpan={3} className="px-3 py-3"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Pagination */}
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
                    dari <strong>{filteredReports.length}</strong> data
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

      {/* POPUP MODAL DETAIL RIWAYAT PIUTANG PELANGGAN */}
      {selectedCustomer && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setSelectedCustomer(null)}
        >
          <div
            className="bg-white w-full sm:max-w-5xl h-[90dvh] sm:h-auto sm:max-h-[88vh] rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between gap-2 shrink-0">
              <div className="min-w-0">
                <h3 className="font-bold text-sm sm:text-base truncate">
                  {selectedCustomer.nama || "-"}
                </h3>
                <p className="text-[11px] text-slate-300 font-mono">
                  Kode Cus: {selectedCustomer.kd_cus || "-"}
                  {selectedCustomer.alamat ? ` • ${selectedCustomer.alamat}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 shrink-0"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Ringkasan Saldo + Filter Tanggal */}
            <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200 space-y-3 shrink-0">
              <div className="flex items-center justify-between bg-rose-50 border border-rose-200 rounded-xl px-3.5 py-2.5">
                <span className="text-xs font-bold text-slate-700">
                  Saldo Piutang Terakhir:
                </span>
                <span className="font-mono text-sm sm:text-base font-extrabold text-rose-600">
                  {formatAmount(saldoTerakhir)}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                    Dari Tanggal
                  </label>
                  <input
                    type="date"
                    value={dariDate}
                    onChange={(e) => setDariDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                    Sampai Tanggal
                  </label>
                  <input
                    type="date"
                    value={sampaiDate}
                    onChange={(e) => setSampaiDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800"
                  />
                </div>
                <button
                  type="button"
                  disabled={loadingDetail}
                  onClick={() =>
                    fetchCustomerDetail(
                      String(selectedCustomer.kd_cus),
                      dariDate,
                      sampaiDate
                    )
                  }
                  className="col-span-2 sm:col-span-1 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1 active:scale-95 transition disabled:opacity-50"
                >
                  <FiRefreshCw
                    className={`w-3.5 h-3.5 ${
                      loadingDetail ? "animate-spin" : ""
                    }`}
                  />
                  <span>Tampilkan</span>
                </button>
              </div>
            </div>

            {/* Isi Riwayat Mutasi Piutang */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4">
              {loadingDetail ? (
                <div className="py-10 text-center text-xs text-slate-400">
                  Memuat riwayat piutang...
                </div>
              ) : detailError ? (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs text-center">
                  {detailError}
                </div>
              ) : historyRows.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400">
                  Tidak ada mutasi piutang pada rentang tanggal ini.
                </div>
              ) : (
                <>
                  {/* Tampilan HP: Kartu Mutasi */}
                  <div className="space-y-2 md:hidden">
                    {historyRows.map((row, idx) => {
                      const noPiutang = row.no_piutang ?? row.NO_PIUTANG ?? "-";
                      const tgl = formatDateDDMMYYYY(
                        row.tgl_piutang ?? row.TGL_PIUTANG
                      );
                      const ket = row.Ket ?? row.ket ?? row.KET ?? "-";
                      const hutang = Number(row.D ?? row.d ?? 0);
                      const bayar = Number(row.K ?? row.k ?? 0);
                      const bsVal = Number(row.bs ?? row.BS ?? 0);
                      const kuponVal = Number(row.kupon ?? row.KUPON ?? 0);
                      const saldo =
                        row.saldo_piutang ?? row.SALDO_PIUTANG ?? null;

                      return (
                        <div
                          key={row.no_urut ?? idx}
                          className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 text-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-mono font-bold text-slate-700">
                              {tgl} • #{noPiutang}
                            </span>
                            {saldo !== null && (
                              <span className="font-mono font-extrabold text-slate-900">
                                Saldo: {formatAmount(saldo)}
                              </span>
                            )}
                          </div>
                          <p className="text-slate-800 font-semibold break-words">
                            {String(ket)}
                          </p>
                          <div className="grid grid-cols-2 gap-1 text-[11px] font-mono pt-1.5 border-t border-slate-200/70">
                            <span className="text-rose-600">
                              Hutang: {formatAmount(hutang)}
                            </span>
                            <span className="text-emerald-600 text-right">
                              Bayar: {formatAmount(bayar)}
                            </span>
                            <span className="text-amber-700">
                              BS: {formatAmount(bsVal)}
                            </span>
                            <span className="text-blue-700 text-right">
                              Kupon: {formatAmount(kuponVal)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Tampilan PC: Tabel Mutasi */}
                  <div className="hidden md:block overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold">
                          <th className="px-2 py-2.5 w-20">No Piutang</th>
                          <th className="px-2 py-2.5 w-20">Tanggal</th>
                          <th className="px-2 py-2.5">Keterangan</th>
                          <th className="px-2 py-2.5 text-right">Hutang</th>
                          <th className="px-2 py-2.5 text-right">Bayar</th>
                          <th className="px-2 py-2.5 text-right">BS</th>
                          <th className="px-2 py-2.5 text-right">Kupon</th>
                          <th className="px-2 py-2.5 text-right">Saldo Piutang</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {historyRows.map((row, idx) => {
                          const noPiutang =
                            row.no_piutang ?? row.NO_PIUTANG ?? "-";
                          const tgl = formatDateDDMMYYYY(
                            row.tgl_piutang ?? row.TGL_PIUTANG
                          );
                          const ket = row.Ket ?? row.ket ?? row.KET ?? "-";
                          const hutang = Number(row.D ?? row.d ?? 0);
                          const bayar = Number(row.K ?? row.k ?? 0);
                          const bsVal = Number(row.bs ?? row.BS ?? 0);
                          const kuponVal = Number(row.kupon ?? row.KUPON ?? 0);
                          const saldo =
                            row.saldo_piutang ?? row.SALDO_PIUTANG ?? null;

                          return (
                            <tr
                              key={row.no_urut ?? idx}
                              className="hover:bg-blue-50/40"
                            >
                              <td className="px-2 py-2 font-mono text-slate-600 whitespace-nowrap">
                                {noPiutang}
                              </td>
                              <td className="px-2 py-2 font-mono text-slate-700 whitespace-nowrap">
                                {tgl}
                              </td>
                              <td className="px-2 py-2 text-slate-800 font-medium">
                                {String(ket)}
                              </td>
                              <td className="px-2 py-2 text-right font-mono text-rose-600 whitespace-nowrap">
                                {formatAmount(hutang)}
                              </td>
                              <td className="px-2 py-2 text-right font-mono text-emerald-600 whitespace-nowrap">
                                {formatAmount(bayar)}
                              </td>
                              <td className="px-2 py-2 text-right font-mono text-amber-700 whitespace-nowrap">
                                {formatAmount(bsVal)}
                              </td>
                              <td className="px-2 py-2 text-right font-mono text-blue-700 whitespace-nowrap">
                                {formatAmount(kuponVal)}
                              </td>
                              <td className="px-2 py-2 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                                {saldo !== null ? formatAmount(saldo) : "-"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}