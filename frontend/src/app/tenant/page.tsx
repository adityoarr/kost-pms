// src/app/tenant/page.tsx
"use client";

import TenantInvoiceDetailModal from "@/components/tenant-invoice-detail-modal";
import { fetchApi } from "@/lib/api";
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

function monthLabel(iso: string) {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}

export default function TenantDashboardPage() {
    const { me, status } = useTenantGuard();
    const [leases, setLeases] = useState<any[]>([]);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [detailId, setDetailId] = useState<string | null>(null);

    useEffect(() => {
        if (status !== "ok") return;
        Promise.all([fetchApi<any[]>("/tenant-me/leases"), fetchApi<any[]>("/tenant-me/invoices")])
            .then(([l, i]) => {
                setLeases(l);
                setInvoices(i);
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [status]);

    async function handleLogout() {
        try {
            await fetchApi("/tenant-auth/logout", { method: "POST" });
        } catch {
            // diabaikan
        }
        window.location.replace("/tenant/login");
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
                        className="px-5 py-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-semibold border border-red-200 transition-colors"
                    >
                        Keluar
                    </button>
                </div>

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
                                                            onClick={() => setDetailId(inv.id)}
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
                    </>
                )}
            </div>

            {detailId && <TenantInvoiceDetailModal invoiceId={detailId} onClose={() => setDetailId(null)} />}
        </main>
    );
}