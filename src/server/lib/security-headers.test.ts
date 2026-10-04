import { describe, expect, it } from "vitest";
import { buildCsp, originAllowed, staticSecurityHeaders } from "@/server/lib/security-headers";

describe("buildCsp", () => {
  it("allows only own and nonce-carrying scripts, no framing, no plugins", () => {
    const csp = buildCsp("abc123", "production");
    expect(csp).toContain(`script-src 'self' 'nonce-abc123' 'strict-dynamic'`);
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).toContain(`frame-ancestors 'none'`);
    expect(csp).toContain(`object-src 'none'`);
    expect(csp).toContain("upgrade-insecure-requests");
  });

  it("adds what next dev needs only locally", () => {
    const csp = buildCsp("abc123", "local");
    expect(csp).toContain(`'unsafe-eval'`);
    expect(csp).not.toContain("upgrade-insecure-requests");
  });
});

describe("staticSecurityHeaders", () => {
  it("sets HSTS outside local only", () => {
    expect(staticSecurityHeaders("staging")).toMatchObject({
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "X-Frame-Options": "DENY",
    });
    expect(staticSecurityHeaders("local")).not.toHaveProperty("Strict-Transport-Security");
    expect(staticSecurityHeaders("local")["Permissions-Policy"]).toContain("camera=()");
  });
});

describe("originAllowed", () => {
  const base = { pathname: "/events", host: "app.payknameh.ir" };

  it("lets safe methods through without an Origin", () => {
    expect(originAllowed({ ...base, method: "GET", origin: null })).toBe(true);
    expect(originAllowed({ ...base, method: "head", origin: null })).toBe(true);
  });

  it("accepts a state-changing request from the same host", () => {
    expect(originAllowed({ ...base, method: "POST", origin: "https://app.payknameh.ir" })).toBe(
      true,
    );
  });

  it.each<[string | null, string]>([
    [null, "missing"],
    ["https://evil.example", "foreign"],
    ["https://payknameh.ir", "another of our hosts"],
    ["null", "opaque"],
  ])("refuses an Origin that is %s (%s)", (origin) => {
    expect(originAllowed({ ...base, method: "POST", origin })).toBe(false);
  });

  it("refuses when the request has no Host", () => {
    expect(originAllowed({ ...base, host: null, method: "DELETE", origin: "https://x" })).toBe(
      false,
    );
  });

  it("exempts server-to-server webhooks", () => {
    expect(
      originAllowed({ method: "POST", pathname: "/api/webhooks/sms", origin: null, host: "x" }),
    ).toBe(true);
  });
});
