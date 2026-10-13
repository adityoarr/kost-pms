// src/app/audit/page.tsx
"use client";

import { Pagination, SearchBox, useListControls } from "@/components/list-controls";
import { fetchApi } from "@/lib/api";
import { isSuperAdmin } from "@/lib/roles";
import { useAuthGuard } from "@/lib/use-auth-guard";
import { useEffect, useMemo, useState } from "react";

type AuditEntry = {
    id: string;
    actorUsername: string | null;
    actorRole: string | null;
    action: string;
    entityType: string;
    entityId: string | null;
    httpMethod: string;
    httpStatus: number;
    ip: string | null;
    createdAt: string;
};

function formatDateTime(iso: string): string {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
}

function statusColor(s: number): string {
    if (s >= 200 && s < 300) return "bg-green-100 text-green-800";
    if (s >= 400 && s < 500) return "bg-red-100 text-red-800";
    if (s >= 500) return "bg-gray-800 text-white";
    return "bg-gray-100 text-gray-800";
}

function actionColor(a: string): string {
    if (
        a === "RECORD_PAYMENT" ||
        a === "RECORD_ADJUSTMENT" ||
        a === "VOID_INVOICE" ||
        a === "DELETE_PAYMENT"
    ) {
        return "bg-amber-100 text-amber-800";
    }
    if (
        a === "CREATE_USER" ||
        a === "RESET_USER_PASSWORD" ||
        a === "DEACTIVATE_USER" ||
        a === "RESET_TENANT_PASSWORD"
    ) {
        return "bg-purple-100 text-purple-800";
    }
    if (a === "ARCHIVE_TENANT") {
        return "bg-blue-100 text-blue-800";
    }
    if (a === "CREATE_LEASE" || a === "CHANGE_LEASE_STATUS") {
        return "bg-green-100 text-green-800";
    }
    return "bg-gray-100 text-gray-800";
}

export default function AuditPage() {
    const { me, status: authStatus } = useAuthGuard();
    const [entries, setEntries] = useState<AuditEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [actionFilter, setActionFilter] = useState("SEMUA");

    const allowed = !!me && isSuperAdmin(me.roles);

    function loadData() {
        setLoading(true);
        setError("");
        fetchApi<AuditEntry[]>("/audit?limit=500")
            .then(setEntries)
            .catch(() => setError("Gagal memuat audit log."))
            .finally(() => setLoading(false));
    }

    useEffect(() => {
        if (authStatus === "ok" && allowed) loadData();
    }, [authStatus, allowed]);

    const actionOptions = useMemo(() => {
        const set = new Set(entries.map((e) => e.action));
        return Array.from(set).sort();
    }, [entries]);

    const shown =
        actionFilter === "SEMUA"
            ? entries
            : entries.filter((e) => e.action === actionFilter);

    const { query, setQuery, page, setPage, pageCount, total, view } =
        useListControls(shown, {
            searchKeys: [
                "actorUsername",
                "actorRole",
                "action",
                "entityType",
                "entityId",
                "httpMethod",
                "httpStatus",
                "ip",
            ],
            pageSize: 20,
        });

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
                    <p className="font-semibold">Audit log hanya untuk pemilik (SUPERADMIN).</p>
                    <a href="/dashboard" className="underline text-blue-600 mt-2 inline-block">
                        ← Kembali
                    </a>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-gray-50 p-6 md:p-10">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <div>
                        <a href="/dashboard" className="text-sm text-blue-600 hover:underline">
                            ← Dashboard
                        </a>
                        <h1 className="text-3xl font-bold text-gray-900 mt-1">Audit Log</h1>
                        <p className="text-gray-500 mt-1">
                            Jejak aksi sensitif: siapa, kapan, ke mana, dan hasilnya.
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

                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                    <SearchBox
                        value={query}
                        onChange={setQuery}
                        placeholder="Cari aktor / aksi / entitas / IP…"
                    />
                    <select
                        value={actionFilter}
                        onChange={(e) => setActionFilter(e.target.value)}
                        className="px-4 py-2.5 rounded-xl border border-gray-300 bg-white text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="SEMUA">Semua aksi</option>
                        {actionOptions.map((a) => (
                            <option key={a} value={a}>
                                {a}
                            </option>
                        ))}
                    </select>
                </div>

                {loading ? (
                    <div className="bg-white rounded-xl border border-gray-200 p-10 animate-pulse"></div>
                ) : error ? (
                    <div className="p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>
                ) : entries.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
                        <p className="text-gray-500 text-lg">Belum ada audit log.</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto bg-white rounded-xl border border-gray-200 shadow-sm">
                            <table className="w-full text-left border-collapse text-sm">
                                <thead>
                                    <tr className="border-b border-gray-200 bg-gray-50 text-gray-600 uppercase tracking-wider">
                                        <th className="p-3 font-semibold">Waktu</th>
                                        <th className="p-3 font-semibold">Aktor</th>
                                        <th className="p-3 font-semibold">Role</th>
                                        <th className="p-3 font-semibold">Aksi</th>
                                        <th className="p-3 font-semibold">Entitas</th>
                                        <th className="p-3 font-semibold">ID</th>
                                        <th className="p-3 font-semibold">HTTP</th>
                                        <th className="p-3 font-semibold">Status</th>
                                        <th className="p-3 font-semibold">IP</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {view.length === 0 ? (
                                        <tr>
                                            <td colSpan={9} className="p-8 text-center text-gray-500">
                                                Tidak ada hasil untuk “{query}”.
                                            </td>
                                        </tr>
                                    ) : (
                                        view.map((e) => (
                                            <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="p-3 text-gray-600 whitespace-nowrap">
                                                    {formatDateTime(e.createdAt)}
                                                </td>
                                                <td className="p-3 font-medium text-gray-900">
                                                    {e.actorUsername ?? "-"}
                                                </td>
                                                <td className="p-3 text-gray-600">
                                                    {e.actorRole ?? "-"}
                                                </td>
                                                <td className="p-3">
                                                    <span
                                                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${actionColor(
                                                            e.action
                                                        )}`}
                                                    >
                                                        {e.action}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-gray-700">{e.entityType}</td>
                                                <td className="p-3 text-gray-500 font-mono text-xs break-all">
                                                    {e.entityId ?? "-"}
                                                </td>
                                                <td className="p-3 text-gray-600 font-mono">
                                                    {e.httpMethod}
                                                </td>
                                                <td className="p-3">
                                                    <span
                                                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColor(
                                                            e.httpStatus
                                                        )}`}
                                                    >
                                                        {e.httpStatus}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-gray-500 font-mono text-xs">
                                                    {e.ip ?? "-"}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="mt-4 flex justify-end">
                            <Pagination
                                page={page}
                                pageCount={pageCount}
                                onChange={setPage}
                                total={total}
                            />
                        </div>
                    </>
                )}
            </div>
        </main>
    );
}