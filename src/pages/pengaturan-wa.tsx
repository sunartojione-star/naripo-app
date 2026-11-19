"use client";

import { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import {
  FiArrowLeft,
  FiPlus,
  FiMessageCircle,
  FiCheckCircle,
  FiAlertCircle,
  FiPhone,
  FiTrash2,
  FiEdit2,
  FiCheck,
  FiUser,
} from "react-icons/fi";
import {
  AdminWAContact,
  getAdminWAList,
  saveAdminWAList,
  normalizePhoneWA,
  buildWhatsAppUrl,
  fetchSettingData,
  saveSettingTelp,
} from "@/utils/waHelper";

export default function PengaturanWAPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<AdminWAContact[]>([]);
  const [settingNama, setSettingNama] = useState("");
  const [settingAlamat, setSettingAlamat] = useState("");
  const [labelInput, setLabelInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const rawApiUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://103.125.42.217:8081/api";
  const apiUrl = rawApiUrl.replace(/\/$/, "");

  useEffect(() => {
    const init = async () => {
      const localList = getAdminWAList();
      const token =
        localStorage.getItem("token") || localStorage.getItem("auth_token");
      const serverSetting = await fetchSettingData(apiUrl, token);

      if (serverSetting) {
        setSettingNama(serverSetting.Nama);
        setSettingAlamat(serverSetting.Alamat);

        if (serverSetting.telp) {
          const exists = localList.some(
            (c) => normalizePhoneWA(c.phone) === serverSetting.telp
          );
          if (!exists) {
            const merged = [
              {
                id: "server",
                label: "Admin Utama (Database)",
                phone: serverSetting.telp,
                isActive: true,
              },
              ...localList.map((c) => ({ ...c, isActive: false })),
            ];
            saveAdminWAList(merged);
            setContacts(merged);
            return;
          } else {
            const synced = localList.map((c) => ({
              ...c,
              isActive: normalizePhoneWA(c.phone) === serverSetting.telp,
            }));
            saveAdminWAList(synced);
            setContacts(synced);
            return;
          }
        }
      }

      setContacts(localList);
    };

    init();
  }, [apiUrl]);

  const syncToDatabase = async (phone: string) => {
    const token =
      localStorage.getItem("token") || localStorage.getItem("auth_token");
    return saveSettingTelp(apiUrl, token, phone, settingNama, settingAlamat);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);

    const cleanLabel = labelInput.trim() || "Admin";
    const normalizedPhone = normalizePhoneWA(phoneInput);

    if (normalizedPhone.length < 10) {
      setNotice({
        type: "error",
        text: "Nomor WhatsApp tidak valid. Contoh: 081234567890.",
      });
      return;
    }

    setSaving(true);
    let updatedList: AdminWAContact[];

    if (editingId) {
      // Saat edit, jadikan nomor yang diedit sebagai nomor utama
      updatedList = contacts.map((item) =>
        item.id === editingId
          ? { ...item, label: cleanLabel, phone: normalizedPhone, isActive: true }
          : { ...item, isActive: false }
      );
    } else {
      // Saat tambah baru, otomatis jadikan nomor baru sebagai nomor utama (Aktif)
      const newContact: AdminWAContact = {
        id: String(Date.now()),
        label: cleanLabel,
        phone: normalizedPhone,
        isActive: true,
      };
      updatedList = [
        newContact,
        ...contacts.map((c) => ({ ...c, isActive: false })),
      ];
    }

    setContacts(updatedList);
    saveAdminWAList(updatedList);

    const okServer = await syncToDatabase(normalizedPhone);

    setNotice({
      type: "success",
      text: okServer
        ? `Nomor ${cleanLabel} (+${normalizedPhone}) aktif sebagai penerima utama di Database.`
        : `Nomor ${cleanLabel} (+${normalizedPhone}) aktif sebagai penerima utama di perangkat.`,
    });

    setLabelInput("");
    setPhoneInput("");
    setEditingId(null);
    setSaving(false);
  };

  const handleSetActive = async (id: string) => {
    const updatedList = contacts.map((item) => ({
      ...item,
      isActive: item.id === id,
    }));
    setContacts(updatedList);
    saveAdminWAList(updatedList);

    const active = updatedList.find((c) => c.id === id);
    if (active) {
      const okServer = await syncToDatabase(active.phone);
      setNotice({
        type: "success",
        text: okServer
          ? `${active.label} (+${active.phone}) aktif sebagai penerima WA di Database.`
          : `${active.label} (+${active.phone}) dipilih sebagai penerima WA utama.`,
      });
    }
  };

  const handleEdit = (item: AdminWAContact) => {
    setEditingId(item.id);
    setLabelInput(item.label);
    setPhoneInput(item.phone);
    setNotice(null);
  };

  const handleDelete = async (id: string) => {
    const filtered = contacts.filter((item) => item.id !== id);
    if (filtered.length > 0 && !filtered.some((item) => item.isActive)) {
      filtered[0].isActive = true;
    }
    setContacts(filtered);
    saveAdminWAList(filtered);

    if (filtered[0]) {
      await syncToDatabase(filtered[0].phone);
    }
    setNotice({ type: "success", text: "Nomor WA berhasil dihapus." });
  };

  const handleTestWA = (phone: string) => {
    const url = buildWhatsAppUrl(
      phone,
      "Halo Admin, ini tes koneksi notifikasi pesanan dari aplikasi Koperasi Niaga Abadi."
    );
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <Layout>
      <Head>
        <title>Pengaturan WA Admin - Naripo</title>
      </Head>

      <div className="w-full max-w-2xl mx-auto px-3 py-4 sm:py-6 min-h-screen text-xs sm:text-sm space-y-4">
        <div className="flex items-center justify-between bg-slate-100 border border-slate-200 rounded-2xl px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <FiMessageCircle className="w-4 h-4" />
            </div>
            <div>
              <h1 className="font-bold text-slate-800 text-sm sm:text-base">
                Kelola Nomor WA Admin
              </h1>
              <p className="text-[11px] text-slate-500">
                {settingNama ? `${settingNama} • ` : ""}Tersimpan ke database Setting
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-1 bg-white hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-xl border border-slate-300 font-semibold text-xs active:scale-95 transition"
          >
            <FiArrowLeft /> Kembali
          </button>
        </div>

        {notice && (
          <div
            className={`p-3 rounded-xl border flex items-start gap-2 text-xs ${
              notice.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-red-50 border-red-200 text-red-700"
            }`}
          >
            {notice.type === "success" ? (
              <FiCheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <FiAlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <span>{notice.text}</span>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-xs"
        >
          <h2 className="font-bold text-slate-800 text-xs sm:text-sm">
            {editingId ? "Edit Nomor WA" : "Tambah Nomor WA Baru (Langsung Jadi Utama)"}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block font-semibold text-slate-600 text-[11px]">
                Nama / Keterangan
              </label>
              <div className="relative">
                <FiUser className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={labelInput}
                  onChange={(e) => setLabelInput(e.target.value)}
                  placeholder="Contoh: Admin PO / Gudang"
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block font-semibold text-slate-600 text-[11px]">
                Nomor WhatsApp
              </label>
              <div className="relative">
                <FiPhone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  inputMode="numeric"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="Contoh: 081234567890"
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setLabelInput("");
                  setPhoneInput("");
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                Batal Edit
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition"
            >
              <FiPlus className="w-4 h-4" />
              <span>{editingId ? "Simpan Perubahan" : "Simpan & Jadikan Utama"}</span>
            </button>
          </div>
        </form>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-xs">
          <h2 className="font-bold text-slate-800 text-xs sm:text-sm">
            Daftar Nomor Tersimpan ({contacts.length})
          </h2>

          {contacts.length === 0 ? (
            <p className="text-center text-slate-400 text-xs py-6">
              Belum ada nomor WA admin tersimpan. Tambahkan nomor di atas.
            </p>
          ) : (
            <div className="space-y-2">
              {contacts.map((item) => (
                <div
                  key={item.id}
                  className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                    item.isActive
                      ? "bg-emerald-50/70 border-emerald-300"
                      : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 text-xs sm:text-sm truncate">
                        {item.label}
                      </span>
                      {item.isActive && (
                        <span className="text-[10px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                          Aktif
                        </span>
                      )}
                    </div>
                    <p className="font-mono text-xs text-slate-600 mt-0.5">
                      +{item.phone}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {!item.isActive && (
                      <button
                        type="button"
                        onClick={() => handleSetActive(item.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1"
                      >
                        <FiCheck className="w-3.5 h-3.5" /> Pakai
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleTestWA(item.phone)}
                      className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[11px] flex items-center gap-1"
                    >
                      <FiMessageCircle className="w-3.5 h-3.5" /> Tes
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEdit(item)}
                      className="p-1.5 rounded-lg bg-white hover:bg-blue-50 text-blue-600 border border-slate-200"
                      title="Edit"
                    >
                      <FiEdit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 rounded-lg bg-white hover:bg-red-50 text-red-600 border border-slate-200"
                      title="Hapus"
                    >
                      <FiTrash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}