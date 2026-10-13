// src/app/dashboard/page.tsx  (ganti seluruh isi)
"use client";

import { fetchApi } from "@/lib/api";
import { isSuperAdmin } from "@/lib/roles";
import { useAuthGuard } from "@/lib/use-auth-guard";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();
  const { me, status } = useAuthGuard();

  async function handleLogout() {
    try {
      await fetchApi("/auth/logout", { method: "POST" });
    } catch {
      // diabaikan
    }
    router.replace("/login");
  }

  if (status === "loading") {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md p-8 rounded-2xl bg-white border border-gray-200 shadow-lg text-center text-gray-500 animate-pulse">
          Memeriksa sesi Anda…
        </div>
      </main>
    );
  }

  if (status === "error" || !me) return null;

  const linkCls =
    "w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-center transition-colors shadow-sm";

  return (
    <main className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
        <h1 className="text-3xl font-bold text-center mb-2">Dashboard</h1>
        <p className="text-center text-gray-500 mb-8">Sistem Pengelolaan Kost</p>

        <div className="space-y-6">
          <div className="p-6 rounded-xl bg-green-50 border border-green-200">
            <p className="text-lg">
              Halo, <span className="font-semibold">{me.username}</span> 👋
            </p>
            <p className="mt-2 text-sm text-gray-600">Peran Anda: {me.roles.join(", ")}</p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <a href="/properties" className={linkCls}>🏠 Properti & Kamar</a>
            <a href="/tenants" className={linkCls}>👥 Penyewa</a>
            <a href="/leases" className={linkCls}>📄 Kontrak Hunian</a>
            <a href="/invoices" className={linkCls}>💰 Tagihan & Pembayaran</a>
            <a href="/tickets" className={linkCls}>🎫 Tiket Laporan</a>

            {isSuperAdmin(me.roles) && (
              <a href="/users" className="w-full py-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-center transition-colors shadow-sm">
                👤 Akun Pegawai
              </a>
            )}
          </div>

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