// src/utils/waHelper.ts

const STORAGE_KEY = "naripo_admin_wa";
const LIST_STORAGE_KEY = "naripo_admin_wa_list";
const DEFAULT_ADMIN_WA = process.env.NEXT_PUBLIC_ADMIN_WA || "";

export interface AdminWAContact {
  id: string;
  label: string;
  phone: string;
  isActive: boolean;
}

export interface SettingData {
  Nama: string;
  Alamat: string;
  telp: string;
}

export function normalizePhoneWA(phone: string): string {
  const firstPhone = String(phone || "").split(/[,/;\n]+/)[0] || "";
  const digits = firstPhone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("0")) return "62" + digits.slice(1);
  if (digits.startsWith("8")) return "62" + digits;
  return digits;
}

export function getLocalDateYYYYMMDD(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatDateDDMMYYYY(dateStr: string): string {
  if (!dateStr) return "-";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

export function getAdminWAList(): AdminWAContact[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LIST_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
    const single = localStorage.getItem(STORAGE_KEY);
    if (single) {
      return [
        {
          id: "default",
          label: "Admin Utama",
          phone: normalizePhoneWA(single),
          isActive: true,
        },
      ];
    }
  } catch {}
  return [];
}

export function saveAdminWAList(list: AdminWAContact[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LIST_STORAGE_KEY, JSON.stringify(list));
  const active = list.find((item) => item.isActive) || list[0];
  if (active?.phone) {
    localStorage.setItem(STORAGE_KEY, normalizePhoneWA(active.phone));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function getLocalAdminWA(): string {
  if (typeof window === "undefined") return normalizePhoneWA(DEFAULT_ADMIN_WA);
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) return normalizePhoneWA(saved);
  const list = getAdminWAList();
  const active = list.find((item) => item.isActive) || list[0];
  if (active?.phone) return normalizePhoneWA(active.phone);
  return normalizePhoneWA(DEFAULT_ADMIN_WA);
}

export function setLocalAdminWA(phone: string): string {
  const normalized = normalizePhoneWA(phone);
  if (typeof window !== "undefined" && normalized) {
    localStorage.setItem(STORAGE_KEY, normalized);
    const list = getAdminWAList();
    if (list.length > 0) {
      const updated = list.map((item) => ({
        ...item,
        isActive: normalizePhoneWA(item.phone) === normalized,
      }));
      localStorage.setItem(LIST_STORAGE_KEY, JSON.stringify(updated));
    }
  }
  return normalized;
}

export async function fetchSettingData(
  apiUrl: string,
  token?: string | null
): Promise<SettingData | null> {
  try {
    const res = await fetch(`${apiUrl.replace(/\/$/, "")}/setting`, {
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const raw = json?.data ?? json;
    const row = Array.isArray(raw) ? raw[0] : raw;
    if (row) {
      return {
        Nama: String(row.Nama || row.nama || ""),
        Alamat: String(row.Alamat || row.alamat || ""),
        telp: normalizePhoneWA(String(row.telp || "")),
      };
    }
  } catch {}
  return null;
}

export async function saveSettingTelp(
  apiUrl: string,
  token: string | null | undefined,
  telp: string,
  nama: string = "",
  alamat: string = ""
): Promise<boolean> {
  try {
    const normalized = normalizePhoneWA(telp);
    const res = await fetch(`${apiUrl.replace(/\/$/, "")}/setting`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        Nama: nama || null,
        Alamat: alamat || null,
        telp: normalized,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchAdminWA(
  apiUrl?: string,
  token?: string | null
): Promise<string> {
  const local = getLocalAdminWA();
  if (!apiUrl) return local || normalizePhoneWA(DEFAULT_ADMIN_WA);
  const setting = await fetchSettingData(apiUrl, token);
  if (setting?.telp) {
    return setLocalAdminWA(setting.telp);
  }
  return local || normalizePhoneWA(DEFAULT_ADMIN_WA);
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  const normalized =
    normalizePhoneWA(phone) || normalizePhoneWA(DEFAULT_ADMIN_WA);
  const encodedText = encodeURIComponent(message);
  return `https://wa.me/${normalized}?text=${encodedText}`;
}