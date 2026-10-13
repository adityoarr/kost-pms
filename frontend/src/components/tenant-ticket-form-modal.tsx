// src/components/tenant-ticket-form-modal.tsx
"use client";

import { readError } from "@/lib/errors";
import { useState } from "react";

const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "https://api.adityoarr.com/kost/v1";

const CATEGORIES = [
    { key: "AIR", label: "Air" },
    { key: "LISTRIK", label: "Listrik" },
    { key: "BANGUNAN", label: "Bangunan/Fisik" },
    { key: "FURNITURE", label: "Perabot" },
    { key: "KEAMANAN", label: "Keamanan" },
    { key: "LAINNYA", label: "Lainnya" },
];

type Props = {
    onClose: () => void;
    onSaved: (message: string) => void;
};

export default function TenantTicketFormModal({ onClose, onSaved }: Props) {
    const [category, setCategory] = useState("LAINNYA");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError("");
        if (!title.trim()) {
            setError("Judul laporan wajib diisi.");
            return;
        }
        setSubmitting(true);
        try {
            const res = await fetch(`${API_BASE_URL}/tickets`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    category,
                    title: title.trim(),
                    description: description.trim() || null,
                }),
            });
            if (!res.ok) {
                setError(await readError(res));
                return;
            }
            onSaved("Laporan berhasil dikirim ✅");
            onClose();
        } catch {
            setError("Tidak bisa menghubungi server.");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-900">Lapor Masalah</h3>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none" aria-label="Tutup">×</button>
                </div>

                {error && (
                    <div className="mb-4 p-4 rounded-xl bg-red-50 text-red-700 text-sm border border-red-200">{error}</div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-base font-semibold text-gray-800 mb-1">Kategori *</label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full text-lg px-4 py-3 rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {CATEGORIES.map((c) => (
                                <option key={c.key} value={c.key}>{c.label}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-base font-semibold text-gray-800 mb-1">Judul Laporan *</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full text-lg px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="contoh: Air mati sejak pagi"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-base font-semibold text-gray-800 mb-1">Deskripsi</label>
                        <textarea
                            rows={4}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full text-lg px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            placeholder="Ceritakan lebih detail (opsional)"
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200">
                            Batal
                        </button>
                        <button type="submit" disabled={submitting} className="flex-1 py-3 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-600 disabled:bg-amber-300">
                            {submitting ? "Mengirim..." : "Kirim Laporan"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}