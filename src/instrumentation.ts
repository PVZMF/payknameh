import type { Instrumentation } from "next";

// Next.js calls register() once when the server starts (Standards §3: validate at startup).
// Node-only code lives in a separate file so the Edge bundle never sees it.
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateEnvOrExit, startErrorTracking } = await import("@/instrumentation-node");
    validateEnvOrExit();
    startErrorTracking();
  }
}

// Tech §13.6: errors thrown while rendering pages or running route handlers and actions.
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { reportRequestError } = await import("@/instrumentation-node");
    reportRequestError(error, request, context);
  }
};
