import { describe, expect, it } from "vitest";
import { APP_VERSION_PATTERN } from "@/env";
import { nextVersion, rcVersion } from "@/server/lib/release-version";

describe("nextVersion", () => {
  it("ends a phase with one MINOR", () => {
    expect(nextVersion("0.0.0", "minor")).toBe("0.1.0");
    expect(nextVersion("0.3.4", "minor")).toBe("0.4.0");
  });

  it("bumps PATCH for a hotfix and MAJOR for launch", () => {
    expect(nextVersion("1.4.0", "patch")).toBe("1.4.1");
    expect(nextVersion("0.7.0", "major")).toBe("1.0.0");
  });

  it("rejects anything that is not a release version", () => {
    expect(() => nextVersion("1.4.0-rc.1", "minor")).toThrow("Not a release version");
    expect(() => nextVersion("v1.4.0", "minor")).toThrow("Not a release version");
  });
});

describe("rcVersion", () => {
  it("adds the rc counter to the next release", () => {
    expect(rcVersion("0.0.0", "minor", 1)).toBe("0.1.0-rc.1");
    expect(rcVersion("1.4.0", "patch", 12)).toBe("1.4.1-rc.12");
  });

  it.each([0, -1, 1.5, Number.NaN])("rejects rc number %s", (n) => {
    expect(() => rcVersion("0.0.0", "minor", n)).toThrow("positive integer");
  });
});

describe("APP_VERSION_PATTERN", () => {
  it.each(["0.1.0", "1.4.0-rc.2", "10.20.30-rc.15"])("accepts %s", (version) => {
    expect(APP_VERSION_PATTERN.test(version)).toBe(true);
  });

  it.each(["v0.1.0", "0.1", "1.4.0-rc.0", "1.4.0-beta.1", ""])("rejects %s", (version) => {
    expect(APP_VERSION_PATTERN.test(version)).toBe(false);
  });
});
