// src/lib/use-tenant-guard.ts
"use client";

import { fetchApi } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export type TenantMe = { tenantId: string; name: string; phone: string; role: string };

export function useTenantGuard() {
    const router = useRouter();
    const [me, setMe] = useState<TenantMe | null>(null);
    const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");

    useEffect(() => {
        let cancelled = false;
        fetchApi<TenantMe>("/tenant-auth/me")
            .then((d) => {
                if (!cancelled) {
                    setMe(d);
                    setStatus("ok");
                }
            })
            .catch(async () => {
                if (cancelled) return;
                setStatus("error");
                // Buang sesi yang inkonsisten (cookie masih ada tapi tenant sudah
                // tidak aktif / sesi basi) supaya tidak terjadi redirect loop.
                try {
                    await fetchApi("/tenant-auth/logout", { method: "POST" });
                } catch {
                    // diabaikan: yang penting kita pindah ke form login
                }
                router.replace("/tenant/login");
            });
        return () => {
            cancelled = true;
        };
    }, [router]);

    return { me, status };
}