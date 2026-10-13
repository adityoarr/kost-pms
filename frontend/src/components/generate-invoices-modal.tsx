// src/components/generate-invoices-modal.tsx
"use client";

import { readError } from "@/lib/errors";
import { useState } from "react";

const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "https://api.adityoarr.com/kost/v1";

type Props = {
    onClose: () => void;
    onSaved: (message: string) => void;
};

export default function GenerateInvoicesModal({ onClose, onSaved }: Props) {
    const [period, setPeriod] = useState("");
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [result, setResult] = useState("");
    const [busy, setBusy] = useState(false);

    async function runGenerate() {
        if (!period) { setResult("Pilih bulan periode dulu."); return; }
        setBusy(true);
        setResult("");
        try {
            const res = await fetch(`${API_BASE_URL}/invoices/generate?period=${period}`, {
                method: "POST",
                credentials: "include",
            });
            if (!res.ok) { setResult(await readError(res)); return; }
            const d = await res.json();
            setResult(`Periode ${d.period}: dibuat ${d.created}, dilewati ${d.skipped}.`);
            onSaved("Generate periode selesai ✅");
        } catch {
            setResult("Tidak bisa menghubungi server.");
        } finally {
            setBusy(false);
        }
    }

    async function runBackfill() {
        if (!from || !to) { setResult("Isi bulan dari dan sampai."); return; }
        setBusy(true);
        setResult("");
        try {
            const res = await fetch(`${API_BASE_URL}/invoices/backfill?from=${from}&to=${to}`, {
                method: "POST",
                credentials: "include",
            });
            if (!res.ok) { setResult(await readError(res)); return; }
            const d = await res.json();
            setResult(`Rentang ${d.from} s.d. ${d.to}: dibuat ${d.created}, dilewati ${d.skipped}.`);
            onSaved("Backfill selesai ✅");
        } catch {
            setResult("Tidak bisa menghubungi server.");
        } finally {
            setBusy(false);
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
                    <h3 className="text-xl font-bold text-gray-900">Generate Tagihan</h3>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none" aria-label="Tutup">
                        ×
                    </button>
                </div>

                <div className="space-y-5">
                    <div className="p-4 rounded-xl border border-gray-200">
                        <label className="block text-base font-semibold text-gray-800 mb-2">Satu periode bulan</label>
                        <div className="flex gap-2">
                            <input
                                type="month"
                                value={period}
                                onChange={(e) => setPeriod(e.target.value)}
                                className="flex-1 px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                                onClick={runGenerate}
                                disabled={busy}
                                className="px-4 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:bg-blue-300"
                            >
                                Generate
                            </button>
                        </div>
                    </div>

                    <div className="p-4 rounded-xl border border-gray-200">
                        <label className="block text-base font-semibold text-gray-800 mb-2">Rentang bulan (backfill)</label>
                        <div className="flex gap-2">
                            <input
                                type="month"
                                value={from}
                                onChange={(e) => setFrom(e.target.value)}
                                className="flex-1 px-3 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <input
                                type="month"
                                value={to}
                                onChange={(e) => setTo(e.target.value)}
                                className="flex-1 px-3 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                                onClick={runBackfill}
                                disabled={busy}
                                className="px-4 py-3 rounded-xl bg-gray-700 text-white font-semibold hover:bg-gray-800 disabled:bg-gray-400"
                            >
                                Backfill
                            </button>
                        </div>
                    </div>

                    {result && (
                        <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-700">{result}</div>
                    )}
                </div>
            </div>
        </div>
    );
}