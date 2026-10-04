import { expect, test } from "@playwright/test";

// Tech §12 (Headers, CSRF), checked in a real browser: the CSP must not block the app itself.

test("pages load under the CSP with no violations and carry the security headers", async ({
  page,
}) => {
  const violations: string[] = [];
  page.on("console", (message) => {
    if (/Content Security Policy|Refused to/i.test(message.text())) violations.push(message.text());
  });
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  const headers = response?.headers() ?? {};
  expect(headers["content-security-policy"]).toMatch(/'nonce-[^']+' 'strict-dynamic'/);
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(violations).toEqual([]);
});

test("a state-changing request from another site is refused", async ({ request, baseURL }) => {
  const foreign = await request.post("/", { headers: { origin: "https://evil.example" } });
  expect(foreign.status()).toBe(403);
  const noOrigin = await request.fetch("/", { method: "POST", headers: { origin: "" } });
  expect(noOrigin.status()).toBe(403);
  const sameSite = await request.post("/", { headers: { origin: new URL(baseURL ?? "").origin } });
  expect(sameSite.status()).not.toBe(403);
});
