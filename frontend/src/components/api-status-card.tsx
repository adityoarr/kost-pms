import { fetchApi } from "@/lib/api";

type ApiInfo = {
  app: string;
  version: string;
  status: string;
};

export default async function ApiStatusCard() {
  let apiData: ApiInfo | null = null;
  let errorMessage = "";

  try {
    apiData = await fetchApi<ApiInfo>("/");
  } catch (error: any) {
    errorMessage = error?.message || "Tidak bisa menghubungi server.";
  }

  if (!apiData) {
    return (
      <div className="bg-gray-100 p-6 rounded-xl border border-gray-200">
        <h2 className="text-xl font-semibold mb-3 text-red-600">
          Status Koneksi API: Gagal ❌
        </h2>
        <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm">
          <p className="font-semibold">Pesan Error:</p>
          <p>{errorMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 p-6 rounded-xl border border-gray-200">
      <h2 className="text-xl font-semibold mb-3 text-green-700">
        Status Koneksi API: Terhubung ✅
      </h2>
      <p className="text-sm text-gray-600 mb-2">Data dari Spring Boot:</p>
      <pre className="p-4 bg-gray-900 text-green-400 rounded-lg text-sm overflow-x-auto">
        {JSON.stringify(apiData, null, 2)}
      </pre>
    </div>
  );
}