// src/app/tenant/page.tsx  (ganti seluruh isi)
"use client";

import TenantInvoiceDetailModal from "@/components/tenant-invoice-detail-modal";
import TenantTicketFormModal from "@/components/tenant-ticket-form-modal";
import { fetchApi } from "@/lib/api";
import { readError } from "@/lib/errors";
import { formatDate, formatRupiah } from "@/lib/format";
import { useTenantGuard } from "@/lib/use-tenant-guard";
import { useEffect, useState } from "react";

function badge(eff: string) {
    switch (eff) {
        case "PAID": return "bg-green-100 text-green-800";
        case "OVERDUE": return "bg-red-100 text-red-800";
        case "PARTIALLY_PAID": return "bg-amber-100 text-amber-800";
        case "VOID": return "bg-gray-200 text-gray-600";
        default: return "bg-blue-100 text-blue-800";
    }
}

function statusBadge(s: string) {
    switch (s) {
        case "OPEN": return "bg-blue-100 text-blue-800";
        case "IN_PROGRESS": return "bg-amber-100 text-amber-800";
        case "RESOLVED": return "bg-green-100 text-green-800";
        case "CLOSED": return "bg-gray-200 text-gray-600";
        default: return "bg-gray-100 text-gray-800";
    }
}

function monthLabel(iso: string) {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}

export default function TenantDashboardPage() {
    const { me, status } = useTenantGuard();
    const [leases, setLeases] = useState<any[]>([]);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [tickets, setTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [invoiceDetailId, setInvoiceDetailId] = useState<string | null>(null);
    const [ticketFormOpen, setTicketFormOpen] = useState(false);
    const [successMsg, setSuccessMsg] = useState("");

    useEffect(() => {
        if (status !== "ok") return;
        Promise.all([
            fetchApi<any[]>("/tenant-me/leases"),
            fetchApi<any[]>("/tenant-me/invoices"),
            fetchApi<any[]>("/tenant-me/tickets"),
        ])
            .then(([l, i, t]) => {
                setLeases(l);
                setInvoices(i);
                setTickets(t);
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [status]);

    useEffect(() => {
        if (!successMsg) return;
        const t = setTimeout(() => setSuccessMsg(""), 4000);
        return () => clearTimeout(t);
    }, [successMsg]);

    async function handleLogout() {
        try {
            await fetchApi("/tenant-auth/logout", { method: "POST" });
        } catch {
            // diabaikan
        }
        window.location.replace("/tenant/login");
    }

    async function handleReopen(ticket: any) {
        if (!window.confirm("Buka ulang tiket ini?")) return;
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://api.adityoarr.com/kost/v1"}/tickets/${ticket.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ status: "OPEN" }),
            });
            if (res.ok) {
                setSuccessMsg("Tiket dibuka ulang ✅");
                const fresh = await fetchApi<any[]>("/tenant-me/tickets");
                setTickets(fresh);
            } else {
                alert(await readError(res));
            }
        } catch {
            alert("Tidak bisa menghubungi server.");
        }
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

    const activeLease = leases.find((l) => l.status === "ACTIVE");

    return (
        <main className="min-h-screen bg-gray-50 p-6 md:p-10">
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Halo, {me.name} 👋</h1>
                        <p className="text-gray-500 mt-1">Portal penyewa kost Anda.</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="px-5 py-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-semibold border border-red-200"
                    >
                        Keluar
                    </button>
                </div>

                {successMsg && (
                    <div className="p-4 rounded-xl bg-green-50 text-green-800 border border-green-200 font-medium">{successMsg}</div>
                )}

                {loading ? (
                    <div className="bg-white rounded-xl border border-gray-200 p-10 animate-pulse"></div>
                ) : (
                    <>
                        <section>
                            <h2 className="text-xl font-bold text-gray-900 mb-3">Kontrak Hunian Anda</h2>
                            {!activeLease ? (
                                <div className="bg-white p-8 rounded-xl border border-dashed border-gray-300 text-center text-gray-500">
                                    Tidak ada kontrak aktif saat ini.
                                </div>
                            ) : (
                                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-lg font-semibold text-gray-900">
                                                {activeLease.propertyName} - Kamar {activeLease.unitNumber}
                                            </p>
                                            <p className="text-gray-600 mt-1 text-sm">
                                                {formatDate(activeLease.startDate)} - {activeLease.endDate ? formatDate(activeLease.endDate) : "terbuka"}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-mono text-lg text-gray-900">{formatRupiah(activeLease.monthlyRate)}</p>
                                            <p className="text-xs text-gray-500">per bulan</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-gray-900 mb-3">Tagihan Saya</h2>
                            {invoices.length === 0 ? (
                                <div className="bg-white p-8 rounded-xl border border-dashed border-gray-300 text-center text-gray-500">
                                    Belum ada tagihan.
                                </div>
                            ) : (
                                <div className="overflow-x-auto bg-white rounded-xl border border-gray-200 shadow-sm">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-gray-200 bg-gray-50 text-gray-600 text-sm uppercase tracking-wider">
                                                <th className="p-4 font-semibold">Periode</th>
                                                <th className="p-4 font-semibold">Jatuh Tempo</th>
                                                <th className="p-4 font-semibold text-right">Total</th>
                                                <th className="p-4 font-semibold">Status</th>
                                                <th className="p-4 font-semibold text-right">Rincian</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {invoices.map((inv) => (
                                                <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="p-4 font-medium text-gray-900">{monthLabel(inv.periodStart)}</td>
                                                    <td className="p-4 text-gray-600 text-sm">{formatDate(inv.dueDate)}</td>
                                                    <td className="p-4 text-right font-mono text-gray-900">{formatRupiah(inv.totalDue)}</td>
                                                    <td className="p-4">
                                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${badge(inv.effectiveStatus)}`}>
                                                            {inv.effectiveStatus}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <button
                                                            onClick={() => setInvoiceDetailId(inv.id)}
                                                            className="px-3 py-1 rounded-lg text-blue-600 hover:bg-blue-50 font-medium text-sm"
                                                        >
                                                            Lihat
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                            <p className="mt-3 text-xs text-gray-400">
                                Pembayaran dilakukan kepada pengelola kost. Struk muncul setelah pembayaran diverifikasi.
                            </p>
                        </section>

                        <section>
                            <div className="flex justify-between items-center mb-3">
                                <h2 className="text-xl font-bold text-gray-900">Laporan Saya</h2>
                                {activeLease && (
                                    <button
                                        onClick={() => setTicketFormOpen(true)}
                                        className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold"
                                    >
                                        🛠 Lapor Masalah
                                    </button>
                                )}
                            </div>
                            {tickets.length === 0 ? (
                                <div className="bg-white p-8 rounded-xl border border-dashed border-gray-300 text-center text-gray-500">
                                    Belum ada laporan. Klik "Lapor Masalah" jika ada yang perlu diperbaiki.
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {tickets.map((t) => (
                                        <div key={t.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex justify-between items-start gap-4">
                                            <div className="flex-1">
                                                <p className="font-semibold text-gray-900">{t.title}</p>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    {t.category} • Kamar {t.unitNumber} • {formatDate(t.createdAt)}
                                                </p>
                                                {t.status === "RESOLVED" && t.resolutionNote && (
                                                    <p className="text-sm text-gray-700 mt-2 p-2 bg-green-50 rounded-lg border border-green-200">
                                                        <span className="font-semibold">Resolusi:</span> {t.resolutionNote}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusBadge(t.status)}`}>
                                                    {t.status}
                                                </span>
                                                {t.status === "RESOLVED" && (
                                                    <button
                                                        onClick={() => handleReopen(t)}
                                                        className="text-xs text-blue-600 hover:underline"
                                                    >
                                                        Buka ulang
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    </>
                )}
            </div>

            {invoiceDetailId && <TenantInvoiceDetailModal invoiceId={invoiceDetailId} onClose={() => setInvoiceDetailId(null)} />}
            {ticketFormOpen && (
                <TenantTicketFormModal
                    onClose={() => setTicketFormOpen(false)}
                    onSaved={(m) => {
                        setSuccessMsg(m);
                        fetchApi<any[]>("/tenant-me/tickets").then(setTickets);
                    }}
                />
            )}
        </main>
    );
}