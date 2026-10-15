// src/app/tenant/forgot-password/page.tsx
"use client";

import { useState } from "react";

const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "https://api.adityoarr.com/kost/v1";

export default function TenantForgotPasswordPage() {
    const [phone, setPhone] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState("");

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError("");
        if (!phone.trim()) {
            setError("Masukkan nomor HP terdaftar Anda.");
            return;
        }
        setSubmitting(true);
        try {
            const res = await fetch(`${API_BASE_URL}/tenant-auth/forgot-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone: phone.trim() }),
            });
            if (res.status === 429) {
                const d = await res.json().catch(() => null);
                setError(d?.error ?? "Terlalu banyak permintaan. Coba lagi nanti.");
                return;
            }
            // Server selalu menjawab generik -> UI pun generik (anti-enumeration).
            setDone(true);
        } catch {
            setError("Tidak bisa menghubungi server. Periksa koneksi Anda.");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-8">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Lupa Password</h1>
                    <p className="text-sm text-gray-500 mb-6">
                        Masukkan nomor HP terdaftar Anda. Jika nomor tersebut memiliki email,
                        tautan reset akan dikirim ke email itu.
                    </p>

                    {done ? (
                        <div className="p-4 rounded-xl bg-green-50 text-green-800 border border-green-200 text-sm mb-4">
                            Permintaan diterima. Jika nomor terdaftar dan memiliki email, tautan
                            reset telah dikirim. Periksa kotak masuk (dan folder spam) Anda.
                            Tautan berlaku 1 jam dan hanya bisa dipakai sekali.
                        </div>
                    ) : (
                        <>
                            {error && (
                                <div className="mb-4 p-4 rounded-xl bg-red-50 text-red-700 text-sm border border-red-200">{error}</div>
                            )}
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-base font-semibold text-gray-800 mb-1">No. HP Terdaftar *</label>
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        className="w-full text-lg px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="contoh: 0812xxxxxxx"
                                        required
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold"
                                >
                                    {submitting ? "Mengirim..." : "Kirim Tautan Reset"}
                                </button>
                            </form>
                        </>
                    )}

                    <div className="mt-6 text-center text-sm">
                        <a href="/tenant" className="text-blue-600 hover:underline">← Kembali ke login</a>
                    </div>
                </div>
            </div>
        </main>
    );
}