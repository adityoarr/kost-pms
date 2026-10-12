// src/app/dashboard/page.tsx
"use client";

import { fetchApi } from "@/lib/api";
import { useAuthGuard } from "@/lib/use-auth-guard";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();
  // Hook ini mengembalikan { me, status }
  // status bisa berupa: "loading", "ok", "error"
  const { me, status } = useAuthGuard();

  async function handleLogout() {
    try {
      await fetchApi("/auth/logout", { method: "POST" });
    } catch {
      // Diabaikan jika gagal, tetap clear browser side
    }
    router.replace("/login");
  }

  // 1. Sedang memeriksa sesi
  if (status === "loading") {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md p-8 rounded-2xl bg-white border border-gray-200 shadow-lg text-center text-gray-500 animate-pulse">
          Memeriksa sesi Anda…
        </div>
      </main>
    );
  }

  // 2. Sesi invalid/expired -> Redirect otomatis oleh hook, tapi kita render null agar aman
  if (status === "error" || !me) {
    return null;
  }

  // 3. Sudah login, tampilkan Dashboard
  return (
    <main className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
        <h1 className="text-3xl font-bold text-center mb-2">Dashboard</h1>
        <p className="text-center text-gray-500 mb-8">Sistem Pengelolaan Kost</p>

        <div className="space-y-6">
          {/* Kartu Selamat Datang */}
          <div className="p-6 rounded-xl bg-green-50 border border-green-200">
            <p className="text-lg">
              Halo, <span className="font-semibold">{me.username}</span> 👋
            </p>
            <p className="mt-2 text-sm text-gray-600">Peran Anda: {me.roles.join(", ")}</p>
          </div>

          {/* Menu Navigasi Utama */}
          <div className="grid grid-cols-1 gap-3">
            <a
              href="/properties"
              className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-center transition-colors shadow-sm"
            >
              🏠 Kelola Properti & Kamar
            </a>

            <button
              disabled
              className="w-full py-4 rounded-xl bg-gray-100 text-gray-400 font-semibold cursor-not-allowed border border-gray-200"
            >
              💰 Keuangan & Tagihan (Coming Soon)
            </button>

            <button
              disabled
              className="w-full py-4 rounded-xl bg-gray-100 text-gray-400 font-semibold cursor-not-allowed border border-gray-200"
            >
              🎫 Tiket & Laporan (Coming Soon)
            </button>
          </div>

          {/* Tombol Logout */}
          <button
            onClick={handleLogout}
            className="w-full py-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-semibold transition-colors border border-red-200"
          >
            Keluar
          </button>
        </div>
      </div>
    </main>
  );
}