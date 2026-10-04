import "server-only";

// Tech §2.3 / CLAUDE.md Domains: one Next.js app serves three surfaces, picked by host.
//   main   marketing site, indexable
//   app    host panel and staff panel; the session cookie lives only here
//   short  only /i/<token> and the guest API; noindex, no host cookie (MVP §6.1, §6.2)
// Route groups share one URL space, so every path is classified and each host serves
// only its own kind; anything else is redirected to the right host or answered with 404.

export type Surface = "main" | "app" | "short";
export type Domains = Record<Surface, string>;
export type PathKind = "shared" | "guest" | "marketing" | "app";

export type RouteDecision =
  | { action: "next" }
  | { action: "not-found" }
  | { action: "redirect"; to: Exclude<Surface, "short"> };

// Health probes (Tech §13.6) and Next.js assets are served on every host.
const SHARED_PATH = /^\/(?:health\/?|_next\/.*)$/;
// MVP §6.2: /i/<token>, token ≈22 base62 characters; the guest API is versioned (Standards §5).
const GUEST_PATH = /^\/(?:i\/[A-Za-z0-9]{16,64}\/?|api\/guest(?:\/.*)?)$/;
// Pages of the (marketing) route group. Add every new marketing page here (e.g. PK-141, PK-142).
const MARKETING_PATHS = new Set(["/"]);

/** Lower-cases a Host header and drops a trailing dot; null when there is none. */
export function normalizeHost(host: string | null): string | null {
  const value = host?.trim().toLowerCase().replace(/\.$/, "");
  return value ? value : null;
}

/** Which surface a host belongs to, or null for a host this deployment does not serve. */
export function resolveSurface(host: string | null, domains: Domains): Surface | null {
  const normalized = normalizeHost(host);
  if (!normalized) return null;
  const surfaces: Surface[] = ["main", "app", "short"];
  return surfaces.find((surface) => normalizeHost(domains[surface]) === normalized) ?? null;
}

export function pathKind(pathname: string): PathKind {
  if (SHARED_PATH.test(pathname)) return "shared";
  if (GUEST_PATH.test(pathname)) return "guest";
  if (MARKETING_PATHS.has(pathname)) return "marketing";
  return "app";
}

/** What the proxy does with a request for `pathname` on `surface`. */
export function decideRoute(surface: Surface | null, pathname: string): RouteDecision {
  const kind = pathKind(pathname);
  if (kind === "shared") return { action: "next" };
  if (surface === null) return { action: "not-found" };
  // Guest routes exist only on the short domain, so a host cookie can never reach them.
  if (kind === "guest") return surface === "short" ? { action: "next" } : { action: "not-found" };
  if (surface === "short") return { action: "not-found" };
  if (kind === "marketing")
    return surface === "main" ? { action: "next" } : { action: "redirect", to: "main" };
  return surface === "app" ? { action: "next" } : { action: "redirect", to: "app" };
}
