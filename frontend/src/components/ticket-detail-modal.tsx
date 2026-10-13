// src/components/ticket-detail-modal.tsx
"use client";

import { fetchApi } from "@/lib/api";
import { readError } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import { useCallback, useEffect, useState } from "react";

const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "https://api.adityoarr.com/kost/v1";

type Props = {
    ticketId: string;
    onClose: () => void;
    onChanged: (message: string) => void;
};

function statusBadge(s: string) {
    switch (s) {
        case "OPEN": return "bg-blue-100 text-blue-800";
        case "IN_PROGRESS": return "bg-amber-100 text-amber-800";
        case "RESOLVED": return "bg-green-100 text-green-800";
        case "CLOSED": return "bg-gray-200 text-gray-600";
        default: return "bg-gray-100 text-gray-800";
    }
}

export default function TicketDetailModal({ ticketId, onClose, onChanged }: Props) {
    const [ticket, setTicket] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [assignTo, setAssignTo] = useState("");
    const [resNote, setResNote] = useState("");

    const load = useCallback(() => {
        setLoading(true);
        fetchApi(`/tickets/${ticketId}`)
            .then(setTicket)
            .catch(() => setTicket(null))
            .finally(() => setLoading(false));
    }, [ticketId]);

    useEffect(() => { load(); }, [load]);

    async function handleUpdate(patch: any) {
        try {
            const res = await fetch(`${API_BASE_URL}/tickets/${ticketId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(patch),
            });
            if (res.ok) {
                onChanged("Tiket diperbarui ✅");
                load();
            } else {
                alert(await readError(res));
            }
        } catch {
            alert("Tidak bisa menghubungi server.");
        }
    }

    if (loading || !ticket) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                <div className="max-w-lg w-full p-8 rounded-2xl bg-white shadow-xl animate-pulse text-center text-gray-500">
                    Memuat tiket...
                </div>
            </div>
        );
    }

    const isDone = ticket.status === "RESOLVED" || ticket.status === "CLOSED";

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
                        Tiket: {ticket.title}
                    </h3>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none" aria-label="Tutup">×</button>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-5 text-sm">
                    <Info label="Penyewa" value={`${ticket.tenantName} (${ticket.tenantPhone})`} />
                    <Info label="Kamar" value={`${ticket.propertyName} — ${ticket.unitNumber}`} />
                    <Info label="Kategori" value={ticket.category} />
                    <Info label="Dibuat" value={formatDate(ticket.createdAt)} />
                    <div className="col-span-2">
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${statusBadge(ticket.status)}`}>
                            {ticket.status}
                        </span>
                        {ticket.assignedToUsername && (
                            <span className="ml-2 text-sm text-gray-600">
                                ditugaskan ke <span className="font-semibold">{ticket.assignedToUsername}</span>
                            </span>
                        )}
                    </div>
                </div>

                <div className="mb-5">
                    <h4 className="font-semibold text-gray-800 mb-2">Deskripsi</h4>
                    <p className="p-4 rounded-xl bg-gray-50 border border-gray-200 text-gray-700 whitespace-pre-wrap">
                        {ticket.description || "(tidak ada deskripsi)"}
                    </p>
                </div>

                {ticket.resolvedAt && (
                    <div className="mb-5">
                        <h4 className="font-semibold text-gray-800 mb-2">Resolusi</h4>
                        <p className="p-4 rounded-xl bg-green-50 border border-green-200 text-gray-700 whitespace-pre-wrap">
                            {ticket.resolutionNote || "(tanpa catatan)"}
                            <span className="block text-xs text-gray-500 mt-1">Diselesaikan {formatDate(ticket.resolvedAt)}</span>
                        </p>
                    </div>
                )}

                {!isDone && (
                    <div className="space-y-4 border-t border-gray-200 pt-4">
                        <div className="flex gap-2 items-end">
                            <div className="flex-1">
                                <label className="block text-base font-semibold text-gray-800 mb-1">Tugaskan ke (username)</label>
                                <input
                                    type="text"
                                    value={assignTo}
                                    onChange={(e) => setAssignTo(e.target.value)}
                                    className="w-full text-base px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="contoh: staff1"
                                />
                            </div>
                            <button
                                onClick={() => {
                                    if (!assignTo.trim()) return;
                                    handleUpdate({ assignedToUsername: assignTo.trim(), status: "IN_PROGRESS" });
                                }}
                                className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700"
                            >
                                Tugaskan
                            </button>
                        </div>

                        <div>
                            <label className="block text-base font-semibold text-gray-800 mb-1">Catatan Resolusi</label>
                            <textarea
                                rows={3}
                                value={resNote}
                                onChange={(e) => setResNote(e.target.value)}
                                className="w-full text-base px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                placeholder="Apa yang dilakukan untuk menyelesaikan..."
                            />
                            <div className="flex gap-2 mt-2">
                                <button
                                    onClick={() => handleUpdate({ status: "RESOLVED", resolutionNote: resNote })}
                                    className="px-4 py-2 rounded-xl bg-green-600 text-white font-semibold hover:bg-green-700"
                                >
                                    Selesaikan
                                </button>
                                <button
                                    onClick={() => handleUpdate({ status: "CLOSED", resolutionNote: resNote || "Ditutup tanpa resolusi" })}
                                    className="px-4 py-2 rounded-xl bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300"
                                >
                                    Tutup
                                </button>
                            </div>
                        </div>
                    </div>
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