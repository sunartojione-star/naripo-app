"use client";

import { useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import {
  FiUser,
  FiLock,
  FiEye,
  FiEyeOff,
  FiArrowRight,
  FiShield,
} from "react-icons/fi";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Helper ID perangkat unik agar 1 akun bisa aktif di banyak HP sekaligus
  const getOrCreateDeviceId = () => {
    if (typeof window === "undefined") return "web-device";
    let devId = localStorage.getItem("device_id");
    if (!devId) {
      devId =
        "device_" +
        Math.random().toString(36).substring(2, 9) +
        "_" +
        Date.now();
      localStorage.setItem("device_id", devId);
    }
    return devId;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const rawApiUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://103.125.42.217:8081/api";
    const API_URL = rawApiUrl.replace(/\/$/, "");

    try {
      const deviceId = getOrCreateDeviceId();

      const res = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password: password,
          device_id: deviceId,
        }),
      });

      const data = await res.json();

      if (!res.ok || (data.success !== undefined && !data.success)) {
        throw new Error(
          data.message || "Login gagal, periksa kembali username/email dan password."
        );
      }

      const token = data.data?.token || data.token;
      const user = data.data?.user || data.user || data.data;

      if (!token) {
        throw new Error("Token autentikasi tidak ditemukan dari server.");
      }

      localStorage.setItem("token", token);

      if (user) {
        localStorage.setItem("user", JSON.stringify(user));
        const kdCus = user.kd_cus || user.kdCus || user.username || "";
        if (kdCus) {
          localStorage.setItem("kd_cus", kdCus);
        }
      }

      router.push("/");
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan pada server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Login - Koperasi Niaga Abadi</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-100/60 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Dekorasi Cahaya Ambient di Latar Belakang */}
        <div className="absolute -top-24 -left-24 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-indigo-400/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-100 p-6 sm:p-8">
            
            {/* Header: Logo & Nama Koperasi */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/25 mb-3">
                <img
                  src="/Logo_Niaga192X192.png"
                  alt="Logo Niaga"
                  className="w-10 h-10 object-contain drop-shadow"
                  onError={(e) => {
                    // Fallback jika logo belum ada
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              </div>

              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight">
                Koperasi Niaga Abadi
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Masuk ke akun Anda untuk mulai bertransaksi
              </p>
            </div>

            {/* Kotak Pesan Error */}
            {error && (
              <div className="mb-4 rounded-xl bg-red-50/90 border border-red-200 p-3 text-xs sm:text-sm text-red-600 flex items-center gap-2">
                <span className="shrink-0 font-bold">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Form Input */}
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Input Username / Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Username atau Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <FiUser className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="Masukkan username / email..."
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>
              </div>

              {/* Input Password dengan Tombol Intip (Eye) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <FiLock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Masukkan kata sandi..."
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <FiEyeOff className="w-4 h-4" />
                    ) : (
                      <FiEye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Tombol Submit Login */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.99] transition shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Memproses Masuk...</span>
                  </>
                ) : (
                  <>
                    <span>Masuk ke Akun</span>
                    <FiArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Pembatas / Divider */}
            <div className="relative my-6 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <span className="relative bg-white px-3 text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                Belum Terdaftar?
              </span>
            </div>

            {/* Tombol Buat Akun Baru */}
            <Link
              href="/login/register"
              className="block w-full py-2.5 text-center rounded-xl border border-blue-600/30 text-blue-600 hover:bg-blue-50/70 font-bold text-xs sm:text-sm transition active:scale-[0.99]"
            >
              Daftar Akun Baru
            </Link>

            {/* Footer Keamanan */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
              <FiShield className="w-3.5 h-3.5 text-emerald-500" />
              <span>Jalur Akses Aman & Terenkripsi</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}