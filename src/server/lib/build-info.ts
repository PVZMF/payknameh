import { execFileSync } from "node:child_process";
import packageJson from "@/package.json" with { type: "json" };
import { getEnv } from "@/env";

export interface BuildInfo {
  version: string;
  commit: string;
}

let cached: BuildInfo | undefined;

function gitCommit(): string {
  try {
    return execFileSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

/** App version and commit for /health and error reports (Standards §5). */
export function getBuildInfo(): BuildInfo {
  if (!cached) {
    const env = getEnv();
    cached = {
      version: env.APP_VERSION ?? packageJson.version,
      commit: env.APP_COMMIT ?? gitCommit(),
    };
  }
  return cached;
}
