"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api";
// Kita pakai tipe yang SUDAH ada di use-auth-guard (dashboard tidak diubah).
import type { MeResponse } from "@/lib/use-auth-guard";

// Penjaga untuk halaman "khusus tamu" (login, dll).
// Kebalikan dari useAuthGuard: kalau ternyata SUDAH login -> usir ke dashboard.
export function useGuestGuard() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "authenticated" | "guest">(
    "loading"
  );

  useEffect(() => {
    let cancelled = false;
    fetchApi<MeResponse>("/auth/me")
      .then(() => {
        if (cancelled) return;
        setStatus("authenticated");
        router.replace("/dashboard"); // sudah punya sesi -> tidak perlu lihat form login
      })
      .catch(() => {
        if (!cancelled) setStatus("guest"); // belum login -> silakan isi form
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  return { status };
}