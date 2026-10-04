import { EnvValidationError, getEnv } from "@/env";

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
