"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  FiMenu,
  FiX,
  FiShoppingCart,
  FiUser,
  FiLogOut,
  FiChevronDown,
  FiBox,
} from "react-icons/fi";
import { useCartStoreBS } from "@/store/cartStoreBS";
import { useCartStore } from "@/store/cartStore";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isBsOpen, setIsBsOpen] = useState(false);
  const [userName, setUserName] = useState<string>("");
  const [userFoto, setUserFoto] = useState<string>("");

  const profileRef = useRef<HTMLDivElement>(null);
  const bsRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Total item keranjang BS
  const totalBsItems = useCartStoreBS((state) => state.totalItems);

  // Total item keranjang reguler
  const totalRegularItems = useCartStore((state: any) =>
    state.items
      ? state.items.reduce(
          (total: number, item: any) =>
            total + (item.quantity || item.qty || 1),
          0
        )
      : 0
  );

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const userObj = JSON.parse(storedUser);
        setUserName(userObj.name || userObj.nama || "User");
        if (userObj.foto) {
          setUserFoto(userObj.foto);
        }
      } catch (e) {
        console.error("Gagal parsing data user", e);
      }
    }
  }, []);

  // Tutup dropdown jika klik di luar
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setIsProfileOpen(false);
      }
      if (bsRef.current && !bsRef.current.contains(event.target as Node)) {
        setIsBsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sanitasi URL Avatar agar aman lewat proxy HTTPS
  const getSafeAvatarUrl = (img: string | null | undefined) => {
    if (!img) return null;
    if (img.includes("/uploads/")) {
      const fileName = img.split("/uploads/").pop();
      return `/uploads/${fileName}`;
    }
    if (img.includes("/images/")) {
      const fileName = img.split("/images/").pop();
      return `/images/${fileName}`;
    }
    return `/uploads/${img}`;
  };

  const avatarSrc = getSafeAvatarUrl(userFoto);

  const handleLogout = async () => {
    const rawApiUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://103.125.42.217:8081/api";
    const apiUrl = rawApiUrl.replace(/\/$/, "");
    const token = localStorage.getItem("token");

    try {
      if (token) {
        await fetch(`${apiUrl}/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });
      }
    } catch (error) {
      console.error("Gagal melakukan logout server:", error);
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setIsProfileOpen(false);
      router.push("/login");
    }
  };

  return (
    <header className="bg-white shadow-xs sticky top-0 z-50 w-full">
      {/* px-2.5 di HP agar tidak meluber keluar layar */}
      <div className="w-full max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-1">
          
          {/* SISI KIRI: JUDUL / LOGO */}
          <div className="flex items-center min-w-0 shrink">
            <Link href="/" className="flex items-center gap-1.5 truncate">
              <span className="font-extrabold text-blue-600 text-xs sm:text-base md:text-lg tracking-tight truncate max-w-[130px] sm:max-w-none">
                KOPERASI NIAGA ABADI
              </span>
            </Link>
          </div>

          {/* SISI KANAN: IKON AKSI (Rapat & Rapi di HP) */}
          <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
            {/* 1. Keranjang Reguler */}
            <Link
              href="/cart"
              className="relative p-1.5 text-gray-700 hover:text-blue-600 transition-colors"
              title="Keranjang Belanja"
            >
              <FiShoppingCart className="w-5 h-5 sm:w-6 sm:h-6" />
              {totalRegularItems > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center ring-2 ring-white">
                  {totalRegularItems > 99 ? "99+" : totalRegularItems}
                </span>
              )}
            </Link>

            {/* 2. Keranjang BS */}
            <Link
              href="/keranjangbs"
              className="relative p-1.5 text-gray-700 hover:text-amber-600 transition-colors"
              title="Keranjang BS"
            >
              <FiBox className="w-5 h-5 sm:w-6 sm:h-6" />
              {totalBsItems > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center ring-2 ring-white">
                  {totalBsItems > 99 ? "99+" : totalBsItems}
                </span>
              )}
            </Link>

            {/* 3. Profil User */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-1 p-1 rounded-full hover:bg-gray-100 transition-colors"
              >
                {avatarSrc ? (
                  <img
                    src={avatarSrc}
                    alt={userName}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover ring-1 ring-blue-500"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                    {userName ? userName.charAt(0).toUpperCase() : <FiUser />}
                  </div>
                )}
                {/* Di HP nama joksin disembunyikan agar hemat tempat */}
                <span className="hidden sm:inline-block text-xs font-semibold text-gray-700 max-w-[80px] truncate">
                  {userName}
                </span>
                <FiChevronDown className="hidden sm:inline-block w-3.5 h-3.5 text-gray-500" />
              </button>

              {/* Dropdown Menu Profil */}
              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-50">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-xs text-gray-500">Masuk sebagai</p>
                    <p className="text-xs font-bold text-gray-800 truncate">
                      {userName}
                    </p>
                  </div>
                  <Link
                    href="/userprofile"
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-xs text-gray-700 hover:bg-gray-50"
                  >
                    <FiUser className="w-3.5 h-3.5" />
                    <span>Profil Saya</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-xs text-red-600 hover:bg-red-50 text-left"
                  >
                    <FiLogOut className="w-3.5 h-3.5" />
                    <span>Keluar (Logout)</span>
                  </button>
                </div>
              )}
            </div>

            {/* 4. Tombol Menu Hamburger */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-1.5 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              title="Menu Navigasi"
            >
              {isMenuOpen ? (
                <FiX className="w-5 h-5 text-gray-700" />
              ) : (
                <FiMenu className="w-5 h-5 text-gray-700" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Menu Navigasi Mobile (Bila dibuka) */}
      {isMenuOpen && (
        <div className="bg-white border-t border-gray-100 px-4 py-3 space-y-2 shadow-md">
          <Link
            href="/"
            onClick={() => setIsMenuOpen(false)}
            className="block text-xs font-medium text-gray-700 hover:text-blue-600 py-1"
          >
            Beranda
          </Link>
          <Link
            href="/products"
            onClick={() => setIsMenuOpen(false)}
            className="block text-xs font-medium text-gray-700 hover:text-blue-600 py-1"
          >
            Katalog Produk
          </Link>
          <Link
            href="/BS/halamanBS"
            onClick={() => setIsMenuOpen(false)}
            className="block text-xs font-medium text-gray-700 hover:text-blue-600 py-1"
          >
            Input BS
          </Link>
          <Link
            href="/laporan/omsetku"
            onClick={() => setIsMenuOpen(false)}
            className="block text-xs font-medium text-gray-700 hover:text-blue-600 py-1"
          >
            Cek Omset
          </Link>
          <Link
            href="/laporan/laporanpo"
            onClick={() => setIsMenuOpen(false)}
            className="block text-xs font-medium text-gray-700 hover:text-blue-600 py-1"
          >
            Cek Orderanku
          </Link>
        </div>
      )}
    </header>
  );
}