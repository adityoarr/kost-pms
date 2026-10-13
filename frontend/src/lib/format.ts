// src/lib/format.ts
export function formatRupiah(n: number): string {
    return "Rp " + new Intl.NumberFormat("id-ID").format(n);
}

export function formatDate(iso: string | null | undefined): string {
    if (!iso) return "-";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}