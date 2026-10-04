import { describe, expect, it } from "vitest";
import { clientIpFrom } from "@/server/lib/client-ip";

describe("clientIpFrom", () => {
  it("uses the rightmost entry without a trusted proxy (Next's socket value)", () => {
    expect(clientIpFrom("203.0.113.7", 0)).toBe("203.0.113.7");
    expect(clientIpFrom("::ffff:127.0.0.1", 0)).toBe("127.0.0.1");
    expect(clientIpFrom("::1", 0)).toBe("::1");
  });

  it("ignores everything a client prepends when trusted proxies are configured", () => {
    // Client forged "6.6.6.6"; the CDN appended the address it saw (198.51.100.4).
    expect(clientIpFrom("6.6.6.6, 198.51.100.4", 1)).toBe("198.51.100.4");
    // CDN then a load balancer: the CDN's view is second from the right.
    expect(clientIpFrom("6.6.6.6, 198.51.100.4, 10.0.0.2", 2)).toBe("198.51.100.4");
  });

  it("returns null when the header is missing, too short for the hops, or malformed", () => {
    expect(clientIpFrom(null, 0)).toBeNull();
    expect(clientIpFrom("", 1)).toBeNull();
    expect(clientIpFrom("198.51.100.4", 2)).toBeNull();
    expect(clientIpFrom("not-an-ip", 0)).toBeNull();
    expect(clientIpFrom("1.2.3.4, unknown", 1)).toBeNull();
  });
});
