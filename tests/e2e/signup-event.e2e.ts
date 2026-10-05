import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { LOCAL_DOMAINS, SMS_OUTBOX, uniqueClientIp } from "./local-domains";

// MVP §11.1, first steps: a brand-new host signs up with a code sent by SMS (ConsoleSmsProvider,
// read from its test outbox) and creates an event.
test.skip(Boolean(process.env.E2E_BASE_URL), "uses the local server and its SMS outbox");

const APP = `http://${LOCAL_DOMAINS.DOMAIN_APP}`;
// A cold dev server compiles each panel route on first use, with three viewports in parallel.
const NAVIGATION = { timeout: 30_000 };

/** The newest login code sent to `phoneE164`, waiting for the server to write it. */
async function codeSentTo(phoneE164: string): Promise<string> {
  let code: string | undefined;
  await expect(async () => {
    const lines = readFileSync(SMS_OUTBOX, "utf8").trim().split("\n");
    const messages = lines.map(
      (line) => JSON.parse(line) as { kind: string; to: string; code?: string },
    );
    code = messages.filter((m) => m.kind === "otp" && m.to === phoneE164).at(-1)?.code;
    expect(code).toMatch(/^\d{6}$/);
  }).toPass({ timeout: 10_000 });
  return code ?? "";
}

async function signUp(page: Page, local: string): Promise<void> {
  await page.setExtraHTTPHeaders({ "x-forwarded-for": uniqueClientIp() });
  await page.goto(`${APP}/login`);
  await page.getByLabel("شماره‌ی موبایل").fill(local);
  await page.getByRole("button", { name: "ارسال کد" }).click();
  await expect(page).toHaveURL(/\/login\/verify\?c=/, NAVIGATION);
  await page.getByLabel("کد ورود").fill(await codeSentTo(`+98${local.slice(1)}`));
  await page.getByRole("button", { name: "ورود", exact: true }).click();
  await expect(page).toHaveURL(`${APP}/events`, NAVIGATION);
}

test("a new host signs up with an SMS code and creates an event", async ({ page, context }) => {
  // A fresh number per run and per viewport, so limits and accounts never collide.
  const local = `0935${String(Date.now()).slice(-6)}${String(test.info().workerIndex % 10)}`;
  await signUp(page, local);

  const [session] = (await context.cookies(APP)).filter((c) => c.name === "pk_session");
  expect(session).toMatchObject({
    httpOnly: true,
    sameSite: "Lax",
    domain: LOCAL_DOMAINS.DOMAIN_APP.split(":")[0],
  });

  await expect(page.getByText("هنوز رویدادی ندارید")).toBeVisible();
  await page.getByRole("link", { name: "رویداد تازه" }).click();
  await page.getByLabel("عنوان رویداد").fill("عروسی سارا و علی");
  await page.getByLabel("نام عروس").fill("سارا");
  await page.getByLabel("نام داماد").fill("علی");
  await page.getByRole("button", { name: "ساخت رویداد" }).click();

  await expect(page).toHaveURL(/\/events\/[0-9a-f-]{36}$/, NAVIGATION);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("عروسی سارا و علی");
  await expect(page.getByText("سارا و علی", { exact: true })).toBeVisible();
  await expect(page.getByRole("navigation").getByText("مراسم‌ها")).toBeVisible();

  await page.getByRole("link", { name: "رویدادهای من" }).first().click();
  await expect(page.getByRole("link", { name: /عروسی سارا و علی/ })).toBeVisible();

  // Back at the panel's home the session is recognised on the server.
  await page.goto(`${APP}/`);
  await expect(page).toHaveURL(`${APP}/events`, NAVIGATION);

  // PK-029: logging out revokes the session; the old cookie no longer opens the panel.
  const token = (await context.cookies(APP)).find((c) => c.name === "pk_session")?.value ?? "";
  await page.getByText("حساب").click();
  await page.getByRole("button", { name: "خروج", exact: true }).click();
  await expect(page).toHaveURL(`${APP}/login`, NAVIGATION);
  await context.addCookies([{ name: "pk_session", value: token, url: APP }]);
  await page.goto(`${APP}/events`);
  await expect(page).toHaveURL(`${APP}/login`);
});
