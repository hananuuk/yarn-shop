import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite ships WASM + data files; keep it out of the bundler.
  devIndicators: false,
  serverExternalPackages: ["@electric-sql/pglite"],
  experimental: {
    serverActions: { bodySizeLimit: "4mb" }, // photo uploads; hosts cap requests at ~4.5 MB
  },
};

export default nextConfig;
