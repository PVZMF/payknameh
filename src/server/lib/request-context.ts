import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

export const REQUEST_ID_HEADER = "x-request-id";

const storage = new AsyncLocalStorage<{ requestId: string }>();

/** Runs fn with a request ID visible to every log written inside it (Tech §13.6). */
export function runWithRequestId<T>(requestId: string | null | undefined, fn: () => T): T {
  return storage.run({ requestId: requestId || randomUUID() }, fn);
}

export function currentRequestId(): string | undefined {
  return storage.getStore()?.requestId;
}
