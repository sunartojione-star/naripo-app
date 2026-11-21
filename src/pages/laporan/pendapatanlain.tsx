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
  FiDollarSign,
  FiFileText,
  FiFilter,
  FiLayers,
  FiSearch,
} from "react-icons/fi";

const formatLocalYMD = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDDMMYYYY = (dateValue: string) => {
  if (!dateValue) return "Semua Tanggal";
  const cleanDate = String(dateValue).slice(0, 10);
  const [year, month, day] = cleanDate.split("-");
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

export default function RekapPendapatanPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState<boolean>(false);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

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
    const token =
      localStorage.getItem("token") || localStorage.getItem("auth_token");
    if (!token) {
      router.replace("/login");
      return;
    }

    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const u = JSON.parse(storedUser);
        const role = String(u.role || u.Hak || u.level_user || "")
          .trim()
          .toLowerCase();

        if (role === "karyawan") {
          router.replace("/opname");
          return;
        }

        const isAllowed =
          role === "admin" ||
          role === "pengurus" ||
          role === "super admin" ||
          role === "superadmin" ||
          role === "kasir" ||
          Number(u.level_user) === 1 ||
          u.is_admin === true ||
          u.is_admin === 1;

        if (!isAllowed) {
          router.replace("/");
          return;
        }
      }
    } catch (e) {
      console.error("Gagal membaca data user:", e);
    }

    setAuthChecked(true);
    fetchRekapPendapatan();
  }, [router]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, itemsPerPage, startDate, endDate]);

  const fetchRekapPendapatan = async () => {
    setLoading(true);
    setError(null);

    const token =
      localStorage.getItem("token") || localStorage.getItem("auth_token");
    if (!token) {
      router.replace("/login");
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
        `${baseUrl}/rekap-pendapatan?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      if (res.status === 401) {
        router.replace("/login");
        return;
      }

      const result = await res.json().catch(() => null);
      if (!res.ok || result?.success === false) {
        throw new Error(
          result?.message || "Gagal memproses data rekap pendapatan"
        );
      }

      const data = result?.data ?? result;
      if (!Array.isArray(data)) {
        throw new Error("Format data rekap pendapatan tidak sesuai");
      }

      setReports(data);
    } catch (err) {
      console.error("Error memproses rekap pendapatan:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat memproses data rekap pendapatan"
      );
    } finally {
      setLoading(false);
    }
  };

  // Filter pencarian berdasarkan keterangan, kode akun, atau no transaksi
  const filteredReports = useMemo(() => {
    return reports.filter((item) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      const ket = String(item.Ket || "").toLowerCase();
      const kodeAkun = String(item.Kode_Akun || "").toLowerCase();
      const kdTran = String(item.Kd_Tran || "").toLowerCase();
      return (
        ket.includes(query) ||
        kodeAkun.includes(query) ||
        kdTran.includes(query)
      );
    });
  }, [reports, searchQuery]);

  // Kelompokkan data secara hierarki: Tanggal -> No. Transaksi (Kd_Tran)
  const groupedData = useMemo(() => {
    const groups: Record<
      string,
      {
        tgl: string;
        transactions: Record<
          string,
          { kdTran: string; items: any[]; subTotalTran: number }
        >;
        subTotalTgl: number;
      }
    > = {};

    filteredReports.forEach((item) => {
      const tglKey = String(item.Tgl || "").slice(0, 10);
      const kdTranKey = String(item.Kd_Tran || "Tanpa Transaksi");
      const jumlah = Number(item.Jumlah) || 0;

      if (!groups[tglKey]) {
        groups[tglKey] = {
          tgl: tglKey,
          transactions: {},
          subTotalTgl: 0,
        };
      }

      if (!groups[tglKey].transactions[kdTranKey]) {
        groups[tglKey].transactions[kdTranKey] = {
          kdTran: kdTranKey,
          items: [],
          subTotalTran: 0,
        };
      }

      groups[tglKey].transactions[kdTranKey].items.push(item);
      groups[tglKey].transactions[kdTranKey].subTotalTran += jumlah;
      groups[tglKey].subTotalTgl += jumlah;
    });

    return Object.values(groups);
  }, [filteredReports]);

  // Flatten kelompok data untuk kebutuhan pagination
  const flattenedRows = useMemo(() => {
    const rows: Array<{ type: "header" | "tran" | "item"; data: any }> = [];

    groupedData.forEach((group) => {
      rows.push({ type: "header", data: group });

      Object.values(group.transactions).forEach((tran) => {
        rows.push({ type: "tran", data: tran });

        tran.items.forEach((item) => {
          rows.push({ type: "item", data: item });
        });
      });
    });

    return rows;
  }, [groupedData]);

  // Grand Total Keseluruhan Pendapatan
  const grandTotalPendapatan = useMemo(() => {
    return filteredReports.reduce((sum, item) => {
      const val = Number(item.Jumlah);
      return sum + (Number.isFinite(val) ? val : 0);
    }, 0);
  }, [filteredReports]);

  const totalPages = Math.ceil(flattenedRows.length / itemsPerPage) || 1;
  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return flattenedRows.slice(startIndex, startIndex + itemsPerPage);
  }, [flattenedRows, currentPage, itemsPerPage]);

  if (!authChecked) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">
          Memeriksa hak akses...
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Rekap Pendapatan - Naripo</title>
      </Head>

      <div className="min-h-screen bg-slate-50/70 px-2.5 pt-2.5 pb-20 sm:px-4 sm:py-6">
        <div className="mx-auto max-w-7xl space-y-3 sm:space-y-4">
          {/* Header, Ringkasan Total & Filter Periode */}
          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-md">
            <div className="flex items-start justify-between gap-2 bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 px-3.5 py-3.5 text-white sm:items-center sm:p-5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/15 sm:h-10 sm:w-10">
                  <FiFileText className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-sm font-extrabold leading-tight sm:text-lg">
                    Rekap Pendapatan (Hierarki)
                  </h1>
                  <p className="text-[11px] text-emerald-100 leading-snug">
                    Dikelompokkan berdasarkan Tanggal dan No. Transaksi
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => router.back()}
                className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/15 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-100 transition hover:bg-white/25 hover:text-white"
              >
                <FiArrowLeft className="h-3.5 w-3.5" />
                <span>Kembali</span>
              </button>
            </div>

            <div className="space-y-3 p-3 sm:p-5">
              {/* Kotak Ringkasan Atas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                <div className="flex items-center justify-between sm:justify-start gap-2.5 rounded-xl border border-teal-100 bg-teal-50/60 px-3.5 py-2.5 sm:px-4 sm:py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-teal-700 sm:h-9 sm:w-9">
                      <FiLayers className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-600 sm:hidden">
                      Total Transaksi
                    </p>
                  </div>
                  <div className="text-right sm:text-left">
                    <p className="hidden sm:block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Total Transaksi
                    </p>
                    <p className="text-sm font-extrabold text-slate-800 sm:text-lg">
                      {filteredReports.length}{" "}
                      <span className="text-[11px] font-medium text-slate-500">
                        transaksi
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-start gap-2.5 rounded-xl border border-emerald-100 bg-emerald-50/70 px-3.5 py-2.5 sm:px-4 sm:py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 sm:h-9 sm:w-9">
                      <FiDollarSign className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-600 sm:hidden">
                      Total Pendapatan
                    </p>
                  </div>
                  <div className="text-right sm:text-left">
                    <p className="hidden sm:block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Total Pendapatan
                    </p>
                    <p className="font-mono text-sm font-extrabold text-emerald-600 sm:text-lg">
                      {formatAmount(grandTotalPendapatan)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Filter Periode Tanggal */}
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <FiFilter className="h-3.5 w-3.5 text-emerald-600" />
                  Filter Periode Tanggal
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
                      <FiCalendar className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
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
                      <FiCalendar className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    </div>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(event) => setEndDate(event.target.value)}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    />
                  </div>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <button
                    type="button"
                    onClick={fetchRekapPendapatan}
                    disabled={loading}
                    className="w-full rounded-xl border border-emerald-600 bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
                  >
                    {loading ? "MEMPROSES..." : "PROSES"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Pencarian Sticky (Tetap Tampil Rapi Saat Scroll) */}
          <div className="sticky top-14 sm:top-16 z-20 rounded-2xl border border-slate-200/80 bg-white/95 backdrop-blur-sm p-2.5 sm:p-3 shadow-sm">
            <div className="relative w-full">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                <FiSearch className="h-4 w-4" />
              </span>
              <input
                type="text"
                placeholder="Cari keterangan, kode akun, no tran..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-9 pr-8 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 sm:text-sm"
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
              <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-b-2 border-emerald-600" />
              <p className="text-xs text-gray-500 sm:text-sm">
                Memproses data rekap pendapatan...
              </p>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center text-red-600">
              <p className="mb-3 text-xs sm:text-sm">{error}</p>
              <button
                type="button"
                onClick={fetchRekapPendapatan}
                className="rounded-lg bg-red-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700"
              >
                Coba Lagi
              </button>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center shadow-sm">
              <p className="text-xs text-gray-500 sm:text-sm">
                Tidak ada data rekap pendapatan pada rentang tanggal ini.
              </p>
            </div>
          ) : (
            <>
              {/* TAMPILAN HP: Daftar Kartu Hierarki (Tidak Terpotong) */}
              <div className="space-y-2 md:hidden">
                {paginatedRows.map((row, index) => {
                  if (row.type === "header") {
                    const group = row.data;
                    return (
                      <div
                        key={`m-header-${group.tgl}-${index}`}
                        className="flex items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50/90 px-3 py-2 text-xs font-bold text-emerald-900"
                      >
                        <span>📅 {formatDDMMYYYY(group.tgl)}</span>
                        <span className="font-mono text-emerald-700">
                          {formatAmount(group.subTotalTgl)}
                        </span>
                      </div>
                    );
                  }

                  if (row.type === "tran") {
                    const tran = row.data;
                    return (
                      <div
                        key={`m-tran-${tran.kdTran}-${index}`}
                        className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-100/80 px-3 py-1.5 text-[11px] font-semibold text-slate-700"
                      >
                        <span className="font-mono truncate">
                          └─ {tran.kdTran}
                        </span>
                        <span className="shrink-0 font-mono text-slate-800">
                          {formatAmount(tran.subTotalTran)}
                        </span>
                      </div>
                    );
                  }

                  const item = row.data;
                  return (
                    <div
                      key={`m-item-${index}`}
                      className="rounded-xl border border-slate-100 bg-white p-3 shadow-xs space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-700">
                            {String(item.Kode_Akun || "-").trim()}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400 truncate">
                            {item.Kd_Tran || "-"}
                          </span>
                        </div>
                        <span className="shrink-0 font-mono text-xs font-extrabold text-emerald-600">
                          {formatAmount(item.Jumlah)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 leading-snug break-words">
                        {item.Ket || "-"}
                      </p>
                    </div>
                  );
                })}

                {/* Kartu Grand Total di Bawah Daftar (HP) */}
                <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-3 font-bold text-slate-900">
                  <span className="text-xs">GRAND TOTAL PENDAPATAN</span>
                  <span className="font-mono text-sm text-emerald-600">
                    {formatAmount(grandTotalPendapatan)}
                  </span>
                </div>
              </div>

              {/* TAMPILAN PC: Tabel Hierarki Lengkap */}
              <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-xs sm:text-sm">
                    <thead className="border-b border-slate-200 bg-slate-100 text-slate-700">
                      <tr>
                        <th className="px-3 py-3 text-left font-bold">
                          Kode Akun
                        </th>
                        <th className="px-3 py-3 text-left font-bold">
                          No. Transaksi
                        </th>
                        <th className="px-3 py-3 text-left font-bold">
                          Keterangan
                        </th>
                        <th className="px-3 py-3 text-right font-bold">
                          Jumlah
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedRows.map((row, index) => {
                        if (row.type === "header") {
                          const group = row.data;
                          return (
                            <tr
                              key={`header-${group.tgl}-${index}`}
                              className="bg-emerald-50/80 font-bold text-emerald-900 border-t-2 border-emerald-200"
                            >
                              <td colSpan={3} className="px-3 py-2.5">
                                📅 Tanggal: {formatDDMMYYYY(group.tgl)}
                              </td>
                              <td className="px-3 py-2.5 text-right font-mono whitespace-nowrap">
                                Sub-Total Tgl: {formatAmount(group.subTotalTgl)}
                              </td>
                            </tr>
                          );
                        }

                        if (row.type === "tran") {
                          const tran = row.data;
                          return (
                            <tr
                              key={`tran-${tran.kdTran}-${index}`}
                              className="bg-slate-100/70 font-semibold text-slate-800"
                            >
                              <td className="px-3 py-2 pl-6" colSpan={1}>
                                └─ No. Transaksi
                              </td>
                              <td className="px-3 py-2 font-mono" colSpan={2}>
                                {tran.kdTran}
                              </td>
                              <td className="px-3 py-2 text-right font-mono text-slate-700 whitespace-nowrap">
                                {formatAmount(tran.subTotalTran)}
                              </td>
                            </tr>
                          );
                        }

                        const item = row.data;
                        return (
                          <tr
                            key={`item-${index}`}
                            className="hover:bg-emerald-50/30"
                          >
                            <td className="px-3 py-2.5 pl-10 font-mono font-semibold text-slate-700">
                              {String(item.Kode_Akun || "").trim()}
                            </td>
                            <td className="px-3 py-2.5 font-mono text-slate-500">
                              {item.Kd_Tran || "-"}
                            </td>
                            <td
                              className="max-w-[320px] lg:max-w-[460px] px-3 py-2.5 text-slate-800 truncate"
                              title={item.Ket}
                            >
                              {item.Ket || "-"}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-600 whitespace-nowrap">
                              {formatAmount(item.Jumlah)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="border-t-2 border-slate-300 bg-slate-50 font-bold text-slate-900">
                      <tr>
                        <td colSpan={3} className="px-3 py-3 text-left">
                          GRAND TOTAL KESELURUHAN PENDAPATAN
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-emerald-600 whitespace-nowrap">
                          {formatAmount(grandTotalPendapatan)}
                        </td>
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
                    className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 sm:text-sm"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={40}>40</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span>
                    dari <strong>{flattenedRows.length}</strong> baris hierarki
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