import { describe, expect, it } from "vitest";
import { EnvValidationError, envSchema, migrationEnvSchema, parseEnv } from "@/env";

const VALID = {
  APP_ENV: "local",
  DOMAIN_MAIN: "payknameh.localhost:3000",
  DOMAIN_APP: "app.payknameh.localhost:3000",
  DOMAIN_SHORT: "pk.localhost:3000",
  DB_URL: "postgres://payknameh_app:secret@localhost:5432/payknameh",
  S3_ENDPOINT: "http://localhost:9000",
  S3_REGION: "us-east-1",
  S3_BUCKET: "payknameh-local",
  S3_ACCESS_KEY_ID: "key",
  S3_SECRET_ACCESS_KEY: "secret",
};

describe("parseEnv", () => {
  it("accepts a complete local environment", () => {
    expect(parseEnv(envSchema, VALID).APP_ENV).toBe("local");
  });

  it.each(["local", "development"])("accepts APP_ENV=%s", (appEnv) => {
    expect(parseEnv(envSchema, { ...VALID, APP_ENV: appEnv }).APP_ENV).toBe(appEnv);
  });

  it("throws when a variable is missing", () => {
    expect(() => parseEnv(envSchema, { ...VALID, DB_URL: undefined })).toThrow(EnvValidationError);
  });

  it("throws on an unknown APP_ENV", () => {
    expect(() => parseEnv(envSchema, { ...VALID, APP_ENV: "test" })).toThrow(/APP_ENV/);
  });

  it("throws on a non-postgres DB_URL", () => {
    expect(() => parseEnv(envSchema, { ...VALID, DB_URL: "mysql://x@y/z" })).toThrow(/DB_URL/);
  });

  it("never echoes secret values in the error", () => {
    const bad = { ...VALID, DB_URL: "not-a-url-with-password-hunter2" };
    expect(() => parseEnv(envSchema, bad)).toThrow(
      expect.objectContaining({ message: expect.not.stringContaining("hunter2") }),
    );
  });

  it("accepts a staging rc version and treats an empty APP_VERSION as unset", () => {
    expect(parseEnv(envSchema, { ...VALID, APP_VERSION: "0.1.0-rc.2" }).APP_VERSION).toBe(
      "0.1.0-rc.2",
    );
    expect(parseEnv(envSchema, { ...VALID, APP_VERSION: "" }).APP_VERSION).toBeUndefined();
  });

  it("throws on an APP_VERSION that is not X.Y.Z or X.Y.Z-rc.N", () => {
    expect(() => parseEnv(envSchema, { ...VALID, APP_VERSION: "v0.1.0" })).toThrow(/APP_VERSION/);
  });

  it.each(["payknameh.ir", "app.payknameh.ir", "pk.ir", "app.payknameh.localhost:3000"])(
    "accepts the host %s",
    (host) => {
      expect(parseEnv(envSchema, { ...VALID, DOMAIN_APP: host }).DOMAIN_APP).toBe(host);
    },
  );

  it.each([
    "https://payknameh.ir",
    "App.payknameh.ir",
    "payknameh.ir/",
    "-bad.ir",
    "",
    "localhost:3000",
  ])("rejects the host %j", (host) => {
    expect(() => parseEnv(envSchema, { ...VALID, DOMAIN_SHORT: host })).toThrow(/DOMAIN_SHORT/);
  });

  it("treats an empty GLITCHTIP_DSN as unset and needs an http(s) URL otherwise", () => {
    expect(parseEnv(envSchema, { ...VALID, GLITCHTIP_DSN: "" }).GLITCHTIP_DSN).toBeUndefined();
    const dsn = "https://key@glitchtip.example/1";
    expect(parseEnv(envSchema, { ...VALID, GLITCHTIP_DSN: dsn }).GLITCHTIP_DSN).toBe(dsn);
    expect(() => parseEnv(envSchema, { ...VALID, GLITCHTIP_DSN: "glitchtip" })).toThrow(
      /GLITCHTIP_DSN/,
    );
  });

  it("defaults to the console SMS provider and allows it locally and on development", () => {
    expect(parseEnv(envSchema, VALID).SMS_PROVIDER).toBe("console");
    expect(parseEnv(envSchema, { ...VALID, APP_ENV: "development" }).SMS_PROVIDER).toBe("console");
  });

  it.each(["staging", "production"])("refuses the console SMS provider on %s", (appEnv) => {
    expect(() =>
      parseEnv(envSchema, { ...VALID, APP_ENV: appEnv, SMS_PROVIDER: "console" }),
    ).toThrow(/SMS_PROVIDER/);
  });

  it("validates the migration user URL separately", () => {
    expect(() => parseEnv(migrationEnvSchema, {})).toThrow(/DB_MIGRATE_URL/);
  });
});
