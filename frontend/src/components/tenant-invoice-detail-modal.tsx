// src/components/tenant-invoice-detail-modal.tsx
"use client";

import { fetchApi } from "@/lib/api";
import { formatDate, formatRupiah } from "@/lib/format";
import { useEffect, useState } from "react";

type Props = {
    invoiceId: string;
    onClose: () => void;
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

export default function TenantInvoiceDetailModal({ invoiceId, onClose }: Props) {
    const [detail, setDetail] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchApi(`/tenant-me/invoices/${invoiceId}`)
            .then(setDetail)
            .catch(() => setDetail(null))
            .finally(() => setLoading(false));
    }, [invoiceId]);

    const inv = detail?.invoice;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-900">Rincian Tagihan</h3>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none" aria-label="Tutup">
                        ×
                    </button>
                </div>

                {loading || !inv ? (
                    <div className="p-10 text-center text-gray-500 animate-pulse">Memuat...</div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 gap-3 mb-5 text-sm">
                            <Info label="Periode" value={`${formatDate(inv.periodStart)} - ${formatDate(inv.periodEnd)}`} />
                            <Info label="Jatuh Tempo" value={formatDate(inv.dueDate)} />
                            <Info label="Tarif" value={formatRupiah(inv.baseAmount)} />
                            <Info label="Terbayar" value={formatRupiah(inv.paidAmount)} />
                            <Info label="Sisa" value={formatRupiah(inv.principalRemaining ?? inv.remaining ?? 0)} />
                            <Info label="Denda" value={(inv.feeAmount ?? inv.lateFee ?? 0) > 0 ? formatRupiah(inv.feeAmount ?? inv.lateFee) : "-"} />
                            <div className="col-span-2">
                                <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${badge(inv.effectiveStatus)}`}>
                                    {inv.effectiveStatus}
                                </span>
                            </div>
                        </div>

                        <h4 className="font-semibold text-gray-800 mb-2">Pembayaran Tercatat</h4>
                        {detail.payments.length === 0 ? (
                            <p className="text-sm text-gray-500">Belum ada pembayaran tercatat.</p>
                        ) : (
                            <ul className="space-y-2">
                                {detail.payments.map((p: any) => (
                                    <li key={p.id} className="flex justify-between text-sm p-3 rounded-xl bg-gray-50 border border-gray-200">
                                        <span className="text-gray-600">
                                            {formatDate(p.paidAt)} - {p.method}
                                            {p.isAdjustment ? " (penyesuaian)" : ""}
                                        </span>
                                        <span className={`font-mono ${p.amount < 0 ? "text-red-600" : "text-gray-900"}`}>
                                            {formatRupiah(p.amount)}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}

                        <p className="mt-5 text-xs text-gray-400">
                            Pembayaran dilakukan kepada pengelola kost. Struk muncul setelah pembayaran diverifikasi.
                        </p>
                    </>
                )}
            </div>
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