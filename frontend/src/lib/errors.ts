// src/lib/errors.ts
export async function readError(res: Response): Promise<string> {
    try {
        const data = await res.json();
        if (data && typeof data.error === "string") return data.error;
        if (data && typeof data.message === "string") return data.message;
    } catch {
        /* body bukan JSON, abaikan */
    }
    if (res.status === 400) return "Data belum lengkap atau formatnya salah. Periksa lagi.";
    if (res.status === 401) return "Sesi Anda habis. Silakan masuk ulang.";
    if (res.status === 403) return "Anda tidak punya izin untuk aksi ini.";
    if (res.status === 404) return "Data tidak ditemukan.";
    return "Terjadi kesalahan pada server. Coba lagi sebentar.";
}