import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite ships WASM + data assets that must be loaded from node_modules at
  // runtime, not bundled by next build (server-side usage only).
  serverExternalPackages: ["@electric-sql/pglite"],
  experimental: {
    serverActions: {
      // Brief PDF ≤ 5 Mo en FormData (limite par défaut : 1 Mo).
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
