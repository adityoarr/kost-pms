// src/components/property-form-modal.tsx
"use client";

import { readError } from "@/lib/errors";
import { useEffect, useState } from "react";

const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "https://api.adityoarr.com/kost/v1";

type Props = {
    mode: "create" | "edit";
    initialData?: any;
    onClose: () => void;
    onSaved: (message: string) => void;
};

export default function PropertyFormModal({ mode, initialData, onClose, onSaved }: Props) {
    const isEdit = mode === "edit";

    const [name, setName] = useState(initialData?.name ?? "");
    const [address, setAddress] = useState(initialData?.address ?? "");
    const [city, setCity] = useState(initialData?.city ?? "");
    const [province, setProvince] = useState(initialData?.province ?? "");
    const [phone, setPhone] = useState(initialData?.phone ?? "");

    const [bank, setBank] = useState("");
    const [accountNumber, setAccountNumber] = useState("");
    const [accountHolder, setAccountHolder] = useState("");
    const [notes, setNotes] = useState("");

    // Guard anti-duplikat: setelah properti dibuat sekali, retry HANYA simpan payment.
    const [createdId, setCreatedId] = useState<string | null>(isEdit ? initialData?.id ?? null : null);

    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // Pre-fill payment saat edit (endpoint terpisah, non-invasif).
    useEffect(() => {
        if (!isEdit || !initialData?.id) return;
        let cancelled = false;
        fetch(`${API_BASE_URL}/properties/${initialData.id}/payment-info`, { credentials: "include" })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
                if (cancelled || !d) return;
                setBank(d.bank ?? "");
                setAccountNumber(d.accountNumber ?? "");
                setAccountHolder(d.accountHolder ?? "");
                setNotes(d.notes ?? "");
            })
            .catch(() => { });
        return () => { cancelled = true; };
    }, [isEdit, initialData?.id]);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError("");
        if (!name.trim() || !address.trim() || !city.trim()) {
            setError("Nama, Alamat, dan Kota wajib diisi.");
            return;
        }

        const accDigits = accountNumber.trim().replace(/[\s-]/g, "");
        if (accDigits && !/^\d{6,20}$/.test(accDigits)) {
            setError("Nomor rekening hanya boleh angka (6–20 digit).");
            return;
        }

        setSubmitting(true);
        try {
            // 1) Simpan properti (POST sekali; retry pakai createdId -> PUT, tidak duplikat).
            let propId = createdId;
            if (!propId) {
                const res = await fetch(`${API_BASE_URL}/properties`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                        name: name.trim(),
                        address: address.trim(),
                        city: city.trim(),
                        province: province.trim() || null,
                        phone: phone.trim() || null,
                    }),
                });
                if (!res.ok) { setError(await readError(res)); return; }
                const created = await res.json();
                propId = created.id;
                setCreatedId(propId);
            } else {
                const res = await fetch(`${API_BASE_URL}/properties/${propId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                        name: name.trim(),
                        address: address.trim(),
                        city: city.trim(),
                        province: province.trim() || null,
                        phone: phone.trim() || null,
                    }),
                });
                if (!res.ok) { setError(await readError(res)); return; }
            }

            // 2) Simpan payment info (endpoint terpisah). Kalau gagal, JANGAN tutup modal.
            const resPay = await fetch(`${API_BASE_URL}/properties/${propId}/payment-info`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    bank: bank.trim() || null,
                    accountNumber: accountNumber.trim() || null,
                    accountHolder: accountHolder.trim() || null,
                    notes: notes.trim() || null,
                }),
            });
            if (!resPay.ok) {
                setError(`Properti tersimpan ✅, tapi info pembayaran gagal: ${await readError(resPay)}. Perbaiki lalu klik Simpan lagi (properti tidak dibuat ulang).`);
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
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl border border-gray-200">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">{isEdit ? "Edit Properti" : "Tambah Properti"}</h2>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none" aria-label="Tutup">×</button>
                </div>

                {error && (
                    <div className="mb-5 p-4 rounded-xl bg-red-50 text-red-700 text-sm border border-red-200">{error}</div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <Field label="Nama Kost *" hint="Contoh: Kost Melati">
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                            className="w-full text-lg px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Kost Melati" required />
                    </Field>
                    <Field label="Alamat Lengkap *" hint="Jalan, nomor, RT/RW, dll.">
                        <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2}
                            className="w-full text-lg px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            placeholder="Jl. Melati No. 10" required />
                    </Field>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="Kota *"><input type="text" value={city} onChange={(e) => setCity(e.target.value)}
                            className="w-full text-lg px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Bandung" required /></Field>
                        <Field label="Provinsi" hint="Opsional"><input type="text" value={province} onChange={(e) => setProvince(e.target.value)}
                            className="w-full text-lg px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Jawa Barat" /></Field>
                    </div>
                    <Field label="No. Telepon Pengelola" hint="Opsional"><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                        className="w-full text-lg px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="081200000000" /></Field>

                    <div className="pt-2 border-t border-gray-200">
                        <p className="text-base font-semibold text-gray-800 mb-1">Info Pembayaran <span className="text-xs font-normal text-gray-400">(opsional — tampil di portal penyewa)</span></p>
                        <p className="text-xs text-gray-400 mb-3">Isi rekening/nama bank agar penyewa tahu harus transfer ke mana. Kosongkan jika belum diatur.</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="Nama Bank" hint="Contoh: BCA"><input type="text" value={bank} onChange={(e) => setBank(e.target.value)}
                            className="w-full text-lg px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="BCA" /></Field>
                        <Field label="No. Rekening"><input type="text" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)}
                            className="w-full text-lg px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" placeholder="1234567890" /></Field>
                    </div>
                    <Field label="Atas Nama"><input type="text" value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)}
                        className="w-full text-lg px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Nama pemilik rekening" /></Field>
                    <Field label="Instruksi Pembayaran" hint="Opsional — tampil untuk penyewa">
                        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                            className="w-full text-lg px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            placeholder="Contoh: transfer tanggal 1-5, kirim bukti ke WA pengelola." />
                    </Field>

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200">Batal</button>
                        <button type="submit" disabled={submitting} className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:bg-blue-300">
                            {submitting ? "Menyimpan..." : "Simpan"}
                        </button>
                    </div>
                </form>
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