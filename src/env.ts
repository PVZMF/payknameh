import "server-only";
import { z } from "zod";

/**
 * Standards §3: APP_ENV decides environment behaviour. NODE_ENV is "production" in
 * every cloud environment and is never used for decisions.
 */
export const APP_ENVS = ["local", "development", "staging", "production"] as const;
export type AppEnv = (typeof APP_ENVS)[number];

const postgresUrl = z
  .url({ protocol: /^postgres(ql)?$/ })
  .describe("postgres://user:password@host:port/database");

/** Every variable the app and worker read. A missing or invalid value stops startup. */
export const envSchema = z.object({
  APP_ENV: z.enum(APP_ENVS),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),

  // APP_: build identity shown in /health and X-App-Version (Standards §5). The commit is
  // baked into the Docker image; locally it falls back to `git rev-parse`.
  APP_COMMIT: z.string().min(1).optional(),

  // WORKER_: the worker's own /health listener (Tech §13.6).
  WORKER_HEALTH_PORT: z.coerce.number().int().min(1).max(65535).default(3001),

  // DB_: the app connects with the least-privilege user (Tech §12).
  DB_URL: postgresUrl,

  // S3_: object storage, MinIO locally (Tech §7.7).
  S3_ENDPOINT: z.url(),
  S3_REGION: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;

/** Migrations run with a separate DB user (Standards §7); only migration scripts read this. */
export const migrationEnvSchema = z.object({ DB_MIGRATE_URL: postgresUrl });
export type MigrationEnv = z.infer<typeof migrationEnvSchema>;

export class EnvValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super(`Invalid environment variables:\n  ${issues.join("\n  ")}`);
    this.name = "EnvValidationError";
  }
}

/**
 * Parses environment input against a schema.
 * Throws EnvValidationError naming every bad variable, never its value (values may be secrets).
 */
export function parseEnv<T extends z.ZodType>(
  schema: T,
  source: Record<string, string | undefined>,
): z.infer<T> {
  const result = schema.safeParse(source);
  if (!result.success) {
    throw new EnvValidationError(
      result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
    );
  }
  return result.data;
}

let cached: Env | undefined;

/** Validated environment of the running process; parsed once on first call. */
export function getEnv(): Env {
  cached ??= parseEnv(envSchema, process.env);
  return cached;
}
