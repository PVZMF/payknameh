import type { NextConfig } from "next";
import packageJson from "./package.json" with { type: "json" };

const nextConfig: NextConfig = {
  // Tech §2.2: the web app ships as a standalone build inside Docker.
  output: "standalone",
  // Pin the workspace root so a stray lockfile above the repo is never picked up.
  outputFileTracingRoot: import.meta.dirname,
  turbopack: { root: import.meta.dirname },
  poweredByHeader: false,
  // Standards §5: every response carries the app version.
  headers: async () => [
    { source: "/:path*", headers: [{ key: "X-App-Version", value: packageJson.version }] },
  ],
  reactStrictMode: true,
};

export default nextConfig;
