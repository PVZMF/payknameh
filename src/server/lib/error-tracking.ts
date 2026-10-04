import "server-only";
import * as Sentry from "@sentry/node";
import type { Breadcrumb, ErrorEvent } from "@sentry/node";
import { getEnv } from "@/env";
import { getBuildInfo } from "@/server/lib/build-info";
import { redact, redactText } from "@/server/lib/redact";

// Tech §13.6: unexpected errors from app and worker go to self-hosted GlitchTip through the
// Sentry SDK (Tech §13.4: no foreign SaaS). Tech §12 / Business §7: no tokens, phone numbers
// or other personal data in reports, so every event is scrubbed before it leaves the process.

export type Service = "app" | "worker";

let enabled = false;

/** Removes personal data from an event; also used for everything the SDK collects itself. */
export function scrubEvent(event: ErrorEvent): ErrorEvent {
  delete event.user;
  if (event.message) event.message = redactText(event.message);
  for (const exception of event.exception?.values ?? []) {
    if (exception.value) exception.value = redactText(exception.value);
  }
  if (event.request) {
    // Only the path (with /i/<token> masked) and method are useful; the rest may carry
    // cookies, auth headers, query parameters or form data.
    event.request = {
      method: event.request.method,
      url: event.request.url ? redactText(event.request.url.replace(/[?#].*$/, "")) : undefined,
    };
  }
  event.breadcrumbs = event.breadcrumbs?.map(scrubBreadcrumb);
  if (event.extra) event.extra = redact(event.extra) as Record<string, unknown>;
  if (event.contexts) event.contexts = redact(event.contexts) as typeof event.contexts;
  return event;
}

export function scrubBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb {
  return {
    ...breadcrumb,
    message: breadcrumb.message ? redactText(breadcrumb.message) : breadcrumb.message,
    data: breadcrumb.data ? (redact(breadcrumb.data) as Record<string, unknown>) : undefined,
  };
}

/**
 * Starts error reporting for one process. A no-op without GLITCHTIP_DSN, which is the local
 * setup (Standards §3: locally errors only reach the console). Returns whether it is on.
 */
export function initErrorTracking(service: Service): boolean {
  const env = getEnv();
  if (!env.GLITCHTIP_DSN) return false;
  const { version, commit } = getBuildInfo();
  Sentry.init({
    dsn: env.GLITCHTIP_DSN,
    environment: env.APP_ENV,
    // Standards §5: every error report carries the version and the commit.
    release: version,
    initialScope: { tags: { service, commit } },
    // Collect nothing about the user or the HTTP exchange; scrubEvent is the second guard.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
    },
    // Errors only: no tracing, no HTTP instrumentation, no source context.
    tracesSampleRate: 0,
    defaultIntegrations: false,
    integrations: [
      Sentry.eventFiltersIntegration(),
      Sentry.functionToStringIntegration(),
      Sentry.linkedErrorsIntegration(),
      Sentry.dedupeIntegration(),
      Sentry.nodeContextIntegration(),
      Sentry.onUncaughtExceptionIntegration(),
      Sentry.onUnhandledRejectionIntegration(),
    ],
    beforeSend: scrubEvent,
    beforeBreadcrumb: scrubBreadcrumb,
  });
  enabled = true;
  return true;
}

/**
 * Reports an unexpected error (Standards §2: expected errors are typed results, not this).
 * The context is scrubbed with the rest of the event in scrubEvent, exactly once.
 */
export function captureUnexpected(error: unknown, context: Record<string, unknown> = {}): void {
  if (!enabled) return;
  Sentry.captureException(error, { extra: context });
}

/** Sends queued reports before the process exits; resolves false on timeout. */
export async function flushErrorReports(timeoutMs = 2_000): Promise<boolean> {
  return enabled ? Sentry.flush(timeoutMs) : true;
}
