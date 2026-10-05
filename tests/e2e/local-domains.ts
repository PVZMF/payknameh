// Tech §2.3: the three surfaces are told apart by host, so the local dev server that
// Playwright starts gets its own *.localhost names on its own port.
export const LOCAL_PORT = 3100;

export const LOCAL_DOMAINS = {
  DOMAIN_MAIN: `payknameh.localhost:${LOCAL_PORT}`,
  DOMAIN_APP: `app.payknameh.localhost:${LOCAL_PORT}`,
  DOMAIN_SHORT: `pk.localhost:${LOCAL_PORT}`,
};

/** Test only: the dev server's ConsoleSmsProvider writes every SMS here (SMS_CONSOLE_OUTBOX). */
export const SMS_OUTBOX = ".e2e/sms-outbox.jsonl";

/**
 * A client IP of its own for one test. Locally TRUSTED_PROXY_HOPS is 0, so the server takes
 * X-Forwarded-For as sent; without this every run shares ::1 and soon hits the per-IP OTP
 * limit (20 an hour).
 */
export function uniqueClientIp(): string {
  const n = Math.floor(Math.random() * 2 ** 16);
  return `198.18.${n >> 8}.${n & 255}`;
}
