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
 *
 * Modules create their logger at import time, and `next build` imports server modules to read
 * route config without any environment. So the logger reads the environment on first use, not
 * when it is created.
 */
export function getLogger(module: string): Logger {
  let child: Logger | undefined;
  const resolve = (): Logger => {
    root ??= createRootLogger({ level: getEnv().LOG_LEVEL, appEnv: getEnv().APP_ENV });
    return (child ??= root.child({ module }));
  };
  // Every property read goes to the real child logger, created on the first one.
  return new Proxy({} as Logger, {
    get(_target, property) {
      const logger = resolve();
      const value: unknown = Reflect.get(logger, property, logger);
      return typeof value === "function" ? value.bind(logger) : value;
    },
  });
}
