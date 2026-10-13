// src/lib/use-tenant-guest-guard.ts
"use client";

import { fetchApi } from "@/lib/api";
import type { TenantMe } from "@/lib/use-tenant-guard";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// Guard khusus halaman /tenant/login.
// Sumber kebenaran TUNGGAL: /tenant-auth/me (bukan /auth/me).
// Kalau sesi tenant valid -> ke /tenant. Kalau tidak -> tampilkan form (guest).
// Dengan satu sumber, tidak ada dua jawaban yang bisa saling bertentangan
// dan menyebabkan redirect loop.
export function useTenantGuestGuard() {
    const router = useRouter();
    const [status, setStatus] = useState<"loading" | "authenticated" | "guest">("loading");

    useEffect(() => {
        let cancelled = false;

        const check = () => {
            fetchApi<TenantMe>("/tenant-auth/me")
                .then(() => {
                    if (cancelled) return;
                    setStatus("authenticated");
                    router.replace("/tenant");
                })
                .catch(() => {
                    if (cancelled) return;
                    setStatus("guest");
                });
        };

        check();

        const onPageShow = (event: PageTransitionEvent) => {
            if (event.persisted) {
                setStatus("loading");
                check();
            }
        };
        window.addEventListener("pageshow", onPageShow);

        return () => {
            cancelled = true;
            window.removeEventListener("pageshow", onPageShow);
        };
    }, [router]);

    return { status };
}