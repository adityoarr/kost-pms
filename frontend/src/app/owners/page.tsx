// src/app/owners/page.tsx
"use client";

import { Pagination, SearchBox, useListControls } from "@/components/list-controls";
import OwnerOnboardModal from "@/components/owner-onboard-modal";
import { fetchApi } from "@/lib/api";
import { readError } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import { isSuperAdmin } from "@/lib/roles";
import { useAuthGuard } from "@/lib/use-auth-guard";
import { useEffect, useState } from "react";

const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "https://api.adityoarr.com/kost/v1";

type Owner = {
    id: string;
    username: string;
    fullName: string;
    createdAt: string;
};

export default function OwnersPage() {
    const { me, status: authStatus } = useAuthGuard();
    const [owners, setOwners] = useState<Owner[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const [successMsg, setSuccessMsg] = useState("");
    const [running, setRunning] = useState(false);

    const allowed = !!me && isSuperAdmin(me.roles);

    function loadData() {
        setLoading(true);
        setError("");
        fetchApi<Owner[]>("/owners")
            .then(setOwners)
            .catch(() => setError("Gagal memuat daftar owner."))
            .finally(() => setLoading(false));
    }

    useEffect(() => { if (authStatus === "ok" && allowed) loadData(); }, [authStatus, allowed]);
    useEffect(() => {
        if (!successMsg) return;
        const t = setTimeout(() => setSuccessMsg(""), 6000);
        return () => clearTimeout(t);
    }, [successMsg]);

    async function handleRunAllReminders() {
        if (!window.confirm("Kirim reminder (H-7/H-3/H-1/H+3) ke SEMUA owner sekarang?\nReminder yang sudah pernah dikirim tidak diulang.")) return;
        setRunning(true);
        try {
            const res = await fetch(`${API_BASE_URL}/reminders/run-all`, { method: "POST", credentials: "include" });
            if (!res.ok) { setError(await readError(res)); return; }
            const d = await res.json();
            setSuccessMsg(
                `Reminder lintas-org terkirim — dini(H-7): ${d.dueEarlySent ?? 0}, menjelang(H-3): ${d.dueSoonSent ?? 0}, ` +
                `mendesak(H-1): ${d.dueUrgentSent ?? 0}, terlambat(H+3): ${d.overdueSent ?? 0}. (${d.skipped} sudah pernah dikirim)`
            );
        } catch {
            setError("Tidak bisa menghubungi server.");
        } finally {
            setRunning(false);
        }
    }

    const { query, setQuery, page, setPage, pageCount, total, view } = useListControls(owners, {
        searchKeys: ["username", "fullName"],
        pageSize: 10,
    });

    if (authStatus === "loading") {
        return (<main className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-pulse text-gray-500">Memeriksa sesi...</div></main>);
    }
    if (authStatus === "error" || !me) return null;

    if (!allowed) {
        return (
            <main className="min-h-screen bg-gray-50 p-6">
                <div className="max-w-2xl mx-auto p-6 bg-amber-50 text-amber-800 rounded-xl border border-amber-200">
                    <p className="font-semibold">Panel owner hanya untuk SUPERADMIN (platform admin).</p>
                    <a href="/dashboard" className="underline text-blue-600 mt-2 inline-block">← Kembali</a>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-gray-50 p-6 md:p-10">
            <div className="max-w-5xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <div>
                        <a href="/dashboard" className="text-sm text-blue-600 hover:underline">← Dashboard</a>
                        <h1 className="text-3xl font-bold text-gray-900 mt-1">Panel Owner (SaaS)</h1>
                        <p className="text-gray-500 mt-1">Kelola pemilik kost di platform ini. Setiap owner terisolasi penuh.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button onClick={handleRunAllReminders} disabled={running}
                            className="px-5 py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white rounded-xl font-semibold shadow-sm">
                            {running ? "Mengirim..." : "🔔 Kirim Reminder Semua Owner"}
                        </button>
                        <button onClick={() => setModalOpen(true)}
                            className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-sm">
                            + Onboard Owner Baru
                        </button>
                    </div>
                </div>

                {successMsg && (<div className="mb-6 p-4 rounded-xl bg-green-50 text-green-800 border border-green-200 font-medium">{successMsg}</div>)}

                <div className="mb-4"><SearchBox value={query} onChange={setQuery} placeholder="Cari username / nama…" /></div>

                {loading ? (
                    <div className="bg-white rounded-xl border border-gray-200 p-10 animate-pulse"></div>
                ) : error ? (
                    <div className="p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>
                ) : owners.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300"><p className="text-gray-500 text-lg">Belum ada owner terdaftar.</p></div>
                ) : (
                    <>
                        <div className="overflow-x-auto bg-white rounded-xl border border-gray-200 shadow-sm">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-gray-200 bg-gray-50 text-gray-600 text-sm uppercase tracking-wider">
                                        <th className="p-4 font-semibold">Username</th>
                                        <th className="p-4 font-semibold">Nama Pemilik</th>
                                        <th className="p-4 font-semibold">Sejak</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {view.length === 0 ? (
                                        <tr><td colSpan={3} className="p-8 text-center text-gray-500">Tidak ada hasil untuk “{query}”.</td></tr>
                                    ) : view.map((o) => (
                                        <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="p-4 font-mono font-medium text-gray-900">{o.username}</td>
                                            <td className="p-4 text-gray-700">{o.fullName}</td>
                                            <td className="p-4 text-gray-500 text-sm">{formatDate(o.createdAt)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="mt-4 flex justify-end"><Pagination page={page} pageCount={pageCount} onChange={setPage} total={total} /></div>
                        <p className="text-xs text-gray-400 mt-3">
                            Total {owners.length} owner. Tombol “Kirim Reminder Semua Owner” memicu loop per-owner (sama dengan cron 08:00) — berguna untuk trigger manual lintas-organisasi.
                        </p>
                    </>
                )}
            </div>

            {modalOpen && (
                <OwnerOnboardModal onClose={() => setModalOpen(false)} onSaved={(m) => { setSuccessMsg(m); loadData(); }} />
            )}
        </main>
    );
}