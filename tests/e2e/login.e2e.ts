import { expect, test } from "@playwright/test";
import { LOCAL_DOMAINS } from "./local-domains";

// PK-030: the login pages on the app domain. The full sign-up path (reading the code) is
// PK-038; here the pages, errors and the step to the code page.
test.skip(Boolean(process.env.E2E_BASE_URL), "uses the local *.localhost hosts");

const APP = `http://${LOCAL_DOMAINS.DOMAIN_APP}`;

test("a host asks for a code and reaches the code page", async ({ page }) => {
  await page.goto(`${APP}/login`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("ورود به پیک‌نامه");

  await page.getByLabel("شماره‌ی موبایل").fill("12");
  await page.getByRole("button", { name: "ارسال کد" }).click();
  // The error is tied to the field (aria-describedby); Next's route announcer is also an alert.
  await expect(page.locator("#phone-error")).toContainText("شماره‌ی موبایل درست نیست");
  await expect(page.getByLabel("شماره‌ی موبایل")).toHaveAttribute(
    "aria-describedby",
    "phone-error",
  );

  // A fresh number each run, so the per-number cooldown never interferes.
  const phone = `0912${String(Date.now()).slice(-7)}`;
  await page.getByLabel("شماره‌ی موبایل").fill(phone);
  await page.getByRole("button", { name: "ارسال کد" }).click();
  await expect(page).toHaveURL(/\/login\/verify\?c=/);
  await expect(page.getByText(/کد ۶ رقمی به .*۰۹۱۲•••/)).toBeVisible();

  await page.getByLabel("کد ورود").fill("000000");
  await page.getByRole("button", { name: "ورود", exact: true }).click();
  await expect(page.locator("#code-error")).toContainText("کد درست نیست");
});

test("the code page without a valid challenge goes back to the phone step", async ({ page }) => {
  await page.goto(`${APP}/login/verify?c=not-a-challenge`);
  await expect(page).toHaveURL(`${APP}/login`);
});
