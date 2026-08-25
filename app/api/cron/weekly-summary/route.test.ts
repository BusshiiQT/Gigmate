import assert from "node:assert/strict";
import test from "node:test";

// Node executes this TypeScript file directly and requires the runtime extension.
// @ts-expect-error TypeScript does not allow .ts extensions without allowImportingTsExtensions.
import { getCronAuthResult } from "./route.ts";

test("missing CRON_SECRET fails closed", () => {
  assert.deepEqual(getCronAuthResult("Bearer anything", undefined), {
    authorized: false,
    status: 500,
    error: "Cron authentication is not configured.",
  });
});

test("wrong bearer token is unauthorized", () => {
  assert.deepEqual(getCronAuthResult("Bearer wrong", "correct"), {
    authorized: false,
    status: 401,
    error: "Unauthorized",
  });
});

test("correct bearer token is accepted", () => {
  assert.deepEqual(getCronAuthResult("Bearer correct", "correct"), {
    authorized: true,
  });
});

test("query-string credentials cannot substitute for the authorization header", () => {
  const requestUrl = new URL("https://example.com/api/cron/weekly-summary?secret=correct");

  assert.equal(requestUrl.searchParams.get("secret"), "correct");
  assert.deepEqual(getCronAuthResult(null, "correct"), {
    authorized: false,
    status: 401,
    error: "Unauthorized",
  });
});
