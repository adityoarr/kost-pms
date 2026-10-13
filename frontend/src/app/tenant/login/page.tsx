// src/app/tenant/login/page.tsx
"use client";

import { useTenantGuestGuard } from "@/lib/use-tenant-guest-guard";
import { useState } from "react";

const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "https://api.adityoarr.com/kost/v1";

export default function TenantLoginPage() {
    const { status } = useTenantGuestGuard();
    const [mode, setMode] = useState<"login" | "setup">("login");
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [loading, setLoading] = useState(false);

    async function submitLogin(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/tenant-auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ phone: phone.trim(), password }),
            });
            if (res.status === 428) {
                setMode("setup");
                setNotice("Nomor Anda terdaftar tetapi belum punya password. Buat password di bawah ini.");
                return;
            }
            if (!res.ok) {
                const d = await res.json().catch(() => null);
                setError(d?.error || "Gagal masuk. Periksa kembali.");
                return;
            }
            window.location.replace("/tenant");
        } catch {
            setError("Tidak bisa menghubungi server. Periksa koneksi internet Anda.");
        } finally {
            setLoading(false);
        }
    }

    async function submitSetup(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError("");
        if (password !== confirm) {
            setError("Konfirmasi password tidak cocok.");
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/tenant-auth/setup-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ phone: phone.trim(), password, confirmPassword: confirm }),
            });
            if (!res.ok) {
                const d = await res.json().catch(() => null);
                setError(d?.error || "Gagal membuat password.");
                return;
            }
            window.location.replace("/tenant");
        } catch {
            setError("Tidak bisa menghubungi server. Periksa koneksi internet Anda.");
        } finally {
            setLoading(false);
        }
    }

    if (status === "loading") {
        return (
            <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
                <div className="w-full max-w-md p-8 rounded-2xl bg-white border border-gray-200 shadow-lg text-center text-gray-500 animate-pulse">
                    Memeriksa sesi Anda…
                </div>
            </main>
        );
    }
    if (status === "authenticated") return null;

    return (
        <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
                <h1 className="text-3xl font-bold text-center mb-2">Masuk Penyewa</h1>
                <p className="text-center text-gray-500 mb-8">Lihat tagihan & kontrak hunian Anda</p>

                {notice && (
                    <div className="mb-5 p-4 rounded-xl bg-amber-50 text-amber-800 text-sm border border-amber-200">{notice}</div>
                )}
                {error && (
                    <div className="mb-5 p-4 rounded-xl bg-red-50 text-red-700 text-sm border border-red-200">{error}</div>
                )}

                <form onSubmit={mode === "login" ? submitLogin : submitSetup} className="space-y-5">
                    <div>
                        <label htmlFor="phone" className="block text-lg font-medium mb-2">No. HP Terdaftar</label>
                        <input
                            id="phone"
                            type="tel"
                            autoComplete="off"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full text-lg px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="+6281234567890"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="tpassword" className="block text-lg font-medium mb-2">
                            {mode === "login" ? "Kata Sandi" : "Buat Kata Sandi"}
                        </label>
                        <input
                            id="tpassword"
                            type="password"
                            autoComplete="new-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full text-lg px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="••••••••"
                            required
                        />
                        {mode === "setup" && (
                            <p className="text-xs text-gray-400 mt-1">Minimal 8 karakter, mengandung huruf dan angka.</p>
                        )}
                    </div>

                    {mode === "setup" && (
                        <div>
                            <label htmlFor="tconfirm" className="block text-lg font-medium mb-2">Ulangi Kata Sandi</label>
                            <input
                                id="tconfirm"
                                type="password"
                                autoComplete="new-password"
                                value={confirm}
                                onChange={(e) => setConfirm(e.target.value)}
                                className="w-full text-lg px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full text-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 rounded-xl py-3 transition-colors"
                    >
                        {loading ? "Memeriksa..." : mode === "login" ? "Masuk" : "Buat Password & Masuk"}
                    </button>
                </form>

                <p className="mt-8 text-center text-sm text-gray-400">
                    Bukan penyewa?{" "}
                    <a href="/login" className="text-blue-600 hover:underline">Masuk sebagai pengelola</a>
                </p>
            </div>
        </main>
    );
}