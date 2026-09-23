import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import {
  FiPlus,
  FiSave,
  FiSearch,
  FiClipboard,
  FiMinus,
  FiTrash2,
} from "react-icons/fi";

interface Barang {
  kd_br: string;
  nama: string;
  satuan: string;
  h_anggota: number;
  barcode?: string;
}

interface DetailItem {
  no_urut: number;
  kd_br: string;
  nama_br: string;
  satuan: string;
  hpp: number;
  qty: number;
  sub_total: number;
}

export default function HalamanOpname() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  // Header State
  const [noBuku, setNoBuku] = useState<string>("");
  const [tanggal, setTanggal] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [penulis, setPenulis] = useState<string>("");
  const [penghitung, setPenghitung] = useState<string>("");
  const [pengawas, setPengawas] = useState<string>("");
  const [catatan, setCatatan] = useState<string>("-");

  // Detail / Grid Items State (700 baris)
  const [items, setItems] = useState<DetailItem[]>([]);

  // Modal / Pencarian Barang State
  const [showSearchModal, setShowSearchModal] = useState<boolean>(false);
  const [activeRowIndex, setActiveRowIndex] = useState<number | null>(null);
  const [searchKeyword, setSearchKeyword] = useState<string>("");
  const [barangsList, setBarangsList] = useState<Barang[]>([]);
  const [searchingBarang, setSearchingBarang] = useState<boolean>(false);

  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://103.125.42.217:8081/api";

  // Load data dari localStorage saat komponen pertama kali dimuat
  useEffect(() => {
    setIsMounted(true);
    const savedData = localStorage.getItem("opname_draft_data");
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setNoBuku(parsed.noBuku || "");
        setTanggal(parsed.tanggal || new Date().toISOString().split("T")[0]);
        setPenulis(parsed.penulis || "");
        setPenghitung(parsed.penghitung || "");
        setPengawas(parsed.pengawas || "");
        setCatatan(parsed.catatan || "-");
        if (
          parsed.items &&
          Array.isArray(parsed.items) &&
          parsed.items.length > 0
        ) {
          setItems(parsed.items);
          return;
        }
      } catch (e) {
        console.error("Gagal parsing localStorage draft:", e);
      }
    }
    generateInitialRows();
  }, []);

  // Simpan otomatis ke localStorage setiap ada perubahan pada state form/tabel
  useEffect(() => {
    if (!isMounted) return;
    const draftData = {
      noBuku,
      tanggal,
      penulis,
      penghitung,
      pengawas,
      catatan,
      items,
    };
    localStorage.setItem("opname_draft_data", JSON.stringify(draftData));
  }, [
    noBuku,
    tanggal,
    penulis,
    penghitung,
    pengawas,
    catatan,
    items,
    isMounted,
  ]);

  const generateInitialRows = () => {
    const initial: DetailItem[] = [];
    for (let i = 1; i <= 700; i++) {
      initial.push({
        no_urut: i,
        kd_br: "",
        nama_br: "",
        satuan: "",
        hpp: 0,
        qty: 0,
        sub_total: 0,
      });
    }
    setItems(initial);
  };

  const handleTambahBaris = () => {
    setItems((prev) => [
      ...prev,
      {
        no_urut: prev.length + 1,
        kd_br: "",
        nama_br: "",
        satuan: "",
        hpp: 0,
        qty: 0,
        sub_total: 0,
      },
    ]);
  };

  const openSearchModal = (index: number) => {
    setActiveRowIndex(index);
    setShowSearchModal(true);
    setSearchKeyword("");
    fetchBarangs("");
  };

  const fetchBarangs = async (keyword: string) => {
    setSearchingBarang(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(
        `${apiUrl}/barangs?search=${encodeURIComponent(keyword)}&limit=20`,
        {
          headers: {
            Accept: "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
        },
      );
      const json = await res.json();
      if (res.ok) {
        setBarangsList(json.data || json || []);
      }
    } catch (err) {
      console.error("Gagal ambil barang:", err);
    } finally {
      setSearchingBarang(false);
    }
  };

  const handleSelectBarang = (barang: Barang) => {
    if (activeRowIndex === null) return;

    setItems((prev) => {
      const updated = [...prev];
      const currentItem = updated[activeRowIndex];
      const hpp = barang.h_anggota || 0;
      const qty = currentItem.qty || 0;

      updated[activeRowIndex] = {
        ...currentItem,
        kd_br: barang.kd_br,
        nama_br: barang.nama,
        satuan: barang.satuan,
        hpp: hpp,
        sub_total: hpp * qty,
      };
      return updated;
    });

    setShowSearchModal(false);
    setActiveRowIndex(null);
  };

  const handleClearRow = (index: number) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        kd_br: "",
        nama_br: "",
        satuan: "",
        hpp: 0,
        qty: 0,
        sub_total: 0,
      };
      return updated;
    });
  };

  const handleQtyChange = (index: number, val: string) => {
    const cleanedVal = val.replace(/\D/g, "");
    if (cleanedVal.length > 4) return;

    const qty = cleanedVal === "" ? 0 : parseInt(cleanedVal, 10);
    setItems((prev) => {
      const updated = [...prev];
      const item = updated[index];
      updated[index] = {
        ...item,
        qty: qty,
        sub_total: item.hpp * qty,
      };
      return updated;
    });
  };

  const handleQtyAdjust = (index: number, delta: number) => {
    setItems((prev) => {
      const updated = [...prev];
      const item = updated[index];
      const newQty = Math.max(0, Math.min(9999, (item.qty || 0) + delta));
      updated[index] = {
        ...item,
        qty: newQty,
        sub_total: item.hpp * newQty,
      };
      return updated;
    });
  };

  const grandTotal = items.reduce((acc, curr) => acc + curr.sub_total, 0);

  const handleSimpan = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Silakan login terlebih dahulu.");
      return;
    }

    if (!noBuku.trim()) {
      alert("Nomor Buku wajib diisi!");
      return;
    }

    const validItems = items.filter((item) => item.kd_br.trim() !== "");
    if (validItems.length === 0) {
      alert("Belum ada item barang yang diinput pada tabel opname!");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        no_buku: noBuku,
        tanggal: tanggal,
        penulis: penulis,
        penghitung: penghitung,
        pengawas: pengawas,
        ket: catatan,
        items: validItems.map((item) => ({
          no_urut: item.no_urut,
          kd_br: item.kd_br,
          nama_br: item.nama_br,
          satuan: item.satuan,
          hpp: item.hpp,
          qty: item.qty,
          sub_total: item.sub_total,
        })),
      };

      const res = await fetch(`${apiUrl}/master-opname`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        alert("Stok Opname berhasil disimpan!");
        localStorage.removeItem("opname_draft_data");
        generateInitialRows();
        setNoBuku("");
        setCatatan("-");
      } else {
        alert(result.message || "Gagal menyimpan data opname.");
      }
    } catch (err: any) {
      console.error("Error simpan opname:", err);
      alert("Terjadi kesalahan koneksi ke server.");
    } finally {
      setLoading(false);
    }
  };

  if (!isMounted) return null;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-6 bg-slate-900 text-white rounded-xl shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-700 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 rounded-lg text-white">
              <FiClipboard className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-wide">
              Proses Stok Opname Master -BARANG-
            </h1>
          </div>
          <span className="text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-3 py-1 rounded-full">
            ● Draft Tersimpan Otomatis
          </span>
        </div>

        {/* Form Header */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-800 p-5 rounded-xl border border-slate-700 mb-6">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="w-28 font-semibold text-sm text-slate-300">
                No Buku :
              </label>
              <input
                type="text"
                value={noBuku}
                onChange={(e) => setNoBuku(e.target.value)}
                placeholder="Masukkan No Buku..."
                className="flex-1 bg-slate-900 border border-slate-600 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500 text-white"
              />
            </div>
            <div className="flex items-center gap-4">
              <label className="w-28 font-semibold text-sm text-slate-300">
                Tanggal :
              </label>
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-600 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500 text-white color-scheme-dark [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
              />
            </div>
            <div className="flex items-center gap-4">
              <label className="w-28 font-semibold text-sm text-slate-300">
                Penulis :
              </label>
              <input
                type="text"
                value={penulis}
                onChange={(e) => setPenulis(e.target.value)}
                placeholder="Nama Penulis..."
                className="flex-1 bg-slate-900 border border-slate-600 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500 text-white"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="w-28 font-semibold text-sm text-slate-300">
                Penghitung :
              </label>
              <input
                type="text"
                value={penghitung}
                onChange={(e) => setPenghitung(e.target.value)}
                placeholder="Nama Penghitung..."
                className="flex-1 bg-slate-900 border border-slate-600 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500 text-white"
              />
            </div>
            <div className="flex items-center gap-4">
              <label className="w-28 font-semibold text-sm text-slate-300">
                Pengawas :
              </label>
              <input
                type="text"
                value={pengawas}
                onChange={(e) => setPengawas(e.target.value)}
                placeholder="Nama Pengawas..."
                className="flex-1 bg-slate-900 border border-slate-600 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500 text-white"
              />
            </div>
          </div>
        </div>

        {/* Tabel Grid Detail Opname (700 Baris) */}
        <div className="overflow-x-auto border border-slate-700 rounded-lg mb-6 max-h-[600px] overflow-y-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-700 text-slate-200">
                <th className="p-2.5 border border-slate-600 w-16 text-center">
                  F8
                </th>
                <th className="p-2.5 border border-slate-600 w-36">KODE</th>
                <th className="p-2.5 border border-slate-600">NAMA BARANG</th>
                <th className="p-2.5 border border-slate-600 w-20 text-center">
                  SAT
                </th>
                <th className="p-2.5 border border-slate-600 w-36 bg-cyan-900 text-cyan-200 text-right">
                  HPP
                </th>
                <th className="p-2.5 border border-slate-600 w-40 bg-fuchsia-900 text-fuchsia-200 text-center">
                  QTY
                </th>
                <th className="p-2.5 border border-slate-600 w-36 text-right">
                  SUB TOTAL
                </th>
                <th className="p-2.5 border border-slate-600 w-12 text-center">
                  #
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr
                  key={index}
                  className="hover:bg-slate-800 transition-colors"
                >
                  <td className="p-2 border border-slate-700 text-center bg-slate-800 text-blue-400 font-bold">
                    {item.no_urut}
                  </td>
                  <td
                    onClick={() => openSearchModal(index)}
                    className="p-2 border border-slate-700 cursor-pointer text-blue-300 font-mono hover:bg-slate-700"
                    title="Klik untuk pilih barang (F8)"
                  >
                    {item.kd_br || (
                      <span className="text-slate-500 italic">Pilih...</span>
                    )}
                  </td>
                  <td
                    onClick={() => openSearchModal(index)}
                    className="p-2 border border-slate-700 cursor-pointer truncate max-w-xs hover:bg-slate-700"
                  >
                    {item.nama_br || (
                      <span className="text-slate-500 italic">
                        - Klik cari barang -
                      </span>
                    )}
                  </td>
                  <td className="p-2 border border-slate-700 text-center text-slate-300">
                    {item.satuan || "-"}
                  </td>
                  <td className="p-2 border border-slate-700 text-right bg-cyan-950/40 font-mono">
                    {item.hpp.toLocaleString()}
                  </td>
                  <td className="p-2 border border-slate-700 bg-fuchsia-950/40 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleQtyAdjust(index, -1)}
                        className="bg-slate-800 hover:bg-slate-700 text-fuchsia-300 border border-fuchsia-700 rounded px-1.5 py-1 text-xs font-bold transition"
                        title="Kurangi 1"
                      >
                        <FiMinus className="w-3 h-3" />
                      </button>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={4}
                        value={item.qty}
                        onChange={(e) => handleQtyChange(index, e.target.value)}
                        className="w-14 bg-slate-900 text-center text-white px-1 py-1 rounded border border-fuchsia-700 focus:outline-none focus:border-white font-mono text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        placeholder="0"
                      />
                      <button
                        type="button"
                        onClick={() => handleQtyAdjust(index, 1)}
                        className="bg-slate-800 hover:bg-slate-700 text-fuchsia-300 border border-fuchsia-700 rounded px-1.5 py-1 text-xs font-bold transition"
                        title="Tambah 1"
                      >
                        <FiPlus className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                  <td className="p-2 border border-slate-700 text-right font-mono font-semibold text-emerald-400">
                    {item.sub_total.toLocaleString()}
                  </td>
                  <td className="p-2 border border-slate-700 text-center">
                    {item.kd_br && (
                      <button
                        type="button"
                        onClick={() => handleClearRow(index)}
                        className="text-red-400 hover:text-red-300 p-1"
                        title="Kosongkan Baris"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Catatan & Grand Total */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center mb-6">
          <div className="lg:col-span-2 space-y-2">
            <label className="text-sm font-semibold text-slate-300">
              Catatan :
            </label>
            <input
              type="text"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 text-white"
            />
          </div>
          <div className="bg-black border border-slate-700 p-4 rounded-xl text-right">
            <span className="text-xs text-slate-400 font-bold block mb-1">
              GRAND TOTAL :
            </span>
            <span className="text-3xl font-extrabold text-fuchsia-400 font-mono">
              {grandTotal.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Footer Action Buttons */}
        <div className="flex items-center gap-4">
          {/* <button
            onClick={handleTambahBaris}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow transition"
          >
            <FiPlus className="w-5 h-5" />
            Baris Baru
          </button> */}
          <button
            onClick={handleSimpan}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow transition"
          >
            <FiSave className="w-5 h-5" />
            {loading ? "Menyimpan..." : "Simpan"}
          </button>
        </div>

        {/* MODAL PENCARIAN BARANG */}
        {showSearchModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 border border-slate-700 w-full max-w-2xl rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
              <div className="p-4 bg-slate-700 flex items-center justify-between">
                <h3 className="font-bold text-lg text-white">Pilih Barang</h3>
                <button
                  onClick={() => setShowSearchModal(false)}
                  className="text-slate-300 hover:text-white font-bold px-2 py-1"
                >
                  ✕
                </button>
              </div>
              <div className="p-4 border-b border-slate-700">
                <div className="relative">
                  <FiSearch className="absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={searchKeyword}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSearchKeyword(val);
                      fetchBarangs(val);
                    }}
                    placeholder="Scan barcode, ketik kode atau nama barang..."
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    autoFocus
                  />
                </div>
              </div>
              <div
                className="flex-1 overflow-y-auto p-4 space-y-2"
                style={{ minHeight: "300px" }}
              >
                {searchingBarang ? (
                  <div className="text-center py-10 text-slate-400">
                    Memuat barang...
                  </div>
                ) : barangsList.length === 0 ? (
                  <div className="text-center py-10 text-slate-400">
                    Tidak ada barang ditemukan.
                  </div>
                ) : (
                  barangsList.map((b) => (
                    <div
                      key={b.kd_br}
                      onClick={() => handleSelectBarang(b)}
                      className="p-3 bg-slate-900/60 hover:bg-slate-700 border border-slate-700 rounded-lg cursor-pointer flex justify-between items-center transition"
                    >
                      <div>
                        <div className="font-mono text-blue-400 text-sm flex items-center gap-2">
                          <span>{b.kd_br}</span>
                          {b.barcode && (
                            <span className="text-xs text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                              Barcode: {b.barcode}
                            </span>
                          )}
                        </div>
                        <div className="text-white font-medium text-sm">
                          {b.nama}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-400">
                          Sat: {b.satuan}
                        </div>
                        <div className="text-cyan-400 font-mono text-sm">
                          {(b.h_anggota || 0).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
