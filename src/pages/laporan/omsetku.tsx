"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OmsetKuPage() {
  const router = useRouter();
  const [kdCus, setKdCus] = useState("A135"); // Bisa diubah atau dijadikan input teks/dropdown
  const [tglMulai, setTglMulai] = useState("2026-09-01");
  const [tglSelesai, setTglSelesai] = useState("2026-09-30");
  const [omsetBruto, setOmsetBruto] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCekOmset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setOmsetBruto(null);

    // Ambil token dari localStorage untuk otorisasi Sanctum
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Silakan login terlebih dahulu.");
      setLoading(false);
      return;
    }

    try {
      // Sesuaikan URL endpoint backend Laravel Anda
      const response = await fetch("http://103.125.42.217:8081/api/cek-omset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`, // Token disertakan di sini
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
    <div className="max-w-xl mx-auto mt-10 p-6 bg-white rounded-xl shadow-lg border border-slate-100">
      {/* Tombol Kembali */}
      <div className="mb-4">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors"
        >
          <svg
            className="w-4 h-4 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            ></path>
          </svg>
          Kembali
        </button>
      </div>

      <div className="mb-6 border-b pb-4">
        <h1 className="text-2xl font-bold text-slate-800">Cek Omset Bruto</h1>
        <p className="text-sm text-slate-500">
          Pilih rentang tanggal untuk melihat rekapitulasi omset customer.
        </p>
      </div>

      <form onSubmit={handleCekOmset} className="space-y-4">
        {/* Input Kode Customer */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            Kode Customer
          </label>
          <input
            type="text"
            value={kdCus}
            onChange={(e) => setKdCus(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Contoh: A135"
          />
        </div>

        {/* Input Tanggal Mulai */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            Tanggal Mulai
          </label>
          <input
            type="date"
            value={tglMulai}
            onChange={(e) => setTglMulai(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Input Tanggal Selesai */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            Tanggal Selesai
          </label>
          <input
            type="date"
            value={tglSelesai}
            onChange={(e) => setTglSelesai(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Tombol Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition duration-200 disabled:bg-slate-400 shadow-md"
        >
          {loading ? "Memproses..." : "CEK OMSET"}
        </button>
      </form>

      {/* Bagian Pesan Error */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Bagian Output Omset Bruto */}
      {omsetBruto !== null && (
        <div className="mt-6 p-5 bg-emerald-50 border border-emerald-200 rounded-xl shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">
            Hasil Omset Bruto
          </p>
          <p className="text-3xl font-extrabold text-emerald-800">
            Rp {Number(omsetBruto).toLocaleString("id-ID")}
          </p>
          <div className="mt-2 text-xs text-emerald-700 flex justify-between">
            <span>
              Customer: <strong>{kdCus}</strong>
            </span>
            <span>
              Periode: {tglMulai} s/d {tglSelesai}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
