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

  // Memanggil total item secara reaktif langsung dari useCartStoreBS (menggunakan totalItems)
  const totalBsItems = useCartStoreBS((state) => state.totalItems);

  // Mengambil total item secara reaktif dari cartStore reguler
  const totalRegularItems = useCartStore((state: any) =>
    state.items
      ? state.items.reduce(
          (total: number, item: any) =>
            total + (item.quantity || item.qty || 1),
          0,
        )
      : 0,
  );

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const userObj = JSON.parse(storedUser);
        setUserName(userObj.name || "User");
        if (userObj.foto) {
          setUserFoto(userObj.foto);
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
        await fetch(`${API_URL}/logout`, {
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
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <h1 className="text-xl sm:text-2xl font-bold text-blue-600 truncate max-w-[200px] sm:max-w-none">
              KOPERASI NIAGA ABADI RIDHOTULLAH
            </h1>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-8">
            <Link href="/" className="text-gray-700 hover:text-blue-600">
              Home
            </Link>

            <Link
              href="/products"
              className="text-gray-700 hover:text-blue-600"
            >
              Produk
            </Link>

            <Link
              href="/laporan/laporanpo"
              className="text-gray-700 hover:text-blue-600"
            >
              Laporan
            </Link>

            <Link
              href="/favorites/produkfavorites"
              className="text-gray-700 hover:text-blue-600"
            >
              Favorite
            </Link>

            {/* Dropdown Menu BS */}
            <div className="relative" ref={bsRef}>
              <button
                onClick={() => setIsBsOpen(!isBsOpen)}
                className="flex items-center gap-1 text-gray-700 hover:text-blue-600 focus:outline-none cursor-pointer"
              >
                <span>BS</span>
                <FiChevronDown
                  className={`w-4 h-4 transition-transform ${isBsOpen ? "rotate-180" : ""}`}
                />
              </button>

              {isBsOpen && (
                <div className="absolute left-0 mt-2 w-44 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 z-50 py-1">
                  <Link
                    href="/BS/halamanBS"
                    onClick={() => setIsBsOpen(false)}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition"
                  >
                    Data BS
                  </Link>
                  {/* Input BS dihapus */}
                  <Link
                    href="/laporan/laporanbs"
                    onClick={() => setIsBsOpen(false)}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition"
                  >
                    Laporan BS
                  </Link>
                </div>
              )}
            </div>
          </nav>

          {/* Icons & Badges */}
          <div className="flex items-center gap-4 sm:gap-6 ml-4 sm:ml-8">
            {/* Badge 1: Keranjang Reguler */}
            <Link href="/cart" className="relative" title="Keranjang Reguler">
              <FiShoppingCart
                size={24}
                className="text-gray-700 hover:text-blue-600"
              />
              {totalRegularItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {totalRegularItems}
                </span>
              )}
            </Link>

            {/* Badge 2: Keranjang / Item BS */}
            <Link href="/keranjangbs" className="relative" title="Keranjang BS">
              <div className="p-1 rounded-full hover:bg-gray-100 transition">
                <FiBox
                  size={24}
                  className="text-gray-700 hover:text-blue-600"
                />
              </div>
              {totalBsItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {totalBsItems}
                </span>
              )}
            </Link>

            {/* Profile Dropdown Menu */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex flex-col items-center justify-center focus:outline-none group cursor-pointer"
              >
                <div className="w-7 h-7 rounded-full overflow-hidden bg-gray-200 border border-gray-300 flex items-center justify-center shadow-sm">
                  {userFoto ? (
                    <img
                      src={userFoto}
                      alt={userName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <FiUser
                      size={18}
                      className="text-gray-700 group-hover:text-blue-600"
                    />
                  )}
                </div>

                <span className="mt-0.5 text-[10px] font-medium text-gray-600 group-hover:text-blue-600 max-w-[80px] truncate flex items-center gap-0.5">
                  {userName ? userName : "Guest"}
                  <FiChevronDown
                    className={`w-3 h-3 transition-transform ${isProfileOpen ? "rotate-180" : ""}`}
                  />
                </span>
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 z-50 divide-y divide-gray-100">
                  <div className="px-4 py-3">
                    <p className="text-xs text-gray-500">Login sebagai</p>
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {userName || "Guest"}
                    </p>
                  </div>

                  <div className="py-1">
                    <Link
                      href="/userprofile"
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition"
                    >
                      <FiUser className="w-4 h-4 text-gray-500" />
                      <span>Profile</span>
                    </Link>

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition text-left cursor-pointer"
                    >
                      <FiLogOut className="w-4 h-4 text-red-600" />
                      <span>Logoff</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden ml-4 cursor-pointer text-gray-700 hover:text-blue-600"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="md:hidden pb-4 pt-2 space-y-2 border-t border-gray-100">
            <Link
              href="/"
              onClick={() => setIsMenuOpen(false)}
              className="block py-2 text-gray-700 hover:text-blue-600"
            >
              Home
            </Link>
            <Link
              href="/products"
              onClick={() => setIsMenuOpen(false)}
              className="block py-2 text-gray-700 hover:text-blue-600"
            >
              Produk
            </Link>
            <Link
              href="/laporan/laporanpo"
              onClick={() => setIsMenuOpen(false)}
              className="block py-2 text-gray-700 hover:text-blue-600"
            >
              Laporan
            </Link>
            <Link
              href="/favorites/produkfavorites"
              onClick={() => setIsMenuOpen(false)}
              className="block py-2 text-gray-700 hover:text-blue-600"
            >
              Favorite
            </Link>

            {/* Mobile Dropdown BS */}
            <div>
              <button
                onClick={() => setIsMobileBsOpen(!isMobileBsOpen)}
                className="w-full flex items-center justify-between py-2 text-gray-700 hover:text-blue-600 focus:outline-none"
              >
                <span>BS</span>
                <FiChevronDown
                  className={`w-4 h-4 transition-transform ${isMobileBsOpen ? "rotate-180" : ""}`}
                />
              </button>
              {isMobileBsOpen && (
                <div className="pl-4 space-y-1 py-1 bg-gray-50 rounded-md mt-1">
                  <Link
                    href="/BS/halamanBS"
                    onClick={() => {
                      setIsMobileBsOpen(false);
                      setIsMenuOpen(false);
                    }}
                    className="block py-1.5 text-sm text-gray-600 hover:text-blue-600"
                  >
                    Data BS
                  </Link>
                  {/* Input BS pada mobile sudah dihapus */}
                  <Link
                    href="/laporan/laporanbs"
                    onClick={() => {
                      setIsMobileBsOpen(false);
                      setIsMenuOpen(false);
                    }}
                    className="py-1.5 text-sm text-gray-600 hover:text-blue-600 flex items-center justify-between pr-4"
                  >
                    <span>Laporan BS</span>
                    {totalBsItems > 0 && (
                      <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                        {totalBsItems}
                      </span>
                    )}
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
