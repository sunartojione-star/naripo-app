"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import {
  FiArrowLeft,
  FiCreditCard,
  FiUser,
  FiTrendingDown,
  FiSearch,
} from "react-icons/fi";

export default function SaldoPiutangPage() {
  const router = useRouter();

  const [kdCus, setKdCus] = useState<string>("A135");
  const [loggedInKdCus, setLoggedInKdCus] = useState<string>("");
  const [loggedInName, setLoggedInName] = useState<string>("");
  const [namaPelanggan, setNamaPelanggan] = useState<string>("");

  const [saldoPiutang, setSaldoPiutang] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const rawApiUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://103.125.42.217:8081/api";
  const apiUrl = rawApiUrl.replace(/\/$/, "");

  // Ambil kode customer dan nama pelanggan otomatis dari data login
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        const autoKd =
          parsed.kd_cus || parsed.username || parsed.kode || parsed.id;
        const autoName =
          parsed.nm_cus ||
          parsed.nama_customer ||
          parsed.nama ||
          parsed.name ||
          "";

        if (autoKd) {
          const kdStr = String(autoKd).toUpperCase();
          setKdCus(kdStr);
          setLoggedInKdCus(kdStr);
        }
        if (autoName) {
          const nameStr = String(autoName).trim();
          setLoggedInName(nameStr);
          setNamaPelanggan(nameStr);
        }
      } catch (e) {
        console.error("Gagal membaca data user login", e);
      }
    }
  }, []);

  const handleCekSaldo = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSaldoPiutang(null);

    const token = localStorage.getItem("token");
    if (!token) {
      setError("Silakan login terlebih dahulu.");
      setLoading(false);
      return;
    }

    try {
      // Mengirimkan parameter kd_cus ke endpoint piutang/saldo
      const queryParams = new URLSearchParams({
        kd_cus: kdCus,
      });

      const response = await fetch(`${apiUrl}/piutang/saldo?${queryParams.toString()}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Mengambil nilai dari key saldo_piutang_terakhir sesuai respons dari backend API
        const nilaiSaldo =
          result.data?.saldo_piutang_terakhir ??
          result.data?.saldo ??
          result.saldo ??
          0;

        setSaldoPiutang(Number(nilaiSaldo));

        const apiNama =
          result.data?.nm_cus ||
          result.data?.nama_customer ||
          result.data?.nama ||
          result.data?.name ||
          "";
        if (apiNama) {
          setNamaPelanggan(String(apiNama).trim());
        } else if (kdCus === loggedInKdCus && loggedInName) {
          setNamaPelanggan(loggedInName);
        } else {
          setNamaPelanggan("");
        }
      } else {
        setError(result.message || "Gagal mengambil data saldo piutang.");
      }
    } catch (err: any) {
      setError("Terjadi kesalahan koneksi ke server.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-[80vh] bg-slate-50/70 py-2.5 sm:py-6 px-2.5 sm:px-4">
        <div className="max-w-xl mx-auto space-y-3">
          {/* Card Utama */}
          <div className="bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden">
            {/* Header Gradien */}
            <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-red-700 text-white px-4 py-3.5 sm:p-5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
                  <FiCreditCard className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-base sm:text-lg font-extrabold leading-tight">
                    Cek Saldo Piutang
                  </h1>
                  <p className="text-[11px] text-orange-100">
                    Rekapitulasi saldo piutang customer
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => router.back()}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-100 hover:text-white bg-white/15 hover:bg-white/25 px-2.5 py-1.5 rounded-full transition shrink-0"
              >
                <FiArrowLeft className="w-3.5 h-3.5" />
                <span>Kembali</span>
              </button>
            </div>

            {/* Form Input */}
            <form onSubmit={handleCekSaldo} className="p-3.5 sm:p-5 space-y-3">
              {/* Nama Pelanggan */}
              {namaPelanggan && (
                <div className="text-[11px] sm:text-xs text-slate-600 bg-orange-50/70 border border-orange-200/80 rounded-xl px-3 py-2 flex items-center gap-1.5">
                  <span className="text-orange-600 font-medium">Pelanggan:</span>
                  <strong className="text-slate-800 uppercase truncate">
                    {namaPelanggan}
                  </strong>
                </div>
              )}

              {/* Kode Customer */}
              <div>
                <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1">
                  Kode Customer
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <FiUser className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="text"
                    value={kdCus}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setKdCus(val);
                      if (val === loggedInKdCus && loggedInName) {
                        setNamaPelanggan(loggedInName);
                      } else {
                        setNamaPelanggan("");
                      }
                    }}
                    required
                    className="w-full uppercase rounded-xl border border-slate-300 bg-slate-50 focus:bg-white pl-8 pr-3 py-2 text-xs sm:text-sm text-slate-800 font-bold tracking-wide focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition"
                    placeholder="Contoh: A135"
                  />
                </div>
              </div>

              {/* Tombol Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-orange-600 hover:bg-orange-700 active:scale-[0.99] text-white font-bold py-2.5 px-4 rounded-xl transition duration-150 disabled:bg-slate-400 shadow-md shadow-orange-600/20 text-xs sm:text-sm flex items-center justify-center gap-2"
              >
                <FiSearch className="w-4 h-4" />
                <span>{loading ? "Menghitung Saldo..." : "CEK SALDO PIUTANG"}</span>
              </button>

              {/* Pesan Error */}
              {error && (
                <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium">
                  {error}
                </div>
              )}
            </form>
          </div>

          {/* Kartu Hasil Saldo Piutang */}
          {saldoPiutang !== null && (
            <div className="bg-gradient-to-br from-red-600 to-rose-800 text-white rounded-2xl p-4 sm:p-5 shadow-lg shadow-red-600/20 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-red-100 flex items-center gap-1.5 shrink-0">
                  <FiTrendingDown className="w-4 h-4" />
                  Total Saldo Piutang
                </span>
                <span className="text-[11px] font-mono font-bold bg-white/15 px-2.5 py-0.5 rounded-full truncate">
                  {kdCus}
                  {namaPelanggan ? ` · ${namaPelanggan}` : ""}
                </span>
              </div>

              <p className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight my-1.5">
                Rp {Math.round(Number(saldoPiutang)).toLocaleString("id-ID")}
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}