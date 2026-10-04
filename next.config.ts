import type { NextConfig } from "next";
import packageJson from "./package.json" with { type: "json" };

// Standards §5: staging builds pass X.Y.Z-rc.N as APP_VERSION; otherwise package.json wins.
// Read at build time because headers are fixed into the build output.
const appVersion = process.env.APP_VERSION || packageJson.version;

const nextConfig: NextConfig = {
  // Tech §2.2: the web app ships as a standalone build inside Docker.
  output: "standalone",
  // Pin the workspace root so a stray lockfile above the repo is never picked up.
  outputFileTracingRoot: import.meta.dirname,
  turbopack: { root: import.meta.dirname },
  poweredByHeader: false,
  // Loaded from node_modules at runtime, not bundled: the Sentry SDK warns (and would skip
  // its own setup) when bundled. We use it for error reports only (PK-018).
  serverExternalPackages: ["@sentry/node"],
  // Standards §5: every response carries the app version.
  headers: async () => [
    { source: "/:path*", headers: [{ key: "X-App-Version", value: appVersion }] },
  ],
  reactStrictMode: true,
};

export default nextConfig;
