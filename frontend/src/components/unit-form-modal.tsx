// src/components/unit-form-modal.tsx
"use client";

import { useState } from "react";

const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "https://api.adityoarr.com/kost/v1";

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
    propertyId: string; // dari halaman detail, ditempel ke URL path saat tambah
    initialData?: any; // untuk edit: data kamar yang sudah ada
    onClose: () => void;
    onSaved: (message: string) => void;
};

// Pilihan status. Saat edit, status aktual ikut ditambahkan agar tidak "hilang".
const BASE_STATUS = ["VACANT", "MAINTENANCE", "BLOCKED"];
const STATUS_LABEL: Record<string, string> = {
    VACANT: "Kosong (bisa disewakan)",
    OCCUPIED: "Terisi (oleh penyewa)",
    MAINTENANCE: "Perbaikan",
    BLOCKED: "Diblokir",
};

export default function UnitFormModal({ mode, propertyId, initialData, onClose, onSaved }: Props) {
    const isEdit = mode === "edit";

    const [unitNumber, setUnitNumber] = useState(initialData?.unitNumber ?? "");
    const [unitType, setUnitType] = useState(initialData?.unitType ?? "STANDARD");
    const [capacity, setCapacity] = useState<number>(initialData?.capacity ?? 1);
    const [monthlyRate, setMonthlyRate] = useState<number>(initialData?.monthlyRate ?? 0);
    const [facilities, setFacilities] = useState<string>(
        (initialData?.facilities ?? []).join(", ")
    );
    const [status, setStatus] = useState<string>(initialData?.status ?? "VACANT");

    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // Daftar opsi status = basis + status saat ini (jika edit & tidak ada di basis).
    const statusOptions = Array.from(new Set([...BASE_STATUS, status].filter(Boolean)));

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError("");

        if (!unitNumber.trim()) {
            setError("Nomor kamar wajib diisi.");
            return;
        }

        setSubmitting(true);
        try {
            // Tambah: POST ke /properties/{id}/units (propertyId dari path).
            // Ubah: PUT ke /units/{id}. Body sengaja TANPA propertyId (backend abaikan).
            const url = isEdit
                ? `${API_BASE_URL}/units/${initialData.id}`
                : `${API_BASE_URL}/properties/${propertyId}/units`;
            const method = isEdit ? "PUT" : "POST";

            const body = {
                unitNumber: unitNumber.trim(),
                unitType: unitType.trim() || "STANDARD",
                capacity: Number.isFinite(capacity) && capacity >= 1 ? capacity : 1,
                monthlyRate: Number.isFinite(monthlyRate) && monthlyRate >= 0 ? monthlyRate : 0,
                facilities: facilities
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                status,
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

            onSaved(isEdit ? "Perubahan kamar tersimpan ✅" : "Kamar baru berhasil ditambahkan ✅");
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
                        {isEdit ? `Edit Kamar ${initialData?.unitNumber ?? ""}` : "Tambah Kamar"}
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="Nomor Kamar *" hint="Contoh: 101, A-2">
                            <input
                                type="text"
                                value={unitNumber}
                                onChange={(e) => setUnitNumber(e.target.value)}
                                className="w-full text-lg px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="101"
                                required
                            />
                        </Field>
                        <Field label="Tipe Kamar" hint="Contoh: STANDARD, DELUXE">
                            <input
                                type="text"
                                value={unitType}
                                onChange={(e) => setUnitType(e.target.value)}
                                className="w-full text-lg px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="STANDARD"
                            />
                        </Field>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="Kapasitas (orang)" hint="Minimal 1">
                            <input
                                type="number"
                                min={1}
                                value={capacity}
                                onChange={(e) => setCapacity(Number(e.target.value))}
                                className="w-full text-lg px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </Field>
                        <Field label="Tarif / Bulan (Rp)" hint="Contoh: 1500000">
                            <input
                                type="number"
                                min={0}
                                step={50000}
                                value={monthlyRate}
                                onChange={(e) => setMonthlyRate(Number(e.target.value))}
                                className="w-full text-lg px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </Field>
                    </div>

                    <Field label="Fasilitas" hint="Pisahkan dengan koma. Contoh: AC, Kamar Mandi Dalam, WiFi">
                        <input
                            type="text"
                            value={facilities}
                            onChange={(e) => setFacilities(e.target.value)}
                            className="w-full text-lg px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="AC, Kamar Mandi Dalam, WiFi"
                        />
                    </Field>

                    <Field label="Status Kamar">
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="w-full text-lg px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                            {statusOptions.map((s) => (
                                <option key={s} value={s}>
                                    {STATUS_LABEL[s] ?? s}
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-400 mt-1">
                            Status &ldquo;Terisi&rdquo; biasanya diatur otomatis saat ada penyewa.
                        </p>
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