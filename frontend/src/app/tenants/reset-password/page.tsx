// src/app/tenant/reset-password/page.tsx
"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "https://api.adityoarr.com/kost/v1";

function ResetForm() {
    const params = useSearchParams();
    const token = params.get("token") ?? "";

    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState("");

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError("");
        if (!token) {
            setError("Tautan reset tidak valid (token tidak ditemukan).");
            return;
        }
        if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
            setError("Password minimal 8 karakter dan harus mengandung huruf serta angka.");
            return;
        }
        if (password !== confirm) {
            setError("Konfirmasi password tidak sama.");
            return;
        }
        setSubmitting(true);
        try {
            const res = await fetch(`${API_BASE_URL}/tenant-auth/reset-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, password }),
            });
            if (!res.ok) {
                const d = await res.json().catch(() => null);
                setError(d?.error ?? "Gagal mereset password.");
                return;
            }
            setDone(true);
        } catch {
            setError("Tidak bisa menghubungi server.");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-8">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Buat Password Baru</h1>

                    {done ? (
                        <>
                            <div className="p-4 rounded-xl bg-green-50 text-green-800 border border-green-200 text-sm mb-4">
                                Password berhasil diubah. Silakan login dengan password baru Anda.
                            </div>
                            <a
                                href="/tenant"
                                className="block w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-center"
                            >
                                Lanjut ke Login
                            </a>
                        </>
                    ) : (
                        <>
                            <p className="text-sm text-gray-500 mb-6">
                                Masukkan password baru untuk akun kost Anda. Tautan ini hanya berlaku 1 jam dan sekali pakai.
                            </p>
                            {error && (
                                <div className="mb-4 p-4 rounded-xl bg-red-50 text-red-700 text-sm border border-red-200">{error}</div>
                            )}
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-base font-semibold text-gray-800 mb-1">Password Baru *</label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full text-lg px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="min. 8 karakter, huruf + angka"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-base font-semibold text-gray-800 mb-1">Ulangi Password Baru *</label>
                                    <input
                                        type="password"
                                        value={confirm}
                                        onChange={(e) => setConfirm(e.target.value)}
                                        className="w-full text-lg px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold"
                                >
                                    {submitting ? "Menyimpan..." : "Simpan Password Baru"}
                                </button>
                            </form>
                            {!token && (
                                <p className="mt-4 text-sm text-red-600">
                                    Token tidak ada di tautan.{" "}
                                    <a href="/tenant/forgot-password" className="underline">Minta tautan baru</a>.
                                </p>
                            )}
                        </>
                    )}
                </div>
            </div>
        </main>
    );
}

// useSearchParams WAJIB di dalam Suspense (aturan rumah 6.3) agar prerender aman.
export default function TenantResetPasswordPage() {
    return (
        <Suspense
            fallback={
                <main className="min-h-screen bg-gray-50 flex items-center justify-center">
                    <div className="animate-pulse text-gray-500">Memuat…</div>
                </main>
            }
        >
            <ResetForm />
        </Suspense>
    );
}