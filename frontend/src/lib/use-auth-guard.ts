// src/lib/use-auth-guard.ts
"use client";

import { fetchApi } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export type MeResponse = { username: string; roles: string[] };

const OWNER_ROLES = ["ROLE_SUPERADMIN", "ROLE_ADMIN"];

// Guard untuk area OWNER. Sesi tenant yang nyasar akan dilempar ke /tenant.
export function useAuthGuard() {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    fetchApi<MeResponse>("/auth/me")
      .then((d) => {
        if (cancelled) return;
        const isOwner = d.roles.some((r) => OWNER_ROLES.includes(r));
        if (isOwner) {
          setMe(d);
          setStatus("ok");
        } else {
          setStatus("error");
          router.replace("/tenant");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatus("error");
          router.replace("/login");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  return { me, status };
}