// src/components/lease-form-modal.tsx
"use client";

import { fetchApi } from "@/lib/api";
import { readError } from "@/lib/errors";
import { useEffect, useState } from "react";

const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "https://api.adityoarr.com/kost/v1";

type Props = {
    onClose: () => void;
    onSaved: (message: string) => void;
};

export default function LeaseFormModal({ onClose, onSaved }: Props) {
    const [tenants, setTenants] = useState<any[]>([]);
    const [units, setUnits] = useState<any[]>([]);
    const [loadingOptions, setLoadingOptions] = useState(true);

    const [tenantId, setTenantId] = useState("");
    const [unitId, setUnitId] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [monthlyRate, setMonthlyRate] = useState("");
    const [deposit, setDeposit] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        async function loadOptions() {
            try {
                const [tenantsData, propertiesData] = await Promise.all([
                    fetchApi<any[]>("/tenants"),
                    fetchApi<any[]>("/properties"),
                ]);
                const activeTenants = tenantsData.filter((t) => t.status === "ACTIVE");
                const unitLists = await Promise.all(
                    propertiesData.map((p) => fetchApi<any[]>(`/properties/${p.id}/units`))
                );
                const vacantUnits = unitLists
                    .flat()
                    .filter((u) => u.status === "VACANT");
                setTenants(activeTenants);
                setUnits(vacantUnits);
            } catch {
                setError("Gagal memuat pilihan penyewa/kamar.");
            } finally {
                setLoadingOptions(false);
            }
        }
        loadOptions();
    }, []);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError("");
        if (!tenantId || !unitId || !startDate) {
            setError("Penyewa, kamar, dan tanggal mulai wajib dipilih.");
            return;
        }
        setSubmitting(true);
        try {
            const res = await fetch(`${API_BASE_URL}/leases`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    tenantId,
                    unitId,
                    startDate,
                    endDate: endDate || null,
                    monthlyRate: monthlyRate ? Number(monthlyRate) : null,
                    deposit: deposit ? Number(deposit) : null,
                }),
            });
            if (!res.ok) {
                setError(await readError(res));
                return;
            }
            onSaved("Kontrak hunian berhasil dibuat ✅");
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
                    <h2 className="text-2xl font-bold text-gray-900">Buat Kontrak Hunian</h2>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none" aria-label="Tutup">
                        ×
                    </button>
                </div>

                {error && (
                    <div className="mb-5 p-4 rounded-xl bg-red-50 text-red-700 text-sm border border-red-200">{error}</div>
                )}

                {loadingOptions ? (
                    <div className="p-8 text-center text-gray-500 animate-pulse">Memuat pilihan...</div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <Field label="Penyewa *">
                            <select
                                value={tenantId}
                                onChange={(e) => setTenantId(e.target.value)}
                                className="w-full text-lg px-4 py-3 rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            >
                                <option value="">— pilih penyewa —</option>
                                {tenants.map((t) => (
                                    <option key={t.id} value={t.id}>
                                        {t.name} ({t.phone})
                                    </option>
                                ))}
                            </select>
                            {tenants.length === 0 && (
                                <p className="text-xs text-amber-600 mt-1">Belum ada penyewa aktif. Tambahkan dulu di halaman Penyewa.</p>
                            )}
                        </Field>

                        <Field label="Kamar Kosong *">
                            <select
                                value={unitId}
                                onChange={(e) => setUnitId(e.target.value)}
                                className="w-full text-lg px-4 py-3 rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            >
                                <option value="">— pilih kamar —</option>
                                {units.map((u) => (
                                    <option key={u.id} value={u.id}>
                                        {u.propertyName} – Kamar {u.unitNumber}
                                    </option>
                                ))}
                            </select>
                            {units.length === 0 && (
                                <p className="text-xs text-amber-600 mt-1">Tidak ada kamar berstatus VACANT.</p>
                            )}
                        </Field>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field label="Tanggal Mulai *">
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full text-lg px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </Field>
                            <Field label="Tanggal Selesai" hint="Kosongkan = sampai dibatalkan">
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full text-lg px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </Field>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field label="Tarif/Bulan (Rp)" hint="Kosongkan = pakai tarif kamar">
                                <input
                                    type="number"
                                    min={0}
                                    step={50000}
                                    value={monthlyRate}
                                    onChange={(e) => setMonthlyRate(e.target.value)}
                                    className="w-full text-lg px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="opsional"
                                />
                            </Field>
                            <Field label="Uang Jaminan (Rp)" hint="Opsional">
                                <input
                                    type="number"
                                    min={0}
                                    step={50000}
                                    value={deposit}
                                    onChange={(e) => setDeposit(e.target.value)}
                                    className="w-full text-lg px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="opsional"
                                />
                            </Field>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors">
                                Batal
                            </button>
                            <button type="submit" disabled={submitting} className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:bg-blue-300 transition-colors">
                                {submitting ? "Menyimpan..." : "Simpan"}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="block text-base font-semibold text-gray-800 mb-1">{label}</label>
            {hint && <p className="text-xs text-gray-400 mb-2">{hint}</p>}
            {children}
        </div>
    );
}