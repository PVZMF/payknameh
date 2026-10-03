// Bundles the worker and the migration runner into dist/ for the Docker image (Tech §2.2:
// one image, the command decides app or worker). Path aliases come from tsconfig.json.
import { build } from "esbuild";

await build({
  entryPoints: { worker: "worker.ts", migrate: "scripts/db-migrate.ts" },
  outdir: "dist",
  outExtension: { ".js": ".mjs" },
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  sourcemap: true,
  // `server-only` resolves to an empty module under the react-server condition.
  conditions: ["react-server"],
  // pg's optional native binding is never installed.
  external: ["pg-native"],
  // Bundled CommonJS dependencies still call require().
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
  logLevel: "info",
});
