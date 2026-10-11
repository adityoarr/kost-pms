// Alamat dasar API kost kita (bisa diubah lewat .env nanti)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.adityoarr.com/kost/v1";

export async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    credentials: 'include', // Penting: Mengirim cookie/session nanti saat login OTP
  });
  
  if (!res.ok) {
    throw new Error(`API Error: ${res.status} - ${res.statusText}`);
  }
  
  return res.json();
}