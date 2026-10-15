// src/app/invoices/page.tsx
"use client";

import GenerateInvoicesModal from "@/components/generate-invoices-modal";
import InvoiceDetailModal from "@/components/invoice-detail-modal";
import { Pagination, SearchBox, useListControls } from "@/components/list-controls";
import { fetchApi } from "@/lib/api";
import { readError } from "@/lib/errors";
import { formatDate, formatRupiah } from "@/lib/format";
import { isOwnerRole, isSuperAdmin } from "@/lib/roles";
import { useAuthGuard } from "@/lib/use-auth-guard";
import { useEffect, useState } from "react";

const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "https://api.adityoarr.com/kost/v1";

const FILTERS = [
    { key: "SEMUA", label: "Semua" }, { key: "OVERDUE", label: "Terlambat" },
    { key: "OPEN", label: "Belum Bayar" }, { key: "PARTIALLY_PAID", label: "Dicicil" },
    { key: "PAID", label: "Lunas" }, { key: "VOID", label: "Dibatalkan" },
];

function badge(eff: string) {
    switch (eff) {
        case "PAID": return "bg-green-100 text-green-800";
        case "OVERDUE": return "bg-red-100 text-red-800";
        case "PARTIALLY_PAID": return "bg-amber-100 text-amber-800";
        case "VOID": return "bg-gray-200 text-gray-600";
        default: return "bg-blue-100 text-blue-800";
    }
}
function monthLabel(iso: string) {
    const d = new Date(iso); if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("id-ID", { month: "short", year: "numeric" });
}

export default function InvoicesPage() {
    const { me, status: authStatus } = useAuthGuard();
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [filter, setFilter] = useState("SEMUA");
    const [detailId, setDetailId] = useState<string | null>(null);
    const [genOpen, setGenOpen] = useState(false);
    const [successMsg, setSuccessMsg] = useState("");

    const canAdjust = !!me && isSuperAdmin(me.roles);
    const canVoid = !!me && isOwnerRole(me.roles);

    function loadData() {
        setLoading(true); setError("");
        fetchApi<any[]>("/invoices").then(setInvoices).catch(() => setError("Gagal memuat data tagihan.")).finally(() => setLoading(false));
    }
    useEffect(() => { if (authStatus === "ok") loadData(); }, [authStatus]);
    useEffect(() => { if (!successMsg) return; const t = setTimeout(() => setSuccessMsg(""), 4000); return () => clearTimeout(t); }, [successMsg]);

    async function handleRunReminders() {
        if (!window.confirm("Kirim pengingat tagihan (H-3 & H+3) ke penyewa sekarang?\nPengingat yang sudah pernah dikirim tidak akan diulang.")) return;
        try {
            const res = await fetch(`${API_BASE_URL}/reminders/run`, { method: "POST", credentials: "include" });
            if (!res.ok) { alert(await readError(res)); return; }
            const d = await res.json();
            setSuccessMsg(
                `Pengingat terkirim — dini(H-7): ${d.dueEarlySent ?? 0}, menjelang(H-3): ${d.dueSoonSent ?? 0}, ` +
                `mendesak(H-1): ${d.dueUrgentSent ?? 0}, terlambat(H+3): ${d.overdueSent ?? 0}. ` +
                `(${d.skipped} sudah pernah dikirim sebelumnya)`
            );
        } catch {
            alert("Tidak bisa menghubungi server.");
        }
    }

    const shown = filter === "SEMUA" ? invoices : invoices.filter((i) => i.effectiveStatus === filter);
    const { query, setQuery, page, setPage, pageCount, total, view } = useListControls(shown, {
        searchKeys: ["tenantName", "tenantPhone", "unitNumber", "propertyName"],
        pageSize: 10,
    });

    if (authStatus === "loading") return (<main className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-pulse text-gray-500">Memeriksa sesi...</div></main>);
    if (authStatus === "error") return null;

    return (
        <main className="min-h-screen bg-gray-50 p-6 md:p-10">
            <div className="max-w-6xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <div>
                        <a href="/dashboard" className="text-sm text-blue-600 hover:underline">← Dashboard</a>
                        <h1 className="text-3xl font-bold text-gray-900 mt-1">Tagihan & Pembayaran</h1>
                        <p className="text-gray-500 mt-1">Piutang kost Anda, per bulan, per penyewa.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {canVoid && (
                            <button onClick={handleRunReminders}
                                className="px-5 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold shadow-sm">
                                🔔 Kirim Pengingat
                            </button>
                        )}
                        <button onClick={() => setGenOpen(true)}
                            className="px-5 py-3 bg-gray-800 hover:bg-gray-900 text-white rounded-xl font-semibold shadow-sm">
                            ⚙️ Generate Tagihan
                        </button>
                    </div>
                </div>

                {successMsg && (<div className="mb-6 p-4 rounded-xl bg-green-50 text-green-800 border border-green-200 font-medium">{successMsg}</div>)}

                <div className="flex flex-wrap gap-2 mb-4">
                    {FILTERS.map((f) => (
                        <button key={f.key} onClick={() => setFilter(f.key)}
                            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${filter === f.key ? "bg-blue-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"}`}>
                            {f.label}
                        </button>
                    ))}
                </div>
                <div className="mb-4"><SearchBox value={query} onChange={setQuery} placeholder="Cari penyewa / kamar / properti…" /></div>

                {loading ? (
                    <div className="bg-white rounded-xl border border-gray-200 p-10 animate-pulse"></div>
                ) : error ? (
                    <div className="p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>
                ) : shown.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300"><p className="text-gray-500 text-lg">Tidak ada tagihan pada filter ini.</p></div>
                ) : (
                    <>
                        <div className="overflow-x-auto bg-white rounded-xl border border-gray-200 shadow-sm">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-gray-200 bg-gray-50 text-gray-600 text-sm uppercase tracking-wider">
                                        <th className="p-4 font-semibold">Periode</th><th className="p-4 font-semibold">Penyewa</th>
                                        <th className="p-4 font-semibold">Kamar</th><th className="p-4 font-semibold">Jatuh Tempo</th>
                                        <th className="p-4 font-semibold text-right">Sisa</th><th className="p-4 font-semibold text-right">Denda</th>
                                        <th className="p-4 font-semibold">Status</th><th className="p-4 font-semibold text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {view.length === 0 ? (
                                        <tr><td colSpan={8} className="p-8 text-center text-gray-500">Tidak ada hasil untuk “{query}”.</td></tr>
                                    ) : view.map((inv) => (
                                        <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="p-4 font-semibold text-gray-900">{monthLabel(inv.periodStart)}</td>
                                            <td className="p-4"><p className="font-medium text-gray-900">{inv.tenantName}</p><p className="text-xs text-gray-500 font-mono">{inv.tenantPhone}</p></td>
                                            <td className="p-4 text-gray-600"><p className="font-medium">Kamar {inv.unitNumber}</p><p className="text-xs text-gray-500">{inv.propertyName}</p></td>
                                            <td className="p-4 text-gray-600 text-sm">{formatDate(inv.dueDate)}</td>
                                            <td className="p-4 text-right font-mono text-gray-900">{formatRupiah(inv.principalRemaining ?? inv.remaining)}</td>
                                            <td className="p-4 text-right font-mono text-red-600">{(inv.feeAmount ?? inv.lateFee ?? 0) > 0 ? formatRupiah(inv.feeAmount ?? inv.lateFee) : "-"}</td>
                                            <td className="p-4"><span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${badge(inv.effectiveStatus)}`}>{inv.effectiveStatus}</span></td>
                                            <td className="p-4 text-right"><button onClick={() => setDetailId(inv.id)} className="px-3 py-1 rounded-lg text-blue-600 hover:bg-blue-50 font-medium text-sm">Detail</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="mt-4 flex justify-end"><Pagination page={page} pageCount={pageCount} onChange={setPage} total={total} /></div>
                    </>
                )}
            </div>

            {detailId && (<InvoiceDetailModal invoiceId={detailId} canAdjust={canAdjust} canVoid={canVoid} onClose={() => setDetailId(null)} onChanged={(m) => { setSuccessMsg(m); loadData(); }} />)}
            {genOpen && (<GenerateInvoicesModal onClose={() => setGenOpen(false)} onSaved={(m) => { setSuccessMsg(m); loadData(); }} />)}
        </main>
    );
}