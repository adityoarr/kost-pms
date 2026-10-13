// src/app/tenants/page.tsx
"use client";

import { Pagination, SearchBox, useListControls } from "@/components/list-controls";
import TenantFormModal from "@/components/tenant-form-modal";
import { fetchApi } from "@/lib/api";
import { readError } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import { isOwnerRole } from "@/lib/roles";
import { useAuthGuard } from "@/lib/use-auth-guard";
import { useEffect, useState } from "react";

const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "https://api.adityoarr.com/kost/v1";

export default function TenantsPage() {
    const { me, status: authStatus } = useAuthGuard();
    const [tenants, setTenants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<any | null>(null);
    const [successMsg, setSuccessMsg] = useState("");

    const canManageTenants = !!me && isOwnerRole(me.roles);
    const { query, setQuery, page, setPage, pageCount, total, view } = useListControls(tenants, {
        searchKeys: ["name", "phone"],
        pageSize: 10,
    });

    function loadData() {
        setLoading(true);
        setError("");
        fetchApi<any[]>("/tenants")
            .then((d) => setTenants(d))
            .catch(() => setError("Gagal memuat data penyewa."))
            .finally(() => setLoading(false));
    }

    useEffect(() => { if (authStatus === "ok") loadData(); }, [authStatus]);
    useEffect(() => {
        if (!successMsg) return;
        const t = setTimeout(() => setSuccessMsg(""), 4000);
        return () => clearTimeout(t);
    }, [successMsg]);

    async function handleResetPassword(ten: any) {
        if (!window.confirm(`Reset password ${ten.name}?\nTenant harus membuat password baru saat login berikutnya.`)) return;
        try {
            const res = await fetch(`${API_BASE_URL}/tenants/${ten.id}/reset-password`, { method: "POST", credentials: "include" });
            if (res.ok) setSuccessMsg(`Password ${ten.name} direset. Minta tenant membuat password baru.`);
            else alert(await readError(res));
        } catch { alert("Tidak bisa menghubungi server."); }
    }

    async function handleArchive(ten: any) {
        if (!window.confirm(`Nonaktifkan ${ten.name}?\nData diarsipkan, tidak dihapus permanen.`)) return;
        try {
            const res = await fetch(`${API_BASE_URL}/tenants/${ten.id}`, { method: "DELETE", credentials: "include" });
            if (res.ok) { setSuccessMsg(`${ten.name} diarsipkan.`); loadData(); }
            else alert(await readError(res));
        } catch { alert("Tidak bisa menghubungi server."); }
    }

    if (authStatus === "loading") {
        return (<main className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-pulse text-gray-500">Memeriksa sesi...</div></main>);
    }
    if (authStatus === "error") return null;

    return (
        <main className="min-h-screen bg-gray-50 p-6 md:p-10">
            <div className="max-w-6xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <div>
                        <a href="/dashboard" className="text-sm text-blue-600 hover:underline">← Dashboard</a>
                        <h1 className="text-3xl font-bold text-gray-900 mt-1">Penyewa</h1>
                        <p className="text-gray-500 mt-1">Data penghuni kost Anda.</p>
                    </div>
                    <button onClick={() => { setEditing(null); setModalOpen(true); }}
                        className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-sm">
                        + Tambah Penyewa
                    </button>
                </div>

                {successMsg && (<div className="mb-6 p-4 rounded-xl bg-green-50 text-green-800 border border-green-200 font-medium">{successMsg}</div>)}

                <div className="mb-4"><SearchBox value={query} onChange={setQuery} placeholder="Cari nama / no. HP…" /></div>

                {loading ? (
                    <div className="bg-white rounded-xl border border-gray-200 p-10 animate-pulse"></div>
                ) : error ? (
                    <div className="p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>
                ) : tenants.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300"><p className="text-gray-500 text-lg">Belum ada penyewa terdaftar.</p></div>
                ) : (
                    <>
                        <div className="overflow-x-auto bg-white rounded-xl border border-gray-200 shadow-sm">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-gray-200 bg-gray-50 text-gray-600 text-sm uppercase tracking-wider">
                                        <th className="p-4 font-semibold">Nama</th>
                                        <th className="p-4 font-semibold">No. HP</th>
                                        <th className="p-4 font-semibold">Status</th>
                                        <th className="p-4 font-semibold">Dibuat</th>
                                        <th className="p-4 font-semibold text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {view.length === 0 ? (
                                        <tr><td colSpan={5} className="p-8 text-center text-gray-500">Tidak ada hasil untuk “{query}”.</td></tr>
                                    ) : view.map((ten) => (
                                        <tr key={ten.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="p-4 font-medium text-gray-900">{ten.name}</td>
                                            <td className="p-4 text-gray-600 font-mono text-sm">{ten.phone}</td>
                                            <td className="p-4">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${ten.status === "ACTIVE" ? "bg-green-100 text-green-800" : ten.status === "ARCHIVED" ? "bg-gray-200 text-gray-600" : "bg-red-100 text-red-800"}`}>
                                                    {ten.status}
                                                </span>
                                            </td>
                                            <td className="p-4 text-gray-500 text-sm">{formatDate(ten.createdAt)}</td>
                                            <td className="p-4 text-right whitespace-nowrap">
                                                <button onClick={() => { setEditing(ten); setModalOpen(true); }} className="px-3 py-1 rounded-lg text-blue-600 hover:bg-blue-50 font-medium text-sm">Edit</button>
                                                {canManageTenants && (
                                                    <button onClick={() => handleResetPassword(ten)} className="ml-1 px-3 py-1 rounded-lg text-amber-600 hover:bg-amber-50 font-medium text-sm">Reset PW</button>
                                                )}
                                                {canManageTenants && ten.status === "ACTIVE" && (
                                                    <button onClick={() => handleArchive(ten)} className="ml-1 px-3 py-1 rounded-lg text-red-600 hover:bg-red-50 font-medium text-sm">Nonaktifkan</button>
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

            {modalOpen && (
                <TenantFormModal mode={editing ? "edit" : "create"} initialData={editing ?? undefined}
                    onClose={() => { setModalOpen(false); setEditing(null); }}
                    onSaved={(msg) => { setSuccessMsg(msg); loadData(); }} />
            )}
        </main>
    );
}