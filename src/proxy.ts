import { NextResponse, type NextRequest } from "next/server";
import { getEnv } from "@/env";
import { decideRoute, resolveSurface, type Domains } from "@/server/lib/host-routing";

const REQUEST_ID_HEADER = "x-request-id";
const VALID_REQUEST_ID = /^[A-Za-z0-9._-]{8,128}$/;
// MVP §6.1: nothing on the short domain may be indexed.
const NO_INDEX = "noindex, nofollow";

function domainsFromEnv(): Domains {
  const env = getEnv();
  return { main: env.DOMAIN_MAIN, app: env.DOMAIN_APP, short: env.DOMAIN_SHORT };
}

/**
 * Routes each request to its surface by host (Tech §2.3) and gives it a request ID
 * (Tech §13.6) that route handlers log and that is echoed back to the client.
 */
export function proxy(request: NextRequest): NextResponse {
  const incoming = request.headers.get(REQUEST_ID_HEADER);
  const requestId = incoming && VALID_REQUEST_ID.test(incoming) ? incoming : crypto.randomUUID();

  const domains = domainsFromEnv();
  const surface = resolveSurface(request.headers.get("host"), domains);
  const decision = decideRoute(surface, request.nextUrl.pathname);

  let response: NextResponse;
  if (decision.action === "redirect") {
    const protocol = getEnv().APP_ENV === "local" ? "http:" : "https:";
    const target = new URL(`${protocol}//${domains[decision.to]}`);
    target.pathname = request.nextUrl.pathname;
    target.search = request.nextUrl.search;
    response = NextResponse.redirect(target, 308);
  } else if (decision.action === "not-found") {
    response = new NextResponse("Not Found", { status: 404 });
  } else {
    const headers = new Headers(request.headers);
    headers.set(REQUEST_ID_HEADER, requestId);
    // Guest routes never see cookies: the host session cookie lives only on the app
    // domain, and dropping the header here keeps any stray cookie out of guest code.
    if (surface === "short") headers.delete("cookie");
    response = NextResponse.next({ request: { headers } });
  }

  if (surface === "short") response.headers.set("X-Robots-Tag", NO_INDEX);
  response.headers.set(REQUEST_ID_HEADER, requestId);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
