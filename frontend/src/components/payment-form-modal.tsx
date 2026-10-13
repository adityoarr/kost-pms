// src/components/payment-form-modal.tsx
"use client";

import { readError } from "@/lib/errors";
import { formatRupiah } from "@/lib/format";
import { useState } from "react";

const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "https://api.adityoarr.com/kost/v1";

type Props = {
    mode: "payment" | "adjustment";
    invoice: any;
    onClose: () => void;
    onSaved: (message: string) => void;
};

export default function PaymentFormModal({ mode, invoice, onClose, onSaved }: Props) {
    const isPayment = mode === "payment";
    const [amount, setAmount] = useState("");
    const [method, setMethod] = useState("CASH");
    const [reference, setReference] = useState("");
    const [reason, setReason] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError("");
        const val = Number(amount);
        if (!amount || isNaN(val) || val <= 0) {
            setError("Masukkan jumlah rupiah lebih dari 0.");
            return;
        }
        if (isPayment && val > invoice.remaining) {
            setError(`Jumlah melebihi sisa tagihan (${formatRupiah(invoice.remaining)}).`);
            return;
        }
        if (!isPayment && !reason.trim()) {
            setError("Alasan adjustment wajib diisi.");
            return;
        }

        setSubmitting(true);
        try {
            const url = isPayment
                ? `${API_BASE_URL}/invoices/${invoice.id}/payments`
                : `${API_BASE_URL}/invoices/${invoice.id}/adjustments`;
            const body = isPayment
                ? { amount: val, method, reference: reference.trim() || null }
                : { amount: -val, reason: reason.trim() };
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                setError(await readError(res));
                return;
            }
            onSaved(isPayment ? "Pembayaran tercatat ✅" : "Adjustment tercatat ✅");
            onClose();
        } catch {
            setError("Tidak bisa menghubungi server. Periksa koneksi internet Anda.");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-900">
                        {isPayment ? "Catat Pembayaran" : "Adjustment (Koreksi)"}
                    </h3>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none" aria-label="Tutup">
                        ×
                    </button>
                </div>

                <div className="mb-4 p-3 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-600 space-y-1">
                    <p>Sisa pokok: <span className="font-semibold text-gray-900">{formatRupiah(invoice.remaining)}</span></p>
                    {!isPayment && (
                        <p className="text-amber-700">Adjustment mengurangi jumlah terbayang (mis. kompensasi/refund).</p>
                    )}
                </div>

                {error && (
                    <div className="mb-4 p-4 rounded-xl bg-red-50 text-red-700 text-sm border border-red-200">{error}</div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-base font-semibold text-gray-800 mb-1">
                            {isPayment ? "Jumlah Diterima (Rp) *" : "Jumlah Dikurangi (Rp) *"}
                        </label>
                        <input
                            type="number"
                            min={1}
                            step={10000}
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full text-lg px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="contoh: 200000"
                            required
                        />
                    </div>

                    {isPayment ? (
                        <>
                            <div>
                                <label className="block text-base font-semibold text-gray-800 mb-1">Metode *</label>
                                <select
                                    value={method}
                                    onChange={(e) => setMethod(e.target.value)}
                                    className="w-full text-lg px-4 py-3 rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="CASH">Tunai</option>
                                    <option value="TRANSFER">Transfer Bank</option>
                                    <option value="OTHER">Lainnya</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-base font-semibold text-gray-800 mb-1">Referensi</label>
                                <input
                                    type="text"
                                    value={reference}
                                    onChange={(e) => setReference(e.target.value)}
                                    className="w-full text-lg px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="mis. BCA-1234 / kwitansi no."
                                />
                            </div>
                        </>
                    ) : (
                        <div>
                            <label className="block text-base font-semibold text-gray-800 mb-1">Alasan *</label>
                            <input
                                type="text"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                className="w-full text-lg px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="mis. kompensasi kerusakan, refund jaminan"
                                required
                            />
                        </div>
                    )}

                    <div className="flex gap-3 pt-1">
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