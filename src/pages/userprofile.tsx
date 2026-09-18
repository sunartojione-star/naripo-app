"use client";

import Layout from "@/components/Layout";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FiUser,
  FiLogOut,
  FiEdit,
  FiSave,
  FiX,
  FiEye,
  FiEyeOff,
} from "react-icons/fi";

export default function ProfilePage() {
  const [user, setUser] = useState({
    name: "",
    email: "",
    kd_cus: "",
    password: "",
    foto: null as File | null,
    fotoUrl: "",
  });

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string>("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("user");
      const token = localStorage.getItem("token");

      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        setUser((prev) => ({
          ...prev,
          name: parsed.name || "",
          email: parsed.email || "",
          kd_cus: parsed.kd_cus || "",
          fotoUrl: parsed.foto || "",
        }));
        if (parsed.foto) {
          setPreviewImage(parsed.foto);
        }
        setIsLoggedIn(true);
      } else if (token) {
        setIsLoggedIn(true);
      }
    } catch (e) {
      console.error("Gagal membaca localStorage:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUser((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUser((prev) => ({ ...prev, foto: file }));
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("Menyimpan perubahan ke server...");

    try {
      const formData = new FormData();
      formData.append("name", user.name);
      formData.append("email", user.email);
      if (user.password) formData.append("password", user.password);
      formData.append("kd_cus", user.kd_cus);

      // Kirim file dengan key "foto" sesuai kolom database
      if (user.foto instanceof File) {
        formData.append("foto", user.foto);
      }

      const token = localStorage.getItem("token");
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://103.125.42.217:8081/api";

      const response = await fetch(`${API_URL}/update-profile`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setMessage("Profil berhasil diperbarui di database!");
        localStorage.setItem("user", JSON.stringify(result.data));
        setUser((prev) => ({
          ...prev,
          ...result.data,
          password: "",
          fotoUrl: result.data.foto || prev.fotoUrl,
        }));
        setIsEditing(false);
      } else {
        setMessage(result.message || "Gagal memperbarui profil di server.");
      }
    } catch (error) {
      console.error("Error API:", error);
      setMessage("Terjadi kesalahan koneksi ke server Laravel.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="text-center py-20 text-gray-500">Memuat profil...</div>
      </Layout>
    );
  }

  if (!isLoggedIn) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Silakan Login Terlebih Dahulu
          </h1>
          <p className="text-gray-600 mb-6">
            Sesi login Anda tidak ditemukan di browser.
          </p>
          <Link
            href="/login"
            className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 transition"
          >
            Ke Halaman Login
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto py-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Profil Saya</h1>

        {message && (
          <div className="p-4 mb-4 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-sm font-medium">
            {message}
          </div>
        )}

        {/* Profile Card */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border border-gray-100">
          <div className="flex items-start justify-between mb-6 border-b pb-4">
            <div className="flex items-center gap-4">
              <div className="bg-blue-600 text-white w-16 h-16 rounded-full flex items-center justify-center overflow-hidden shadow">
                {previewImage ? (
                  <img
                    src={previewImage}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <FiUser size={32} />
                )}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {user.name || "Pengguna"}
                </h2>
                <p className="text-gray-600 text-sm">{user.email || "-"}</p>
              </div>
            </div>

            {/* Tombol Edit / Tutup */}
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition text-sm font-medium cursor-pointer ${
                !isEditing
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              {!isEditing ? <FiEdit size={18} /> : <FiX size={18} />}
              {!isEditing ? "Edit" : "Batal"}
            </button>
          </div>

          {/* Kondisi Tampilan vs Form Edit */}
          {!isEditing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Nama / Username
                </label>
                <p className="text-gray-900 font-medium text-lg mt-1">
                  {user.name || "-"}
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Email
                </label>
                <p className="text-gray-900 font-medium text-lg mt-1">
                  {user.email || "-"}
                </p>
              </div>
              {user.kd_cus && (
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Kode Customer (kd_cus)
                  </label>
                  <p className="text-blue-600 font-bold text-lg mt-1">
                    {user.kd_cus}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ganti Foto Profil
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nama / Username
                </label>
                <input
                  type="text"
                  name="name"
                  value={user.name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={user.email}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Password Baru{" "}
                  <span className="text-xs text-gray-400">
                    (Kosongkan jika tidak ingin mengubah)
                  </span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={user.password}
                    onChange={handleChange}
                    placeholder="Minimal 6 karakter"
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 focus:outline-none cursor-pointer"
                  >
                    {showPassword ? (
                      <FiEyeOff size={18} />
                    ) : (
                      <FiEye size={18} />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kode Customer (kd_cus)
                </label>
                <input
                  type="text"
                  name="kd_cus"
                  value={user.kd_cus}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-semibold bg-white"
                />
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-bold shadow disabled:opacity-50 cursor-pointer"
                >
                  <FiSave size={18} />
                  {saving ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Link
            href="/laporan/laporanpo"
            className="bg-white p-6 rounded-lg shadow-sm text-center hover:shadow-lg transition border border-gray-100"
          >
            <h3 className="font-bold text-gray-900 mb-2">Laporan Saya</h3>
            <p className="text-gray-600 text-sm">Lihat riwayat laporan</p>
          </Link>
          <Link
            href="/favorites/produkfavorites"
            className="bg-white p-6 rounded-lg shadow-sm text-center hover:shadow-lg transition border border-gray-100"
          >
            <h3 className="font-bold text-gray-900 mb-2">Favorite</h3>
            <p className="text-gray-600 text-sm">Produk favorit Anda</p>
          </Link>
          <Link
            href="/cart"
            className="bg-white p-6 rounded-lg shadow-sm text-center hover:shadow-lg transition border border-gray-100"
          >
            <h3 className="font-bold text-gray-900 mb-2">Keranjang</h3>
            <p className="text-gray-600 text-sm">Cek keranjang belanja</p>
          </Link>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full bg-red-600 text-white py-3 rounded-lg font-bold hover:bg-red-700 transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <FiLogOut size={20} />
          Logout
        </button>
      </div>
    </Layout>
  );
}
