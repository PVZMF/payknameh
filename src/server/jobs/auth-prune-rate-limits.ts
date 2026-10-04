import { pruneRateLimits } from "@/server/services/auth";
import { getLogger } from "@/server/lib/logger";

const log = getLogger("auth");

/** Daily: drops rate-limit windows older than a day (Tech §7.6). Safe to run twice. */
export async function handlePruneRateLimits(): Promise<void> {
  const deleted = await pruneRateLimits();
  log.info({ deleted }, "rate limit windows pruned");
}
