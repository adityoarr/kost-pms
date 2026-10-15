// src/app/reminders/page.tsx
"use client";

import { Pagination, SearchBox, useListControls } from "@/components/list-controls";
import { fetchApi } from "@/lib/api";
import { formatDate, formatRupiah } from "@/lib/format";
import { isOwnerRole } from "@/lib/roles";
import { useAuthGuard } from "@/lib/use-auth-guard";
import { useEffect, useMemo, useState } from "react";

type ReminderEntry = {
    id: string;
    kind: "DUE_SOON" | "OVERDUE";
    channel: string;
    message: string;
    amountDue: number;
    sentAt: string;
    tenantName: string;
    tenantPhone: string;
    unitNumber: string;
    propertyName: string;
    periodStart: string;
    dueDate: string;
};

function formatDateTime(iso: string): string {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleString("id-ID", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
    });
}

function kindBadge(k: string) {
    if (k === "OVERDUE") return "bg-red-100 text-red-800";
    if (k === "DUE_URGENT") return "bg-orange-100 text-orange-800";
    if (k === "DUE_SOON") return "bg-blue-100 text-blue-800";
    if (k === "DUE_EARLY") return "bg-teal-100 text-teal-800";
    return "bg-gray-100 text-gray-800";
}

function kindLabel(k: string) {
    if (k === "OVERDUE") return "Terlambat (H+3)";
    if (k === "DUE_URGENT") return "Mendesak (H-1)";
    if (k === "DUE_SOON") return "Menjelang (H-3)";
    if (k === "DUE_EARLY") return "Dini (H-7)";
    return k;
}

export default function RemindersPage() {
    const { me, status: authStatus } = useAuthGuard();
    const [entries, setEntries] = useState<ReminderEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [kindFilter, setKindFilter] = useState("SEMUA");

    const allowed = !!me && isOwnerRole(me.roles);

    function loadData() {
        setLoading(true);
        setError("");
        fetchApi<ReminderEntry[]>("/reminders?limit=200")
            .then(setEntries)
            .catch(() => setError("Gagal memuat riwayat pengingat."))
            .finally(() => setLoading(false));
    }

    useEffect(() => {
        if (authStatus === "ok" && allowed) loadData();
    }, [authStatus, allowed]);

    const shown =
        kindFilter === "SEMUA"
            ? entries
            : entries.filter((e) => e.kind === kindFilter);

    const { query, setQuery, page, setPage, pageCount, total, view } =
        useListControls(shown, {
            searchKeys: ["tenantName", "tenantPhone", "unitNumber", "propertyName", "message"],
            pageSize: 15,
        });

    const summary = useMemo(() => {
        const dueSoon = entries.filter((e) => e.kind === "DUE_SOON").length;
        const overdue = entries.filter((e) => e.kind === "OVERDUE").length;
        return { total: entries.length, dueSoon, overdue };
    }, [entries]);

    if (authStatus === "loading") {
        return (
            <main className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-pulse text-gray-500">Memeriksa sesi...</div>
            </main>
        );
    }
    if (authStatus === "error" || !me) return null;

    if (!allowed) {
        return (
            <main className="min-h-screen bg-gray-50 p-6">
                <div className="max-w-2xl mx-auto p-6 bg-amber-50 text-amber-800 rounded-xl border border-amber-200">
                    <p className="font-semibold">Riwayat pengingat hanya untuk pemilik (SUPERADMIN/ADMIN).</p>
                    <a href="/dashboard" className="underline text-blue-600 mt-2 inline-block">← Kembali</a>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-gray-50 p-6 md:p-10">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <a href="/dashboard" className="text-sm text-blue-600 hover:underline">← Dashboard</a>
                        <h1 className="text-3xl font-bold text-gray-900 mt-1">Riwayat Pengingat</h1>
                        <p className="text-gray-500 mt-1">
                            Jejak pengingat yang dikirim ke penyewa. Otomatis tiap 08:00 WIB, atau manual dari halaman Tagihan.
                        </p>
                    </div>
                    <button
                        onClick={loadData}
                        disabled={loading}
                        className="px-5 py-3 bg-gray-800 hover:bg-gray-900 disabled:bg-gray-400 text-white rounded-xl font-semibold shadow-sm"
                    >
                        ↻ Muat Ulang
                    </button>
                </div>

                {summary.total > 0 && (
                    <div className="grid grid-cols-3 gap-3">
                        <Card label="Total Terkirim" value={summary.total.toString()} tone="gray" />
                        <Card label="Menjelang (H-3)" value={summary.dueSoon.toString()} tone="blue" />
                        <Card label="Terlambat (H+3)" value={summary.overdue.toString()} tone="red" />
                    </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                    <SearchBox value={query} onChange={setQuery} placeholder="Cari tenant / unit / pesan…" />
                    <select
                        value={kindFilter}
                        onChange={(e) => setKindFilter(e.target.value)}
                        className="px-4 py-2.5 rounded-xl border border-gray-300 bg-white text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="SEMUA">Semua jenis</option>
                        <option value="DUE_EARLY">Dini (H-7)</option>
                        <option value="DUE_SOON">Menjelang (H-3)</option>
                        <option value="DUE_URGENT">Mendesak (H-1)</option>
                        <option value="OVERDUE">Terlambat (H+3)</option>
                    </select>
                </div>

                {loading ? (
                    <div className="bg-white rounded-xl border border-gray-200 p-10 animate-pulse"></div>
                ) : error ? (
                    <div className="p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>
                ) : entries.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
                        <p className="text-gray-500 text-lg">Belum ada pengingat yang terkirim.</p>
                        <p className="text-gray-400 text-sm mt-2">
                            Klik <span className="font-semibold">🔔 Kirim Pengingat</span> di halaman Tagihan untuk memicu manual.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto bg-white rounded-xl border border-gray-200 shadow-sm">
                            <table className="w-full text-left border-collapse text-sm">
                                <thead>
                                    <tr className="border-b border-gray-200 bg-gray-50 text-gray-600 uppercase tracking-wider">
                                        <th className="p-3 font-semibold">Waktu</th>
                                        <th className="p-3 font-semibold">Jenis</th>
                                        <th className="p-3 font-semibold">Penyewa</th>
                                        <th className="p-3 font-semibold">Kamar</th>
                                        <th className="p-3 font-semibold">Jatuh Tempo</th>
                                        <th className="p-3 font-semibold text-right">Nominal</th>
                                        <th className="p-3 font-semibold">Pesan</th>
                                        <th className="p-3 font-semibold">Channel</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {view.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="p-8 text-center text-gray-500">
                                                Tidak ada hasil untuk "{query}".
                                            </td>
                                        </tr>
                                    ) : (
                                        view.map((e) => (
                                            <tr key={e.id} className="hover:bg-gray-50 transition-colors align-top">
                                                <td className="p-3 text-gray-600 whitespace-nowrap">{formatDateTime(e.sentAt)}</td>
                                                <td className="p-3">
                                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${kindBadge(e.kind)}`}>
                                                        {kindLabel(e.kind)}
                                                    </span>
                                                </td>
                                                <td className="p-3">
                                                    <p className="font-medium text-gray-900">{e.tenantName}</p>
                                                    <p className="text-xs text-gray-500 font-mono">{e.tenantPhone}</p>
                                                </td>
                                                <td className="p-3 text-gray-600">
                                                    <p className="font-medium">{e.unitNumber}</p>
                                                    <p className="text-xs text-gray-500">{e.propertyName}</p>
                                                </td>
                                                <td className="p-3 text-gray-600">{formatDate(e.dueDate)}</td>
                                                <td className="p-3 text-right font-mono text-gray-900">{formatRupiah(e.amountDue)}</td>
                                                <td className="p-3 text-gray-700 max-w-md">
                                                    <p className="line-clamp-3">{e.message}</p>
                                                </td>
                                                <td className="p-3">
                                                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700">
                                                        {e.channel}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex justify-end">
                            <Pagination page={page} pageCount={pageCount} onChange={setPage} total={total} />
                        </div>
                        <p className="text-xs text-gray-400">
                            Catatan: nominal di atas adalah snapshot saat pengingat dikirim. Tidak ter-update saat tenant membayar kemudian. Ini by design — pengingat adalah fakta saat dikirim.
                        </p>
                    </>
                )}
            </div>
        </main>
    );
}

function Card({ label, value, tone }: { label: string; value: string; tone: "blue" | "red" | "green" | "gray" }) {
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