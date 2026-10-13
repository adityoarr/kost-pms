// src/lib/use-staff-guard.ts
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api";
import type { MeResponse } from "@/lib/use-auth-guard";

// Guard untuk area STAFF (/staff). Sumber kebenaran sama dengan owner: /auth/me.
// Owner yang nyasar -> /dashboard; tenant yang nyasar -> /tenant; selain terautentikasi -> /login.
export function useStaffGuard() {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    fetchApi<MeResponse>("/auth/me")
      .then((d) => {
        if (cancelled) return;
        const isStaff = d.roles.includes("ROLE_STAFF");
        const isOwner = d.roles.includes("ROLE_SUPERADMIN") || d.roles.includes("ROLE_ADMIN");
        if (isStaff) {
          setMe(d);
          setStatus("ok");
        } else {
          setStatus("error");
          router.replace(isOwner ? "/dashboard" : "/tenant");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatus("error");
          router.replace("/login");
        }
      });
    return () => { cancelled = true; };
  }, [router]);

  return { me, status };
}