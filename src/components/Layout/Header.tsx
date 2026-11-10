"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import {
  FiMenu,
  FiX,
  FiShoppingCart,
  FiUser,
  FiLogOut,
  FiChevronDown,
  FiBox,
} from "react-icons/fi";
import { useCartStoreBS } from "@/store/cartStoreBS"; // Store Zustand khusus BS
import { useCartStore } from "@/store/cartStore"; // Store Zustand untuk keranjang reguler

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isBsOpen, setIsBsOpen] = useState(false);
  const [isMobileBsOpen, setIsMobileBsOpen] = useState(false);
  const [userName, setUserName] = useState<string>("");
  const [userFoto, setUserFoto] = useState<string>("");

  const profileRef = useRef<HTMLDivElement>(null);
  const bsRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Memanggil total item secara reaktif langsung dari useCartStoreBS
  const totalBsItems = useCartStoreBS((state) => state.totalItems);

  // Mengambil total item secara reaktif dari cartStore reguler
  const totalRegularItems = useCartStore((state: any) =>
    state.items
      ? state.items.reduce(
          (total: number, item: any) =>
            total + (item.quantity || item.qty || 1),
          0
        )
      : 0
  );

  // Helper pembersih URL foto profil agar melewati jalur aman HTTPS (/uploads/)
  const getSafeAvatarUrl = (foto: string | null | undefined) => {
    if (!foto) return null;
    if (foto.includes("/uploads/")) {
      const fileName = foto.split("/uploads/").pop();
      return `/uploads/${fileName}`;
    }
    if (foto.includes("/images/")) {
      const fileName = foto.split("/images/").pop();
      return `/images/${fileName}`;
    }
    if (foto.startsWith("http://") || foto.startsWith("https://")) {
      return foto;
    }
    return `/uploads/${foto}`;
  };

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const userObj = JSON.parse(storedUser);
        setUserName(userObj.name || userObj.nama || "User");
        if (userObj.foto || userObj.avatar || userObj.gambar) {
          setUserFoto(userObj.foto || userObj.avatar || userObj.gambar);
        }
      } catch (e) {
        console.error("Gagal parsing data user", e);
      }
    }
  }, []);

  // Menutup dropdown profile atau BS jika mengklik di luar area masing-masing
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

  // Fungsi Logoff / Logout
  const handleLogout = async () => {
    const API_URL =
      process.env.NEXT_PUBLIC_API_URL || "http://103.125.42.217:8081/api";
    const token = localStorage.getItem("token");

    try {
      if (token) {
        const cleanApi = API_URL.replace(/\/$/, "");
        await fetch(`${cleanApi}/logout`, {
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

  const avatarSrc = getSafeAvatarUrl(userFoto);

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <h1 className="text-base sm:text-xl md:text-2xl font-bold text-blue-600 truncate max-w-[190px] sm:max-w-none">
              KOPERASI NIAGA ABADI RIDHOTULLAH
            </h1>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-8">
            <Link
              href="/"
              className="text-gray-700 hover:text-blue-600 font-medium text-sm transition"
            >
              Home
            </Link>

            <Link
              href="/products"
              className="text-gray-700 hover:text-blue-600 font-medium text-sm transition"
            >
              Produk
            </Link>

            <Link
              href="/laporan/laporanpo"
              className="text-gray-700 hover:text-blue-600 font-medium text-sm transition"
            >
              Laporan
            </Link>

            <Link
              href="/favorites/produkfavorites"
              className="text-gray-700 hover:text-blue-600 font-medium text-sm transition"
            >
              Favorite
            </Link>

            {/* Dropdown Menu BS */}
            <div className="relative" ref={bsRef}>
              <button
                type="button"
                onClick={() => setIsBsOpen(!isBsOpen)}
                className="flex items-center gap-1 text-gray-700 hover:text-blue-600 font-medium text-sm focus:outline-none cursor-pointer transition"
              >
                <span>BS</span>
                <FiChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${
                    isBsOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {isBsOpen && (
                <div className="absolute left-0 mt-2 w-44 rounded-xl bg-white shadow-xl border border-gray-100 z-50 py-1.5 animate-in fade-in zoom-in-95 duration-100">
                  <Link
                    href="/BS/halamanBS"
                    onClick={() => setIsBsOpen(false)}
                    className="block px-4 py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-50 transition"
                  >
                    Data BS
                  </Link>
                  <Link
                    href="/laporan/laporanbs"
                    onClick={() => setIsBsOpen(false)}
                    className="block px-4 py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-50 transition"
                  >
                    Laporan BS
                  </Link>
                </div>
              )}
            </div>
          </nav>

          {/* Icons & Badges */}
          <div className="flex items-center gap-3 sm:gap-6 ml-2 sm:ml-8">
            {/* Badge 1: Keranjang Reguler */}
            <Link
              href="/cart"
              className="relative p-1 text-gray-700 hover:text-blue-600 transition"
              title="Keranjang Reguler"
            >
              <FiShoppingCart size={22} />
              {totalRegularItems > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-blue-600 text-white text-[10px] rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center font-bold shadow-sm">
                  {totalRegularItems}
                </span>
              )}
            </Link>

            {/* Badge 2: Keranjang / Item BS */}
            <Link
              href="/keranjangbs"
              className="relative p-1 text-gray-700 hover:text-blue-600 transition"
              title="Keranjang BS"
            >
              <FiBox size={22} />
              {totalBsItems > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center font-bold shadow-sm">
                  {totalBsItems}
                </span>
              )}
            </Link>

            {/* Profile Dropdown Menu */}
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex flex-col items-center justify-center focus:outline-none group cursor-pointer"
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden bg-gray-100 border border-gray-300 flex items-center justify-center shadow-sm">
                  {avatarSrc ? (
                    <img
                      src={avatarSrc}
                      alt={userName}
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (target.src.includes("/uploads/")) {
                          target.src = target.src.replace(
                            "/uploads/",
                            "/images/"
                          );
                        }
                      }}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <FiUser size={16} className="text-gray-600" />
                  )}
                </div>

                <span className="mt-0.5 text-[9px] sm:text-[10px] font-medium text-gray-600 group-hover:text-blue-600 max-w-[65px] sm:max-w-[80px] truncate flex items-center gap-0.5">
                  {userName ? userName : "Guest"}
                  <FiChevronDown
                    className={`w-2.5 h-2.5 transition-transform ${
                      isProfileOpen ? "rotate-180" : ""
                    }`}
                  />
                </span>
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-xl bg-white shadow-xl border border-gray-100 z-50 divide-y divide-gray-100 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-4 py-2.5">
                    <p className="text-[10px] text-gray-400">Login sebagai</p>
                    <p className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                      {userName || "Guest"}
                    </p>
                  </div>

                  <div className="py-1">
                    <Link
                      href="/userprofile"
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-50 transition"
                    >
                      <FiUser className="w-3.5 h-3.5 text-gray-500" />
                      <span>Profile</span>
                    </Link>

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2 text-xs sm:text-sm text-red-600 hover:bg-red-50 transition text-left cursor-pointer font-medium"
                    >
                      <FiLogOut className="w-3.5 h-3.5 text-red-600" />
                      <span>Logoff</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Menu Hamburger Button */}
          <button
            type="button"
            className="md:hidden ml-2.5 p-1 text-gray-700 hover:text-blue-600 focus:outline-none"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <FiX size={22} /> : <FiMenu size={22} />}
          </button>
        </div>

        {/* Mobile Navigation Dropdown */}
        {isMenuOpen && (
          <nav className="md:hidden pb-3 pt-2 space-y-1 border-t border-gray-100 animate-in slide-in-from-top-2 duration-150">
            <Link
              href="/"
              onClick={() => setIsMenuOpen(false)}
              className="block py-2 px-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-blue-600 rounded-lg"
            >
              Home
            </Link>
            <Link
              href="/products"
              onClick={() => setIsMenuOpen(false)}
              className="block py-2 px-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-blue-600 rounded-lg"
            >
              Produk
            </Link>
            <Link
              href="/laporan/laporanpo"
              onClick={() => setIsMenuOpen(false)}
              className="block py-2 px-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-blue-600 rounded-lg"
            >
              Laporan
            </Link>
            <Link
              href="/favorites/produkfavorites"
              onClick={() => setIsMenuOpen(false)}
              className="block py-2 px-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-blue-600 rounded-lg"
            >
              Favorite
            </Link>

            {/* Mobile Dropdown BS */}
            <div>
              <button
                type="button"
                onClick={() => setIsMobileBsOpen(!isMobileBsOpen)}
                className="w-full flex items-center justify-between py-2 px-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-blue-600 rounded-lg focus:outline-none"
              >
                <span>BS</span>
                <FiChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${
                    isMobileBsOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              {isMobileBsOpen && (
                <div className="pl-3 space-y-1 py-1 bg-gray-50 rounded-lg mt-0.5">
                  <Link
                    href="/BS/halamanBS"
                    onClick={() => {
                      setIsMobileBsOpen(false);
                      setIsMenuOpen(false);
                    }}
                    className="block py-1.5 px-2 text-xs text-gray-600 hover:text-blue-600 font-medium"
                  >
                    Data BS
                  </Link>
                  <Link
                    href="/laporan/laporanbs"
                    onClick={() => {
                      setIsMobileBsOpen(false);
                      setIsMenuOpen(false);
                    }}
                    className="block py-1.5 px-2 text-xs text-gray-600 hover:text-blue-600 font-medium"
                  >
                    Laporan BS
                  </Link>
                </div>
              )}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}