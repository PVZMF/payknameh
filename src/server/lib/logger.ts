import "server-only";
import pino, { type DestinationStream, type Logger } from "pino";
import { getEnv } from "@/env";
import { redact } from "@/server/lib/redact";
import { currentRequestId } from "@/server/lib/request-context";

/** Builds the root logger; the destination is injectable for tests. */
export function createRootLogger(
  options: { level: string; appEnv: string },
  destination?: DestinationStream,
): Logger {
  return pino(
    {
      level: options.level,
      base: { env: options.appEnv },
      messageKey: "msg",
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: {
        level: (label) => ({ level: label }),
        log: (object) => redact(object) as Record<string, unknown>,
      },
      // Standards §2: every log carries the request ID when there is one.
      mixin: () => {
        const requestId = currentRequestId();
        return requestId ? { requestId } : {};
      },
    },
    destination,
  );
}

let root: Logger | undefined;

/**
 * Logger for one module (Standards §1 module names, or infra/worker).
 * Messages are fixed English strings; variable data goes in the object argument.
 */
export function getLogger(module: string): Logger {
  root ??= createRootLogger({ level: getEnv().LOG_LEVEL, appEnv: getEnv().APP_ENV });
  return root.child({ module });
}
