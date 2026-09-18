'use client';

import { useState, useEffect } from 'react';
import { FiBox } from 'react-icons/fi'; // Pastikan sudah install react-icons atau sesuaikan ikonnya

// Interface untuk struktur data Gudang (sesuaikan dengan kolom database Laravel kamu)
interface Gudang {
  id: number;
  nama_gudang?: string;
  name?: string;
  lokasi?: string;
  [key: string]: any;
}

export default function DaftarGudangSection() {
  const [gudangs, setGudangs] = useState<Gudang[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGudangs = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://103.125.42.217:8081/api';
        const response = await fetch(`${apiUrl}/gudangs`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Gagal mengambil data gudang dari server.');
        }

        const result = await response.json();
        
        // Sesuaikan dengan struktur response Laravel (misal: result.data atau langsung array)
        const dataGudang = result.data || result;
        setGudangs(Array.isArray(dataGudang) ? dataGudang : []);
      } catch (err: any) {
        setError(err.message || 'Terjadi kesalahan');
      } finally {
        setLoading(false);
      }
    };

    fetchGudangs();
  }, []);

  if (loading) {
    return <div className="py-8 text-center text-gray-500">Memuat daftar gudang...</div>;
  }

  if (error) {
    return <div className="py-8 text-center text-red-500">Error: {error}</div>;
  }

  return (
    <section className="py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Daftar Gudang</h2>

      {gudangs.length === 0 ? (
        <p className="text-gray-500">Tidak ada gudang tersedia.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {gudangs.map((gudang) => (
            <div 
              key={gudang.id} 
              className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="mb-4 text-blue-600">
                {/* Ikon Kotak/Gudang */}
                <FiBox size={40} />
              </div>
              <h3 className="font-semibold text-gray-800 text-lg">
                {gudang.nama_gudang || gudang.name || `Gudang #${gudang.id}`}
              </h3>
              {gudang.lokasi && (
                <p className="text-sm text-gray-500 mt-1">{gudang.lokasi}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}