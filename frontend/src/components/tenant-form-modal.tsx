// src/components/tenant-form-modal.tsx
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function TenantFormModal({ mode, initialData, onClose, onSaved }: Props) {
    const isEdit = mode === "edit";
    const [name, setName] = useState(initialData?.name ?? "");
    const [phone, setPhone] = useState(initialData?.phone ?? "");
    const [email, setEmail] = useState("");
    const [nik, setNik] = useState(initialData?.nik ?? "");
    const [address, setAddress] = useState(initialData?.address ?? "");
    const [notes, setNotes] = useState(initialData?.notes ?? "");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    // Anti-duplikat: setelah tenant dibuat sekali, retry hanya meng-PUT email.
    const [createdId, setCreatedId] = useState<string | null>(isEdit ? initialData?.id ?? null : null);

    // Mode edit: pre-fill email dari endpoint terpisah.
    useEffect(() => {
        if (!isEdit || !initialData?.id) return;
        let cancelled = false;
        fetch(`${API_BASE_URL}/tenants/${initialData.id}/email`, { credentials: "include" })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
                if (cancelled || !d) return;
                setEmail(d.email ?? "");
            })
            .catch(() => { });
        return () => { cancelled = true; };
    }, [isEdit, initialData?.id]);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError("");
        if (!name.trim() || !phone.trim()) {
            setError("Nama dan No. HP wajib diisi.");
            return;
        }
        if (!/^\+[1-9]\d{6,14}$/.test(phone.trim())) {
            setError("No. HP harus format internasional, contoh: +6281234567890");
            return;
        }
        if (!email.trim()) {
            setError("Email wajib diisi (diperlukan untuk fitur lupa password).");
            return;
        }
        if (!EMAIL_RE.test(email.trim())) {
            setError("Format email tidak valid.");
            return;
        }
        setSubmitting(true);
        try {
            // 1) Simpan tenant (POST sekali; retry pakai createdId -> PUT, tidak duplikat)
            let tenantId = createdId;
            if (!tenantId) {
                const res = await fetch(`${API_BASE_URL}/tenants`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                        name: name.trim(),
                        phone: phone.trim(),
                        nik: nik.trim() || null,
                        address: address.trim() || null,
                        notes: notes.trim() || null,
                    }),
                });
                if (!res.ok) { setError(await readError(res)); return; }
                const created = await res.json();
                tenantId = created.id;
                setCreatedId(tenantId);
            } else {
                const res = await fetch(`${API_BASE_URL}/tenants/${tenantId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                        name: name.trim(),
                        phone: phone.trim(),
                        nik: nik.trim() || null,
                        address: address.trim() || null,
                        notes: notes.trim() || null,
                    }),
                });
                if (!res.ok) { setError(await readError(res)); return; }
            }

            // 2) Simpan email via endpoint terpisah (endpoint ini menolak kosong & format salah)
            const resEmail = await fetch(`${API_BASE_URL}/tenants/${tenantId}/email`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ email: email.trim() }),
            });
            if (!resEmail.ok) {
                setError(`Penyewa tersimpan, tapi email gagal: ${await readError(resEmail)}. Perbaiki lalu klik Simpan lagi (penyewa tidak dibuat ulang).`);
                return;
            }

            onSaved(isEdit ? "Perubahan penyewa tersimpan ✅" : "Penyewa baru ditambahkan ✅");
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
                        {isEdit ? "Edit Penyewa" : "Tambah Penyewa"}
                    </h2>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none" aria-label="Tutup">
                        ×
                    </button>
                </div>

                {error && (
                    <div className="mb-5 p-4 rounded-xl bg-red-50 text-red-700 text-sm border border-red-200">{error}</div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <Field label="Nama Lengkap *">
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full text-lg px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Nama penyewa"
                            required
                        />
                    </Field>

                    <Field label="No. HP *" hint="Format internasional. Ini yang dipakai tenant untuk login.">
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full text-lg px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="+6281234567890"
                            required
                        />
                    </Field>

                    <Field label="Email *" hint="Diperlukan untuk fitur lupa password. Pastikan tenant aktif menggunakan email ini.">
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full text-lg px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="nama@contoh.com"
                            required
                        />
                    </Field>

                    <Field label="NIK" hint="Opsional">
                        <input
                            type="text"
                            value={nik}
                            onChange={(e) => setNik(e.target.value)}
                            className="w-full text-lg px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Nomor KTP"
                        />
                    </Field>

                    <Field label="Alamat Asal" hint="Opsional">
                        <textarea
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            rows={2}
                            className="w-full text-lg px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            placeholder="Alamat sesuai KTP"
                        />
                    </Field>

                    <Field label="Catatan" hint="Opsional">
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={2}
                            className="w-full text-lg px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            placeholder="Catatan internal"
                        />
                    </Field>

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors">
                            Batal
                        </button>
                        <button type="submit" disabled={submitting} className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:bg-blue-300 transition-colors">
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