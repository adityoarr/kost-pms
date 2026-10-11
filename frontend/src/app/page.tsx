import { Suspense } from "react";
import ApiStatusCard from "@/components/api-status-card";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-50 text-gray-900">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-lg border border-gray-200">
        <h1 className="text-3xl font-bold mb-2 text-center">Sistem PMS Kost</h1>
        <p className="text-center text-gray-500 mb-8">Frontend Next.js berhasil dibuat!</p>

        <Suspense
          fallback={
            <div className="bg-gray-100 p-6 rounded-xl border border-gray-200 animate-pulse">
              <p className="text-gray-500">Memeriksa koneksi API...</p>
            </div>
          }
        >
          <ApiStatusCard />
        </Suspense>
      </div>
    </main>
  );
}