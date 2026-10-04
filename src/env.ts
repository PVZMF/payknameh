import "server-only";
import { z } from "zod";

/**
 * Standards §3: APP_ENV decides environment behaviour. NODE_ENV is "production" in
 * every cloud environment and is never used for decisions.
 */
export const APP_ENVS = ["local", "development", "staging", "production"] as const;
export type AppEnv = (typeof APP_ENVS)[number];

/** X.Y.Z or X.Y.Z-rc.N: the only shapes an app build may report (Standards §5). */
export const APP_VERSION_PATTERN = /^\d+\.\d+\.\d+(-rc\.[1-9]\d*)?$/;

/** Optional variable where an empty value (e.g. an unset Docker build arg) counts as unset. */
function optional<T extends z.ZodType>(schema: T) {
  return z.preprocess((value) => (value === "" ? undefined : value), schema.optional());
}

const host = z
  .string()
  .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*(:\d{1,5})?$/, {
    message: "expected a lower-case host name, optionally with :port",
  })
  // Next.js uses localhost:<port> as its own host and makes redirects to it relative, which
  // breaks cross-surface redirects; use a *.localhost name locally instead.
  .refine((value) => !/^localhost(:\d+)?$/.test(value), {
    message: "use a *.localhost name (e.g. payknameh.localhost:3000), not localhost itself",
  });

const postgresUrl = z
  .url({ protocol: /^postgres(ql)?$/ })
  .describe("postgres://user:password@host:port/database");

/** Each variable on its own. A missing or invalid value stops startup. */
const baseEnvSchema = z.object({
  APP_ENV: z.enum(APP_ENVS),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),

  // APP_: build identity shown in /health and X-App-Version (Standards §5). The commit is
  // baked into the Docker image; locally it falls back to `git rev-parse`.
  APP_COMMIT: z.string().min(1).optional(),
  // Set only on staging builds (X.Y.Z-rc.N); otherwise the package.json version is reported.
  // Docker passes an empty build arg when none is given, which counts as unset.
  APP_VERSION: optional(z.string().regex(APP_VERSION_PATTERN, "expected X.Y.Z or X.Y.Z-rc.N")),

  // GLITCHTIP_: error reports (Tech §13.6, Standards §3). Unset locally: errors only reach the
  // console. Each environment has its own GlitchTip project and DSN.
  GLITCHTIP_DSN: optional(z.url({ protocol: /^https?$/ })),

  // WORKER_: the worker's own /health listener (Tech §13.6).
  WORKER_HEALTH_PORT: z.coerce.number().int().min(1).max(65535).default(3001),

  // DOMAIN_: hosts of the three surfaces (Tech §2.3), with the port when it is not the default.
  // The short .ir domain is still open (Decision D-07); every environment sets its own.
  DOMAIN_MAIN: host,
  DOMAIN_APP: host,
  DOMAIN_SHORT: host,

  // SMS_: provider behind the SmsProvider interface (Tech §7.8). Only "console" exists until
  // the vendor is chosen (Decision D-06, PK-036).
  SMS_PROVIDER: z.enum(["console"]).default("console"),

  // AUTH_: Tech §7.3, OTP codes are stored only as an HMAC with this secret.
  AUTH_OTP_SECRET: z.string().min(32, "at least 32 characters"),
  // How many reverse proxies (CDN, load balancer) in front of the app append to
  // X-Forwarded-For. 0 = none: the value Next.js sets from the socket (local and development).
  TRUSTED_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),

  // DB_: the app connects with the least-privilege user (Tech §12).
  DB_URL: postgresUrl,

  // S3_: object storage, MinIO locally (Tech §7.7).
  S3_ENDPOINT: z.url(),
  S3_REGION: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
});

/** Every variable the app and worker read, plus rules that span several variables. */
export const envSchema = baseEnvSchema.superRefine((env, ctx) => {
  // Standards §3: the console provider (codes in the terminal) only runs locally and on the
  // development environment; staging and production must send real SMS.
  if (
    env.SMS_PROVIDER === "console" &&
    (env.APP_ENV === "staging" || env.APP_ENV === "production")
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["SMS_PROVIDER"],
      message: `"console" is only allowed when APP_ENV is local or development`,
    });
  }
  // Next.js keeps an X-Forwarded-For sent by the client, so without a trusted proxy in front
  // per-IP rate limits could be bypassed. Staging and production must run behind one.
  if (env.TRUSTED_PROXY_HOPS < 1 && (env.APP_ENV === "staging" || env.APP_ENV === "production")) {
    ctx.addIssue({
      code: "custom",
      path: ["TRUSTED_PROXY_HOPS"],
      message: "must be at least 1 on staging and production (the app runs behind a proxy)",
    });
  }
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
