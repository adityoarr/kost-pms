// src/app/users/page.tsx
"use client";

import UserFormModal from "@/components/user-form-modal";
import { fetchApi } from "@/lib/api";
import { readError } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import { isSuperAdmin } from "@/lib/roles";
import { useAuthGuard } from "@/lib/use-auth-guard";
import { useEffect, useState } from "react";

const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "https://api.adityoarr.com/kost/v1";

export default function UsersPage() {
    const { me, status: authStatus } = useAuthGuard();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const [successMsg, setSuccessMsg] = useState("");

    function loadData() {
        setLoading(true);
        setError("");
        fetchApi<any[]>("/users")
            .then((d) => setUsers(d))
            .catch(() => setError("Gagal memuat daftar pegawai."))
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

    async function handleResetPassword(u: any) {
        const newPw = window.prompt(`Password baru untuk ${u.username}? (min 8, huruf+angka)`);
        if (!newPw || !newPw.trim()) return;
        try {
            const res = await fetch(`${API_BASE_URL}/users/${u.id}/reset-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ newPassword: newPw.trim() }),
            });
            if (res.ok) setSuccessMsg(`Password ${u.username} direset ✅`);
            else alert(await readError(res));
        } catch {
            alert("Tidak bisa menghubungi server.");
        }
    }

    async function handleDeactivate(u: any) {
        if (u.username === me?.username) {
            alert("Tidak bisa menonaktifkan akun sendiri.");
            return;
        }
        if (!window.confirm(`Nonaktifkan akun ${u.username}?\nMereka tidak bisa login lagi.`)) return;
        try {
            const res = await fetch(`${API_BASE_URL}/users/${u.id}`, {
                method: "DELETE",
                credentials: "include",
            });
            if (res.ok) {
                setSuccessMsg(`Akun ${u.username} dinonaktifkan`);
                loadData();
            } else {
                alert(await readError(res));
            }
        } catch {
            alert("Tidak bisa menghubungi server.");
        }
    }

    if (authStatus === "loading") {
        return (
            <main className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-pulse text-gray-500">Memeriksa sesi...</div>
            </main>
        );
    }
    if (authStatus === "error" || !me) return null;
    if (!isSuperAdmin(me.roles)) {
        return (
            <main className="min-h-screen bg-gray-50 p-6">
                <div className="max-w-2xl mx-auto p-6 bg-amber-50 text-amber-800 rounded-xl border border-amber-200">
                    <p className="font-semibold">Halaman ini hanya untuk pemilik (SUPERADMIN).</p>
                    <a href="/dashboard" className="underline text-blue-600 mt-2 inline-block">← Kembali</a>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-gray-50 p-6 md:p-10">
            <div className="max-w-5xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <a href="/dashboard" className="text-sm text-blue-600 hover:underline">← Dashboard</a>
                        <h1 className="text-3xl font-bold text-gray-900 mt-1">Akun Pegawai</h1>
                        <p className="text-gray-500 mt-1">Kelola siapa yang bisa mengakses sistem sebagai staff/admin.</p>
                    </div>
                    <button
                        onClick={() => setModalOpen(true)}
                        className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-sm"
                    >
                        + Tambah Pegawai
                    </button>
                </div>

                {successMsg && (
                    <div className="mb-6 p-4 rounded-xl bg-green-50 text-green-800 border border-green-200 font-medium">{successMsg}</div>
                )}

                {loading ? (
                    <div className="bg-white rounded-xl border border-gray-200 p-10 animate-pulse"></div>
                ) : error ? (
                    <div className="p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>
                ) : (
                    <div className="overflow-x-auto bg-white rounded-xl border border-gray-200 shadow-sm">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-200 bg-gray-50 text-gray-600 text-sm uppercase tracking-wider">
                                    <th className="p-4 font-semibold">Username</th>
                                    <th className="p-4 font-semibold">Nama</th>
                                    <th className="p-4 font-semibold">Role</th>
                                    <th className="p-4 font-semibold">Status</th>
                                    <th className="p-4 font-semibold">Dibuat</th>
                                    <th className="p-4 font-semibold text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {users.map((u) => (
                                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-4 font-medium text-gray-900 font-mono">{u.username}</td>
                                        <td className="p-4 text-gray-700">{u.fullName}</td>
                                        <td className="p-4">
                                            <span
                                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${u.role === "SUPERADMIN"
                                                        ? "bg-purple-100 text-purple-800"
                                                        : u.role === "ADMIN"
                                                            ? "bg-blue-100 text-blue-800"
                                                            : "bg-gray-200 text-gray-700"
                                                    }`}
                                            >
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span
                                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${u.status === "ACTIVE" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                                                    }`}
                                            >
                                                {u.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-gray-500 text-sm">{formatDate(u.createdAt)}</td>
                                        <td className="p-4 text-right whitespace-nowrap">
                                            <button
                                                onClick={() => handleResetPassword(u)}
                                                className="px-3 py-1 rounded-lg text-amber-600 hover:bg-amber-50 font-medium text-sm"
                                            >
                                                Reset PW
                                            </button>
                                            {u.status === "ACTIVE" && u.username !== me?.username && (
                                                <button
                                                    onClick={() => handleDeactivate(u)}
                                                    className="ml-1 px-3 py-1 rounded-lg text-red-600 hover:bg-red-50 font-medium text-sm"
                                                >
                                                    Nonaktifkan
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {modalOpen && (
                <UserFormModal
                    onClose={() => setModalOpen(false)}
                    onSaved={(m) => {
                        setSuccessMsg(m);
                        loadData();
                    }}
                />
            )}
        </main>
    );
}