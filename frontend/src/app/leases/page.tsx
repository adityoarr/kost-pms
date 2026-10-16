// src/app/leases/page.tsx
"use client";

import LeaseFormModal from "@/components/lease-form-modal";
import { Pagination, SearchBox, useListControls } from "@/components/list-controls";
import { fetchApi } from "@/lib/api";
import { readError } from "@/lib/errors";
import { formatDate, formatRupiah } from "@/lib/format";
import { isOwnerRole, isStaff } from "@/lib/roles";
import { useAuthGuard } from "@/lib/use-auth-guard";
import { useEffect, useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.adityoarr.com/kost/v1";

export default function LeasesPage() {
    const { me, status: authStatus } = useAuthGuard({ allowStaff: true });
    const [leases, setLeases] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const [successMsg, setSuccessMsg] = useState("");

    const canCloseLease = !!me && isOwnerRole(me.roles);
    const { query, setQuery, page, setPage, pageCount, total, view } = useListControls(leases, {
        searchKeys: ["tenantName", "tenantPhone", "unitNumber", "propertyName"],
        pageSize: 10,
    });

    function loadData() {
        setLoading(true); setError("");
        fetchApi<any[]>("/leases").then(setLeases).catch(() => setError("Gagal memuat data kontrak.")).finally(() => setLoading(false));
    }
    useEffect(() => { if (authStatus === "ok") loadData(); }, [authStatus]);
    useEffect(() => { if (!successMsg) return; const t = setTimeout(() => setSuccessMsg(""), 4000); return () => clearTimeout(t); }, [successMsg]);

    async function handleClose(lease: any, newStatus: "ENDED" | "CANCELLED") {
        const label = newStatus === "ENDED" ? "mengakhiri" : "membatalkan";
        if (!window.confirm(`Yakin ${label} kontrak ${lease.tenantName} di kamar ${lease.unitNumber}?\nKamar akan kembali berstatus VACANT.`)) return;
        try {
            const res = await fetch(`${API_BASE_URL}/leases/${lease.id}/status`, {
                method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include",
                body: JSON.stringify({ status: newStatus }),
            });
            if (res.ok) { setSuccessMsg(`Kontrak ${lease.tenantName} ${newStatus === "ENDED" ? "diakhiri" : "dibatalkan"} ✅`); loadData(); }
            else alert(await readError(res));
        } catch { alert("Tidak bisa menghubungi server."); }
    }

    if (authStatus === "loading") return (<main className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-pulse text-gray-500">Memeriksa sesi...</div></main>);
    if (authStatus === "error") return null;

    return (
        <main className="min-h-screen bg-gray-50 p-6 md:p-10">
            <div className="max-w-6xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <div>
                        <a href={me && isStaff(me.roles) ? "/staff" : "/dashboard"} className="text-sm text-blue-600 hover:underline">← {me && isStaff(me.roles) ? "Beranda Staf" : "Dashboard"}</a>
                        <h1 className="text-3xl font-bold text-gray-900 mt-1">Kontrak Hunian</h1>
                        <p className="text-gray-500 mt-1">Siapa menempati kamar mana, sampai kapan.</p>
                    </div>
                    <button onClick={() => setModalOpen(true)} className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-sm">+ Buat Kontrak</button>
                </div>

                {successMsg && (<div className="mb-6 p-4 rounded-xl bg-green-50 text-green-800 border border-green-200 font-medium">{successMsg}</div>)}
                <div className="mb-4"><SearchBox value={query} onChange={setQuery} placeholder="Cari penyewa / kamar / properti…" /></div>

                {loading ? (
                    <div className="bg-white rounded-xl border border-gray-200 p-10 animate-pulse"></div>
                ) : error ? (
                    <div className="p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>
                ) : leases.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300"><p className="text-gray-500 text-lg">Belum ada kontrak hunian.</p></div>
                ) : (
                    <>
                        <div className="overflow-x-auto bg-white rounded-xl border border-gray-200 shadow-sm">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-gray-200 bg-gray-50 text-gray-600 text-sm uppercase tracking-wider">
                                        <th className="p-4 font-semibold">Penyewa</th><th className="p-4 font-semibold">Kamar</th>
                                        <th className="p-4 font-semibold">Periode</th><th className="p-4 font-semibold">Tarif</th>
                                        <th className="p-4 font-semibold">Status</th><th className="p-4 font-semibold text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {view.length === 0 ? (
                                        <tr><td colSpan={6} className="p-8 text-center text-gray-500">Tidak ada hasil untuk “{query}”.</td></tr>
                                    ) : view.map((l) => (
                                        <tr key={l.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="p-4"><p className="font-medium text-gray-900">{l.tenantName}</p><p className="text-xs text-gray-500 font-mono">{l.tenantPhone}</p></td>
                                            <td className="p-4 text-gray-600"><p className="font-medium">Kamar {l.unitNumber}</p><p className="text-xs text-gray-500">{l.propertyName}</p></td>
                                            <td className="p-4 text-gray-600 text-sm">{formatDate(l.startDate)} → {l.endDate ? formatDate(l.endDate) : "terbuka"}</td>
                                            <td className="p-4 font-mono text-gray-900 text-sm">{formatRupiah(l.monthlyRate)}</td>
                                            <td className="p-4">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${l.status === "ACTIVE" ? "bg-green-100 text-green-800" : l.status === "ENDED" ? "bg-gray-200 text-gray-600" : "bg-red-100 text-red-800"}`}>
                                                    {l.status}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right whitespace-nowrap">
                                                {canCloseLease && l.status === "ACTIVE" && (
                                                    <>
                                                        <button onClick={() => handleClose(l, "ENDED")} className="px-3 py-1 rounded-lg text-amber-600 hover:bg-amber-50 font-medium text-sm">Akhiri</button>
                                                        <button onClick={() => handleClose(l, "CANCELLED")} className="ml-1 px-3 py-1 rounded-lg text-red-600 hover:bg-red-50 font-medium text-sm">Batalkan</button>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="mt-4 flex justify-end"><Pagination page={page} pageCount={pageCount} onChange={setPage} total={total} /></div>
                    </>
                )}
            </div>

            {modalOpen && (<LeaseFormModal onClose={() => setModalOpen(false)} onSaved={(msg) => { setSuccessMsg(msg); loadData(); }} />)}
        </main>
    );
}