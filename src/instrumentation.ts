// Next.js calls register() once when the server starts (Standards §3: validate at startup).
// Node-only code lives in a separate file so the Edge bundle never sees it.
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateEnvOrExit } = await import("@/instrumentation-node");
    validateEnvOrExit();
  }
}
