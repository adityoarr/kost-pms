// src/lib/use-guest-guard.ts
"use client";

import { fetchApi } from "@/lib/api";
import type { MeResponse } from "@/lib/use-auth-guard";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// Guard untuk halaman login (owner maupun tenant):
// kalau sudah punya sesi, lempar ke rumah masing-masing.
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
          const isTenant = d.roles.includes("ROLE_TENANT");
          router.replace(isTenant ? "/tenant" : "/dashboard");
        })
        .catch(() => {
          if (!cancelled) setStatus("guest");
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