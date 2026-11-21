"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FiFacebook, FiTwitter, FiInstagram, FiLinkedin } from "react-icons/fi";

export default function Footer() {
  const [isKaryawan, setIsKaryawan] = useState(false);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const userObj = JSON.parse(storedUser);
        const role = String(
          userObj.role || userObj.Hak || userObj.level_user || ""
        )
          .trim()
          .toLowerCase();
        setIsKaryawan(role === "karyawan");
      }
    } catch {
      setIsKaryawan(false);
    }
  }, []);

  if (isKaryawan) {
    return (
      <footer className="bg-gray-900 text-white mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-400">
          <span>
            &copy; {new Date().getFullYear()} NARIPO. Semua hak dilindungi.
          </span>
          <Link href="/opname" className="text-blue-400 hover:text-white font-semibold">
            Menu Stok Opname
          </Link>
        </div>
      </footer>
    );
  }

  return (
    <footer className="bg-gray-900 text-white mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* About */}
          <div>
            <h3 className="text-lg font-bold mb-4">NARIPO</h3>
            <p className="text-gray-400 text-sm">
              Platform e-commerce terpercaya dengan produk berkualitas dan layanan terbaik.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-bold mb-4">Menu</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <Link href="/" className="hover:text-white">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/products" className="hover:text-white">
                  Produk
                </Link>
              </li>
              <li>
                <Link href="/categories" className="hover:text-white">
                  Kategori
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white">
                  Hubungi Kami
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-lg font-bold mb-4">Dukungan</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <Link href="/faq" className="hover:text-white">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/shipping" className="hover:text-white">
                  Pengiriman
                </Link>
              </li>
              <li>
                <Link href="/returns" className="hover:text-white">
                  Pengembalian
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-white">
                  Privasi
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-lg font-bold mb-4">Kontak</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>Email: info@naripo.com</li>
              <li>Phone: +62 123 456 7890</li>
              <li className="flex gap-4 mt-4">
                <a href="#" className="hover:text-white">
                  <FiFacebook size={20} />
                </a>
                <a href="#" className="hover:text-white">
                  <FiTwitter size={20} />
                </a>
                <a href="#" className="hover:text-white">
                  <FiInstagram size={20} />
                </a>
                <a href="#" className="hover:text-white">
                  <FiLinkedin size={20} />
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8">
          <p className="text-center text-gray-400 text-sm">
            &copy; {new Date().getFullYear()} NARIPO. Semua hak dilindungi.
          </p>
        </div>
      </div>
    </footer>
  );
}