import { describe, expect, it } from "vitest";
import {
  decideRoute,
  normalizeHost,
  pathKind,
  resolveSurface,
  type Domains,
} from "@/server/lib/host-routing";

const DOMAINS: Domains = {
  main: "payknameh.ir",
  app: "app.payknameh.ir",
  short: "pk.ir",
};
const TOKEN = "a1B2c3D4e5F6g7H8i9J0kL";

describe("normalizeHost", () => {
  it("lower-cases and drops a trailing dot", () => {
    expect(normalizeHost("App.Payknameh.IR.")).toBe("app.payknameh.ir");
  });

  it.each([null, "", "  "])("returns null for %j", (host) => {
    expect(normalizeHost(host)).toBeNull();
  });
});

describe("resolveSurface", () => {
  it.each([
    ["payknameh.ir", "main"],
    ["APP.payknameh.ir", "app"],
    ["pk.ir.", "short"],
  ] as const)("maps %s to %s", (host, surface) => {
    expect(resolveSurface(host, DOMAINS)).toBe(surface);
  });

  it("keeps the port as part of the host", () => {
    const local = {
      main: "payknameh.localhost:3000",
      app: "app.payknameh.localhost:3000",
      short: "pk.localhost:3000",
    };
    expect(resolveSurface("app.payknameh.localhost:3000", local)).toBe("app");
    expect(resolveSurface("payknameh.localhost:4000", local)).toBeNull();
  });

  it.each([null, "evil.example", "www.payknameh.ir", "payknameh.ir.evil.example"])(
    "rejects %j",
    (host) => {
      expect(resolveSurface(host, DOMAINS)).toBeNull();
    },
  );
});

describe("pathKind", () => {
  it.each([
    ["/health", "shared"],
    ["/_next/static/chunks/app.js", "shared"],
    [`/i/${TOKEN}`, "guest"],
    [`/i/${TOKEN}/`, "guest"],
    ["/api/guest", "guest"],
    ["/api/guest/v1/invitation", "guest"],
    ["/", "marketing"],
    ["/events", "app"],
    ["/api/events", "app"],
    ["/i/short", "app"],
    [`/i/${TOKEN}/extra`, "app"],
    ["/i/abc$def-ghijklmnopqrs", "app"],
    ["/api/guestbook", "app"],
  ] as const)("%s is %s", (pathname, kind) => {
    expect(pathKind(pathname)).toBe(kind);
  });
});

describe("decideRoute", () => {
  it("serves health checks and assets on every host, even an unknown one", () => {
    for (const surface of ["main", "app", "short", null] as const) {
      expect(decideRoute(surface, "/health")).toEqual({ action: "next" });
    }
  });

  it("answers 404 on an unknown host", () => {
    expect(decideRoute(null, "/")).toEqual({ action: "not-found" });
    expect(decideRoute(null, `/i/${TOKEN}`)).toEqual({ action: "not-found" });
  });

  it("serves the guest surface only on the short domain", () => {
    expect(decideRoute("short", `/i/${TOKEN}`)).toEqual({ action: "next" });
    expect(decideRoute("short", "/api/guest/v1/rsvp")).toEqual({ action: "next" });
    expect(decideRoute("main", `/i/${TOKEN}`)).toEqual({ action: "not-found" });
    expect(decideRoute("app", "/api/guest/v1/rsvp")).toEqual({ action: "not-found" });
  });

  it("serves nothing else on the short domain", () => {
    expect(decideRoute("short", "/")).toEqual({ action: "not-found" });
    expect(decideRoute("short", "/events")).toEqual({ action: "not-found" });
  });

  it("keeps marketing on the main domain and the panels on the app domain", () => {
    expect(decideRoute("main", "/")).toEqual({ action: "next" });
    expect(decideRoute("app", "/events")).toEqual({ action: "next" });
    expect(decideRoute("app", "/")).toEqual({ action: "redirect", to: "main" });
    expect(decideRoute("main", "/events")).toEqual({ action: "redirect", to: "app" });
  });
});
