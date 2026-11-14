"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import {
  FiArrowLeft,
  FiDollarSign,
  FiCalendar,
  FiUser,
  FiTrendingUp,
  FiSearch,
} from "react-icons/fi";

const formatLocalYMD = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDDMMYYYY = (ymd: string) => {
  if (!ymd) return "-";
  const [y, m, d] = ymd.split("-");
  if (!y || !m || !d) return ymd;
  return `${d}/${m}/${y}`;
};

const formatDisplayDate = (ymd: string) => {
  if (!ymd) return "-";
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return ymd;
  return new Date(y, m - 1, d).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function OmsetKuPage() {
  const router = useRouter();

  const [kdCus, setKdCus] = useState<string>("A135");
  const [loggedInKdCus, setLoggedInKdCus] = useState<string>("");
  const [loggedInName, setLoggedInName] = useState<string>("");
  const [namaPelanggan, setNamaPelanggan] = useState<string>("");

  const [tglMulai, setTglMulai] = useState<string>(() => {
    const now = new Date();
    return formatLocalYMD(new Date(now.getFullYear(), now.getMonth(), 1));
  });
  const [tglSelesai, setTglSelesai] = useState<string>(() =>
    formatLocalYMD(new Date())
  );
  const [activePreset, setActivePreset] = useState<string>("bulan_ini");

  const [omsetBruto, setOmsetBruto] = useState<number | null>(null);
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

  const applyPreset = (preset: "bulan_ini" | "bulan_lalu") => {
    const now = new Date();
    setActivePreset(preset);

    if (preset === "bulan_ini") {
      setTglMulai(formatLocalYMD(new Date(now.getFullYear(), now.getMonth(), 1)));
      setTglSelesai(formatLocalYMD(now));
    } else if (preset === "bulan_lalu") {
      const startLast = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endLast = new Date(now.getFullYear(), now.getMonth(), 0);
      setTglMulai(formatLocalYMD(startLast));
      setTglSelesai(formatLocalYMD(endLast));
    }
  };

  const handleCekOmset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setOmsetBruto(null);

    const token = localStorage.getItem("token");
    if (!token) {
      setError("Silakan login terlebih dahulu.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/cek-omset`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          kd_cus: kdCus,
          tgl_mulai: tglMulai,
          tgl_selesai: tglSelesai,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setOmsetBruto(result.data.omset_bruto);
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
        setError(result.message || "Gagal mengambil data omset.");
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
            {/* Header Gradien Ringkas */}
            <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 text-white px-4 py-3.5 sm:p-5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
                  <FiDollarSign className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-base sm:text-lg font-extrabold leading-tight">
                    Cek Omset Bruto
                  </h1>
                  <p className="text-[11px] text-blue-100">
                    Rekapitulasi transaksi customer
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

            {/* Form Input */}
            <form onSubmit={handleCekOmset} className="p-3.5 sm:p-5 space-y-3">
              {/* Nama Pelanggan (di atas Kode Customer) */}
              {namaPelanggan && (
                <div className="text-[11px] sm:text-xs text-slate-600 bg-blue-50/70 border border-blue-200/80 rounded-xl px-3 py-2 flex items-center gap-1.5">
                  <span className="text-blue-600 font-medium">Pelanggan:</span>
                  <strong className="text-slate-800 uppercase truncate">
                    {namaPelanggan}
                  </strong>
                </div>
              )}

              {/* Kode Customer + 2 Tombol Cepat */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-end">
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
                      className="w-full uppercase rounded-xl border border-slate-300 bg-slate-50 focus:bg-white pl-8 pr-3 py-2 text-xs sm:text-sm text-slate-800 font-bold tracking-wide focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition"
                      placeholder="Contoh: A135"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: "bulan_ini", label: "Bulan Ini" },
                    { id: "bulan_lalu", label: "Bulan Lalu" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        applyPreset(item.id as "bulan_ini" | "bulan_lalu")
                      }
                      className={`py-2 px-2 rounded-xl text-xs font-semibold border transition active:scale-95 ${
                        activePreset === item.id
                          ? "bg-blue-50 border-blue-500 text-blue-700"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input Tanggal Mulai & Selesai (Tampilan DD/MM/YYYY) */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1">
                    Tanggal Mulai
                  </label>
                  <div className="relative">
                    <div className="w-full rounded-xl border border-slate-300 bg-slate-50 px-2.5 sm:px-3 py-2 text-xs sm:text-sm text-slate-800 font-semibold flex items-center justify-between">
                      <span>{formatDDMMYYYY(tglMulai)}</span>
                      <FiCalendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    </div>
                    <input
                      type="date"
                      value={tglMulai}
                      onChange={(e) => {
                        setActivePreset("custom");
                        setTglMulai(e.target.value);
                      }}
                      required
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
                      <span>{formatDDMMYYYY(tglSelesai)}</span>
                      <FiCalendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    </div>
                    <input
                      type="date"
                      value={tglSelesai}
                      onChange={(e) => {
                        setActivePreset("custom");
                        setTglSelesai(e.target.value);
                      }}
                      required
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Tombol Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold py-2.5 px-4 rounded-xl transition duration-150 disabled:bg-slate-400 shadow-md shadow-blue-600/20 text-xs sm:text-sm flex items-center justify-center gap-2"
              >
                <FiSearch className="w-4 h-4" />
                <span>{loading ? "Menghitung Omset..." : "CEK OMSET"}</span>
              </button>

              {/* Pesan Error */}
              {error && (
                <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium">
                  {error}
                </div>
              )}
            </form>
          </div>

          {/* Kartu Hasil Omset Bruto */}
          {omsetBruto !== null && (
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-2xl p-4 sm:p-5 shadow-lg shadow-emerald-600/20 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-100 flex items-center gap-1.5 shrink-0">
                  <FiTrendingUp className="w-4 h-4" />
                  Total Omset Bruto
                </span>
                <span className="text-[11px] font-mono font-bold bg-white/15 px-2.5 py-0.5 rounded-full truncate">
                  {kdCus}
                  {namaPelanggan ? ` · ${namaPelanggan}` : ""}
                </span>
              </div>

              <p className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight my-1.5">
                Rp {Math.round(Number(omsetBruto)).toLocaleString("id-ID")}
              </p>

              <div className="mt-2 pt-2 border-t border-white/20 text-xs text-emerald-50">
                Periode: <strong>{formatDisplayDate(tglMulai)}</strong> –{" "}
                <strong>{formatDisplayDate(tglSelesai)}</strong>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}