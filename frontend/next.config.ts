import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // FIX B2: halaman reset/lupa password tenant ada di /tenants/*, sementara link di
  // halaman login tenant & email backend memakai /tenant/*. Query string (?token=) ikut diteruskan.
  async redirects() {
    return [
      { source: "/tenant/forgot-password", destination: "/tenants/forgot-password", permanent: false },
      { source: "/tenant/reset-password", destination: "/tenants/reset-password", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: "/login",
        headers: [
          { key: "Cache-Control", value: "no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;