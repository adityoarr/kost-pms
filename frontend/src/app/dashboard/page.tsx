// src/app/dashboard/page.tsx
"use client";

import { fetchApi } from "@/lib/api";
import { formatDate, formatRupiah } from "@/lib/format";
import { isSuperAdmin } from "@/lib/roles";
import { useAuthGuard } from "@/lib/use-auth-guard";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Summary = {
  outstanding: number;
  overdueAmount: number;
  overdueCount: number;
  collectedThisMonth: number;
  billedThisMonth: number;
  occupiedUnits: number;
  rentableUnits: number;
  openTickets: number;
};

export default function DashboardPage() {
  const router = useRouter();
  const { me, status } = useAuthGuard();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [overdue, setOverdue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== "ok") return;
    setLoading(true);
    Promise.all([
      fetchApi<Summary>("/reports/summary"),
      fetchApi<any[]>("/invoices"),
    ])
      .then(([s, invs]) => {
        setSummary(s);
        setOverdue(
          invs
            .filter((i) => i.effectiveStatus === "OVERDUE")
            .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
            .slice(0, 5)
        );
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, [status]);

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

  const occupancyPct =
    summary && summary.rentableUnits > 0
      ? Math.round((summary.occupiedUnits / summary.rentableUnits) * 100)
      : 0;

  const linkCls =
    "w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-center transition-colors shadow-sm";

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Halo, {me.username} 👋</h1>
            <p className="text-gray-500 mt-1">Peran Anda: {me.roles.join(", ")}</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-5 py-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-semibold border border-red-200"
          >
            Keluar
          </button>
        </div>

        {/* Kartu metrik keuangan */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">Rekap Bulan Ini</h2>
          {loading || !summary ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-28 bg-white rounded-xl animate-pulse border border-gray-200"></div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Metric label="Outstanding (belum lunas)" value={formatRupiah(summary.outstanding)} tone="blue" />
              <Metric
                label={`Telat (${summary.overdueCount} tagihan)`}
                value={formatRupiah(summary.overdueAmount)}
                tone="red"
              />
              <Metric label="Diterima bulan ini" value={formatRupiah(summary.collectedThisMonth)} tone="green" />
              <Metric label="Ditagih bulan ini" value={formatRupiah(summary.billedThisMonth)} tone="gray" />
            </div>
          )}
        </section>

        {/* Okupansi & tiket */}
        {!loading && summary && (
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <p className="text-sm text-gray-500 mb-1">Okupansi Kamar</p>
              <p className="text-2xl font-bold text-gray-900">
                {summary.occupiedUnits}/{summary.rentableUnits} kamar terisi
              </p>
              <div className="mt-3 h-2 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full bg-blue-600" style={{ width: `${occupancyPct}%` }} />
              </div>
              <p className="text-xs text-gray-400 mt-1">{occupancyPct}% terisi</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Tiket Terbuka</p>
                <p className="text-2xl font-bold text-gray-900">{summary.openTickets} laporan</p>
              </div>
              <a href="/tickets" className="text-blue-600 hover:underline text-sm font-semibold">
                Kelola →
              </a>
            </div>
          </section>
        )}

        {/* Perlu perhatian: top overdue */}
        {!loading && (
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Perlu Perhatian</h2>
            {overdue.length === 0 ? (
              <div className="bg-white p-8 rounded-xl border border-dashed border-gray-300 text-center text-gray-500">
                Tidak ada tagihan yang telat. 🎉
              </div>
            ) : (
              <div className="overflow-x-auto bg-white rounded-xl border border-gray-200 shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 text-gray-600 text-sm uppercase tracking-wider">
                      <th className="p-4 font-semibold">Penyewa</th>
                      <th className="p-4 font-semibold">Kamar</th>
                      <th className="p-4 font-semibold">Jatuh Tempo</th>
                      <th className="p-4 font-semibold text-right">Sisa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {overdue.map((i) => (
                      <tr key={i.id} className="hover:bg-gray-50">
                        <td className="p-4 font-medium text-gray-900">{i.tenantName}</td>
                        <td className="p-4 text-gray-600">
                          Kamar {i.unitNumber} <span className="text-xs text-gray-400">({i.propertyName})</span>
                        </td>
                        <td className="p-4 text-red-600 text-sm">{formatDate(i.dueDate)}</td>
                        <td className="p-4 text-right font-mono text-gray-900">{formatRupiah(i.remaining)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="p-3 text-right">
                  <a href="/invoices" className="text-blue-600 hover:underline text-sm font-semibold">
                    Lihat semua tagihan →
                  </a>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Navigasi */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">Kelola</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: "blue" | "red" | "green" | "gray" }) {
  const toneCls =
    tone === "red" ? "text-red-600" :
      tone === "green" ? "text-green-700" :
        tone === "blue" ? "text-blue-700" : "text-gray-900";
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className={`text-xl font-bold ${toneCls}`}>{value}</p>
    </div>
  );
}