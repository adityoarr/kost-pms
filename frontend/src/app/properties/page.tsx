// src/app/properties/page.tsx
"use client";

import { Pagination, SearchBox, useListControls } from "@/components/list-controls";
import PropertyCard from "@/components/property-card";
import PropertyFormModal from "@/components/property-form-modal";
import { fetchApi } from "@/lib/api";
import { isOwnerRole } from "@/lib/roles";
import { useAuthGuard } from "@/lib/use-auth-guard";
import { useEffect, useState } from "react";

export default function PropertiesPage() {
    const { me, status: authStatus } = useAuthGuard();
    const [properties, setProperties] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const [successMsg, setSuccessMsg] = useState("");

    const canEditProperties = !!me && isOwnerRole(me.roles);
    const { query, setQuery, page, setPage, pageCount, total, view } = useListControls(properties, {
        searchKeys: ["name", "address", "city"],
        pageSize: 9,
    });

    function loadData() {
        setLoading(true);
        setError("");
        fetchApi<any[]>("/properties")
            .then((data) => setProperties(data))
            .catch(() => setError("Gagal memuat data properti."))
            .finally(() => setLoading(false));
    }

    useEffect(() => { if (authStatus === "ok") loadData(); }, [authStatus]);
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
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <div>
                        <a href="/dashboard" className="text-sm text-blue-600 hover:underline">← Dashboard</a>
                        <h1 className="text-3xl font-bold text-gray-900 mt-1">Properti Saya</h1>
                        <p className="text-gray-500 mt-1">Kelola kost dan unit hunian Anda.</p>
                    </div>
                    {canEditProperties && (
                        <button
                            onClick={() => setModalOpen(true)}
                            className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors shadow-sm"
                        >
                            + Tambah Properti
                        </button>
                    )}
                </div>

                {successMsg && (
                    <div className="mb-6 p-4 rounded-xl bg-green-50 text-green-800 border border-green-200 font-medium">
                        {successMsg}
                    </div>
                )}

                <div className="mb-4">
                    <SearchBox value={query} onChange={setQuery} placeholder="Cari nama / alamat / kota…" />
                </div>

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
                        {canEditProperties && (
                            <p className="text-gray-400 text-sm mt-2">
                                Klik <span className="font-semibold">&ldquo;+ Tambah Properti&rdquo;</span> di atas untuk mulai.
                            </p>
                        )}
                    </div>
                ) : (
                    <>
                        {view.length === 0 ? (
                            <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
                                <p className="text-gray-500 text-lg">Tidak ada hasil untuk &ldquo;{query}&rdquo;.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {view.map((prop) => (
                                    <PropertyCard key={prop.id} property={prop} />
                                ))}
                            </div>
                        )}
                        <div className="mt-6 flex justify-end">
                            <Pagination page={page} pageCount={pageCount} onChange={setPage} total={total} />
                        </div>
                    </>
                )}
            </div>

            {modalOpen && canEditProperties && (
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