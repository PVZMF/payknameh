import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/env", () => ({
  getEnv: () => ({
    APP_ENV: "staging",
    DOMAIN_MAIN: "payknameh.ir",
    DOMAIN_APP: "app.payknameh.ir",
    DOMAIN_SHORT: "pk.ir",
  }),
}));

const { proxy } = await import("@/proxy");

const TOKEN = "a1B2c3D4e5F6g7H8i9J0kL";

function request(url: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(url, { headers: { host: new URL(url).host, ...headers } });
}

/** Headers the proxy forwards to the route (NextResponse.next encodes them). */
function forwarded(response: Response, name: string): string | null {
  return response.headers.get(`x-middleware-request-${name}`);
}

describe("proxy", () => {
  it("passes a main-domain marketing page through with a request ID", () => {
    const response = proxy(request("https://payknameh.ir/"));
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.get("x-request-id")).toMatch(/^[0-9a-f-]{36}$/);
    expect(response.headers.get("x-robots-tag")).toBeNull();
  });

  it("keeps a well-formed incoming request ID", () => {
    const response = proxy(request("https://payknameh.ir/", { "x-request-id": "cdn-abc12345" }));
    expect(response.headers.get("x-request-id")).toBe("cdn-abc12345");
    expect(forwarded(response, "x-request-id")).toBe("cdn-abc12345");
  });

  it("redirects panel paths on the main domain to the app domain, keeping the query", () => {
    const response = proxy(request("https://payknameh.ir/events?tab=guests"));
    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe("https://app.payknameh.ir/events?tab=guests");
  });

  it("serves the panel home for / on the app domain", () => {
    const response = proxy(request("https://app.payknameh.ir/"));
    expect(response.headers.get("x-middleware-rewrite")).toBe(
      "https://app.payknameh.ir/panel-home",
    );
  });

  it("serves the invitation route on the short domain, noindex and without cookies", () => {
    const response = proxy(request(`https://pk.ir/i/${TOKEN}`, { cookie: "session=host-secret" }));
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(forwarded(response, "cookie")).toBeNull();
    expect(response.headers.get("x-middleware-override-headers")).not.toContain("cookie");
  });

  it("answers 404 with noindex for anything else on the short domain", () => {
    const response = proxy(request("https://pk.ir/events"));
    expect(response.status).toBe(404);
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
  });

  it("does not serve the invitation route on the app domain", () => {
    expect(proxy(request(`https://app.payknameh.ir/i/${TOKEN}`)).status).toBe(404);
  });

  it("answers 404 on an unknown host but still serves health checks", () => {
    expect(proxy(request("https://evil.example/")).status).toBe(404);
    expect(proxy(request("https://10.0.0.5/health")).headers.get("x-middleware-next")).toBe("1");
  });
});
