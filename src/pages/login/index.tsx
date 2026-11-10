"use client";



import { useState } from "react";

import { useRouter } from "next/navigation";

import Head from "next/head";

import Link from "next/link";



export default function LoginPage() {

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [error, setError] = useState("");

  const [loading, setLoading] = useState(false);

  const router = useRouter();



  const handleLogin = async (e: React.FormEvent) => {

    e.preventDefault();

    setLoading(true);

    setError("");



    const API_URL =

      process.env.NEXT_PUBLIC_API_URL || "http://103.125.42.217:8081/api";



    try {

      const res = await fetch(`${API_URL}/login`, {

        method: "POST",

        headers: {

          "Content-Type": "application/json",

          Accept: "application/json",

        },

        body: JSON.stringify({

          email,

          password,

          device_id: "web-browser",

        }),

      });



      const data = await res.json();



      if (!res.ok || !data.success) {

        throw new Error(

          data.message || "Login gagal, periksa kembali email dan password.",

        );

      }



      // 1. Simpan Token

      localStorage.setItem("token", data.data.token);



      // 2. Simpan Data User Lengkap

      localStorage.setItem("user", JSON.stringify(data.data.user));



      // 3. Simpan kd_cus secara spesifik untuk dibaca oleh Cart/Checkout

      if (data.data.user && data.data.user.kd_cus) {

        localStorage.setItem("kd_cus", data.data.user.kd_cus);

      }



      router.push("/");

    } catch (err: any) {

      setError(err.message || "Terjadi kesalahan pada server.");

    } finally {

      setLoading(false);

    }

  };



  return (

    <>

      <Head>

        <title>Login - Naripo</title>

      </Head>

      <div className="flex min-h-screen items-center justify-center bg-gray-100">

        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">

          <h2 className="mb-6 text-center text-2xl font-bold text-gray-800">

            Login

          </h2>



          {error && (

            <div className="mb-4 rounded-md bg-red-100 p-3 text-sm text-red-700">

              {error}

            </div>

          )}



          <form onSubmit={handleLogin} className="space-y-4">

            <div>

              <label className="block text-sm font-medium text-gray-700">

                Email

              </label>

              <input

                type="email"

                value={email}

                onChange={(e) => setEmail(e.target.value)}

                required

                className="mt-1 w-full rounded-md border border-gray-300 p-2 focus:border-indigo-500 focus:outline-none"

                placeholder="contoh@email.com"

              />

            </div>



            <div>

              <label className="block text-sm font-medium text-gray-700">

                Password

              </label>

              <input

                type="password"

                value={password}

                onChange={(e) => setPassword(e.target.value)}

                required

                className="mt-1 w-full rounded-md border border-gray-300 p-2 focus:border-indigo-500 focus:outline-none"

                placeholder="••••••••"

              />

            </div>



            <button

              type="submit"

              disabled={loading}

              className="w-full rounded-md bg-indigo-600 py-2 font-semibold text-white hover:bg-indigo-700 transition disabled:opacity-50"

            >

              {loading ? "Memproses..." : "Login"}

            </button>

          </form>



          {/* Divider & Tombol Daftar Baru */}

          <div className="mt-6 border-t border-gray-200 pt-4 text-center">

            <p className="text-sm text-gray-600 mb-3">Belum memiliki akun?</p>

            <Link

              href="/login/register"

              className="block w-full rounded-md border border-indigo-600 py-2 text-center font-semibold text-indigo-600 hover:bg-indigo-50 transition"

            >

              Daftar Baru

            </Link>

          </div>

        </div>

      </div>

    </>

  );

}