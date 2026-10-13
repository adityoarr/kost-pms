// src/lib/use-guest-guard.ts
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api";
import type { MeResponse } from "@/lib/use-auth-guard";

// Guard halaman /login: kalau sudah ada sesi, lempar ke rumah realm-nya.
export function useGuestGuard() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "authenticated" | "guest">("loading");

  useEffect(() => {
    let cancelled = false;

    const check = () => {
      fetchApi<MeResponse>("/auth/me")
        .then((d) => {
          if (cancelled) return;
          setStatus("authenticated");
          const roles = d.roles;
          if (roles.includes("ROLE_SUPERADMIN") || roles.includes("ROLE_ADMIN")) router.replace("/dashboard");
          else if (roles.includes("ROLE_STAFF")) router.replace("/staff");
          else router.replace("/tenant");
        })
        .catch(() => {
          if (!cancelled) setStatus("guest");
        });
    };

    check();

    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) { setStatus("loading"); check(); }
    };
    window.addEventListener("pageshow", onPageShow);

    return () => {
      cancelled = true;
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [router]);

  return { status };
}