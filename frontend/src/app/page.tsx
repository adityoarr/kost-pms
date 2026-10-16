import ApiStatusCard from "@/components/api-status-card";
import CurrentYear from "@/components/current-year";
import { Suspense } from "react";

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gray-50 px-5 py-12 text-gray-900 sm:px-8">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-gradient-to-b from-blue-100/70 via-indigo-50/50 to-transparent" />
      <div className="relative w-full max-w-5xl">
        <header className="mb-8 flex items-center justify-between gap-4">
          <a href="/" className="flex items-center gap-3 font-semibold tracking-tight text-gray-900 no-underline">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-lg font-bold text-white shadow-md shadow-blue-900/15">K</span>
            <span className="text-lg">Kost<span className="text-blue-600">PMS</span><span className="ml-2 hidden rounded-full border border-gray-200 bg-white px-2 py-1 align-middle text-[10px] font-semibold uppercase tracking-widest text-gray-500 sm:inline-block">Workspace</span></span>
          </a>
          <span className="hidden items-center gap-2 text-sm text-gray-500 sm:flex">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Property management, made clearer
          </span>
        </header>

        <section className="grid overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-lg md:grid-cols-[1.1fr_.9fr]">
          <div className="flex flex-col justify-center p-6 sm:p-10 lg:p-12">
            <span className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold tracking-wide text-blue-700">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
              SISTEM PENGELOLAAN KOST
            </span>
            <h1 className="max-w-xl text-3xl font-bold leading-tight tracking-tight text-gray-900 sm:text-4xl lg:text-5xl">
              Kelola hunian lebih <span className="text-blue-600">teratur.</span>
            </h1>
            <p className="mt-4 max-w-lg text-base leading-7 text-gray-500 sm:text-lg">
              Pantau properti, penyewa, kontrak, tagihan, dan laporan dalam satu ruang kerja yang praktis.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <a href="/login" className="group flex min-h-14 items-center justify-between rounded-xl bg-blue-600 px-5 py-4 font-semibold text-white no-underline shadow-md shadow-blue-900/10 hover:bg-blue-700">
                <span><span className="block text-base">Masuk Pengelola</span><span className="mt-0.5 block text-xs font-normal text-blue-100">Dashboard operasional</span></span>
                <span aria-hidden="true" className="text-xl transition-transform group-hover:translate-x-1">→</span>
              </a>
              <a href="/tenant/login" className="group flex min-h-14 items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4 font-semibold text-gray-800 no-underline hover:border-blue-200 hover:bg-blue-50/50">
                <span><span className="block text-base">Portal Penyewa</span><span className="mt-0.5 block text-xs font-normal text-gray-500">Tagihan & kontrak hunian</span></span>
                <span aria-hidden="true" className="text-xl text-blue-600 transition-transform group-hover:translate-x-1">→</span>
              </a>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-3 border-t border-gray-100 pt-6">
              <div><p className="text-sm font-semibold text-gray-800">Properti</p><p className="mt-1 text-xs text-gray-500">Kelola unit</p></div>
              <div><p className="text-sm font-semibold text-gray-800">Keuangan</p><p className="mt-1 text-xs text-gray-500">Tagihan & bayar</p></div>
              <div><p className="text-sm font-semibold text-gray-800">Laporan</p><p className="mt-1 text-xs text-gray-500">Pantau kinerja</p></div>
            </div>
          </div>

          <div className="flex flex-col justify-center border-t border-gray-100 bg-slate-50/80 p-6 sm:p-8 md:border-l md:border-t-0 lg:p-10">
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-[.16em] text-gray-400">System status</p>
              <h2 className="mt-2 text-xl font-semibold text-gray-900">Koneksi layanan</h2>
              <p className="mt-1 text-sm text-gray-500">Status koneksi API ditampilkan di bawah ini.</p>
            </div>
            <Suspense
              fallback={
                <div className="animate-pulse rounded-2xl border border-gray-200 bg-white p-6">
                  <div className="h-3 w-28 rounded bg-gray-200" />
                  <div className="mt-4 h-5 w-40 rounded bg-gray-200" />
                  <div className="mt-3 h-3 w-full rounded bg-gray-100" />
                </div>
              }
            >
              <ApiStatusCard />
            </Suspense>
            <p className="mt-5 text-xs leading-5 text-gray-400">Akses menggunakan akun yang sudah terdaftar. Jika mengalami kendala, hubungi administrator sistem.</p>
          </div>
        </section>

        <footer className="mt-6 flex flex-col items-center justify-between gap-2 text-xs text-gray-400 sm:flex-row">
          <span>© <CurrentYear /> Kost PMS</span>
          <span>Simple, clear, and focused on daily operations.</span>
        </footer>
      </div>
    </main>
  );
}
