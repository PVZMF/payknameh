// Prints the staging version for the checked-out main commit (Standards §5), for the staging
// deploy to pass as the APP_VERSION build arg. N counts commits since the last release tag,
// so every staging build of a release gets a higher rc.
//   pnpm release:rc-version            next MINOR (normal phase release)
//   pnpm release:rc-version patch      hotfix
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { RELEASE_BUMPS, rcVersion, type ReleaseBump } from "@/server/lib/release-version";

const bump = (process.argv[2] ?? "minor") as ReleaseBump;
if (!RELEASE_BUMPS.includes(bump)) {
  throw new Error(`Unknown bump "${bump}"; use one of ${RELEASE_BUMPS.join(", ")}`);
}

const manifest = JSON.parse(readFileSync(".release-please-manifest.json", "utf8")) as {
  ".": string;
};

function git(...args: string[]): string {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
}

let range = "HEAD";
try {
  range = `${git("describe", "--tags", "--abbrev=0", "--match", "v*")}..HEAD`;
} catch {
  // No release tag yet: count every commit.
}

console.log(rcVersion(manifest["."], bump, Number(git("rev-list", "--count", range))));
