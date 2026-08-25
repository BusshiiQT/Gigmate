import assert from "node:assert/strict";
import test from "node:test";

// Node executes this TypeScript file directly and requires the runtime extension.
// @ts-expect-error TypeScript does not allow .ts extensions without allowImportingTsExtensions.
import { getSafeRedirectUrl } from "./redirect.ts";

const origin = "https://gigmate.example";

test("missing next falls back to /dashboard", () => {
  assert.equal(getSafeRedirectUrl(null, origin).href, `${origin}/dashboard`);
});

test("accepts /dashboard", () => {
  assert.equal(getSafeRedirectUrl("/dashboard", origin).href, `${origin}/dashboard`);
});

test("accepts /settings", () => {
  assert.equal(getSafeRedirectUrl("/settings", origin).href, `${origin}/settings`);
});

test("preserves a query string on an internal path", () => {
  assert.equal(
    getSafeRedirectUrl("/entries/new?source=calendar&draft=1", origin).href,
    `${origin}/entries/new?source=calendar&draft=1`
  );
});

test("rejects an absolute external URL", () => {
  assert.equal(
    getSafeRedirectUrl("https://evil.example.com", origin).href,
    `${origin}/dashboard`
  );
});

test("rejects a protocol-relative external URL", () => {
  assert.equal(
    getSafeRedirectUrl("//evil.example.com", origin).href,
    `${origin}/dashboard`
  );
});

test("rejects a javascript URL", () => {
  assert.equal(
    getSafeRedirectUrl("javascript:alert(1)", origin).href,
    `${origin}/dashboard`
  );
});

test("rejects a data URL", () => {
  assert.equal(
    getSafeRedirectUrl("data:text/html,evil", origin).href,
    `${origin}/dashboard`
  );
});

test("rejects a malformed destination that URL parsing treats as external", () => {
  assert.equal(
    getSafeRedirectUrl("/\\evil.example.com", origin).href,
    `${origin}/dashboard`
  );
});

test("every accepted or rejected destination remains on the application origin", () => {
  const destinations = [
    null,
    "/dashboard",
    "/settings",
    "/entries/new?source=calendar",
    "https://evil.example.com",
    "//evil.example.com",
    "javascript:alert(1)",
    "data:text/html,evil",
    "/\\evil.example.com",
  ];

  for (const destination of destinations) {
    assert.equal(getSafeRedirectUrl(destination, origin).origin, origin);
  }
});
