// src/components/property-form-modal.tsx
"use client";

import { useState } from "react";

const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "https://api.adityoarr.com/kost/v1";

// Baca pesan error dari backend, ubah jadi bahasa manusiawi.
async function readError(res: Response): Promise<string> {
    try {
        const data = await res.json();
        if (data && typeof data.error === "string") return data.error;
        if (data && typeof data.message === "string") return data.message;
    } catch {
        /* body bukan JSON, abaikan */
    }
    if (res.status === 400) return "Data belum lengkap atau formatnya salah. Periksa lagi.";
    if (res.status === 401) return "Sesi Anda habis. Silakan masuk ulang.";
    if (res.status === 403) return "Anda tidak punya izin untuk aksi ini.";
    if (res.status === 404) return "Data tidak ditemukan.";
    return "Terjadi kesalahan pada server. Coba lagi sebentar.";
}

type Props = {
    mode: "create" | "edit";
    initialData?: any; // untuk edit: data properti yang sudah ada
    onClose: () => void;
    onSaved: (message: string) => void;
};

export default function PropertyFormModal({ mode, initialData, onClose, onSaved }: Props) {
    const isEdit = mode === "edit";

    // Nilai awal: dari data (edit) atau kosong (tambah).
    const [name, setName] = useState(initialData?.name ?? "");
    const [address, setAddress] = useState(initialData?.address ?? "");
    const [city, setCity] = useState(initialData?.city ?? "");
    const [province, setProvince] = useState(initialData?.province ?? "");
    const [phone, setPhone] = useState(initialData?.phone ?? "");

    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError("");

        // Validasi ringan di browser: tangkap error cepat sebelum ke server.
        if (!name.trim() || !address.trim() || !city.trim()) {
            setError("Nama, Alamat, dan Kota wajib diisi.");
            return;
        }

        setSubmitting(true);
        try {
            const url = isEdit
                ? `${API_BASE_URL}/properties/${initialData.id}`
                : `${API_BASE_URL}/properties`;
            const method = isEdit ? "PUT" : "POST";

            const body = {
                name: name.trim(),
                address: address.trim(),
                city: city.trim(),
                province: province.trim() || null,
                phone: phone.trim() || null,
            };

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                setError(await readError(res));
                return;
            }

            onSaved(isEdit ? "Perubahan properti tersimpan ✅" : "Properti baru berhasil ditambahkan ✅");
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
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl border border-gray-200">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">
                        {isEdit ? "Edit Properti" : "Tambah Properti"}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-700 text-2xl leading-none"
                        aria-label="Tutup"
                    >
                        ×
                    </button>
                </div>

                {error && (
                    <div className="mb-5 p-4 rounded-xl bg-red-50 text-red-700 text-sm border border-red-200">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <Field label="Nama Kost *" hint="Contoh: Kost Melati">
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full text-lg px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Kost Melati"
                            required
                        />
                    </Field>

                    <Field label="Alamat Lengkap *" hint="Jalan, nomor, RT/RW, dll.">
                        <textarea
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            rows={2}
                            className="w-full text-lg px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            placeholder="Jl. Melati No. 10, RT 03/RW 05"
                            required
                        />
                    </Field>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="Kota *" hint="Contoh: Bandung">
                            <input
                                type="text"
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                className="w-full text-lg px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Bandung"
                                required
                            />
                        </Field>
                        <Field label="Provinsi" hint="Opsional">
                            <input
                                type="text"
                                value={province}
                                onChange={(e) => setProvince(e.target.value)}
                                className="w-full text-lg px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Jawa Barat"
                            />
                        </Field>
                    </div>

                    <Field label="No. Telepon Pengelola" hint="Opsional. Contoh: 081200000000">
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full text-lg px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="081200000000"
                        />
                    </Field>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
                        >
                            {submitting ? "Menyimpan..." : "Simpan"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Komponen kecil pembungkus label + hint + input, agar form rapi & konsisten.
function Field({
    label,
    hint,
    children,
}: {
    label: string;
    hint?: string;
    children: React.ReactNode;
}) {
    return (
        <div>
            <label className="block text-base font-semibold text-gray-800 mb-1">{label}</label>
            {hint && <p className="text-xs text-gray-400 mb-2">{hint}</p>}
            {children}
        </div>
    );
}