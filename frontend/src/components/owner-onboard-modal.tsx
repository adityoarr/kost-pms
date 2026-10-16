// src/components/owner-onboard-modal.tsx
"use client";

import { readError } from "@/lib/errors";
import { useState } from "react";

const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "https://api.adityoarr.com/kost/v1";

type Props = {
    onClose: () => void;
    onSaved: (message: string) => void;
};

const PW_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

export default function OwnerOnboardModal({ onClose, onSaved }: Props) {
    const [username, setUsername] = useState("");
    const [fullName, setFullName] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError("");
        if (!username.trim() || !fullName.trim() || !password) {
            setError("Semua field wajib diisi.");
            return;
        }
        if (!PW_RE.test(password)) {
            setError("Password minimal 8 karakter dan harus mengandung huruf serta angka.");
            return;
        }
        setSubmitting(true);
        try {
            const res = await fetch(`${API_BASE_URL}/owners`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    username: username.trim(),
                    fullName: fullName.trim(),
                    password,
                }),
            });
            if (!res.ok) {
                setError(await readError(res));
                return;
            }
            onSaved(`Owner ${username.trim()} berhasil dibuat ✅`);
            onClose();
        } catch {
            setError("Tidak bisa menghubungi server. Periksa koneksi internet Anda.");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-gray-200">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-2xl font-bold text-gray-900">Onboard Owner Baru</h2>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none" aria-label="Tutup">×</button>
                </div>

                <p className="text-sm text-gray-500 mb-5">
                    Owner baru adalah <span className="font-semibold">SUPERADMIN</span> untuk organisasi terpisah.
                    Data mereka terisolasi penuh dari owner lain. Sampaikan username & password ini secara aman kepada mereka.
                </p>

                {error && (
                    <div className="mb-5 p-4 rounded-xl bg-red-50 text-red-700 text-sm border border-red-200">{error}</div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-base font-semibold text-gray-800 mb-1">Username *</label>
                        <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                            className="w-full text-lg px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="contoh: ownerbandung" required />
                        <p className="text-xs text-gray-400 mt-1">Username unik secara global (dipakai untuk login).</p>
                    </div>
                    <div>
                        <label className="block text-base font-semibold text-gray-800 mb-1">Nama Lengkap *</label>
                        <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                            className="w-full text-lg px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Nama pemilik" required />
                    </div>
                    <div>
                        <label className="block text-base font-semibold text-gray-800 mb-1">Password Awal *</label>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                            className="w-full text-lg px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="min. 8 karakter, huruf + angka" required />
                    </div>
                    <div className="flex gap-3 pt-1">
                        <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors">Batal</button>
                        <button type="submit" disabled={submitting} className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:bg-indigo-300 transition-colors">
                            {submitting ? "Menyimpan..." : "Buat Owner"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}