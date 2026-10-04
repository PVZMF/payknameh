import type { Instrumentation } from "next";
import { EnvValidationError, getEnv } from "@/env";
import { captureUnexpected, initErrorTracking } from "@/server/lib/error-tracking";
import { redactText } from "@/server/lib/redact";

/**
 * Stops the process on a bad environment before any request is served.
 * Without the explicit exit, Next keeps running and answers 500.
 */
export function validateEnvOrExit(): void {
  try {
    getEnv();
  } catch (error) {
    if (!(error instanceof EnvValidationError)) throw error;
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
}

export function startErrorTracking(): void {
  initErrorTracking("app");
}

/** Reports a request error with its route; the path is masked (it may hold /i/<token>). */
export function reportRequestError(
  ...[error, request, context]: Parameters<Instrumentation.onRequestError>
): void {
  captureUnexpected(error, {
    method: request.method,
    path: redactText(request.path),
    routePath: context.routePath,
    routeType: context.routeType,
  });
}
