// src/app/properties/[id]/page.tsx
"use client";

import PropertyFormModal from "@/components/property-form-modal";
import UnitFormModal from "@/components/unit-form-modal";
import { fetchApi } from "@/lib/api";
import { isOwnerRole } from "@/lib/roles";
import { useAuthGuard } from "@/lib/use-auth-guard";
import { useParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "https://api.adityoarr.com/kost/v1";

// ===== KULIT LUAR: hanya menyediakan Suspense + fallback =====
// Next.js boleh "memotret" bagian ini di depan, karena tak membaca URL.
export default function PropertyDetailPage() {
    return (
        <Suspense fallback={<PageSkeleton />}>
            <PropertyDetailContent />
        </Suspense>
    );
}

// ===== FALLBACK: papan "sedang dimasak" saat data URL belum siap =====
function PageSkeleton() {
    return (
        <main className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="animate-pulse text-gray-500">Memuat data...</div>
        </main>
    );
}

// ===== ISI: semua logika + useParams() hidup DI DALAM Suspense =====
function PropertyDetailContent() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const { me, status: authStatus } = useAuthGuard();
    const [property, setProperty] = useState<any | null>(null);
    const [units, setUnits] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    const [propModalOpen, setPropModalOpen] = useState(false);
    const [unitModalOpen, setUnitModalOpen] = useState(false);
    const [unitEditing, setUnitEditing] = useState<any | null>(null);

    const canEditProperties = !!me && isOwnerRole(me.roles);

    function loadData() {
        setLoading(true);
        setError("");
        Promise.all([fetchApi(`/properties/${id}`), fetchApi(`/properties/${id}/units`)])
            .then(([propData, unitsData]) => {
                setProperty(propData as any);
                setUnits(unitsData as any[]);
            })
            .catch(() => setError("Gagal memuat detail properti."))
            .finally(() => setLoading(false));
    }

    useEffect(() => {
        if (authStatus === "ok" && id) loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authStatus, id]);

    useEffect(() => {
        if (!successMsg) return;
        const t = setTimeout(() => setSuccessMsg(""), 4000);
        return () => clearTimeout(t);
    }, [successMsg]);

    async function handleDeactivateProperty() {
        if (
            !window.confirm(
                "Yakin ingin menonaktifkan properti ini?\nData tidak dihapus permanen, hanya ditandai nonaktif."
            )
        ) {
            return;
        }
        try {
            const res = await fetch(`${API_BASE_URL}/properties/${id}`, {
                method: "DELETE",
                credentials: "include",
            });
            if (res.ok) {
                router.replace("/properties");
            } else {
                alert("Gagal menonaktifkan properti. Coba lagi.");
            }
        } catch {
            alert("Tidak bisa menghubungi server.");
        }
    }

    async function handleDeleteUnit(unitId: string, unitNumber: string) {
        if (!window.confirm(`Yakin ingin menghapus kamar ${unitNumber}?\nTindakan ini permanen.`)) {
            return;
        }
        try {
            const res = await fetch(`${API_BASE_URL}/units/${unitId}`, {
                method: "DELETE",
                credentials: "include",
            });
            if (res.ok) {
                setSuccessMsg(`Kamar ${unitNumber} dihapus ✅`);
                loadData();
            } else {
                alert("Gagal menghapus kamar. Mungkin kamar masih terhubung ke data lain.");
            }
        } catch {
            alert("Tidak bisa menghubungi server.");
        }
    }

    if (authStatus === "loading" || loading) {
        return (
            <main className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-pulse text-gray-500">Memuat data...</div>
            </main>
        );
    }
    if (authStatus === "error") return null;

    if (error || !property) {
        return (
            <main className="min-h-screen bg-gray-50 p-6">
                <div className="max-w-4xl mx-auto p-6 bg-red-50 text-red-700 rounded-xl border border-red-200">
                    <h2 className="font-bold text-xl mb-2">Terjadi Kesalahan</h2>
                    <p>{error || "Properti tidak ditemukan."}</p>
                    <button onClick={() => router.push("/properties")} className="mt-4 underline text-blue-600">
                        Kembali ke Daftar
                    </button>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-gray-50 p-6 md:p-10">
            <div className="max-w-6xl mx-auto space-y-8">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors"
                >
                    ← Kembali ke Daftar Properti
                </button>

                {successMsg && (
                    <div className="p-4 rounded-xl bg-green-50 text-green-800 border border-green-200 font-medium">
                        {successMsg}
                    </div>
                )}

                {/* Header Properti + Aksi */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">{property.name}</h1>
                            <p className="text-gray-600 mt-2">
                                📍 {property.address}, {property.city}
                                {property.province ? `, ${property.province}` : ""}
                            </p>
                            {property.phone && <p className="text-gray-500 mt-1">📞 {property.phone}</p>}
                        </div>
                        <div className="flex flex-col items-start sm:items-end gap-3">
                            <span
                                className={`px-3 py-1 rounded-full text-sm font-semibold ${property.status === "ACTIVE"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                                    }`}
                            >
                                {property.status}
                            </span>
                            <div className="flex gap-2">
                                {canEditProperties && (
                                    <button
                                        onClick={() => setPropModalOpen(true)}
                                        className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-colors"
                                    >
                                        ✏️ Edit
                                    </button>
                                )}
                                {canEditProperties && property.status === "ACTIVE" && (
                                    <button
                                        onClick={handleDeactivateProperty}
                                        className="px-4 py-2 rounded-lg bg-red-50 text-red-600 font-medium hover:bg-red-100 border border-red-200 transition-colors"
                                    >
                                        Nonaktifkan
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Daftar Kamar */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold text-gray-900">Daftar Kamar ({units.length})</h2>
                        <button
                            onClick={() => {
                                setUnitEditing(null);
                                setUnitModalOpen(true);
                            }}
                            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
                        >
                            + Tambah Kamar
                        </button>
                    </div>

                    {units.length === 0 ? (
                        <div className="bg-white p-10 rounded-xl border border-dashed border-gray-300 text-center">
                            <p className="text-gray-500">Belum ada kamar. Klik &ldquo;+ Tambah Kamar&rdquo; untuk mulai.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto bg-white rounded-xl border border-gray-200 shadow-sm">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-gray-200 bg-gray-50 text-gray-600 text-sm uppercase tracking-wider">
                                        <th className="p-4 font-semibold">No. Kamar</th>
                                        <th className="p-4 font-semibold">Tipe</th>
                                        <th className="p-4 font-semibold">Kapasitas</th>
                                        <th className="p-4 font-semibold">Tarif/Bulan</th>
                                        <th className="p-4 font-semibold">Fasilitas</th>
                                        <th className="p-4 font-semibold">Status</th>
                                        <th className="p-4 font-semibold text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {units.map((unit) => (
                                        <tr key={unit.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="p-4 font-medium text-gray-900">{unit.unitNumber}</td>
                                            <td className="p-4 text-gray-600">{unit.unitType}</td>
                                            <td className="p-4 text-gray-600">{unit.capacity} Orang</td>
                                            <td className="p-4 font-mono text-gray-900">
                                                Rp {new Intl.NumberFormat("id-ID").format(unit.monthlyRate)}
                                            </td>
                                            <td
                                                className="p-4 text-gray-600 text-sm max-w-xs truncate"
                                                title={(unit.facilities ?? []).join(", ")}
                                            >
                                                {(unit.facilities ?? []).join(", ") || "-"}
                                            </td>
                                            <td className="p-4">
                                                <span
                                                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                                                        unit.status
                                                    )}`}
                                                >
                                                    {unit.status}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right whitespace-nowrap">
                                                <button
                                                    onClick={() => {
                                                        setUnitEditing(unit);
                                                        setUnitModalOpen(true);
                                                    }}
                                                    className="px-3 py-1 rounded-lg text-blue-600 hover:bg-blue-50 font-medium text-sm"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteUnit(unit.id, unit.unitNumber)}
                                                    className="ml-1 px-3 py-1 rounded-lg text-red-600 hover:bg-red-50 font-medium text-sm"
                                                >
                                                    Hapus
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {propModalOpen && (
                <PropertyFormModal
                    mode="edit"
                    initialData={property}
                    onClose={() => setPropModalOpen(false)}
                    onSaved={(msg) => {
                        setSuccessMsg(msg);
                        loadData();
                    }}
                />
            )}

            {unitModalOpen && (
                <UnitFormModal
                    mode={unitEditing ? "edit" : "create"}
                    propertyId={id}
                    initialData={unitEditing ?? undefined}
                    onClose={() => {
                        setUnitModalOpen(false);
                        setUnitEditing(null);
                    }}
                    onSaved={(msg) => {
                        setSuccessMsg(msg);
                        loadData();
                    }}
                />
            )}
        </main>
    );
}

function getStatusColor(status: string) {
    switch (status) {
        case "VACANT":
            return "bg-blue-100 text-blue-800";
        case "OCCUPIED":
            return "bg-purple-100 text-purple-800";
        case "MAINTENANCE":
            return "bg-yellow-100 text-yellow-800";
        case "BLOCKED":
            return "bg-red-100 text-red-800";
        default:
            return "bg-gray-100 text-gray-800";
    }
}