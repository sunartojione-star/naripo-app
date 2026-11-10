"use client";

import { useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Helper membuat ID perangkat unik per masing-masing HP / PC
  const getOrCreateDeviceId = () => {
    if (typeof window === "undefined") return "web-device";
    let devId = localStorage.getItem("device_id");
    if (!devId) {
      devId = "device_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now();
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
          device_id: deviceId, // Setiap HP memiliki ID unik sendiri
        }),
      });

      const data = await res.json();

      if (!res.ok || (data.success !== undefined && !data.success)) {
        throw new Error(
          data.message || "Login gagal, periksa kembali username/email dan password."
        );
      }

      // Ambil token & user secara fleksibel (support data.data maupun data langsung)
      const token = data.data?.token || data.token;
      const user = data.data?.user || data.user || data.data;

      if (!token) {
        throw new Error("Token autentikasi tidak ditemukan dari server.");
      }

      // 1. Simpan Token di browser HP ini
      localStorage.setItem("token", token);

      // 2. Simpan Data User Lengkap
      if (user) {
        localStorage.setItem("user", JSON.stringify(user));
        
        // 3. Simpan kd_cus untuk keranjang
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
        <title>Login - Naripo</title>
      </Head>
      <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 sm:p-8 shadow-md border border-gray-100">
          <h2 className="mb-6 text-center text-2xl font-bold text-gray-800">
            Login Koperasi
          </h2>

          {error && (
            <div className="mb-4 rounded-xl bg-red-50 p-3 text-xs sm:text-sm text-red-600 border border-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">
                Username / Email
              </label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-xl border border-gray-300 p-2.5 text-xs sm:text-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                placeholder="Masukkan username atau email..."
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-xl border border-gray-300 p-2.5 text-xs sm:text-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 py-2.5 font-bold text-white hover:bg-blue-700 transition disabled:opacity-50 text-xs sm:text-sm active:scale-95 shadow-xs"
            >
              {loading ? "Memproses..." : "Masuk"}
            </button>
          </form>

          {/* Divider & Daftar Baru */}
          <div className="mt-6 border-t border-gray-100 pt-4 text-center">
            <p className="text-xs text-gray-500 mb-3">Belum memiliki akun?</p>
            <Link
              href="/login/register"
              className="block w-full rounded-xl border border-blue-600 py-2 text-center font-bold text-blue-600 hover:bg-blue-50 transition text-xs sm:text-sm"
            >
              Daftar Baru
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}