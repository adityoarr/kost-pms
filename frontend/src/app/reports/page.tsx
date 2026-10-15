// src/app/reports/page.tsx
"use client";

import { fetchApi } from "@/lib/api";
import { formatRupiah } from "@/lib/format";
import { isOwnerRole } from "@/lib/roles";
import { useAuthGuard } from "@/lib/use-auth-guard";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { useEffect, useState } from "react";

type Row = {
    invoiceId: string;
    tenantName: string;
    tenantPhone: string;
    unitNumber: string;
    propertyName: string;
    baseAmount: number;
    discount: number;
    paidAmount: number;
    remaining: number;
    principalRemaining: number;
    lateFee: number;
    feeAmount: number;
    effectiveStatus: string;
};

type PeriodReport = {
    month: string;
    billedAmount: number;
    collectedAmount: number;
    paidCount: number;
    overdueCount: number;
    overdueAmount: number;
    outstandingEnd: number;
    rows: Row[];
};

function currentMonth(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthTitle(iso: string): string {
    const d = new Date(iso + "-01T00:00:00");
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}

function badge(eff: string) {
    switch (eff) {
        case "PAID": return "bg-green-100 text-green-800";
        case "OVERDUE": return "bg-red-100 text-red-800";
        case "PARTIALLY_PAID": return "bg-amber-100 text-amber-800";
        default: return "bg-blue-100 text-blue-800";
    }
}

const rp = (n: number) => "Rp " + new Intl.NumberFormat("id-ID").format(n);
const sisaPokok = (r: Row) => r.principalRemaining ?? r.remaining;
const denda = (r: Row) => r.feeAmount ?? r.lateFee ?? 0;
const totalDue = (r: Row) => sisaPokok(r) + denda(r);

// ---- CSV (client-side, BOM utk Excel) ----
function buildCsv(rep: PeriodReport): string {
    const q = (s: string | number) => `"${String(s).replace(/"/g, '""')}"`;
    const lines: string[] = [];
    lines.push(`Laporan Periode,${q(monthTitle(rep.month))}`);
    lines.push(`Ditagih,${rep.billedAmount}`);
    lines.push(`Diterima (tercatat periode ini),${rep.collectedAmount}`);
    lines.push(`Lunas (jumlah tagihan),${rep.paidCount}`);
    lines.push(`Telat (jumlah tagihan),${rep.overdueCount}`);
    lines.push(`Telat (nominal sisa),${rep.overdueAmount}`);
    lines.push(`Outstanding akhir periode,${rep.outstandingEnd}`);
    lines.push("");
    lines.push(["Penyewa", "No.HP", "Kamar", "Properti", "Ditagih", "Diskon", "Terbayar", "Sisa Pokok", "Denda", "Total Due", "Status"].map(q).join(","));
    for (const r of rep.rows) {
        lines.push([r.tenantName, r.tenantPhone, r.unitNumber, r.propertyName, r.baseAmount, r.discount, r.paidAmount, sisaPokok(r), denda(r), totalDue(r), r.effectiveStatus].map(q).join(","));
    }
    return "\uFEFF" + lines.join("\r\n");
}

function downloadCsv(rep: PeriodReport) {
    const blob = new Blob([buildCsv(rep)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `laporan-kost-${rep.month}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ---- PDF (client-side, jsPDF + autotable) ----
function downloadPdf(rep: PeriodReport) {
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

    doc.setFontSize(16);
    doc.text("Laporan Bulanan Kost", 40, 50);
    doc.setFontSize(11);
    doc.text(`Periode: ${monthTitle(rep.month)}`, 40, 70);
    // new Date() di DALAM handler klik (bukan saat render) -> aman dari aturan nilai-tidak-stabil
    doc.text(`Dicetak: ${new Date().toLocaleString("id-ID")}`, 40, 86);

    let y = 112;
    doc.setFontSize(10);
    const summary = [
        `Ditagih: ${rp(rep.billedAmount)}`,
        `Diterima (tercatat periode ini): ${rp(rep.collectedAmount)}`,
        `Outstanding akhir periode: ${rp(rep.outstandingEnd)}`,
        `Lunas: ${rep.paidCount} dari ${rep.rows.length} tagihan`,
        `Telat: ${rep.overdueCount} tagihan (${rp(rep.overdueAmount)})`,
    ];
    summary.forEach((s) => { doc.text(s, 40, y); y += 16; });

    autoTable(doc, {
        startY: y + 10,
        head: [["Penyewa", "No. HP", "Kamar", "Properti", "Ditagih", "Terbayar", "Sisa Pokok", "Denda", "Total Due", "Status"]],
        body: rep.rows.map((r) => [
            r.tenantName,
            r.tenantPhone,
            r.unitNumber,
            r.propertyName,
            rp(r.baseAmount - r.discount),
            rp(r.paidAmount),
            rp(sisaPokok(r)),
            rp(denda(r)),
            rp(totalDue(r)),
            r.effectiveStatus,
        ]),
        styles: { fontSize: 8, cellPadding: 4 },
        headStyles: { fillColor: [31, 41, 55], textColor: 255 },
        alternateRowStyles: { fillColor: [246, 247, 249] },
    });

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(140);
        doc.text(`Halaman ${i} dari ${pageCount} - dihasilkan otomatis oleh Sistem PMS Kost`, 40, doc.internal.pageSize.getHeight() - 20);
    }

    doc.save(`laporan-kost-${rep.month}.pdf`);
}

export default function ReportsPage() {
    const { me, status: authStatus } = useAuthGuard();
    const [month, setMonth] = useState<string>("");
    const [report, setReport] = useState<PeriodReport | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const allowed = !!me && isOwnerRole(me.roles);

    // Default bulan diisi SETELAH mount agar prerender tidak melihat new Date().
    useEffect(() => { setMonth(currentMonth()); }, []);

    function load(m: string) {
        setLoading(true);
        setError("");
        fetchApi<PeriodReport>(`/reports/period?month=${m}`)
            .then(setReport)
            .catch(() => setError("Gagal memuat laporan. Periksa bulan atau coba lagi."))
            .finally(() => setLoading(false));
    }

    useEffect(() => {
        if (authStatus === "ok" && allowed && month) load(month);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authStatus, allowed, month]);

    if (authStatus === "loading") {
        return (
            <main className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-pulse text-gray-500">Memeriksa sesi...</div>
            </main>
        );
    }
    if (authStatus === "error" || !me) return null;
    if (!allowed) {
        return (
            <main className="min-h-screen bg-gray-50 p-6">
                <div className="max-w-2xl mx-auto p-6 bg-amber-50 text-amber-800 rounded-xl border border-amber-200">
                    <p className="font-semibold">Laporan keuangan hanya untuk pemilik (SUPERADMIN/ADMIN).</p>
                    <a href="/dashboard" className="underline text-blue-600 mt-2 inline-block">← Kembali</a>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-gray-50 p-6 md:p-10">
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                    <div>
                        <a href="/dashboard" className="text-sm text-blue-600 hover:underline">← Dashboard</a>
                        <h1 className="text-3xl font-bold text-gray-900 mt-1">Laporan Bulanan</h1>
                        <p className="text-gray-500 mt-1">Rekap tagihan & kas per periode, siap diunduh (CSV / PDF).</p>
                    </div>
                    <div className="flex items-end gap-2 flex-wrap">
                        <div>
                            <label htmlFor="m" className="block text-xs text-gray-500 mb-1">Periode bulan</label>
                            <input id="m" type="month" value={month} onChange={(e) => setMonth(e.target.value)}
                                className="px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <button onClick={() => load(month)} disabled={loading}
                            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold">
                            Tampilkan
                        </button>
                        <button onClick={() => report && downloadCsv(report)} disabled={!report || loading}
                            className="px-5 py-2 rounded-xl bg-gray-800 hover:bg-gray-900 disabled:bg-gray-400 text-white font-semibold">
                            ⬇ Unduh CSV
                        </button>
                        <button onClick={() => report && downloadPdf(report)} disabled={!report || loading}
                            className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-semibold">
                            ⬇ Unduh PDF
                        </button>
                    </div>
                </div>

                {error && (<div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-200">{error}</div>)}

                {loading && !report ? (
                    <div className="bg-white rounded-xl border border-gray-200 p-10 animate-pulse"></div>
                ) : report ? (
                    <>
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                            <Card label={`Ditagih - ${monthTitle(report.month)}`} value={formatRupiah(report.billedAmount)} tone="gray" />
                            <Card label="Diterima (tercatat periode ini)" value={formatRupiah(report.collectedAmount)} tone="green" />
                            <Card label="Outstanding akhir periode" value={formatRupiah(report.outstandingEnd)} tone="blue" />
                            <Card label={`Lunas (${report.paidCount} tagihan)`} value={`${report.paidCount} / ${report.rows.length}`} tone="green" />
                            <Card label={`Telat (${report.overdueCount} tagihan)`} value={formatRupiah(report.overdueAmount)} tone="red" />
                            <Card label="Jumlah tagihan periode" value={`${report.rows.length}`} tone="gray" />
                        </div>

                        <p className="text-xs text-gray-400">
                            Catatan: &ldquo;Diterima&rdquo; = uang yang <span className="font-semibold">tercatat</span> pada periode ini (termasuk pelunasan bulan lalu),
                            sehingga bisa berbeda dari &ldquo;Ditagih&rdquo;. Itu normal secara pembukuan.
                        </p>

                        {report.rows.length === 0 ? (
                            <div className="bg-white p-10 rounded-xl border border-dashed border-gray-300 text-center text-gray-500">
                                Tidak ada tagihan pada periode ini.
                            </div>
                        ) : (
                            <div className="overflow-x-auto bg-white rounded-xl border border-gray-200 shadow-sm">
                                <table className="w-full text-left border-collapse text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-200 bg-gray-50 text-gray-600 uppercase tracking-wider">
                                            <th className="p-3 font-semibold">Penyewa</th>
                                            <th className="p-3 font-semibold">Kamar</th>
                                            <th className="p-3 font-semibold">Properti</th>
                                            <th className="p-3 font-semibold text-right">Ditagih</th>
                                            <th className="p-3 font-semibold text-right">Terbayar</th>
                                            <th className="p-3 font-semibold text-right">Sisa Pokok</th>
                                            <th className="p-3 font-semibold text-right">Denda</th>
                                            <th className="p-3 font-semibold text-right">Total Due</th>
                                            <th className="p-3 font-semibold">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {report.rows.map((r) => (
                                            <tr key={r.invoiceId} className="hover:bg-gray-50">
                                                <td className="p-3">
                                                    <p className="font-medium text-gray-900">{r.tenantName}</p>
                                                    <p className="text-xs text-gray-500 font-mono">{r.tenantPhone}</p>
                                                </td>
                                                <td className="p-3 text-gray-700">{r.unitNumber}</td>
                                                <td className="p-3 text-gray-500">{r.propertyName}</td>
                                                <td className="p-3 text-right font-mono">{formatRupiah(r.baseAmount - r.discount)}</td>
                                                <td className="p-3 text-right font-mono text-gray-600">{formatRupiah(r.paidAmount)}</td>
                                                <td className="p-3 text-right font-mono text-gray-900">{formatRupiah(sisaPokok(r))}</td>
                                                <td className="p-3 text-right font-mono text-red-600">{denda(r) > 0 ? formatRupiah(denda(r)) : "-"}</td>
                                                <td className="p-3 text-right font-mono text-gray-900">{formatRupiah(totalDue(r))}</td>
                                                <td className="p-3">
                                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${badge(r.effectiveStatus)}`}>{r.effectiveStatus}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                ) : null}
            </div>
        </main>
    );
}

function Card({ label, value, tone }: { label: string; value: string; tone: "blue" | "red" | "green" | "gray" }) {
    const toneCls =
        tone === "red" ? "text-red-600" :
            tone === "green" ? "text-green-700" :
                tone === "blue" ? "text-blue-700" : "text-gray-900";
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <p className="text-sm text-gray-500 mb-1">{label}</p>
            <p className={`text-xl font-bold ${toneCls}`}>{value}</p>
        </div>
    );
}