"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api";
import type { MeResponse } from "@/lib/use-auth-guard";

export function useGuestGuard() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "authenticated" | "guest">(
    "loading"
  );

  useEffect(() => {
    let cancelled = false;

    const check = () => {
      fetchApi<MeResponse>("/auth/me")
        .then(() => {
          if (cancelled) return;
          setStatus("authenticated");
          router.replace("/dashboard");
        })
        .catch(() => {
          if (!cancelled) setStatus("guest");
        });
    };

    check();

    // Jaring pengaman: kalau browser nekat menyimpan "foto" halaman (bfcache),
    // saat back kita paksa ganti foto form dengan spinner, lalu cek ulang sesi.
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