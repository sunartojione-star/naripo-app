import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import { FiArrowLeft, FiDollarSign, FiCalendar, FiUser } from "react-icons/fi";

export default function OmsetKuPage() {
  const router = useRouter();
  const [kdCus, setKdCus] = useState<string>("A135");
  const [tglMulai, setTglMulai] = useState<string>("2026-09-01");
  const [tglSelesai, setTglSelesai] = useState<string>("2026-09-30");
  const [omsetBruto, setOmsetBruto] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://103.125.42.217:8081/api";

  // Ambil kode customer otomatis dari data login jika tersedia
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        const autoKd =
          parsed.kd_cus || parsed.username || parsed.kode || parsed.id;
        if (autoKd) {
          setKdCus(String(autoKd));
        }
      } catch (e) {
        console.error("Gagal membaca data user login", e);
      }
    }
  }, []);

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
      <div className="min-h-[80vh] py-4 sm:py-8 px-2.5 sm:px-4">
        <div className="max-w-xl mx-auto p-4 sm:p-6 bg-white rounded-2xl shadow-md border border-slate-100">
          {/* Tombol Kembali */}
          <div className="mb-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex items-center text-xs sm:text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors gap-1.5"
            >
              <FiArrowLeft className="w-4 h-4" />
              <span>Kembali</span>
            </button>
          </div>

          {/* Judul Halaman */}
          <div className="mb-5 sm:mb-6 border-b border-slate-100 pb-3 sm:pb-4 flex items-center gap-3">
            <div className="p-2 sm:p-2.5 bg-blue-50 text-blue-600 rounded-xl shrink-0">
              <FiDollarSign className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-bold text-slate-800 leading-tight">
                Cek Omset Bruto
              </h1>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                Pilih rentang tanggal rekapitulasi omset customer.
              </p>
            </div>
          </div>

          <form onSubmit={handleCekOmset} className="space-y-3.5 sm:space-y-4">
            {/* Input Kode Customer */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1">
                Kode Customer :
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={kdCus}
                  onChange={(e) => setKdCus(e.target.value.toUpperCase())}
                  required
                  className="w-full uppercase rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                  placeholder="Contoh: A135"
                />
                <FiUser className="absolute right-3 top-2.5 text-slate-400 w-4 h-4" />
              </div>
            </div>

            {/* Input Tanggal Mulai & Selesai (2 Kolom Responsif) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1">
                  Tanggal Mulai :
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={tglMulai}
                    onChange={(e) => setTglMulai(e.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1">
                  Tanggal Selesai :
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={tglSelesai}
                    onChange={(e) => setTglSelesai(e.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Tombol Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold py-2.5 px-4 rounded-lg transition duration-150 disabled:bg-slate-400 shadow-md text-xs sm:text-sm mt-2"
            >
              {loading ? "Memproses..." : "CEK OMSET"}
            </button>
          </form>

          {/* Pesan Error */}
          {error && (
            <div className="mt-4 p-3 sm:p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs sm:text-sm">
              {error}
            </div>
          )}

          {/* Output Hasil Omset Bruto (Format Titik Rupiah) */}
          {omsetBruto !== null && (
            <div className="mt-5 p-4 sm:p-5 bg-emerald-50 border border-emerald-200 rounded-xl shadow-sm animate-in fade-in zoom-in-95 duration-150">
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">
                Hasil Omset Bruto
              </p>
              <p className="text-2xl sm:text-3xl font-extrabold text-emerald-800 font-mono">
                Rp {Math.round(Number(omsetBruto)).toLocaleString("id-ID")}
              </p>
              <div className="mt-2.5 pt-2 border-t border-emerald-200/60 text-[11px] sm:text-xs text-emerald-700 flex flex-col sm:flex-row justify-between gap-1">
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
      </div>
    </Layout>
  );
}