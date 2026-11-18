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
  FiSearch,
} from "react-icons/fi";

const formatAmount = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "-";
  const amount = Number(value);
  return Number.isFinite(amount)
    ? `Rp ${amount.toLocaleString("id-ID")}`
    : String(value);
};

export default function DetailHutangSupplierPage() {
  const router = useRouter();
  const { kd_sp } = router.query;

  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(40);

  useEffect(() => {
    if (kd_sp) {
      fetchDetailHutang(String(kd_sp));
    }
  }, [kd_sp]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, itemsPerPage]);

  const fetchDetailHutang = async (supplierCode: string) => {
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

    try {
      const res = await fetch(`${baseUrl}/hutang-supplier/${encodeURIComponent(supplierCode)}/details`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      const result = await res.json().catch(() => null);
      if (!res.ok || result?.success === false) {
        throw new Error(
          result?.message || "Gagal memproses data detail faktur hutang supplier"
        );
      }

      const data = result?.data ?? result;
      if (!Array.isArray(data)) {
        throw new Error("Format data detail hutang tidak sesuai");
      }

      setReports(data);
    } catch (err) {
      console.error("Error memproses detail hutang:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat memproses data detail hutang"
      );
    } finally {
      setLoading(false);
    }
  };

  // Filter pencarian berdasarkan nomor hutang
  const filteredReports = useMemo(() => {
    return reports.filter((item) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      const noHutang = String(item.no_hutang || "").toLowerCase();
      return noHutang.includes(query);
    });
  }, [reports, searchQuery]);

  // Hitung Grand Total untuk saldo hutang
  const grandTotalSaldoHutang = useMemo(() => {
    return filteredReports.reduce((sum, item) => {
      const val = Number(item.saldo_hutang);
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
        <title>Detail Faktur Hutang {kd_sp ? `- ${kd_sp}` : ""} - Naripo</title>
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
                    Rincian Faktur Hutang Supplier: <span className="underline">{kd_sp || "Memuat..."}</span>
                  </h1>
                  <p className="text-[11px] text-blue-100">
                    Daftar faktur pembelian belum lunas, umur faktur, dan tempo
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => router.push("/laporan/hutangsupplier")}
                className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/15 px-2.5 py-1.5 text-[11px] font-semibold text-blue-100 transition hover:bg-white/25 hover:text-white"
              >
                <FiArrowLeft className="h-3.5 w-3.5" />
                <span>Kembali</span>
              </button>
            </div>

            <div className="space-y-3 p-3.5 sm:p-5">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                <div className="relative w-full sm:w-80">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                    <FiSearch className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="Cari nomor hutang / faktur..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-9 pr-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
                <span className="text-xs font-medium text-slate-500">
                  Total Faktur: <strong>{filteredReports.length}</strong> transaksi
                </span>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center shadow-sm">
              <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
              <p className="text-xs text-gray-500 sm:text-sm">
                Memproses rincian faktur hutang...
              </p>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center text-red-600">
              <p className="mb-3 text-xs sm:text-sm">{error}</p>
              <button
                type="button"
                onClick={() => kd_sp && fetchDetailHutang(String(kd_sp))}
                className="rounded-lg bg-red-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700"
              >
                Coba Lagi
              </button>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center shadow-sm">
              <p className="text-xs text-gray-500 sm:text-sm">
                Tidak ada data rincian faktur hutang yang ditemukan untuk supplier ini.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="min-w-max w-full border-collapse text-xs">
                    <thead className="border-b border-slate-200 bg-slate-100 text-slate-700">
                      <tr>
                        <th className="px-3 py-3 text-left font-bold w-12">No</th>
                        <th className="px-3 py-3 text-left font-bold">No. Hutang / Faktur</th>
                        <th className="px-3 py-3 text-center font-bold">Tgl Hutang</th>
                        <th className="px-3 py-3 text-center font-bold">Tgl Lunas</th>
                        <th className="px-3 py-3 text-right font-bold">Jumlah (D)</th>
                        <th className="px-3 py-3 text-right font-bold">Saldo Hutang</th>
                        <th className="px-3 py-3 text-center font-bold">Umur (Hari)</th>
                        <th className="px-3 py-3 text-center font-bold">Tempo (Hari)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedReports.map((item, index) => {
                        const absoluteIndex =
                          (currentPage - 1) * itemsPerPage + index + 1;
                        return (
                          <tr
                            key={`${item.no_hutang}-${index}`}
                            className="hover:bg-blue-50/50"
                          >
                            <td className="px-3 py-3 text-slate-500">
                              {absoluteIndex}
                            </td>
                            <td className="px-3 py-3 font-mono font-bold text-slate-800">
                              {item.no_hutang}
                            </td>
                            <td className="px-3 py-3 text-center text-slate-600 font-mono">
                              {String(item.tgl_hutang || "").slice(0, 10)}
                            </td>
                            <td className="px-3 py-3 text-center text-slate-600 font-mono">
                              {item.tgl_lunas ? String(item.tgl_lunas).slice(0, 10) : "-"}
                            </td>
                            <td className="px-3 py-3 text-right font-mono text-slate-700">
                              {formatAmount(item.d)}
                            </td>
                            <td className="px-3 py-3 text-right font-mono font-bold text-rose-600">
                              {formatAmount(item.saldo_hutang)}
                            </td>
                            <td className="px-3 py-3 text-center font-mono font-semibold text-amber-600">
                              {item.umur_faktur} hari
                            </td>
                            <td className="px-3 py-3 text-center font-mono text-slate-700">
                              {item.tempo} hari
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="border-t-2 border-slate-300 bg-slate-50 font-bold text-slate-900">
                      <tr>
                        <td colSpan={5} className="px-3 py-3 text-left">
                          GRAND TOTAL SALDO HUTANG
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-rose-600">
                          {formatAmount(grandTotalSaldoHutang)}
                        </td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  </table>
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
                    dari <strong>{filteredReports.length}</strong> faktur
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