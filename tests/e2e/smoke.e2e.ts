import { expect, test } from "@playwright/test";

test("home page renders right-to-left Persian", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("html")).toHaveAttribute("lang", "fa");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("health endpoint is up with version and commit", async ({ request }) => {
  const response = await request.get("/health");
  expect(response.status()).toBe(200);
  expect(response.headers()["x-app-version"]).toBeTruthy();
  const body = (await response.json()) as { status: string; version: string; commit: string };
  expect(body).toMatchObject({
    status: "ok",
    version: expect.any(String),
    commit: expect.any(String),
  });
});

test("loads Vazirmatn from our own origin, with no third-party requests", async ({
  page,
  baseURL,
}) => {
  const origin = new URL(baseURL ?? "http://localhost").origin;
  const foreign: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).origin !== origin) foreign.push(request.url());
  });

  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);

  expect(foreign).toEqual([]);
  const fontFamily = await page.locator("body").evaluate((el) => getComputedStyle(el).fontFamily);
  expect(fontFamily.toLowerCase()).toContain("vazirmatn");
});
