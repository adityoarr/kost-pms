// src/app/tickets/page.tsx
"use client";

import TicketDetailModal from "@/components/ticket-detail-modal";
import { fetchApi } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { useAuthGuard } from "@/lib/use-auth-guard";
import { useEffect, useState } from "react";

const FILTERS = [
    { key: "SEMUA", label: "Semua" },
    { key: "OPEN", label: "Baru" },
    { key: "IN_PROGRESS", label: "Dikerjakan" },
    { key: "RESOLVED", label: "Selesai" },
    { key: "CLOSED", label: "Ditutup" },
];

function statusBadge(s: string) {
    switch (s) {
        case "OPEN": return "bg-blue-100 text-blue-800";
        case "IN_PROGRESS": return "bg-amber-100 text-amber-800";
        case "RESOLVED": return "bg-green-100 text-green-800";
        case "CLOSED": return "bg-gray-200 text-gray-600";
        default: return "bg-gray-100 text-gray-800";
    }
}

export default function TicketsPage() {
    const { status: authStatus } = useAuthGuard();
    const [tickets, setTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [filter, setFilter] = useState("SEMUA");
    const [detailId, setDetailId] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState("");

    function loadData() {
        setLoading(true);
        setError("");
        fetchApi<any[]>("/tickets")
            .then((d) => setTickets(d))
            .catch(() => setError("Gagal memuat tiket."))
            .finally(() => setLoading(false));
    }

    useEffect(() => {
        if (authStatus === "ok") loadData();
    }, [authStatus]);

    useEffect(() => {
        if (!successMsg) return;
        const t = setTimeout(() => setSuccessMsg(""), 4000);
        return () => clearTimeout(t);
    }, [successMsg]);

    if (authStatus === "loading") {
        return (
            <main className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-pulse text-gray-500">Memeriksa sesi...</div>
            </main>
        );
    }
    if (authStatus === "error") return null;

    const shown = filter === "SEMUA" ? tickets : tickets.filter((t) => t.status === filter);

    return (
        <main className="min-h-screen bg-gray-50 p-6 md:p-10">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <a href="/dashboard" className="text-sm text-blue-600 hover:underline">← Dashboard</a>
                        <h1 className="text-3xl font-bold text-gray-900 mt-1">Tiket Laporan</h1>
                        <p className="text-gray-500 mt-1">Laporan dari penyewa, kelola bersama tim.</p>
                    </div>
                </div>

                {successMsg && (
                    <div className="mb-6 p-4 rounded-xl bg-green-50 text-green-800 border border-green-200 font-medium">{successMsg}</div>
                )}

                <div className="flex flex-wrap gap-2 mb-6">
                    {FILTERS.map((f) => (
                        <button
                            key={f.key}
                            onClick={() => setFilter(f.key)}
                            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${filter === f.key
                                    ? "bg-blue-600 text-white"
                                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"
                                }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="bg-white rounded-xl border border-gray-200 p-10 animate-pulse"></div>
                ) : error ? (
                    <div className="p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>
                ) : shown.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
                        <p className="text-gray-500 text-lg">Tidak ada tiket pada filter ini.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto bg-white rounded-xl border border-gray-200 shadow-sm">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-200 bg-gray-50 text-gray-600 text-sm uppercase tracking-wider">
                                    <th className="p-4 font-semibold">Dibuat</th>
                                    <th className="p-4 font-semibold">Penyewa</th>
                                    <th className="p-4 font-semibold">Kamar</th>
                                    <th className="p-4 font-semibold">Judul</th>
                                    <th className="p-4 font-semibold">Kategori</th>
                                    <th className="p-4 font-semibold">Status</th>
                                    <th className="p-4 font-semibold text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {shown.map((t) => (
                                    <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-4 text-gray-500 text-sm">{formatDate(t.createdAt)}</td>
                                        <td className="p-4">
                                            <p className="font-medium text-gray-900">{t.tenantName}</p>
                                            <p className="text-xs text-gray-500 font-mono">{t.tenantPhone}</p>
                                        </td>
                                        <td className="p-4 text-gray-600">
                                            <p className="font-medium">Kamar {t.unitNumber}</p>
                                            <p className="text-xs text-gray-500">{t.propertyName}</p>
                                        </td>
                                        <td className="p-4 text-gray-900">{t.title}</td>
                                        <td className="p-4 text-gray-600">{t.category}</td>
                                        <td className="p-4">
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusBadge(t.status)}`}>
                                                {t.status}
                                            </span>
                                            {t.assignedToUsername && (
                                                <p className="text-xs text-gray-500 mt-1">@{t.assignedToUsername}</p>
                                            )}
                                        </td>
                                        <td className="p-4 text-right">
                                            <button
                                                onClick={() => setDetailId(t.id)}
                                                className="px-3 py-1 rounded-lg text-blue-600 hover:bg-blue-50 font-medium text-sm"
                                            >
                                                Buka
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {detailId && (
                <TicketDetailModal
                    ticketId={detailId}
                    onClose={() => setDetailId(null)}
                    onChanged={(m) => {
                        setSuccessMsg(m);
                        loadData();
                    }}
                />
            )}
        </main>
    );
}