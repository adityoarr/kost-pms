// src/components/invoice-detail-modal.tsx
"use client";

import PaymentFormModal from "@/components/payment-form-modal";
import { fetchApi } from "@/lib/api";
import { readError } from "@/lib/errors";
import { formatDate, formatRupiah } from "@/lib/format";
import { useCallback, useEffect, useState } from "react";

const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "https://api.adityoarr.com/kost/v1";

type Props = {
    invoiceId: string;
    canAdjust: boolean;
    canVoid: boolean;
    onClose: () => void;
    onChanged: (message: string) => void;
};

function badge(eff: string) {
    switch (eff) {
        case "PAID": return "bg-green-100 text-green-800";
        case "OVERDUE": return "bg-red-100 text-red-800";
        case "PARTIALLY_PAID": return "bg-amber-100 text-amber-800";
        case "VOID": return "bg-gray-200 text-gray-600";
        default: return "bg-blue-100 text-blue-800";
    }
}

export default function InvoiceDetailModal({ invoiceId, canAdjust, canVoid, onClose, onChanged }: Props) {
    const [detail, setDetail] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [payOpen, setPayOpen] = useState(false);
    const [adjustOpen, setAdjustOpen] = useState(false);

    const load = useCallback(() => {
        setLoading(true);
        fetchApi(`/invoices/${invoiceId}`)
            .then(setDetail)
            .catch(() => setDetail(null))
            .finally(() => setLoading(false));
    }, [invoiceId]);

    useEffect(() => {
        load();
    }, [load]);

    async function handleVoid() {
        const reason = window.prompt("Alasan pembatalan tagihan?");
        if (!reason || !reason.trim()) return;
        try {
            const res = await fetch(`${API_BASE_URL}/invoices/${invoiceId}/void`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ reason: reason.trim() }),
            });
            if (res.ok) {
                onChanged("Tagihan dibatalkan ✅");
                load();
            } else {
                alert(await readError(res));
            }
        } catch {
            alert("Tidak bisa menghubungi server.");
        }
    }

    async function handleDeletePayment(p: any) {
        if (!window.confirm(`Hapus struk ${formatRupiah(p.amount)} (${p.method})?\nStatus tagihan akan dihitung ulang.`)) return;
        try {
            const res = await fetch(`${API_BASE_URL}/payments/${p.id}`, {
                method: "DELETE",
                credentials: "include",
            });
            if (res.ok) {
                onChanged("Struk dihapus, status dihitung ulang ✅");
                load();
            } else {
                alert(await readError(res));
            }
        } catch {
            alert("Tidak bisa menghubungi server.");
        }
    }

    const inv = detail?.invoice;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-900">
                        {inv ? `Tagihan ${inv.tenantName} — Kamar ${inv.unitNumber}` : "Memuat..."}
                    </h3>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none" aria-label="Tutup">
                        ×
                    </button>
                </div>

                {loading || !inv ? (
                    <div className="p-10 text-center text-gray-500 animate-pulse">Memuat tagihan...</div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 gap-3 mb-5 text-sm">
                            <Info label="Periode" value={`${formatDate(inv.periodStart)} – ${formatDate(inv.periodEnd)}`} />
                            <Info label="Jatuh Tempo" value={formatDate(inv.dueDate)} />
                            <Info label="Tarif Dasar" value={formatRupiah(inv.baseAmount)} />
                            <Info label="Diskon" value={formatRupiah(inv.discount)} />
                            <Info label="Terbayar (pokok+denda)" value={formatRupiah(inv.paidAmount)} />
                            <Info label="Sisa Pokok" value={formatRupiah(inv.principalRemaining ?? inv.remaining)} />
                            <Info label="Denda Berjalan" value={(inv.feeAmount ?? 0) > 0 ? formatRupiah(inv.feeAmount) : "-"} />
                            <Info label="Total Harus Dibayar" value={formatRupiah(inv.totalDue ?? inv.remaining)} />
                            <div className="col-span-2">
                                <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${badge(inv.effectiveStatus)}`}>
                                    {inv.effectiveStatus}
                                </span>
                                {(inv.feeAmount ?? 0) > 0 && inv.effectiveStatus !== "PAID" && (
                                    <p className="mt-2 text-xs text-red-600">Termasuk denda keterlambatan {formatRupiah(inv.feeAmount)}.</p>
                                )}
                                {inv.status === "VOID" && inv.voidReason && (
                                    <p className="mt-2 text-xs text-gray-500">Alasan batal: {inv.voidReason}</p>
                                )}
                            </div>
                        </div>

                        <h4 className="font-semibold text-gray-800 mb-2">Riwayat Struk</h4>
                        {detail.payments.length === 0 ? (
                            <p className="text-sm text-gray-500 mb-4">Belum ada pembayaran tercatat.</p>
                        ) : (
                            <div className="overflow-x-auto border border-gray-200 rounded-xl mb-4">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="bg-gray-50 text-gray-600 uppercase text-xs">
                                            <th className="p-3">Waktu</th>
                                            <th className="p-3">Metode</th>
                                            <th className="p-3">Ref</th>
                                            <th className="p-3 text-right">Jumlah</th>
                                            <th className="p-3">Oleh</th>
                                            {canAdjust && <th className="p-3 text-right">Aksi</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {detail.payments.map((p: any) => (
                                            <tr key={p.id}>
                                                <td className="p-3 text-gray-600">{formatDate(p.paidAt)}</td>
                                                <td className="p-3 text-gray-600">
                                                    {p.method}
                                                    {p.isAdjustment && (
                                                        <span className="ml-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-semibold">ADJUST</span>
                                                    )}
                                                </td>
                                                <td className="p-3 text-gray-500">{p.reference || "-"}</td>
                                                <td className={`p-3 text-right font-mono ${p.amount < 0 ? "text-red-600" : "text-gray-900"}`}>
                                                    {formatRupiah(p.amount)}
                                                </td>
                                                <td className="p-3 text-gray-500">{p.receivedByUsername}</td>
                                                {canAdjust && (
                                                    <td className="p-3 text-right">
                                                        <button
                                                            onClick={() => handleDeletePayment(p)}
                                                            className="px-2 py-1 rounded-lg text-red-600 hover:bg-red-50 text-xs font-medium"
                                                        >
                                                            Hapus
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <div className="flex flex-wrap gap-2">
                            {inv.effectiveStatus !== "PAID" && inv.status !== "VOID" && (
                                <button
                                    onClick={() => setPayOpen(true)}
                                    className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700"
                                >
                                    💵 Catat Pembayaran
                                </button>
                            )}
                            {canAdjust && inv.status !== "VOID" && (
                                <button
                                    onClick={() => setAdjustOpen(true)}
                                    className="px-4 py-2 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-600"
                                >
                                    🛠 Adjustment
                                </button>
                            )}
                            {canVoid && inv.status !== "VOID" && (
                                <button
                                    onClick={handleVoid}
                                    className="px-4 py-2 rounded-xl bg-red-50 text-red-600 font-semibold hover:bg-red-100 border border-red-200"
                                >
                                    Batalkan Tagihan
                                </button>
                            )}
                        </div>
                    </>
                )}
            </div>

            {payOpen && inv && (
                <PaymentFormModal
                    mode="payment"
                    invoice={inv}
                    onClose={() => setPayOpen(false)}
                    onSaved={(m) => {
                        onChanged(m);
                        load();
                    }}
                />
            )}
            {adjustOpen && inv && (
                <PaymentFormModal
                    mode="adjustment"
                    invoice={inv}
                    onClose={() => setAdjustOpen(false)}
                    onSaved={(m) => {
                        onChanged(m);
                        load();
                    }}
                />
            )}
        </div>
    );
}

function Info({ label, value }: { label: string; value: string }) {
    return (
        <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
            <p className="text-xs text-gray-500">{label}</p>
            <p className="font-semibold text-gray-900">{value}</p>
        </div>
    );
}