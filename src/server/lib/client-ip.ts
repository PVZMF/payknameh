import "server-only";
import { isIP } from "node:net";

/**
 * The client's IP for rate limits (Tech §7.6), from X-Forwarded-For.
 *
 * Next.js sets X-Forwarded-For to the socket address only when the request has none, and keeps
 * a header the client sent. So the entry is chosen by how many trusted proxies sit in front:
 *   0 hops: the rightmost entry, which is Next's own value unless the client forged one; only
 *           allowed on local and development (src/env.ts enforces it).
 *   N hops: the N-th entry from the right, the address the outermost trusted proxy saw; any
 *           entries further left are client-controlled and ignored.
 * Returns null when there is no usable address (header missing, too short or malformed).
 */
export function clientIpFrom(forwardedFor: string | null, trustedProxyHops: number): string | null {
  const entries = (forwardedFor ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  const candidate = entries[entries.length - Math.max(trustedProxyHops, 1)];
  if (!candidate) return null;
  // "::ffff:1.2.3.4" is an IPv4 client on an IPv6 socket.
  const address = candidate.replace(/^::ffff:(?=\d+\.\d+\.\d+\.\d+$)/i, "");
  return isIP(address) ? address : null;
}
