"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api";

export type MeResponse = {
  username: string;
  roles: string[];
};

export function useAuthGuard() {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    fetchApi<MeResponse>("/auth/me")
      .then((data) => {
        if (!cancelled) {
          setMe(data);
          setStatus("ok");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatus("error");
          router.replace("/login"); // belum login / sesi habis -> usir ke login
        }
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  return { me, status };
}