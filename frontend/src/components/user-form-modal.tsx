// src/components/user-form-modal.tsx
"use client";

import { readError } from "@/lib/errors";
import { useState } from "react";

const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "https://api.adityoarr.com/kost/v1";

type Props = {
    mode: "create" | "edit";
    initialData?: any;
    onClose: () => void;
    onSaved: (message: string) => void;
};

export default function UserFormModal({ mode, initialData, onClose, onSaved }: Props) {
    const isEdit = mode === "edit";
    const [username, setUsername] = useState(initialData?.username ?? "");
    const [fullName, setFullName] = useState(initialData?.fullName ?? "");
    const [role, setRole] = useState(initialData?.role ?? "STAFF");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError("");
        if (!username.trim() || !fullName.trim() || (!isEdit && !password)) {
            setError("Semua field wajib diisi.");
            return;
        }
        if (!isEdit && !/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password)) {
            setError("Password minimal 8 karakter dan harus mengandung huruf serta angka.");
            return;
        }
        setSubmitting(true);
        try {
            const url = isEdit ? `${API_BASE_URL}/users/${initialData.id}` : `${API_BASE_URL}/users`;
            const method = isEdit ? "PUT" : "POST";
            const body = isEdit
                ? { fullName: fullName.trim(), role }
                : { username: username.trim(), fullName: fullName.trim(), password, role };
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
            onSaved(isEdit ? `Pegawai ${username} diperbarui ✅` : `Akun ${username} berhasil dibuat ✅`);
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
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-900">{isEdit ? "Edit Pegawai" : "Tambah Pegawai"}</h3>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none" aria-label="Tutup">×</button>
                </div>

                {error && (
                    <div className="mb-5 p-4 rounded-xl bg-red-50 text-red-700 text-sm border border-red-200">{error}</div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-base font-semibold text-gray-800 mb-1">Username *</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            autoComplete="off"
                            maxLength={50}
                            readOnly={isEdit}
                            disabled={isEdit}
                            className={`w-full text-lg px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 ${isEdit ? "bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed" : "border-gray-300"}`}
                            placeholder="contoh: staff1"
                            required
                        />
                        {isEdit && <p className="text-xs text-gray-400 mt-1">Username tidak bisa diubah (identity untuk audit log).</p>}
                    </div>
                    <div>
                        <label className="block text-base font-semibold text-gray-800 mb-1">Nama Lengkap *</label>
                        <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="w-full text-lg px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Nama lengkap pegawai"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-base font-semibold text-gray-800 mb-1">Role *</label>
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            className="w-full text-lg px-4 py-3 rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="STAFF">STAFF (pegawai operasional)</option>
                            <option value="ADMIN">ADMIN (bisa kelola master data)</option>
                        </select>
                        <p className="text-xs text-gray-400 mt-1">Pilih STAFF untuk operasional harian, ADMIN untuk hak lebih luas.</p>
                    </div>
                    {!isEdit && (
                        <div>
                            <label className="block text-base font-semibold text-gray-800 mb-1">Password Awal *</label>
                            <div className="flex gap-2">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    autoComplete="new-password"
                                    className="w-full text-lg px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                                    placeholder="min. 8 karakter, huruf+angka"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((v) => !v)}
                                    className="px-3 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200"
                                >
                                    {showPassword ? "Sembunyi" : "Lihat"}
                                </button>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">Sampaikan password ini ke pegawai untuk login pertama.</p>
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200">
                            Batal
                        </button>
                        <button type="submit" disabled={submitting} className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:bg-blue-300">
                            {submitting ? "Menyimpan..." : "Buat Akun"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}