import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tech §2.2: the web app ships as a standalone build inside Docker.
  output: "standalone",
  // Pin the workspace root so a stray lockfile above the repo is never picked up.
  outputFileTracingRoot: import.meta.dirname,
  turbopack: { root: import.meta.dirname },
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
