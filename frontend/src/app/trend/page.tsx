// src/app/trend/page.tsx
"use client";

import { fetchApi } from "@/lib/api";
import { formatRupiah } from "@/lib/format";
import { isOwnerRole } from "@/lib/roles";
import { useAuthGuard } from "@/lib/use-auth-guard";
import { useEffect, useState } from "react";
import {
    Bar,
    CartesianGrid,
    ComposedChart,
    Legend,
    Line,
    ResponsiveContainer,
    Tooltip,
    XAxis, YAxis,
} from "recharts";

type MonthPoint = { month: string; billed: number; collected: number; occupied: number };

function monthShort(iso: string): string {
    const d = new Date(iso + "-01T00:00:00");
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("id-ID", { month: "short", year: "2-digit" });
}

export default function TrendPage() {
    const { me, status: authStatus } = useAuthGuard();
    const [months, setMonths] = useState(6);
    const [data, setData] = useState<MonthPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const allowed = !!me && isOwnerRole(me.roles);

    function load(n: number) {
        setLoading(true);
        setError("");
        fetchApi<{ months: MonthPoint[] }>(`/reports/trend?months=${n}`)
            .then((d) => setData(d.months))
            .catch(() => setError("Gagal memuat tren."))
            .finally(() => setLoading(false));
    }

    useEffect(() => {
        if (authStatus === "ok" && allowed) load(months);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authStatus, allowed, months]);

    if (authStatus === "loading") {
        return (<main className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-pulse text-gray-500">Memeriksa sesi...</div></main>);
    }
    if (authStatus === "error" || !me) return null;
    if (!allowed) {
        return (
            <main className="min-h-screen bg-gray-50 p-6">
                <div className="max-w-2xl mx-auto p-6 bg-amber-50 text-amber-800 rounded-xl border border-amber-200">
                    <p className="font-semibold">Tren hanya untuk pemilik (SUPERADMIN/ADMIN).</p>
                    <a href="/dashboard" className="underline text-blue-600 mt-2 inline-block">← Kembali</a>
                </div>
            </main>
        );
    }

    const chartData = data.map((m) => ({ ...m, name: monthShort(m.month) }));

    return (
        <main className="min-h-screen bg-gray-50 p-6 md:p-10">
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                    <div>
                        <a href="/dashboard" className="text-sm text-blue-600 hover:underline">← Dashboard</a>
                        <h1 className="text-3xl font-bold text-gray-900 mt-1">Tren Multi-Bulan</h1>
                        <p className="text-gray-500 mt-1">Ditagih vs kas masuk vs kamar terisi, beberapa bulan terakhir.</p>
                    </div>
                    <div className="flex items-end gap-2">
                        <label className="text-xs text-gray-500 mb-1 block">Rentang</label>
                        <select value={months} onChange={(e) => setMonths(Number(e.target.value))}
                            className="px-4 py-2 rounded-xl border border-gray-300 bg-white text-base focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value={3}>3 bulan</option>
                            <option value={6}>6 bulan</option>
                            <option value={12}>12 bulan</option>
                        </select>
                    </div>
                </div>

                {error && (<div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-200">{error}</div>)}

                {loading ? (
                    <div className="bg-white rounded-xl border border-gray-200 p-10 animate-pulse"></div>
                ) : (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                        <ResponsiveContainer width="100%" height={340}>
                            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis yAxisId="left" tickFormatter={(v) => `${Number(v) / 1000}k`} />
                                <YAxis yAxisId="right" orientation="right" allowDecimals={false} />
                                <Tooltip
                                    formatter={(value: any, name: any) =>
                                        name === "Kamar terisi"
                                            ? [value, name]
                                            : [formatRupiah(Number(value)), name]
                                    }
                                />
                                <Legend />
                                <Bar yAxisId="left" dataKey="billed" name="Ditagih" fill="#9ca3af" radius={[4, 4, 0, 0]} />
                                <Bar yAxisId="left" dataKey="collected" name="Diterima" fill="#16a34a" radius={[4, 4, 0, 0]} />
                                <Line yAxisId="right" type="monotone" dataKey="occupied" name="Kamar terisi" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
                            </ComposedChart>
                        </ResponsiveContainer>
                        <p className="text-xs text-gray-400 mt-3">
                            Sumbu kiri = rupiah (Ditagih & Diterima). Sumbu kanan = jumlah kamar terisi.
                            &ldquo;Diterima&rdquo; = kas yang tercatat pada bulan tersebut (termasuk pelunasan tagihan bulan lain).
                        </p>
                    </div>
                )}
            </div>
        </main>
    );
}