import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite ships WASM + data assets that must be loaded from node_modules at
  // runtime, not bundled by next build (server-side usage only).
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
