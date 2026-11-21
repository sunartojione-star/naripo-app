"use client";

import { useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import { FiEye, FiEyeOff } from "react-icons/fi";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    kd_cus: "",
    password: "",
    password_confirmation: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "kd_cus" ? value.toUpperCase() : value,
    }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setFieldErrors({});

    const rawApiUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://103.125.42.217:8081/api";
    const API_URL = rawApiUrl.replace(/\/$/, "");

    try {
      const deviceId = getOrCreateDeviceId();

      const res = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          kd_cus: formData.kd_cus.trim(),
          password: formData.password,
          password_confirmation: formData.password_confirmation,
          device_id: deviceId,
        }),
      });

      const data = await res.json();

      if (!res.ok || (data.success !== undefined && !data.success)) {
        if (data.errors) {
          setFieldErrors(data.errors);
        }
        throw new Error(
          data.message || "Registrasi gagal, periksa data yang Anda masukkan."
        );
      }

      const token = data.data?.token || data.token;
      const user = data.data?.user || data.user;

      if (!token) {
        throw new Error("Token autentikasi tidak ditemukan dari server.");
      }

      localStorage.setItem("token", token);
      if (user) {
        localStorage.setItem("user", JSON.stringify(user));
        const kdCus = user.kd_cus || formData.kd_cus.trim();
        if (kdCus) {
          localStorage.setItem("kd_cus", String(kdCus).toUpperCase());
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
        <title>Daftar Akun - Naripo</title>
      </Head>
      <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4 py-8">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 sm:p-8 shadow-md">
          <h2 className="mb-6 text-center text-xl sm:text-2xl font-bold text-gray-800">
            Daftar Akun Baru
          </h2>

          {error && (
            <div className="mb-4 rounded-xl bg-red-100 p-3 text-xs sm:text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            {/* Nama Lengkap */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700">
                Nama Lengkap
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="mt-1 w-full rounded-xl border border-gray-300 p-2.5 text-sm focus:border-indigo-500 focus:outline-none"
                placeholder="Nama Lengkap"
              />
              {fieldErrors.name && (
                <p className="mt-1 text-xs text-red-600">
                  {fieldErrors.name[0]}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="mt-1 w-full rounded-xl border border-gray-300 p-2.5 text-sm focus:border-indigo-500 focus:outline-none"
                placeholder="contoh@email.com"
              />
              {fieldErrors.email && (
                <p className="mt-1 text-xs text-red-600">
                  {fieldErrors.email[0]}
                </p>
              )}
            </div>

            {/* Kode Customer (kd_cus) */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700">
                Kode Customer (KD CUS)
              </label>
              <input
                type="text"
                name="kd_cus"
                value={formData.kd_cus}
                onChange={handleChange}
                required
                className="mt-1 w-full uppercase rounded-xl border border-gray-300 p-2.5 text-sm focus:border-indigo-500 focus:outline-none"
                placeholder="Masukkan Kode Customer"
              />
              {fieldErrors.kd_cus && (
                <p className="mt-1 text-xs text-red-600">
                  {fieldErrors.kd_cus[0]}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="relative mt-1">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={6}
                  className="w-full rounded-xl border border-gray-300 p-2.5 pr-10 text-sm focus:border-indigo-500 focus:outline-none"
                  placeholder="Minimal 6 karakter"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <FiEyeOff className="w-4 h-4" />
                  ) : (
                    <FiEye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="mt-1 text-xs text-red-600">
                  {fieldErrors.password[0]}
                </p>
              )}
            </div>

            {/* Konfirmasi Password */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700">
                Konfirmasi Password
              </label>
              <input
                type={showPassword ? "text" : "password"}
                name="password_confirmation"
                value={formData.password_confirmation}
                onChange={handleChange}
                required
                className="mt-1 w-full rounded-xl border border-gray-300 p-2.5 text-sm focus:border-indigo-500 focus:outline-none"
                placeholder="Ulangi password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-indigo-600 py-2.5 font-semibold text-white hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {loading ? "Memproses..." : "Daftar Sekarang"}
            </button>
          </form>

          {/* Link Kembali ke Login */}
          <div className="mt-6 border-t border-gray-200 pt-4 text-center">
            <p className="text-sm text-gray-600 mb-2">Sudah memiliki akun?</p>
            <Link
              href="/login"
              className="font-semibold text-indigo-600 hover:text-indigo-500 underline underline-offset-2"
            >
              Masuk di sini
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}