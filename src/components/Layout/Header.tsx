// src/components/Layout/Header.tsx
"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  FiMenu,
  FiX,
  FiShoppingCart,
  FiUser,
  FiLogOut,
  FiBox,
  FiHome,
  FiShoppingBag,
  FiDollarSign,
  FiFileText,
  FiChevronRight,
  FiChevronDown,
  FiBarChart2,
  FiUsers,
  FiCreditCard,
  FiTrendingUp,
  FiTruck,
} from "react-icons/fi";
import { useCartStoreBS } from "@/store/cartStoreBS";
import { useCartStore } from "@/store/cartStore";

interface BranchBrand {
  logo: string;
  subtitle: string;
}

function detectBranchBrand(hostname: string = ""): BranchBrand {
  const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "").toLowerCase();
  const host = hostname.toLowerCase();
  const combined = `${host} ${apiUrl}`;

  if (
    combined.includes("pdaren") ||
    combined.includes("pd-aren") ||
    combined.includes("tangerang") ||
    combined.includes("103.125.42.217")
  ) {
    return {
      logo: "/tangerang%20192.png",
      subtitle: "NIAGA PD AREN",
    };
  }

  if (combined.includes("bekasi") || combined.includes("191.101.190.235")) {
    return {
      logo: "/bekasi%20192.png",
      subtitle: "NIAGA BEKASI",
    };
  }

  if (combined.includes("pusat") || combined.includes("103.156.218.44")) {
    return {
      logo: "/pusat%20192.png",
      subtitle: "NIAGA PUSAT",
    };
  }

  if (combined.includes("sunter") || combined.includes("151.242.116.131")) {
    return {
      logo: "/sunter%20192.png",
      subtitle: "NIAGA SUNTER",
    };
  }

  return {
    logo: "/Logo_Niaga192X192.png",
    subtitle: "",
  };
}

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [userName, setUserName] = useState<string>("");
  const [userFoto, setUserFoto] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [branchBrand, setBranchBrand] = useState<BranchBrand>(() =>
    detectBranchBrand()
  );

  const mobileProfileRef = useRef<HTMLDivElement>(null);
  const desktopProfileRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname() || "";

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
    if (typeof window !== "undefined") {
      setBranchBrand(detectBranchBrand(window.location.hostname));
    }
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const userObj = JSON.parse(storedUser);
        setUserName(userObj.name || userObj.nama || "User");
        setUserFoto(userObj.foto || "");

        const role =
          userObj.role || userObj.Hak || userObj.level_user || userObj.level || "";
        const checkIsAdmin =
          String(role).toLowerCase() === "admin" ||
          userObj.is_admin === true ||
          userObj.is_admin === 1;

        setIsAdmin(checkIsAdmin);
      } catch (e) {
        console.error("Gagal parsing data user", e);
      }
    } else {
      setUserName("");
      setUserFoto("");
      setIsAdmin(false);
    }
  }, [pathname]);

  // Tutup popup akun & menu atas jika klik di luar
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const inMobileProfile = mobileProfileRef.current?.contains(target);
      const inDesktopProfile = desktopProfileRef.current?.contains(target);

      if (!inMobileProfile && !inDesktopProfile) {
        setIsProfileOpen(false);
      }
      if (menuRef.current && !menuRef.current.contains(target)) {
        setIsMenuOpen(false);
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
      setIsAdmin(false);
      setIsProfileOpen(false);
      router.push("/login");
    }
  };

  const navItems = [
    {
      label: "Home",
      fullLabel: "Beranda",
      href: "/",
      icon: FiHome,
      active: pathname === "/",
    },
    {
      label: "Produk",
      fullLabel: "Katalog Produk",
      href: "/products",
      icon: FiShoppingBag,
      active: pathname.startsWith("/products"),
    },
    {
      label: "Input BS",
      fullLabel: "Input BS",
      href: "/BS/halamanBS",
      icon: FiBox,
      active: pathname.startsWith("/BS"),
    },
    {
      label: "Omset",
      fullLabel: "Cek Omset",
      href: "/laporan/omsetku",
      icon: FiDollarSign,
      active: pathname.startsWith("/laporan/omsetku"),
    },
    {
      label: "Cek Piutang",
      fullLabel: "Cek Piutang",
      href: "/laporan/hutangku",
      icon: FiDollarSign,
      active: pathname.startsWith("/laporan/hutangku"),
    },
    {
      label: "Order",
      fullLabel: "Cek Orderanku",
      href: "/laporan/laporanpo",
      icon: FiFileText,
      active: pathname.startsWith("/laporan/laporanpo"),
    },
  ];

  const isAccountActive =
    isProfileOpen || pathname.startsWith("/userprofile");

  const AccountPopupCard = ({ positionClass }: { positionClass: string }) => (
    <div
      className={`absolute ${positionClass} w-60 bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden z-50`}
    >
      {/* Header Gradasi Biru-Indigo */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-white flex items-center gap-2.5">
        {avatarSrc ? (
          <img
            src={avatarSrc}
            alt={userName}
            className="w-9 h-9 rounded-full object-cover ring-2 ring-white/80 shrink-0"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-white/20 text-white flex items-center justify-center font-extrabold text-sm ring-2 ring-white/40 shrink-0">
            {userName ? userName.charAt(0).toUpperCase() : "U"}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-[10px] text-blue-100 font-medium leading-tight">
            Masuk sebagai
          </p>
          <p className="text-xs sm:text-sm font-extrabold truncate">
            {userName || "User"}
          </p>
        </div>
      </div>

      {/* Daftar Menu Akun & Laporan */}
      <div className="p-1.5 space-y-0.5 bg-white max-h-[340px] overflow-y-auto">
        <Link
          href="/userprofile"
          onClick={() => setIsProfileOpen(false)}
          className="flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <FiUser className="w-3.5 h-3.5" />
            </span>
            <span>Profil Saya</span>
          </div>
          <FiChevronRight className="w-3.5 h-3.5 text-slate-400" />
        </Link>

        {/* Menu tambahan laporan HANYA MUNCUL JIKA ISADMIN BERNILAI TRUE */}
        {isAdmin && (
          <div className="border-t border-slate-100 my-1 pt-1">
            <Link
              href="/laporan/labarugi"
              onClick={() => setIsProfileOpen(false)}
              className="flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <FiBarChart2 className="w-3.5 h-3.5" />
                </span>
                <span>Laba Rugi</span>
              </div>
            </Link>

            <Link
              href="/laporan/piutangaktif"
              onClick={() => setIsProfileOpen(false)}
              className="flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <FiUsers className="w-3.5 h-3.5" />
                </span>
                <span>Piutang Anggota</span>
              </div>
            </Link>

            <Link
              href="/laporan/biayaoperasional"
              onClick={() => setIsProfileOpen(false)}
              className="flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <FiCreditCard className="w-3.5 h-3.5" />
                </span>
                <span>Biaya Operasional</span>
              </div>
            </Link>

            <Link
              href="/laporan/pendapatanlain"
              onClick={() => setIsProfileOpen(false)}
              className="flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                  <FiTrendingUp className="w-3.5 h-3.5" />
                </span>
                <span>Pendapatan Lain</span>
              </div>
            </Link>

            <Link
              href="/laporan/hutangsupplier"
              onClick={() => setIsProfileOpen(false)}
              className="flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                  <FiTruck className="w-3.5 h-3.5" />
                </span>
                <span>Hutang Supplier</span>
              </div>
            </Link>
          </div>
        )}

        <div className="border-t border-slate-100 my-1 pt-1">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors text-left"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <FiLogOut className="w-3.5 h-3.5" />
              </span>
              <span>Keluar (Logout)</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* NAVBAR ATAS */}
      <header
        ref={menuRef}
        className="bg-white shadow-xs sticky top-0 z-50 w-full"
      >
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
            {/* SISI KIRI: LOGO + NAMA KOPERASI + CABANG + MENU PC */}
            <div className="flex items-center min-w-0 flex-1 gap-3 xl:gap-5">
              <Link
                href="/"
                className="flex items-center gap-2 min-w-0 shrink-0"
              >
                <img
                  src={branchBrand.logo}
                  alt={`Logo ${branchBrand.subtitle || "Koperasi Niaga Abadi"}`}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      "/Logo_Niaga192X192.png";
                  }}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg object-contain shrink-0"
                />
                <div className="flex flex-col min-w-0 leading-tight">
                  <span className="font-extrabold text-blue-600 text-xs sm:text-sm xl:text-base tracking-tight truncate">
                    KOPERASI NIAGA ABADI
                  </span>
                  {branchBrand.subtitle && (
                    <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 tracking-wide uppercase truncate">
                      {branchBrand.subtitle}
                    </span>
                  )}
                </div>
              </Link>

              {/* MENU HORIZONTAL KHUSUS PC (>= 1024px) */}
              <nav className="hidden lg:flex items-center gap-0.5 xl:gap-1 min-w-0">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-1.5 px-2 xl:px-2.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                        item.active
                          ? "bg-blue-50 text-blue-700 font-bold"
                          : "text-gray-600 hover:bg-gray-100 hover:text-blue-600"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span>{item.fullLabel}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* SISI KANAN: KERANJANG, AKUN (PC), & HAMBURGER (HP & TABLET) */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
              <Link
                href="/cart"
                className="relative p-1.5 text-gray-700 hover:text-blue-600 transition-colors"
                title="Keranjang Belanja"
              >
                <FiShoppingCart className="w-5 h-5 sm:w-6 sm:h-6" />
                {totalRegularItems > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center ring-2 ring-white">
                    {totalRegularItems > 99 ? "99+" : totalRegularItems}
                  </span>
                )}
              </Link>

              <Link
                href="/keranjangbs"
                className="relative p-1.5 text-gray-700 hover:text-amber-600 transition-colors"
                title="Keranjang BS"
              >
                <FiBox className="w-5 h-5 sm:w-6 sm:h-6" />
                {totalBsItems > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center ring-2 ring-white">
                    {totalBsItems > 99 ? "99+" : totalBsItems}
                  </span>
                )}
              </Link>

              {/* TOMBOL AKUN KHUSUS PC (>= 1024px) */}
              <div className="hidden lg:block relative" ref={desktopProfileRef}>
                <button
                  type="button"
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className={`flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-full border transition-colors ${
                    isAccountActive
                      ? "bg-blue-50 border-blue-200 text-blue-700"
                      : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {avatarSrc ? (
                    <img
                      src={avatarSrc}
                      alt={userName}
                      className="w-7 h-7 rounded-full object-cover ring-1 ring-blue-500"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                      {userName ? userName.charAt(0).toUpperCase() : "U"}
                    </div>
                  )}
                  <span className="text-xs font-semibold max-w-[90px] truncate">
                    {userName || "Akun"}
                  </span>
                  <FiChevronDown className="w-3.5 h-3.5 text-gray-500" />
                </button>

                {isProfileOpen && (
                  <AccountPopupCard positionClass="top-12 right-0" />
                )}
              </div>

              {/* TOMBOL HAMBURGER KHUSUS HP & TABLET */}
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(!isMenuOpen);
                  setIsProfileOpen(false);
                }}
                className={`lg:hidden p-1.5 rounded-xl transition-colors ${
                  isMenuOpen
                    ? "bg-blue-50 text-blue-600"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
                title="Menu Navigasi"
              >
                {isMenuOpen ? (
                  <FiX className="w-5 h-5" />
                ) : (
                  <FiMenu className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* MENU DROPDOWN ATAS KHUSUS HP & TABLET */}
        {isMenuOpen && (
          <div className="lg:hidden bg-white border-t border-gray-100 px-3 py-2.5 space-y-1 shadow-lg">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    item.active
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-700 hover:bg-gray-50 hover:text-blue-600"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`p-1.5 rounded-lg ${
                        item.active
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </span>
                    <span>{item.fullLabel}</span>
                  </div>
                  <FiChevronRight className="w-4 h-4 text-gray-400" />
                </Link>
              );
            })}
          </div>
        )}
      </header>

      {/* BOTTOM NAVIGATION BAR PERMANEN KHUSUS HP & TABLET */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.06)]">
        <div className="max-w-7xl mx-auto flex items-center justify-around h-14 px-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  setIsProfileOpen(false);
                  setIsMenuOpen(false);
                }}
                className={`flex-1 flex flex-col items-center justify-center py-1 gap-0.5 transition-colors ${
                  item.active
                    ? "text-blue-600 font-bold"
                    : "text-gray-500 hover:text-blue-600 font-medium"
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${item.active ? "stroke-[2.5]" : ""}`}
                />
                <span className="text-[10px] leading-none truncate">
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* TAB USER / AKUN + POPUP MENU BERWARNA */}
          <div
            className="relative flex-1 flex justify-center"
            ref={mobileProfileRef}
          >
            <button
              type="button"
              onClick={() => {
                setIsProfileOpen(!isProfileOpen);
                setIsMenuOpen(false);
              }}
              className={`w-full flex flex-col items-center justify-center py-1 gap-0.5 transition-colors ${
                isAccountActive
                  ? "text-blue-600 font-bold"
                  : "text-gray-500 hover:text-blue-600 font-medium"
              }`}
            >
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt={userName}
                  className={`w-5 h-5 rounded-full object-cover ${
                    isAccountActive
                      ? "ring-2 ring-blue-600"
                      : "ring-1 ring-gray-300"
                  }`}
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              ) : (
                <FiUser
                  className={`w-5 h-5 ${isAccountActive ? "stroke-[2.5]" : ""}`}
                />
              )}
              <span className="text-[10px] leading-none truncate">Akun</span>
            </button>

            {isProfileOpen && (
              <AccountPopupCard positionClass="bottom-16 right-1" />
            )}
          </div>
        </div>
      </nav>
    </>
  );
}