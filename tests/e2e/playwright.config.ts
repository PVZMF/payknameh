import { defineConfig, devices } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { LOCAL_DOMAINS, LOCAL_PORT, SMS_OUTBOX } from "./local-domains";

// Tech §14.1–14.2: end-to-end runs on mobile widths first. Locally Playwright starts the
// dev server; set E2E_BASE_URL to run the same suite against staging.
const externalBaseUrl = process.env.E2E_BASE_URL;

const mobile = devices["Pixel 7"];

// The dev server runs from the repo root, so the outbox path is relative to it.
mkdirSync(".e2e", { recursive: true });

export default defineConfig({
  testDir: ".",
  testMatch: "**/*.e2e.ts",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never", outputFolder: "../../playwright-report" }]]
    : "list",
  use: {
    baseURL: externalBaseUrl ?? `http://${LOCAL_DOMAINS.DOMAIN_MAIN}`,
    locale: "fa-IR",
    timezoneId: "Asia/Tehran",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "mobile-360", use: { ...mobile, viewport: { width: 360, height: 780 } } },
    { name: "mobile-390", use: { ...mobile, viewport: { width: 390, height: 844 } } },
    {
      name: "tablet-768",
      use: { ...devices["Desktop Chrome"], viewport: { width: 768, height: 1024 } },
    },
  ],
  webServer: externalBaseUrl
    ? undefined
    : {
        command: `pnpm dev --port ${LOCAL_PORT}`,
        url: `http://localhost:${LOCAL_PORT}/health`,
        env: { ...LOCAL_DOMAINS, SMS_CONSOLE_OUTBOX: SMS_OUTBOX },
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
