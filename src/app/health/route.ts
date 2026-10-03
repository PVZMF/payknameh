import { checkHealth } from "@/server/lib/health";
import { REQUEST_ID_HEADER, runWithRequestId } from "@/server/lib/request-context";

export const dynamic = "force-dynamic";

/** Tech §13.6: uptime probes and deploys read this; 503 when a dependency is down. */
export async function GET(request: Request): Promise<Response> {
  return runWithRequestId(request.headers.get(REQUEST_ID_HEADER), async () => {
    const report = await checkHealth("app");
    return Response.json(report, {
      status: report.status === "ok" ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    });
  });
}
