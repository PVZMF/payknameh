import "server-only";

// Standards §5: release-please owns release versions; staging builds carry the version the
// next release will get plus "-rc.N", and production only ever sees clean X.Y.Z.

export const RELEASE_BUMPS = ["major", "minor", "patch"] as const;
export type ReleaseBump = (typeof RELEASE_BUMPS)[number];

const RELEASE_VERSION = /^(\d+)\.(\d+)\.(\d+)$/;

/**
 * Version of the next release after `current`.
 * Standards §5: each MVP phase ends in one MINOR, hotfixes are a PATCH.
 */
export function nextVersion(current: string, bump: ReleaseBump): string {
  const match = RELEASE_VERSION.exec(current);
  if (!match) throw new Error(`Not a release version: ${current}`);
  const [major, minor, patch] = match.slice(1).map(Number) as [number, number, number];
  if (bump === "major") return `${major + 1}.0.0`;
  if (bump === "minor") return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

/** Staging version: the next release with an rc counter, e.g. 0.1.0-rc.3. */
export function rcVersion(current: string, bump: ReleaseBump, rcNumber: number): string {
  if (!Number.isSafeInteger(rcNumber) || rcNumber < 1) {
    throw new Error(`rc number must be a positive integer, got ${rcNumber}`);
  }
  return `${nextVersion(current, bump)}-rc.${rcNumber}`;
}
