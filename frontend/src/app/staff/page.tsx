// src/app/staff/page.tsx
"use client";

import PaymentFormModal from "@/components/payment-form-modal";
import TicketDetailModal from "@/components/ticket-detail-modal";
import { fetchApi } from "@/lib/api";
import { formatDate, formatRupiah } from "@/lib/format";
import { useStaffGuard } from "@/lib/use-staff-guard";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

function statusBadge(s: string) {
  switch (s) {
    case "OPEN": return "bg-blue-100 text-blue-800";
    case "IN_PROGRESS": return "bg-amber-100 text-amber-800";
    case "RESOLVED": return "bg-green-100 text-green-800";
    case "CLOSED": return "bg-gray-200 text-gray-600";
    default: return "bg-gray-100 text-gray-800";
  }
}
function invBadge(eff: string) {
  switch (eff) {
    case "OVERDUE": return "bg-red-100 text-red-800";
    case "PARTIALLY_PAID": return "bg-amber-100 text-amber-800";
    default: return "bg-blue-100 text-blue-800";
  }
}

export default function StaffPage() {
  const router = useRouter();
  const { me, status } = useStaffGuard();
  const [tickets, setTickets] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [payInvoice, setPayInvoice] = useState<any | null>(null);
  const [msg, setMsg] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([fetchApi<any[]>("/tickets"), fetchApi<any[]>("/invoices")])
      .then(([t, i]) => { setTickets(t); setInvoices(i); })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { if (status === "ok") load(); }, [status, load]);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(""), 4000);
    return () => clearTimeout(t);
  }, [msg]);

  async function handleLogout() {
    try { await fetchApi("/auth/logout", { method: "POST" }); } catch { }
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

  // Tiket yang ditugaskan ke saya & belum selesai.
  const myOpen = tickets
    .filter((t) => t.assignedToUsername === me.username && (t.status === "OPEN" || t.status === "IN_PROGRESS"))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  // Semua tiket terbuka (untuk link cepat kalau "tugas saya" kosong).
  const allOpen = tickets.filter((t) => t.status === "OPEN" || t.status === "IN_PROGRESS");
  // Tagihan perlu perhatian: telat dulu, lalu belum bayar/dicicil.
  const attention = invoices
    .filter((i) => i.status !== "PAID" && i.status !== "VOID" && (i.totalDue ?? i.principalRemaining ?? i.remaining ?? 0) > 0)
    .sort((a, b) => (a.effectiveStatus === "OVERDUE" ? -1 : 1) - (b.effectiveStatus === "OVERDUE" ? -1 : 1) || new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 8);

  const linkCls = "px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 text-sm";

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Ruang Kerja, {me.username} 👋</h1>
            <p className="text-gray-500 mt-1">Tiket & pembayaran yang menjadi tanggung jawab Anda.</p>
          </div>
          <button onClick={handleLogout} className="px-5 py-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-semibold border border-red-200">
            Keluar
          </button>
        </div>

        {msg && (<div className="p-4 rounded-xl bg-green-50 text-green-800 border border-green-200 font-medium">{msg}</div>)}

        {/* Navigasi cepat ke halaman yang staff-boleh (sudah staff-safe dari 6.8.2) */}
        <div className="flex flex-wrap gap-2">
          <a href="/tickets" className={linkCls}>🎫 Semua Tiket</a>
          <a href="/invoices" className={linkCls}>💰 Tagihan</a>
          <a href="/tenants" className={linkCls}>👥 Penyewa</a>
          <a href="/leases" className={linkCls}>📄 Kontrak</a>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-10 animate-pulse"></div>
        ) : (
          <>
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">Tiket Ditugaskan ke Saya</h2>
              {myOpen.length === 0 ? (
                <div className="bg-white p-8 rounded-xl border border-dashed border-gray-300 text-center text-gray-500">
                  Tidak ada tiket atas nama Anda.{allOpen.length > 0 && <span className="block text-sm mt-1">Ada {allOpen.length} tiket terbuka yang bisa Anda ambil di <a href="/tickets" className="text-blue-600 underline">Semua Tiket</a>.</span>}
                </div>
              ) : (
                <div className="space-y-2">
                  {myOpen.map((t) => (
                    <div key={t.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{t.title}</p>
                        <p className="text-xs text-gray-500 mt-1">{t.category} • {t.tenantName} • Kamar {t.unitNumber} • {formatDate(t.createdAt)}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusBadge(t.status)}`}>{t.status}</span>
                        <button onClick={() => setTicketId(t.id)} className="text-sm text-blue-600 hover:underline font-medium">Buka</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">Tagihan Perlu Perhatian</h2>
              {attention.length === 0 ? (
                <div className="bg-white p-8 rounded-xl border border-dashed border-gray-300 text-center text-gray-500">Semua tagihan lunas. 🎉</div>
              ) : (
                <div className="overflow-x-auto bg-white rounded-xl border border-gray-200 shadow-sm">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50 text-gray-600 uppercase tracking-wider">
                        <th className="p-3 font-semibold">Penyewa</th>
                        <th className="p-3 font-semibold">Kamar</th>
                        <th className="p-3 font-semibold">Jatuh Tempo</th>
                        <th className="p-3 font-semibold text-right">Sisa</th>
                        <th className="p-3 font-semibold">Status</th>
                        <th className="p-3 font-semibold text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {attention.map((i) => (
                        <tr key={i.id} className="hover:bg-gray-50">
                          <td className="p-3 font-medium text-gray-900">{i.tenantName}</td>
                          <td className="p-3 text-gray-600">Kamar {i.unitNumber}</td>
                          <td className="p-3 text-gray-600">{formatDate(i.dueDate)}</td>
                          <td className="p-3 text-right font-mono text-gray-900">{formatRupiah(i.principalRemaining ?? i.remaining ?? 0)}</td>
                          <td className="p-3"><span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${invBadge(i.effectiveStatus)}`}>{i.effectiveStatus}</span></td>
                          <td className="p-3 text-right">
                            <button onClick={() => setPayInvoice(i)} className="px-3 py-1 rounded-lg text-blue-600 hover:bg-blue-50 font-medium">Catat</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {ticketId && (
        <TicketDetailModal ticketId={ticketId} onClose={() => setTicketId(null)} onChanged={(m) => { setMsg(m); load(); }} />
      )}
      {payInvoice && (
        <PaymentFormModal
          mode="payment"
          invoice={payInvoice}
          onClose={() => setPayInvoice(null)}
          onSaved={(m) => { setMsg(m); load(); }}
        />
      )}
    </main>
  );
}