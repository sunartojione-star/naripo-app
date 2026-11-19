"use client";

import { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import {
  FiArrowLeft,
  FiSearch,
  FiUsers,
  FiEdit2,
  FiSave,
  FiX,
  FiCheckCircle,
  FiAlertCircle,
  FiRefreshCw,
  FiMail,
} from "react-icons/fi";

interface UserItem {
  id: number | string;
  name?: string;
  nama?: string;
  email?: string;
  username?: string;
  kd_cus?: string;
  role?: string | null;
  Hak?: string | null;
  level_user?: string | null;
}

export default function DataUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // State Modal Edit User
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [initialKdCus, setInitialKdCus] = useState("");
  const [formNama, setFormNama] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formKdCus, setFormKdCus] = useState("");
  const [formRole, setFormRole] = useState("customer");
  const [formPassword, setFormPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const rawApiUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://103.125.42.217:8081/api";
  const apiUrl = rawApiUrl.replace(/\/$/, "");

  const normalizeRole = (u: UserItem): string => {
    const raw = String(u.role || u.Hak || u.level_user || "")
      .trim()
      .toLowerCase();
    if (raw === "admin" || raw === "super admin" || raw === "superadmin") {
      return "admin";
    }
    return "customer";
  };

  const fetchUsers = async () => {
    setLoading(true);
    setErrorMsg(null);
    const token =
      localStorage.getItem("token") || localStorage.getItem("auth_token");

    if (!token) {
      router.push("/login");
      return;
    }

    try {
      const res = await fetch(`${apiUrl}/users`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const text = await res.text();
      let json: any = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(`Respon server tidak valid (${res.status}).`);
      }

      if (!res.ok) {
        throw new Error(
          json?.message || `Gagal memuat data users (${res.status})`
        );
      }

      const list: UserItem[] = Array.isArray(json)
        ? json
        : Array.isArray(json?.data)
        ? json.data
        : [];
      setUsers(list);
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal terhubung ke server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const u = JSON.parse(storedUser);
        const role = String(u.role || u.Hak || u.level_user || "")
          .trim()
          .toLowerCase();
        if (!["admin", "super admin", "superadmin"].includes(role)) {
          router.replace("/");
          return;
        }
      }
    } catch {}

    fetchUsers();
  }, []);

  const openEditModal = (u: UserItem) => {
    const kdCus = String(u.kd_cus || "").trim();
    setEditingUser(u);
    setInitialKdCus(kdCus);
    setFormNama(u.name || u.nama || "");
    setFormEmail(u.email || u.username || "");
    setFormKdCus(kdCus);
    setFormRole(normalizeRole(u));
    setFormPassword("");
    setModalError(null);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setSaving(true);
    setModalError(null);
    setSuccessMsg(null);

    const token =
      localStorage.getItem("token") || localStorage.getItem("auth_token");

    try {
      const payload: Record<string, any> = {
        name: formNama.trim(),
        email: formEmail.trim(),
        role: formRole,
      };

      const cleanKdCus = formKdCus.trim();
      if (cleanKdCus !== initialKdCus) {
        payload.kd_cus = cleanKdCus;
      }

      if (formPassword.trim() !== "") {
        payload.password = formPassword.trim();
      }

      const res = await fetch(
        `${apiUrl}/users/${encodeURIComponent(String(editingUser.id))}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        }
      );

      const text = await res.text();
      let json: any = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(`Respon server tidak valid (${res.status}).`);
      }

      if (!res.ok) {
        const msg =
          json?.message ||
          (json?.errors ? Object.values(json.errors).flat().join(", ") : "") ||
          `Gagal menyimpan perubahan (${res.status}).`;
        throw new Error(msg);
      }

      setUsers((prev) =>
        prev.map((item) =>
          item.id === editingUser.id
            ? {
                ...item,
                name: formNama.trim(),
                nama: formNama.trim(),
                email: formEmail.trim(),
                kd_cus: cleanKdCus,
                role: formRole,
              }
            : item
        )
      );

      setSuccessMsg(`Data user ${formNama.trim()} berhasil diperbarui.`);
      setEditingUser(null);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setModalError(err.message || "Gagal menyimpan data user.");
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    const nama = String(u.name || u.nama || "").toLowerCase();
    const email = String(u.email || u.username || "").toLowerCase();
    const kdCus = String(u.kd_cus || "").toLowerCase();
    const role = normalizeRole(u);
    return (
      nama.includes(q) ||
      email.includes(q) ||
      kdCus.includes(q) ||
      role.includes(q)
    );
  });

  return (
    <Layout>
      <Head>
        <title>Data Users - Naripo</title>
      </Head>

      <div className="w-full max-w-5xl mx-auto px-2.5 sm:px-4 py-3 sm:py-6 min-h-screen text-xs space-y-3 pb-24">
        {/* HEADER */}
        <div className="flex items-center justify-between bg-slate-100 border border-slate-200 rounded-2xl px-3.5 py-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
              <FiUsers className="w-4 h-4" />
            </div>
            <div>
              <h1 className="font-bold text-slate-800 text-sm sm:text-base leading-tight">
                Data Users
              </h1>
              <p className="text-[11px] text-slate-500">
                Kelola customer & admin ({filteredUsers.length} user)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={fetchUsers}
              className="p-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700"
              title="Muat Ulang"
            >
              <FiRefreshCw
                className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
              />
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex items-center gap-1 bg-white hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-xl border border-slate-300 font-semibold text-xs active:scale-95 transition"
            >
              <FiArrowLeft /> Kembali
            </button>
          </div>
        </div>

        {/* NOTIFIKASI */}
        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2">
            <FiCheckCircle className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
            <FiAlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* PENCARIAN */}
        <div className="relative">
          <FiSearch className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama, email, kode cus, atau role..."
            className="w-full pl-9 pr-8 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <FiX className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* KONTEN */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 py-12 text-center text-slate-400">
            Memuat data users...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 py-12 text-center text-slate-400">
            Data user tidak ditemukan.
          </div>
        ) : (
          <>
            {/* TAMPILAN HP: KARTU COMPACT */}
            <div className="grid grid-cols-1 gap-2 md:hidden">
              {filteredUsers.map((u, idx) => {
                const roleVal = normalizeRole(u);
                const isRoleAdmin = roleVal === "admin";
                return (
                  <div
                    key={u.id}
                    className="bg-white rounded-xl border border-slate-200 p-3 flex items-center justify-between gap-2 shadow-xs"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-mono text-slate-400">
                          #{idx + 1}
                        </span>
                        <span className="font-bold text-slate-800 text-xs truncate">
                          {u.name || u.nama || "-"}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                            isRoleAdmin
                              ? "bg-violet-100 text-violet-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {roleVal}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
                        <span className="inline-flex items-center gap-1 truncate max-w-[200px]">
                          <FiMail className="w-3 h-3 shrink-0" />
                          {u.email || u.username || "-"}
                        </span>
                        {u.kd_cus && (
                          <span className="font-mono font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded text-[10px]">
                            KD: {u.kd_cus}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => openEditModal(u)}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-[11px] shrink-0 active:scale-95 transition"
                    >
                      <FiEdit2 className="w-3 h-3" /> Edit
                    </button>
                  </div>
                );
              })}
            </div>

            {/* TAMPILAN PC: TABEL PENUH */}
            <div className="hidden md:block bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-semibold">
                      <th className="p-2.5 w-12 text-center">No</th>
                      <th className="p-2.5">Nama</th>
                      <th className="p-2.5">Email</th>
                      <th className="p-2.5">Kode Cus</th>
                      <th className="p-2.5 text-center">Role</th>
                      <th className="p-2.5 w-24 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.map((u, idx) => {
                      const roleVal = normalizeRole(u);
                      const isRoleAdmin = roleVal === "admin";
                      return (
                        <tr key={u.id} className="hover:bg-violet-50/40">
                          <td className="p-2.5 text-center font-mono text-slate-500">
                            {idx + 1}
                          </td>
                          <td className="p-2.5 font-bold text-slate-800">
                            {u.name || u.nama || "-"}
                          </td>
                          <td className="p-2.5 text-slate-600">
                            {u.email || u.username || "-"}
                          </td>
                          <td className="p-2.5 font-mono font-bold text-blue-600">
                            {u.kd_cus || "-"}
                          </td>
                          <td className="p-2.5 text-center">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                isRoleAdmin
                                  ? "bg-violet-100 text-violet-700"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {roleVal}
                            </span>
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => openEditModal(u)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-bold text-[11px] active:scale-95 transition"
                            >
                              <FiEdit2 className="w-3 h-3" /> Edit
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* MODAL EDIT USER */}
        {editingUser && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
              <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between">
                <span className="font-bold text-sm flex items-center gap-1.5">
                  <FiEdit2 className="w-4 h-4 text-violet-400" /> Edit Data User
                </span>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="text-slate-300 hover:text-white p-1"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveUser} className="p-4 space-y-3">
                {modalError && (
                  <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-1.5">
                    <FiAlertCircle className="w-4 h-4 shrink-0" />
                    <span>{modalError}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="block font-bold text-slate-700 text-xs">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    required
                    value={formNama}
                    onChange={(e) => setFormNama(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-slate-700 text-xs">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="contoh@gmail.com"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-700 text-xs">
                      Kode Cus (kd_cus)
                    </label>
                    <input
                      type="text"
                      value={formKdCus}
                      onChange={(e) => setFormKdCus(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono font-bold text-blue-700 focus:outline-none focus:border-violet-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block font-bold text-slate-700 text-xs">
                      Role
                    </label>
                    <select
                      value={formRole}
                      onChange={(e) => setFormRole(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 bg-white focus:outline-none focus:border-violet-500"
                    >
                      <option value="customer">customer</option>
                      <option value="admin">admin</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-slate-700 text-xs">
                    Password Baru (Opsional)
                  </label>
                  <input
                    type="password"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder="Kosongkan jika tidak ingin ganti password"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    disabled={saving}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    <FiSave className="w-4 h-4" />
                    <span>{saving ? "Menyimpan..." : "Simpan"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}