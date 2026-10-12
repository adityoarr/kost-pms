// src/app/properties/page.tsx
"use client";

import PropertyCard from "@/components/property-card";
import PropertyFormModal from "@/components/property-form-modal";
import { fetchApi } from "@/lib/api";
import { useAuthGuard } from "@/lib/use-auth-guard";
import { useEffect, useState } from "react";

export default function PropertiesPage() {
    const { status: authStatus } = useAuthGuard();
    const [properties, setProperties] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const [successMsg, setSuccessMsg] = useState("");

    function loadData() {
        setLoading(true);
        setError("");
        fetchApi<any[]>("/properties")
            .then((data) => setProperties(data))
            .catch(() => setError("Gagal memuat data properti."))
            .finally(() => setLoading(false));
    }

    useEffect(() => {
        if (authStatus === "ok") loadData();
    }, [authStatus]);

    // Auto-hilangkan banner sukses setelah 4 detik.
    useEffect(() => {
        if (!successMsg) return;
        const t = setTimeout(() => setSuccessMsg(""), 4000);
        return () => clearTimeout(t);
    }, [successMsg]);

    if (authStatus === "loading") {
        return (
            <main className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-pulse text-gray-500">Memeriksa sesi...</div>
            </main>
        );
    }
    if (authStatus === "error") return null;

    return (
        <main className="min-h-screen bg-gray-50 p-6 md:p-10">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Properti Saya</h1>
                        <p className="text-gray-500 mt-1">Kelola kost dan unit hunian Anda.</p>
                    </div>
                    <button
                        onClick={() => setModalOpen(true)}
                        className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors shadow-sm"
                    >
                        + Tambah Properti
                    </button>
                </div>

                {successMsg && (
                    <div className="mb-6 p-4 rounded-xl bg-green-50 text-green-800 border border-green-200 font-medium">
                        {successMsg}
                    </div>
                )}

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-40 bg-white rounded-xl animate-pulse border border-gray-200"></div>
                        ))}
                    </div>
                ) : error ? (
                    <div className="p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>
                ) : properties.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
                        <p className="text-gray-500 text-lg">Belum ada properti terdaftar.</p>
                        <p className="text-gray-400 text-sm mt-2">
                            Klik <span className="font-semibold">&ldquo;+ Tambah Properti&rdquo;</span> di atas untuk mulai.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {properties.map((prop) => (
                            <PropertyCard key={prop.id} property={prop} />
                        ))}
                    </div>
                )}
            </div>

            {modalOpen && (
                <PropertyFormModal
                    mode="create"
                    onClose={() => setModalOpen(false)}
                    onSaved={(msg) => {
                        setSuccessMsg(msg);
                        loadData();
                    }}
                />
            )}
        </main>
    );
}