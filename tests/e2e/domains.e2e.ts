import { expect, test } from "@playwright/test";
import { LOCAL_DOMAINS } from "./local-domains";

// Tech §2.3, MVP §6.1: each host serves only its own surface. Runs against the local server,
// whose hosts are known; a deployed environment is checked by its own probes.
test.skip(Boolean(process.env.E2E_BASE_URL), "uses the local *.localhost hosts");

const MAIN = `http://${LOCAL_DOMAINS.DOMAIN_MAIN}`;
const APP = `http://${LOCAL_DOMAINS.DOMAIN_APP}`;
const SHORT = `http://${LOCAL_DOMAINS.DOMAIN_SHORT}`;
const TOKEN = "a1B2c3D4e5F6g7H8i9J0kL";

test("panel paths on the main domain move to the app domain", async ({ request }) => {
  const response = await request.get(`${MAIN}/events?tab=guests`, { maxRedirects: 0 });
  expect(response.status()).toBe(308);
  expect(response.headers()["location"]).toBe(`${APP}/events?tab=guests`);
});

test("the marketing home on the app domain moves to the main domain", async ({ request }) => {
  const response = await request.get(`${APP}/`, { maxRedirects: 0 });
  expect(response.status()).toBe(308);
  expect(response.headers()["location"]).toBe(`${MAIN}/`);
});

test("the short domain is noindex and serves nothing but guest routes", async ({ request }) => {
  const home = await request.get(`${SHORT}/`, { maxRedirects: 0 });
  expect(home.status()).toBe(404);
  expect(home.headers()["x-robots-tag"]).toBe("noindex, nofollow");

  const invitation = await request.get(`${SHORT}/i/${TOKEN}`, { maxRedirects: 0 });
  expect(invitation.headers()["x-robots-tag"]).toBe("noindex, nofollow");
});

test("invitation links do not work on the app domain", async ({ request }) => {
  const response = await request.get(`${APP}/i/${TOKEN}`, { maxRedirects: 0 });
  expect(response.status()).toBe(404);
});
