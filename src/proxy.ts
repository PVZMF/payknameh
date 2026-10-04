import { NextResponse, type NextRequest } from "next/server";
import { getEnv } from "@/env";
import { decideRoute, resolveSurface, type Domains } from "@/server/lib/host-routing";
import { buildCsp, originAllowed, staticSecurityHeaders } from "@/server/lib/security-headers";

const REQUEST_ID_HEADER = "x-request-id";
const VALID_REQUEST_ID = /^[A-Za-z0-9._-]{8,128}$/;
// MVP §6.1: nothing on the short domain may be indexed.
const NO_INDEX = "noindex, nofollow";

function domainsFromEnv(): Domains {
  const env = getEnv();
  return { main: env.DOMAIN_MAIN, app: env.DOMAIN_APP, short: env.DOMAIN_SHORT };
}

/**
 * Every request passes here (Tech §2.3, §12, §13.6): it gets a request ID, is routed to its
 * surface by host, has its Origin checked when it changes state, and every response carries
 * the security headers with a per-request CSP nonce.
 */
export function proxy(request: NextRequest): NextResponse {
  const appEnv = getEnv().APP_ENV;
  const incoming = request.headers.get(REQUEST_ID_HEADER);
  const requestId = incoming && VALID_REQUEST_ID.test(incoming) ? incoming : crypto.randomUUID();
  const nonce = btoa(crypto.randomUUID());
  const csp = buildCsp(nonce, appEnv);

  const domains = domainsFromEnv();
  const host = request.headers.get("host");
  const surface = resolveSurface(host, domains);
  const decision = decideRoute(surface, request.nextUrl.pathname);

  // Headers the route sees. Next.js reads the CSP here to put the nonce on its scripts.
  const forwarded = new Headers(request.headers);
  forwarded.set(REQUEST_ID_HEADER, requestId);
  forwarded.set("x-nonce", nonce);
  forwarded.set("Content-Security-Policy", csp);
  // Guest routes never see cookies: the host session cookie lives only on the app
  // domain, and dropping the header here keeps any stray cookie out of guest code.
  if (surface === "short") forwarded.delete("cookie");

  let response: NextResponse;
  if (
    !originAllowed({
      method: request.method,
      pathname: request.nextUrl.pathname,
      origin: request.headers.get("origin"),
      host,
    })
  ) {
    response = new NextResponse("Forbidden", { status: 403 });
  } else if (decision.action === "redirect") {
    const protocol = appEnv === "local" ? "http:" : "https:";
    const target = new URL(`${protocol}//${domains[decision.to]}`);
    target.pathname = request.nextUrl.pathname;
    target.search = request.nextUrl.search;
    response = NextResponse.redirect(target, 308);
  } else if (decision.action === "rewrite") {
    const target = request.nextUrl.clone();
    target.pathname = decision.pathname;
    response = NextResponse.rewrite(target, { request: { headers: forwarded } });
  } else if (decision.action === "not-found") {
    response = new NextResponse("Not Found", { status: 404 });
  } else {
    response = NextResponse.next({ request: { headers: forwarded } });
  }

  for (const [name, value] of Object.entries(staticSecurityHeaders(appEnv))) {
    response.headers.set(name, value);
  }
  response.headers.set("Content-Security-Policy", csp);
  if (surface === "short") response.headers.set("X-Robots-Tag", NO_INDEX);
  response.headers.set(REQUEST_ID_HEADER, requestId);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
