import "server-only";
import type { AppEnv } from "@/env";

// Tech §12 (Headers, CSRF) / MVP §8: baseline headers on every route and an Origin check on
// every state-changing request, on top of SameSite=Lax cookies. Guest pages get a stricter
// policy later (PK-102).

/**
 * Content-Security-Policy with a per-request nonce; Next.js puts the nonce on its own
 * scripts when it finds this header on the request. `next dev` evaluates code, so local
 * also allows 'unsafe-eval'.
 */
export function buildCsp(nonce: string, appEnv: AppEnv): string {
  const scripts = [`'self'`, `'nonce-${nonce}'`, `'strict-dynamic'`];
  if (appEnv === "local") scripts.push(`'unsafe-eval'`);
  return [
    `default-src 'self'`,
    `script-src ${scripts.join(" ")}`,
    // Next.js and next/font inject style tags without a nonce.
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob:`,
    `font-src 'self'`,
    `connect-src 'self'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    ...(appEnv === "local" ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

/** Headers that do not depend on the request. */
export function staticSecurityHeaders(appEnv: AppEnv): Record<string, string> {
  return {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Frame-Options": "DENY",
    "Permissions-Policy":
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
    // Local runs on plain http, where HSTS would only get in the way.
    ...(appEnv === "local"
      ? {}
      : { "Strict-Transport-Security": "max-age=31536000; includeSubDomains" }),
  };
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
/** Server-to-server callbacks that carry no Origin (e.g. SMS delivery reports, PK-120). */
const ORIGIN_EXEMPT_PREFIXES = ["/api/webhooks/"];

/**
 * CSRF check: a state-changing request must come from a page on the same host. Browsers
 * send Origin on every such request; a missing or foreign Origin is refused.
 */
export function originAllowed(request: {
  method: string;
  pathname: string;
  origin: string | null;
  host: string | null;
}): boolean {
  if (SAFE_METHODS.has(request.method.toUpperCase())) return true;
  if (ORIGIN_EXEMPT_PREFIXES.some((prefix) => request.pathname.startsWith(prefix))) return true;
  if (!request.origin || !request.host) return false;
  try {
    return new URL(request.origin).host.toLowerCase() === request.host.toLowerCase();
  } catch {
    return false;
  }
}
