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
} from "react-icons/fi";
import { useCartStore } from "@/store/cartStore";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [userName, setUserName] = useState<string>("");
  const [userFoto, setUserFoto] = useState<string>("");
  const profileRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const { getItemCount } = useCartStore((state: any) => state);
  const itemCount = getItemCount ? getItemCount() : 0;

  // const { getItemCount } = useCartStore();
  // const itemCount = getItemCount();

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const userObj = JSON.parse(storedUser);
        // Mengambil nama dan foto user dari localStorage
        setUserName(userObj.name || "User");
        if (userObj.foto) {
          setUserFoto(userObj.foto);
        }
      } catch (e) {
        console.error("Gagal parsing data user", e);
      }
    }
  }, []);

  // Menutup dropdown profile jika mengklik di luar area profile
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setIsProfileOpen(false);
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
            <h1 className="text-2xl font-bold text-blue-600">
              KOPERASI NIAGA ABADI RIDHOTULLAH
            </h1>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex gap-8">
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
          </nav>

          {/* Icons */}
          <div className="flex items-center gap-6 ml-8">
            <Link href="/cart" className="relative">
              <FiShoppingCart
                size={24}
                className="text-gray-700 hover:text-blue-600"
              />
              {itemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </Link>

            {/* Profile Dropdown Menu */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex flex-col items-center justify-center focus:outline-none group cursor-pointer"
              >
                {/* Avatar / Foto Profil */}
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

              {/* Dropdown Card */}
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
            className="md:hidden ml-4 cursor-pointer"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="md:hidden pb-4 space-y-2">
            <Link
              href="/"
              className="block py-2 text-gray-700 hover:text-blue-600"
            >
              Home
            </Link>
            <Link
              href="/products"
              className="block py-2 text-gray-700 hover:text-blue-600"
            >
              Produk
            </Link>
            <Link
              href="/laporan/laporanpo"
              className="block py-2 text-gray-700 hover:text-blue-600"
            >
              Laporan
            </Link>
            <Link
              href="/favorites/produkfavorites"
              className="block py-2 text-gray-700 hover:text-blue-600"
            >
              Favorite
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
