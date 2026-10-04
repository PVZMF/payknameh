import { NextResponse, type NextRequest } from "next/server";

const REQUEST_ID_HEADER = "x-request-id";
const VALID_REQUEST_ID = /^[A-Za-z0-9._-]{8,128}$/;

/**
 * Gives every request an ID (Tech §13.6) that route handlers read for their logs and that
 * is echoed back to the client. A well-formed incoming ID (e.g. from the CDN) is kept.
 */
export function proxy(request: NextRequest): NextResponse {
  const incoming = request.headers.get(REQUEST_ID_HEADER);
  const requestId = incoming && VALID_REQUEST_ID.test(incoming) ? incoming : crypto.randomUUID();

  const headers = new Headers(request.headers);
  headers.set(REQUEST_ID_HEADER, requestId);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set(REQUEST_ID_HEADER, requestId);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
