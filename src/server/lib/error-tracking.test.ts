import type { ErrorEvent } from "@sentry/node";
import { afterEach, describe, expect, it, vi } from "vitest";

const sentry = vi.hoisted(() => ({
  init: vi.fn(),
  captureException: vi.fn(),
  flush: vi.fn().mockResolvedValue(true),
}));
vi.mock("@sentry/node", () => ({
  ...sentry,
  eventFiltersIntegration: () => ({ name: "EventFilters" }),
  functionToStringIntegration: () => ({ name: "FunctionToString" }),
  linkedErrorsIntegration: () => ({ name: "LinkedErrors" }),
  dedupeIntegration: () => ({ name: "Dedupe" }),
  nodeContextIntegration: () => ({ name: "Context" }),
  onUncaughtExceptionIntegration: () => ({ name: "OnUncaughtException" }),
  onUnhandledRejectionIntegration: () => ({ name: "OnUnhandledRejection" }),
}));
vi.mock("@/server/lib/build-info", () => ({
  getBuildInfo: () => ({ version: "0.1.0-rc.2", commit: "abc1234" }),
}));

const PHONE = "09121234567";
const TOKEN = "a1B2c3D4e5F6g7H8i9J0kL";

async function load(dsn: string | undefined) {
  vi.resetModules();
  vi.doMock("@/env", () => ({ getEnv: () => ({ APP_ENV: "staging", GLITCHTIP_DSN: dsn }) }));
  return import("@/server/lib/error-tracking");
}

afterEach(() => {
  vi.clearAllMocks();
  vi.doUnmock("@/env");
});

describe("initErrorTracking", () => {
  it("stays off without a DSN, and capture and flush are no-ops", async () => {
    const tracking = await load(undefined);
    expect(tracking.initErrorTracking("app")).toBe(false);
    tracking.captureUnexpected(new Error("boom"));
    expect(await tracking.flushErrorReports()).toBe(true);
    expect(sentry.init).not.toHaveBeenCalled();
    expect(sentry.captureException).not.toHaveBeenCalled();
    expect(sentry.flush).not.toHaveBeenCalled();
  });

  it("reports with environment, version, commit and service, collecting no personal data", async () => {
    const tracking = await load("https://key@glitchtip.example/1");
    expect(tracking.initErrorTracking("worker")).toBe(true);
    const options = sentry.init.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(options).toMatchObject({
      dsn: "https://key@glitchtip.example/1",
      environment: "staging",
      release: "0.1.0-rc.2",
      initialScope: { tags: { service: "worker", commit: "abc1234" } },
      tracesSampleRate: 0,
      defaultIntegrations: false,
      dataCollection: { userInfo: false, cookies: false, httpHeaders: false, httpBodies: [] },
      beforeSend: tracking.scrubEvent,
      beforeBreadcrumb: tracking.scrubBreadcrumb,
    });
  });

  it("captures with its context (scrubbed later in beforeSend) and flushes once on", async () => {
    const tracking = await load("https://key@glitchtip.example/1");
    tracking.initErrorTracking("app");
    const error = new Error("boom");
    tracking.captureUnexpected(error, { phone: PHONE, queue: "infra.ping" });
    expect(sentry.captureException).toHaveBeenCalledWith(error, {
      extra: { phone: PHONE, queue: "infra.ping" },
    });
    expect(await tracking.flushErrorReports(500)).toBe(true);
    expect(sentry.flush).toHaveBeenCalledWith(500);
  });
});

describe("scrubEvent", () => {
  it("removes tokens, phone numbers and request details from a report", async () => {
    const { scrubEvent } = await load(undefined);
    const event = scrubEvent({
      type: undefined,
      message: `SMS to ${PHONE} failed`,
      user: { id: "u1", ip_address: "1.2.3.4" },
      exception: { values: [{ type: "Error", value: `GET /i/${TOKEN} for ${PHONE}` }, {}] },
      request: {
        method: "GET",
        url: `https://pk.ir/i/${TOKEN}?ref=sms`,
        headers: { cookie: "session=secret", authorization: "Bearer x" },
        cookies: { session: "secret" },
        data: { otp: "123456" },
        query_string: "ref=sms",
      },
      breadcrumbs: [{ message: `called ${PHONE}`, data: { token: TOKEN } }, { category: "x" }],
      extra: { phoneNumber: PHONE },
      contexts: { job: { displayName: "Ali" } },
    } as ErrorEvent);

    expect(event.user).toBeUndefined();
    expect(event.message).toBe("SMS to •••••••••67 failed");
    expect(event.exception?.values?.[0]?.value).toBe("GET /i/[REDACTED] for •••••••••67");
    expect(event.request).toEqual({ method: "GET", url: "https://pk.ir/i/[REDACTED]" });
    expect(event.breadcrumbs).toEqual([
      { message: "called •••••••••67", data: { token: "[REDACTED]" } },
      { category: "x", message: undefined, data: undefined },
    ]);
    expect(event.extra).toEqual({ phoneNumber: "•••••••••67" });
    expect(event.contexts).toEqual({ job: { displayName: "[REDACTED]" } });
    expect(JSON.stringify(event)).not.toMatch(/1234567|secret|Bearer|123456|ref=sms/);
  });

  it("leaves a minimal event alone", async () => {
    const { scrubEvent } = await load(undefined);
    expect(scrubEvent({ type: undefined, request: { method: "POST" } } as ErrorEvent)).toEqual({
      type: undefined,
      request: { method: "POST", url: undefined },
      breadcrumbs: undefined,
    });
  });
});
