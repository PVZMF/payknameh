import type { Job } from "pg-boss";
import { getLogger } from "@/server/lib/logger";

const log = getLogger("infra");

export interface InfraPingData {
  sentAt: string;
}

/** Sample job: proves app → queue → worker end to end. Safe to run twice (no side effects). */
export async function handleInfraPing(jobs: Job<InfraPingData>[]): Promise<void> {
  for (const job of jobs) {
    log.info({ jobId: job.id, sentAt: job.data.sentAt }, "infra.ping handled");
  }
}
