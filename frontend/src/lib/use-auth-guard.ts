// src/lib/use-auth-guard.ts
"use client";

import { fetchApi } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export type MeResponse = { username: string; roles: string[] };

// Satu sumber kebenaran untuk realm owner+staff: /auth/me.
// Tenant TIDAK dipetakan di sini (realm-nya /tenant-auth/me) — tapi kalau
// /auth/me kebetulan mengembalikan ROLE_TENANT, kita tetap arahkan ke /tenant
// agar tidak ada sesi yang "nyangkut" tanpa rumah.
function realmOf(roles: string[]): "owner" | "staff" | "tenant" {
  if (roles.includes("ROLE_SUPERADMIN") || roles.includes("ROLE_ADMIN")) return "owner";
  if (roles.includes("ROLE_STAFF")) return "staff";
  return "tenant";
}

// Guard untuk area OWNER (/dashboard, /properties, /tenants, dst).
// FIX B4: opsi allowStaff agar halaman operasional (tiket, tagihan, penyewa, kontrak)
// yang memang diizinkan backend untuk STAFF tidak mengusir staf kembali ke /staff.
export function useAuthGuard(options: { allowStaff?: boolean } = {}) {
  const allowStaff = options.allowStaff ?? false;
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    fetchApi<MeResponse>("/auth/me")
      .then((d) => {
        if (cancelled) return;
        const realm = realmOf(d.roles);
        if (realm === "owner" || (allowStaff && realm === "staff")) {
          setMe(d);
          setStatus("ok");
        } else {
          // staff -> rumah kerja staff; tenant -> rumah tenant. Bukan /tenant buta.
          setStatus("error");
          router.replace(realm === "staff" ? "/staff" : "/tenant");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatus("error");
          router.replace("/login");
        }
      });
    return () => { cancelled = true; };
  }, [router, allowStaff]);

  return { me, status };
}