// src/components/list-controls.tsx
"use client";

import { useMemo, useState } from "react";

export type ListControls<T> = {
    query: string;
    setQuery: (s: string) => void;
    page: number;
    setPage: (n: number) => void;
    pageCount: number;
    total: number;
    view: T[];
};

type Opts<T> = {
    searchKeys: Array<keyof T | ((item: T) => string)>;
    pageSize?: number;
};

function extract<T>(item: T, key: keyof T | ((item: T) => string)): string {
    if (typeof key === "function") return String(key(item) ?? "");
    return String((item as any)[key] ?? "");
}

// Cari + paginasi atas array yang SUDAH difilter (komposisi: filter status dulu, lalu search).
export function useListControls<T>(items: T[], { searchKeys, pageSize = 10 }: Opts<T>): ListControls<T> {
    const [query, setQueryRaw] = useState("");
    const [page, setPageRaw] = useState(1);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return items;
        return items.filter((it) =>
            // eslint-disable-next-line react-hooks/exhaustive-deps
            searchKeys.some((k) => extract(it, k).toLowerCase().includes(q))
        );
    }, [items, query]);

    const total = filtered.length;
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, pageCount);
    const view = useMemo(
        () => filtered.slice((safePage - 1) * pageSize, safePage * pageSize),
        [filtered, safePage, pageSize]
    );

    function setQuery(s: string) { setQueryRaw(s); setPageRaw(1); }
    function setPage(n: number) { setPageRaw(Math.min(Math.max(1, n), pageCount)); }

    return { query, setQuery, page: safePage, setPage, pageCount, total, view };
}

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (s: string) => void; placeholder?: string }) {
    return (
        <input
            type="search"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder ?? "Cari…"}
            className="w-full sm:w-72 px-4 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
        />
    );
}

export function Pagination({ page, pageCount, onChange, total }: { page: number; pageCount: number; onChange: (n: number) => void; total?: number }) {
    if (pageCount <= 1) {
        return total != null ? <p className="text-xs text-gray-400">{total} data</p> : null;
    }
    return (
        <div className="flex items-center gap-3">
            {total != null && <span className="text-xs text-gray-400">{total} data</span>}
            <button onClick={() => onChange(page - 1)} disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium disabled:opacity-40 hover:bg-gray-50">← Prev</button>
            <span className="text-sm text-gray-600">Hal {page} / {pageCount}</span>
            <button onClick={() => onChange(page + 1)} disabled={page >= pageCount}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium disabled:opacity-40 hover:bg-gray-50">Next →</button>
        </div>
    );
}