"use client";

import { useState } from "react";
import { useGuestGuard } from "@/lib/use-guest-guard";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://api.adityoarr.com/kost/v1";

export default function LoginPage() {
  const { status } = useGuestGuard();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        setError("Nama pengguna atau kata sandi salah. Periksa lagi pelan-pelan.");
        return;
      }
      // PERINTAH LANGSUNG KE BROWSER: buang /login dari riwayat secara total.
      // Ini yang membuat tombol back TIDAK MUNGKIN kembali ke halaman ini.
      window.location.replace("/dashboard");
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

  if (status === "authenticated") {
    return null;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
        <h1 className="text-3xl font-bold text-center mb-2">Masuk</h1>
        <p className="text-center text-gray-500 mb-8">Sistem Pengelolaan Kost</p>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 text-red-700 text-sm border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-lg font-medium mb-2">
              Nama Pengguna
            </label>
            <input
              id="username"
              type="text"
              autoComplete="off"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full text-lg px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="contoh: owner"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-lg font-medium mb-2">
              Kata Sandi
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full text-lg px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full text-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 rounded-xl py-3 transition-colors"
          >
            {loading ? "Memeriksa..." : "Masuk"}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-gray-400">
          Belum punya akun? Hubungi pemilik kost Anda.
        </p>
      </div>
    </main>
  );
}