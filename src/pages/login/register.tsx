'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Head from 'next/head';
import Link from 'next/link';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    kd_cus: '',
    password: '',
    password_confirmation: '',
  });

  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setFieldErrors({});

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://103.125.42.217:8081/api';

    try {
      const res = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          device_id: 'web-browser',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Handle laravel validation error (422)
        if (data.errors) {
          setFieldErrors(data.errors);
        }
        throw new Error(data.message || 'Registrasi gagal, periksa data yang Anda masukkan.');
      }

      if (data.success && data.data?.token) {
        // Simpan token & user ke localStorage
        localStorage.setItem('token', data.data.token);
        localStorage.setItem('user', JSON.stringify(data.data.user));

        // Redirect ke dashboard/beranda
        router.push('/');
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan pada server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Daftar Akun - Naripo</title>
      </Head>
      <div className="flex min-h-screen items-center justify-center bg-gray-100 py-8">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
          <h2 className="mb-6 text-center text-2xl font-bold text-gray-800">Daftar Akun Baru</h2>

          {error && (
            <div className="mb-4 rounded-md bg-red-100 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            {/* Nama Lengkap */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Nama Lengkap</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="mt-1 w-full rounded-md border border-gray-300 p-2 focus:border-indigo-500 focus:outline-none"
                placeholder="Nama Lengkap"
              />
              {fieldErrors.name && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.name[0]}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="mt-1 w-full rounded-md border border-gray-300 p-2 focus:border-indigo-500 focus:outline-none"
                placeholder="contoh@email.com"
              />
              {fieldErrors.email && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.email[0]}</p>
              )}
            </div>

            {/* Kode Customer (kd_cus) */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Kode Customer (KD CUS)</label>
              <input
                type="text"
                name="kd_cus"
                value={formData.kd_cus}
                onChange={handleChange}
                required
                className="mt-1 w-full rounded-md border border-gray-300 p-2 focus:border-indigo-500 focus:outline-none"
                placeholder="Masukkan Kode Customer"
              />
              {fieldErrors.kd_cus && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.kd_cus[0]}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={6}
                className="mt-1 w-full rounded-md border border-gray-300 p-2 focus:border-indigo-500 focus:outline-none"
                placeholder="Minimal 6 karakter"
              />
              {fieldErrors.password && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.password[0]}</p>
              )}
            </div>

            {/* Konfirmasi Password (password_confirmation) */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Konfirmasi Password</label>
              <input
                type="password"
                name="password_confirmation"
                value={formData.password_confirmation}
                onChange={handleChange}
                required
                className="mt-1 w-full rounded-md border border-gray-300 p-2 focus:border-indigo-500 focus:outline-none"
                placeholder="Ulangi password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-indigo-600 py-2.5 font-semibold text-white hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {loading ? 'Memproses...' : 'Daftar Sekarang'}
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